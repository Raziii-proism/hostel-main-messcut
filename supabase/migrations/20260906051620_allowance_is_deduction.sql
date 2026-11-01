-- Update generate_monthly_bills: allowance is now a DEDUCTION (subtracted from each student's bill)
CREATE OR REPLACE FUNCTION generate_monthly_bills(p_hostel_id uuid, p_month date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mess_total numeric;
  v_common_total numeric;
  v_allowance_total numeric;
  v_room_rent_total numeric;
  v_total_expense numeric;
  v_total_present_days int;
  v_mess_per_day numeric;
  v_common_per_student numeric;
  v_allowance_per_student numeric;
  v_room_rent_per_student numeric;
  v_student_count int;
  v_days_in_month int;
  v_month_start date;
  v_month_end date;
  v_bills_inserted int := 0;
  v_student_rec record;
  v_student_present_days int;
  v_bill_amount numeric;
BEGIN
  -- Verify the caller is a warden of this hostel
  IF NOT EXISTS (
    SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = p_hostel_id
  ) THEN
    RETURN jsonb_build_object('error', 'Not authorized: only the warden can generate bills');
  END IF;

  -- Sum expense items by type
  SELECT
    COALESCE(SUM(CASE WHEN type = 'mess_bill' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'common_bill' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'allowance' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'room_rent' THEN amount ELSE 0 END), 0)
  INTO v_mess_total, v_common_total, v_allowance_total, v_room_rent_total
  FROM expense_items
  WHERE hostel_id = p_hostel_id;

  v_total_expense := COALESCE(v_mess_total, 0) + COALESCE(v_common_total, 0) + COALESCE(v_allowance_total, 0) + COALESCE(v_room_rent_total, 0);

  IF v_total_expense <= 0 THEN
    RETURN jsonb_build_object('error', 'No expense items found. Please add expense items first.');
  END IF;

  -- Calculate month range
  v_month_start := date_trunc('month', p_month)::date;
  v_month_end := (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::date;
  v_days_in_month := EXTRACT(day FROM v_month_end);

  -- Count students
  SELECT count(*) INTO v_student_count
  FROM students WHERE hostel_id = p_hostel_id;

  IF v_student_count = 0 THEN
    RETURN jsonb_build_object('error', 'No students in this hostel.');
  END IF;

  -- Calculate total present days across ALL students (excluding mess leave days)
  SELECT COALESCE(SUM(v_days_in_month - COALESCE(stud_abs.absent_count, 0) - COALESCE(leave_days.leave_count, 0)), 0)
  INTO v_total_present_days
  FROM students s
  LEFT JOIN (
    SELECT student_id, COUNT(*) as absent_count
    FROM absences
    WHERE absent_date >= v_month_start AND absent_date <= v_month_end
    GROUP BY student_id
  ) stud_abs ON stud_abs.student_id = s.id
  LEFT JOIN (
    SELECT s2.id as student_id, COUNT(DISTINCT d.dt) as leave_count
    FROM students s2
    CROSS JOIN generate_series(v_month_start, v_month_end, interval '1 day') AS d(dt)
    JOIN mess_leaves ml ON d.dt::date >= ml.start_date AND d.dt::date <= ml.end_date AND ml.hostel_id = p_hostel_id
    WHERE s2.hostel_id = p_hostel_id
    GROUP BY s2.id
  ) leave_days ON leave_days.student_id = s.id
  WHERE s.hostel_id = p_hostel_id;

  IF v_total_present_days <= 0 THEN
    RETURN jsonb_build_object('error', 'No present days recorded for any student this month.');
  END IF;

  -- Compute per-type per-student costs
  v_mess_per_day := ROUND((v_mess_total / v_total_present_days)::numeric, 2);
  v_common_per_student := ROUND((v_common_total / v_student_count)::numeric, 0);
  v_allowance_per_student := ROUND((v_allowance_total / v_student_count)::numeric, 0);
  v_room_rent_per_student := ROUND((v_room_rent_total / v_student_count)::numeric, 0);

  -- Generate a bill for each student
  -- Allowance is SUBTRACTED from the bill (it reduces the amount the student owes)
  FOR v_student_rec IN
    SELECT s.id as student_id,
           v_days_in_month - COALESCE(stud_abs.absent_count, 0) - COALESCE(leave_days.leave_count, 0) as present_days
    FROM students s
    LEFT JOIN (
      SELECT student_id, COUNT(*) as absent_count
      FROM absences
      WHERE absent_date >= v_month_start AND absent_date <= v_month_end
      GROUP BY student_id
    ) stud_abs ON stud_abs.student_id = s.id
    LEFT JOIN (
      SELECT s2.id as student_id, COUNT(DISTINCT d.dt) as leave_count
      FROM students s2
      CROSS JOIN generate_series(v_month_start, v_month_end, interval '1 day') AS d(dt)
      JOIN mess_leaves ml ON d.dt::date >= ml.start_date AND d.dt::date <= ml.end_date AND ml.hostel_id = p_hostel_id
      WHERE s2.hostel_id = p_hostel_id
      GROUP BY s2.id
    ) leave_days ON leave_days.student_id = s.id
    WHERE s.hostel_id = p_hostel_id
  LOOP
    v_student_present_days := v_student_rec.present_days;
    v_bill_amount := ROUND(v_mess_per_day * v_student_present_days, 0)
                   + v_common_per_student
                   - v_allowance_per_student
                   + v_room_rent_per_student;

    -- Ensure bill doesn't go negative
    IF v_bill_amount < 0 THEN
      v_bill_amount := 0;
    END IF;

    -- Insert bill only if one doesn't already exist for this student/month
    INSERT INTO bills (student_id, hostel_id, month, present_days, amount, status)
    VALUES (v_student_rec.student_id, p_hostel_id, v_month_start, v_student_present_days, v_bill_amount, 'unpaid')
    ON CONFLICT (student_id, month) DO NOTHING;

    IF FOUND THEN
      v_bills_inserted := v_bills_inserted + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'bills_inserted', v_bills_inserted,
    'total_expense', v_total_expense,
    'mess_total', v_mess_total,
    'common_total', v_common_total,
    'allowance_total', v_allowance_total,
    'room_rent_total', v_room_rent_total,
    'total_present_days', v_total_present_days,
    'mess_per_day_cost', v_mess_per_day,
    'common_per_student', v_common_per_student,
    'allowance_per_student', v_allowance_per_student,
    'room_rent_per_student', v_room_rent_per_student
  );
END;
$$;

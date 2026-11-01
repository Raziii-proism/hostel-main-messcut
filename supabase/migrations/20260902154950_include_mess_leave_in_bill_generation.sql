/*
# Include mess leave in monthly bills

1. Modified Function: `generate_monthly_bills`
   - Mess leave dates are treated as absent for every student in the hostel.
   - Total present days and each student's present days now exclude both
     individual absences and overlapping mess leave dates.
   - Existing bills are still protected by the existing unique constraint and
     ON CONFLICT behavior.

2. Security
   - Keeps the existing SECURITY DEFINER behavior and warden ownership check.
   - No table or RLS changes.

3. Important Notes
   - Mess leave ranges are inclusive of both start_date and end_date.
   - Overlapping leave periods are counted once per date.
*/

CREATE OR REPLACE FUNCTION generate_monthly_bills(p_hostel_id uuid, p_month date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expense numeric;
  v_total_present_days int;
  v_per_day_cost numeric;
  v_days_in_month int;
  v_month_start date;
  v_month_end date;
  v_bills_inserted int := 0;
  v_student_rec record;
  v_student_present_days int;
  v_bill_amount numeric;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = p_hostel_id
  ) THEN
    RETURN jsonb_build_object('error', 'Not authorized: only the warden can generate bills');
  END IF;

  SELECT COALESCE(total_monthly_expense, 0) INTO v_expense
  FROM hostels WHERE id = p_hostel_id;

  IF v_expense <= 0 THEN
    RETURN jsonb_build_object('error', 'No monthly expense set. Please set the total monthly expense first.');
  END IF;

  v_month_start := date_trunc('month', p_month)::date;
  v_month_end := (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::date;
  v_days_in_month := EXTRACT(day FROM v_month_end);

  SELECT COALESCE(SUM(
    GREATEST(
      v_days_in_month
      - COALESCE(stud_abs.absent_count, 0)
      - COALESCE(leave_days.leave_count, 0),
      0
    )
  ), 0)
  INTO v_total_present_days
  FROM students s
  LEFT JOIN (
    SELECT student_id, COUNT(*) as absent_count
    FROM absences
    WHERE absent_date >= v_month_start AND absent_date <= v_month_end
    GROUP BY student_id
  ) stud_abs ON stud_abs.student_id = s.id
  LEFT JOIN (
    SELECT COUNT(DISTINCT day)::int as leave_count
    FROM mess_leaves,
      generate_series(
        GREATEST(start_date, v_month_start),
        LEAST(end_date, v_month_end),
        interval '1 day'
      ) AS day
    WHERE hostel_id = p_hostel_id
      AND start_date <= v_month_end
      AND end_date >= v_month_start
  ) leave_days ON true
  WHERE s.hostel_id = p_hostel_id;

  IF v_total_present_days <= 0 THEN
    RETURN jsonb_build_object('error', 'No present days recorded for any student this month.');
  END IF;

  v_per_day_cost := ROUND((v_expense / v_total_present_days)::numeric, 2);

  FOR v_student_rec IN
    SELECT s.id as student_id,
      GREATEST(
        v_days_in_month
        - COALESCE(stud_abs.absent_count, 0)
        - COALESCE(leave_days.leave_count, 0),
        0
      ) as present_days
    FROM students s
    LEFT JOIN (
      SELECT student_id, COUNT(*) as absent_count
      FROM absences
      WHERE absent_date >= v_month_start AND absent_date <= v_month_end
      GROUP BY student_id
    ) stud_abs ON stud_abs.student_id = s.id
    LEFT JOIN (
      SELECT COUNT(DISTINCT day)::int as leave_count
      FROM mess_leaves,
        generate_series(
          GREATEST(start_date, v_month_start),
          LEAST(end_date, v_month_end),
          interval '1 day'
        ) AS day
      WHERE hostel_id = p_hostel_id
        AND start_date <= v_month_end
        AND end_date >= v_month_start
    ) leave_days ON true
    WHERE s.hostel_id = p_hostel_id
  LOOP
    v_student_present_days := v_student_rec.present_days;
    v_bill_amount := ROUND((v_per_day_cost * v_student_present_days)::numeric, 0);

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
    'total_expense', v_expense,
    'total_present_days', v_total_present_days,
    'per_day_cost', v_per_day_cost
  );
END;
$$;

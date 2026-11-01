/*
# Add monthly expense tracking and auto bill generation

1. Changes to `hostels` table
   - Add `total_monthly_expense` (numeric, nullable) — the warden enters the entire monthly mess expense.
   - The per-day cost is no longer stored as a flat `daily_cost`; instead it is computed dynamically as total_monthly_expense / total_present_days_across_all_students.

2. New function: `generate_monthly_bills(hostel_uuid, month_date)`
   - SECURITY DEFINER function that generates bills for all students in a hostel for a given month.
   - Computes total present days across ALL students in the hostel for that month.
   - Computes per-day cost = total_monthly_expense / total_present_days (rounded to 2 decimal places).
   - For each student: bill amount = per_day_cost * student_present_days (rounded to integer).
   - Inserts bills with status 'unpaid' for students who don't already have a bill for that month.
   - Uses ON CONFLICT to skip students who already have a bill (upsert-safe).

3. Security
   - The function is SECURITY DEFINER so it can insert bills on behalf of the warden.
   - Only wardens can call it (EXECUTE granted to authenticated; the function checks warden ownership).
   - No new tables. No RLS policy changes needed.
*/

-- Add total_monthly_expense column to hostels
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS total_monthly_expense numeric;

-- Create or replace the bill generation function
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
  -- Verify the caller is a warden of this hostel
  IF NOT EXISTS (
    SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = p_hostel_id
  ) THEN
    RETURN jsonb_build_object('error', 'Not authorized: only the warden can generate bills');
  END IF;

  -- Get the expense for this hostel
  SELECT COALESCE(total_monthly_expense, 0) INTO v_expense
  FROM hostels WHERE id = p_hostel_id;

  IF v_expense <= 0 THEN
    RETURN jsonb_build_object('error', 'No monthly expense set. Please set the total monthly expense first.');
  END IF;

  -- Calculate month range
  v_month_start := date_trunc('month', p_month)::date;
  v_month_end := (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::date;
  v_days_in_month := EXTRACT(day FROM v_month_end);

  -- Calculate total present days across ALL students
  SELECT COALESCE(SUM(v_days_in_month - COALESCE(stud_abs.absent_count, 0)), 0)
  INTO v_total_present_days
  FROM students s
  LEFT JOIN (
    SELECT student_id, COUNT(*) as absent_count
    FROM absences
    WHERE absent_date >= v_month_start AND absent_date <= v_month_end
    GROUP BY student_id
  ) stud_abs ON stud_abs.student_id = s.id
  WHERE s.hostel_id = p_hostel_id;

  IF v_total_present_days <= 0 THEN
    RETURN jsonb_build_object('error', 'No present days recorded for any student this month.');
  END IF;

  -- Compute per-day cost
  v_per_day_cost := ROUND((v_expense / v_total_present_days)::numeric, 2);

  -- Generate a bill for each student
  FOR v_student_rec IN
    SELECT s.id as student_id,
           v_days_in_month - COALESCE(stud_abs.absent_count, 0) as present_days
    FROM students s
    LEFT JOIN (
      SELECT student_id, COUNT(*) as absent_count
      FROM absences
      WHERE absent_date >= v_month_start AND absent_date <= v_month_end
      GROUP BY student_id
    ) stud_abs ON stud_abs.student_id = s.id
    WHERE s.hostel_id = p_hostel_id
  LOOP
    v_student_present_days := v_student_rec.present_days;
    v_bill_amount := ROUND((v_per_day_cost * v_student_present_days)::numeric, 0);

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
    'total_expense', v_expense,
    'total_present_days', v_total_present_days,
    'per_day_cost', v_per_day_cost
  );
END;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION generate_monthly_bills(uuid, date) TO authenticated;

/*
# Hostel Mess Cut - Database Schema

1. Overview
   This app manages hostel mess attendance and fee billing.
   - Wardens manage hostels, add students, set the daily mess cost, set the absence cutoff time, and set a UPI ID for payments.
   - Students log in, mark themselves absent (only before the warden-set cutoff on the previous day), see a calendar of present days, and pay monthly mess bills via UPI.

2. New Tables
   - `hostels`
     - `id` (uuid PK)
     - `name` (text, unique, not null) — hostel display name
     - `upi_id` (text, nullable) — UPI ID for student payments
     - `absence_cutoff_time` (text, not null, default '18:00') — HH:MM cutoff; students must mark absence before this time on the previous day
     - `daily_cost` (numeric, not null, default 0) — cost per present-day per student (set by warden from total monthly expenses / total present days)
     - `created_at` (timestamptz)
   - `wardens`
     - `id` (uuid PK, references auth.users) — the warden's auth account
     - `hostel_id` (uuid FK -> hostels)
     - `created_at` (timestamptz)
   - `students`
     - `id` (uuid PK, references auth.users) — the student's auth account
     - `hostel_id` (uuid FK -> hostels)
     - `full_name` (text, not null)
     - `room_no` (text, nullable)
     - `phone` (text, nullable)
     - `created_at` (timestamptz)
   - `absences`
     - `id` (uuid PK)
     - `student_id` (uuid FK -> students)
     - `absent_date` (date, not null) — the day the student will be absent
     - `created_at` (timestamptz)
     - Unique constraint on (student_id, absent_date) so a student can't mark the same day twice.
   - `bills`
     - `id` (uuid PK)
     - `student_id` (uuid FK -> students)
     - `hostel_id` (uuid FK -> hostels)
     - `month` (date, not null) — first day of the billing month (e.g. 2026-08-01)
     - `present_days` (int, not null) — days present that month
     - `amount` (numeric, not null) — amount owed (present_days * daily_cost)
     - `status` (text, not null, default 'unpaid') — 'unpaid' | 'paid'
     - `paid_at` (timestamptz, nullable)
     - Unique constraint on (student_id, month) so only one bill per student per month.

3. Security (RLS)
   - Enable RLS on all tables.
   - `hostels`: wardens can read/update their own hostel; students can read their hostel (to get cutoff, upi, daily cost).
   - `wardens`: a warden can read their own warden row.
   - `students`: wardens can read/update students in their hostel; a student can read/update their own student row.
   - `absences`: a student can read/insert their own absences; wardens can read absences for students in their hostel.
   - `bills`: a student can read their own bills and update to 'paid'; wardens can read bills for their hostel.

4. Important Notes
   1. Wardens and students both use Supabase email/password auth. The `wardens` and `students` tables link auth users to hostels.
   2. The warden's daily_cost is the per-student per-day cost, computed by the warden from total monthly expenses divided by total present days across all students.
   3. Bills auto-generate on the 1st of each month. The frontend computes present_days = days_in_month - absences_in_month, and amount = present_days * daily_cost.
   4. Absence cutoff defaults to 18:00 (6 PM). A student must mark absence before this time on the day before the absent date.
*/

-- Hostels table
CREATE TABLE IF NOT EXISTS hostels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  upi_id text,
  absence_cutoff_time text NOT NULL DEFAULT '18:00',
  daily_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;

-- Wardens table
CREATE TABLE IF NOT EXISTS wardens (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE wardens ENABLE ROW LEVEL SECURITY;

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  room_no text,
  phone text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Absences table
CREATE TABLE IF NOT EXISTS absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  absent_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, absent_date)
);
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  month date NOT NULL,
  present_days int NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'unpaid',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, month)
);
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- ============ HOSTELS policies ============
-- Wardens can read their own hostel (via wardens table join)
DROP POLICY IF EXISTS "warden_read_own_hostel" ON hostels;
CREATE POLICY "warden_read_own_hostel" ON hostels FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = hostels.id)
  );
-- Wardens can update their own hostel
DROP POLICY IF EXISTS "warden_update_own_hostel" ON hostels;
CREATE POLICY "warden_update_own_hostel" ON hostels FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = hostels.id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = hostels.id)
  );
-- Students can read their own hostel
DROP POLICY IF EXISTS "student_read_own_hostel" ON hostels;
CREATE POLICY "student_read_own_hostel" ON hostels FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM students WHERE students.id = auth.uid() AND students.hostel_id = hostels.id)
  );

-- ============ WARDENS policies ============
-- A warden can read their own warden row
DROP POLICY IF EXISTS "warden_read_self" ON wardens;
CREATE POLICY "warden_read_self" ON wardens FOR SELECT
  TO authenticated USING (auth.uid() = id);

-- ============ STUDENTS policies ============
-- A student can read their own student row
DROP POLICY IF EXISTS "student_read_self" ON students;
CREATE POLICY "student_read_self" ON students FOR SELECT
  TO authenticated USING (auth.uid() = id);
-- A student can update their own student row
DROP POLICY IF EXISTS "student_update_self" ON students;
CREATE POLICY "student_update_self" ON students FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
-- A warden can read students in their hostel
DROP POLICY IF EXISTS "warden_read_hostel_students" ON students;
CREATE POLICY "warden_read_hostel_students" ON students FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = students.hostel_id)
  );
-- A warden can update students in their hostel
DROP POLICY IF EXISTS "warden_update_hostel_students" ON students;
CREATE POLICY "warden_update_hostel_students" ON students FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = students.hostel_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = students.hostel_id)
  );
-- A warden can insert students into their hostel (used by edge function with service role, but allow for completeness)
DROP POLICY IF EXISTS "warden_insert_hostel_students" ON students;
CREATE POLICY "warden_insert_hostel_students" ON students FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = students.hostel_id)
  );
-- A warden can delete students in their hostel
DROP POLICY IF EXISTS "warden_delete_hostel_students" ON students;
CREATE POLICY "warden_delete_hostel_students" ON students FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = students.hostel_id)
  );

-- ============ ABSENCES policies ============
-- A student can read their own absences
DROP POLICY IF EXISTS "student_read_own_absences" ON absences;
CREATE POLICY "student_read_own_absences" ON absences FOR SELECT
  TO authenticated USING (auth.uid() = student_id);
-- A student can insert their own absences
DROP POLICY IF EXISTS "student_insert_own_absences" ON absences;
CREATE POLICY "student_insert_own_absences" ON absences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = student_id);
-- A student can delete their own absences
DROP POLICY IF EXISTS "student_delete_own_absences" ON absences;
CREATE POLICY "student_delete_own_absences" ON absences FOR DELETE
  TO authenticated USING (auth.uid() = student_id);
-- A warden can read absences for students in their hostel
DROP POLICY IF EXISTS "warden_read_hostel_absences" ON absences;
CREATE POLICY "warden_read_hostel_absences" ON absences FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = absences.student_id
      AND EXISTS (SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = students.hostel_id)
    )
  );

-- ============ BILLS policies ============
-- A student can read their own bills
DROP POLICY IF EXISTS "student_read_own_bills" ON bills;
CREATE POLICY "student_read_own_bills" ON bills FOR SELECT
  TO authenticated USING (auth.uid() = student_id);
-- A student can update their own bills (to mark paid)
DROP POLICY IF EXISTS "student_update_own_bills" ON bills;
CREATE POLICY "student_update_own_bills" ON bills FOR UPDATE
  TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);
-- A warden can read bills for their hostel
DROP POLICY IF EXISTS "warden_read_hostel_bills" ON bills;
CREATE POLICY "warden_read_hostel_bills" ON bills FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = bills.hostel_id)
  );
-- A warden can insert bills for their hostel
DROP POLICY IF EXISTS "warden_insert_hostel_bills" ON bills;
CREATE POLICY "warden_insert_hostel_bills" ON bills FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = bills.hostel_id)
  );

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_wardens_hostel ON wardens(hostel_id);
CREATE INDEX IF NOT EXISTS idx_students_hostel ON students(hostel_id);
CREATE INDEX IF NOT EXISTS idx_absences_student_date ON absences(student_id, absent_date);
CREATE INDEX IF NOT EXISTS idx_bills_student_month ON bills(student_id, month);
CREATE INDEX IF NOT EXISTS idx_bills_hostel ON bills(hostel_id);

-- ============ TRIGGER: auto-create warden row on signup ============
-- We handle warden/student row creation in the frontend after signUp,
-- since the role (warden/student) is chosen at signup time.
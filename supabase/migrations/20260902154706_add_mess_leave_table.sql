/*
# Add Mess Leave feature

1. New Table: `mess_leaves`
   - `id` (uuid PK)
   - `hostel_id` (uuid FK -> hostels, ON DELETE CASCADE)
   - `start_date` (date, not null) — first day of the mess leave period
   - `end_date` (date, not null) — last day of the mess leave period (inclusive)
   - `reason` (text, nullable) — optional note from the warden
   - `created_at` (timestamptz, default now())
   - CHECK constraint: end_date >= start_date

2. Purpose
   When a warden declares a mess leave for a date range, the mess is closed.
   Every student in that hostel is treated as absent for every day in the range.
   The frontend reads mess_leaves and merges those dates with individual student
   absences when computing present days, calendar display, and bills.

3. Security (RLS)
   - Enable RLS on `mess_leaves`.
   - Wardens can CRUD mess_leaves for their own hostel.
   - Students can read mess_leaves for their hostel (so they can see the days).
   - Anon can read mess_leaves (for the public Entries page).
*/

CREATE TABLE IF NOT EXISTS mess_leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  CHECK (end_date >= start_date)
);
ALTER TABLE mess_leaves ENABLE ROW LEVEL SECURITY;

-- Warden can read mess_leaves for their hostel
DROP POLICY IF EXISTS "warden_read_mess_leaves" ON mess_leaves;
CREATE POLICY "warden_read_mess_leaves" ON mess_leaves FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = mess_leaves.hostel_id)
  );

-- Warden can insert mess_leaves for their hostel
DROP POLICY IF EXISTS "warden_insert_mess_leaves" ON mess_leaves;
CREATE POLICY "warden_insert_mess_leaves" ON mess_leaves FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = mess_leaves.hostel_id)
  );

-- Warden can delete mess_leaves for their hostel
DROP POLICY IF EXISTS "warden_delete_mess_leaves" ON mess_leaves;
CREATE POLICY "warden_delete_mess_leaves" ON mess_leaves FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = mess_leaves.hostel_id)
  );

-- Students can read mess_leaves for their hostel
DROP POLICY IF EXISTS "student_read_mess_leaves" ON mess_leaves;
CREATE POLICY "student_read_mess_leaves" ON mess_leaves FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM students WHERE students.id = auth.uid() AND students.hostel_id = mess_leaves.hostel_id)
  );

-- Anon can read mess_leaves (for public Entries page)
DROP POLICY IF EXISTS "anon_read_mess_leaves" ON mess_leaves;
CREATE POLICY "anon_read_mess_leaves" ON mess_leaves FOR SELECT
  TO anon, authenticated USING (true);

-- Index for quick lookup by hostel
CREATE INDEX IF NOT EXISTS idx_mess_leaves_hostel ON mess_leaves(hostel_id);
CREATE INDEX IF NOT EXISTS idx_mess_leaves_dates ON mess_leaves(start_date, end_date);

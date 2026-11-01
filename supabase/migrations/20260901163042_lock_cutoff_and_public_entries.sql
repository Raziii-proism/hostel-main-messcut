/*
# Lock cutoff time to 18:00 and add public read access for Entries page

1. Changes
   - Set absence_cutoff_time to '18:00' for all existing hostels.
   - The cutoff is now permanently 6:00 PM; the warden can no longer change it.
   - Add anon SELECT policies on students, absences, and hostels so the public
     Entries page (accessible without login from the landing page) can read
     which students exist and who is absent on a given day.

2. Security
   - anon can SELECT students, absences, and hostels (read-only).
   - No write access for anon. Only authenticated wardens/students can write as before.
*/

-- Lock all hostels to 18:00 cutoff
UPDATE hostels SET absence_cutoff_time = '18:00' WHERE absence_cutoff_time IS NULL OR absence_cutoff_time <> '18:00';

-- Allow anon to read students (for the public Entries page)
DROP POLICY IF EXISTS "anon_read_students" ON students;
CREATE POLICY "anon_read_students" ON students FOR SELECT
  TO anon, authenticated USING (true);

-- Allow anon to read absences (for the public Entries page)
DROP POLICY IF EXISTS "anon_read_absences" ON absences;
CREATE POLICY "anon_read_absences" ON absences FOR SELECT
  TO anon, authenticated USING (true);

-- Allow anon to read hostels (for hostel name display)
DROP POLICY IF EXISTS "anon_read_hostels" ON hostels;
CREATE POLICY "anon_read_hostels" ON hostels FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "warden_insert_hostel_absences"
  ON absences FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = absences.student_id
      AND EXISTS (
        SELECT 1 FROM wardens w
        WHERE w.id = auth.uid() AND w.hostel_id = s.hostel_id
      )
    )
  );

CREATE POLICY "warden_delete_hostel_absences"
  ON absences FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = absences.student_id
      AND EXISTS (
        SELECT 1 FROM wardens w
        WHERE w.id = auth.uid() AND w.hostel_id = s.hostel_id
      )
    )
  );

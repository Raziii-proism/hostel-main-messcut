-- Allow wardens to update bill status (mark paid/unpaid) for their hostel
CREATE POLICY "warden_update_hostel_bills"
  ON bills FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wardens
      WHERE wardens.id = auth.uid() AND wardens.hostel_id = bills.hostel_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wardens
      WHERE wardens.id = auth.uid() AND wardens.hostel_id = bills.hostel_id
    )
  );

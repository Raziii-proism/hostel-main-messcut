/*
# Add expense items table

1. New Table: `expense_items`
   - `id` (uuid PK)
   - `hostel_id` (uuid FK -> hostels, ON DELETE CASCADE)
   - `type` (text, NOT NULL) — one of: 'common_bill', 'mess_bill', 'allowance', 'room_rent'
   - `label` (text, NOT NULL) — user-visible name for this expense item
   - `amount` (numeric, NOT NULL) — the amount for this expense item
   - `created_at` (timestamptz, DEFAULT now())

2. Purpose
   - Wardens can now break down the total monthly expense into multiple typed items
     (common bill, mess bill, allowance, room rent) instead of a single flat number.
   - The total monthly expense is the sum of all expense items for that hostel.

3. Security (RLS)
   - Enable RLS on `expense_items`.
   - Wardens can CRUD expense items for their own hostel (4 separate policies).
   - Students can read expense items for their hostel (so they can see the breakdown).

4. Important Notes
   - The existing `hostels.total_monthly_expense` column remains for backward compatibility
     but the app will now compute the total from expense_items instead.
   - No destructive changes to existing tables or data.
*/

CREATE TABLE IF NOT EXISTS expense_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('common_bill', 'mess_bill', 'allowance', 'room_rent')),
  label text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

-- Warden can read expense items for their hostel
DROP POLICY IF EXISTS "warden_read_expense_items" ON expense_items;
CREATE POLICY "warden_read_expense_items" ON expense_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = expense_items.hostel_id)
  );

-- Warden can insert expense items for their hostel
DROP POLICY IF EXISTS "warden_insert_expense_items" ON expense_items;
CREATE POLICY "warden_insert_expense_items" ON expense_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = expense_items.hostel_id)
  );

-- Warden can update expense items for their hostel
DROP POLICY IF EXISTS "warden_update_expense_items" ON expense_items;
CREATE POLICY "warden_update_expense_items" ON expense_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = expense_items.hostel_id)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = expense_items.hostel_id)
  );

-- Warden can delete expense items for their hostel
DROP POLICY IF EXISTS "warden_delete_expense_items" ON expense_items;
CREATE POLICY "warden_delete_expense_items" ON expense_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM wardens WHERE wardens.id = auth.uid() AND wardens.hostel_id = expense_items.hostel_id)
  );

-- Students can read expense items for their hostel
DROP POLICY IF EXISTS "student_read_expense_items" ON expense_items;
CREATE POLICY "student_read_expense_items" ON expense_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM students WHERE students.id = auth.uid() AND students.hostel_id = expense_items.hostel_id)
  );

CREATE INDEX IF NOT EXISTS idx_expense_items_hostel ON expense_items(hostel_id);

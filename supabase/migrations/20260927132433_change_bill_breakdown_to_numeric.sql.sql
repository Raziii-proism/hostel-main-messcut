ALTER TABLE bills
  ALTER COLUMN mess_amount TYPE numeric(12,2) USING mess_amount::numeric(12,2),
  ALTER COLUMN common_amount TYPE numeric(12,2) USING common_amount::numeric(12,2),
  ALTER COLUMN allowance_amount TYPE numeric(12,2) USING allowance_amount::numeric(12,2),
  ALTER COLUMN room_rent_amount TYPE numeric(12,2) USING room_rent_amount::numeric(12,2);

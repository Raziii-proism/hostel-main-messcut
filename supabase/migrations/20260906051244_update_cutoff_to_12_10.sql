-- Update absence cutoff time from 18:00 to 12:10 for all hostels
UPDATE hostels SET absence_cutoff_time = '12:10' WHERE absence_cutoff_time <> '12:10';

-- Update the default for future hostels
ALTER TABLE hostels ALTER COLUMN absence_cutoff_time SET DEFAULT '12:10';

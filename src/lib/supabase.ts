import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-id.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_token';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Hostel = {
  id: string;
  name: string;
  upi_id: string | null;
  absence_cutoff_time: string;
  daily_cost: number;
  total_monthly_expense: number | null;
  created_at: string;
};

export type Warden = {
  id: string;
  hostel_id: string;
  created_at: string;
};

export type Student = {
  id: string;
  hostel_id: string;
  full_name: string;
  room_no: string | null;
  phone: string | null;
  created_at: string;
};

export type Absence = {
  id: string;
  student_id: string;
  absent_date: string;
  created_at: string;
};

export type Bill = {
  id: string;
  student_id: string;
  hostel_id: string;
  month: string;
  present_days: number;
  amount: number;
  mess_amount?: number | null;
  common_amount?: number | null;
  allowance_amount?: number | null;
  room_rent_amount?: number | null;
  status: string;
  paid_at: string | null;
  created_at: string;
};

export type MessLeave = {
  id: string;
  hostel_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string;
};

export type ExpenseItemType = 'common_bill' | 'mess_bill' | 'allowance' | 'room_rent';

export type ExpenseItem = {
  id: string;
  hostel_id: string;
  type: ExpenseItemType;
  label: string;
  amount: number;
  month: string;
  created_at: string;
};

export type UserRole = 'warden' | 'student' | null;

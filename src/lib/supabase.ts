import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://ubtdybxvgdvgphgnspcp.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVidGR5Ynh2Z2R2Z3BoZ25zcGNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNDcyMTIsImV4cCI6MjEwNzcyMzIxMn0.MKG7fAGVlT8hEp5gKjljJUxzXere98WKSFP3ZigB4i8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nfumrarirrgjdynwmqfr.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mdW1yYXJpcnJnamR5bndtcWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Njc1NzEsImV4cCI6MjA5NzA0MzU3MX0.NKVp0LTqiU2R9J9qb9zYFGgwRmcGoxjwofsKfADxde8';
const SUPABASE_TABLE = 'lototo_aktif';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { SUPABASE_TABLE };

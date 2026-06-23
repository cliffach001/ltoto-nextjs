-- Jalankan SQL ini di Supabase SQL Editor (https://supabase.com/dashboard/project/nfumrarirrgjdynwmqfr/sql)
-- Menu: SQL Editor > New Query > Paste > Ctrl+Enter

ALTER TABLE lototo_aktif
ADD COLUMN IF NOT EXISTS no_notif TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS no_lototo TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS peminta TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS keterangan TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS gambar TEXT DEFAULT '';

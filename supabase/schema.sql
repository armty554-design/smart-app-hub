-- ============================================================================
-- App Hub Launcher - Supabase Database & Storage Schema
-- คัดลอกคำสั่งทั้งหมดนี้ไปวางใน Supabase Dashboard -> SQL Editor แล้วกด Run
-- ============================================================================

-- 1. ตารางหมวดหมู่ / โฟลเดอร์ (categories)
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Folder',
  color TEXT NOT NULL DEFAULT '#6366f1',
  layout TEXT NOT NULL DEFAULT 'detail-2col', -- 'detail-2col' | 'icons' | 'cards-2col'
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ตารางลิงก์แอปพลิเคชัน / Google Apps Script (app_links)
CREATE TABLE IF NOT EXISTS public.app_links (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT DEFAULT '',
  category_id TEXT NOT NULL DEFAULT 'all',
  icon_type TEXT NOT NULL DEFAULT 'library', -- 'library' | 'image'
  icon_name TEXT NOT NULL DEFAULT 'FileSpreadsheet',
  icon_url TEXT DEFAULT '',
  image_fit TEXT NOT NULL DEFAULT 'cover', -- 'cover' | 'contain'
  bg_style TEXT NOT NULL DEFAULT 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
  icon_color TEXT NOT NULL DEFAULT '#ffffff',
  badge_text TEXT DEFAULT '',
  is_dock BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ตารางตั้งค่าระบบหลังบ้าน (app_settings)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  hub_title TEXT NOT NULL DEFAULT 'Smart Workspace',
  hub_subtitle TEXT NOT NULL DEFAULT 'ศูนย์รวมระบบ Google Apps Script & เครื่องมือทำงาน',
  admin_pin TEXT NOT NULL DEFAULT '1234',
  wallpaper_id TEXT NOT NULL DEFAULT 'aurora-night',
  custom_wallpaper_url TEXT DEFAULT '',
  icon_shape TEXT NOT NULL DEFAULT 'squircle', -- 'squircle' | 'rounded' | 'circle'
  grid_columns INTEGER NOT NULL DEFAULT 4,
  default_folder_layout TEXT NOT NULL DEFAULT 'detail-2col', -- 'detail-2col' | 'icons' | 'cards-2col'
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. เปิดใช้งาน Row Level Security (RLS) และอนุญาตให้เข้าถึงผ่าน Anon Key
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to categories" ON public.categories;
CREATE POLICY "Allow public access to categories" ON public.categories
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to app_links" ON public.app_links;
CREATE POLICY "Allow public access to app_links" ON public.app_links
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to app_settings" ON public.app_settings;
CREATE POLICY "Allow public access to app_settings" ON public.app_settings
  FOR ALL USING (true) WITH CHECK (true);

-- 5. สร้าง Storage Bucket สำหรับเก็บไฟล์รูปภาพไอคอนที่อัปโหลด (app-icons)
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-icons', 'app-icons', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read access for app-icons" ON storage.objects;
CREATE POLICY "Public read access for app-icons" ON storage.objects
  FOR SELECT USING (bucket_id = 'app-icons');

DROP POLICY IF EXISTS "Public upload access for app-icons" ON storage.objects;
CREATE POLICY "Public upload access for app-icons" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'app-icons');

DROP POLICY IF EXISTS "Public update access for app-icons" ON storage.objects;
CREATE POLICY "Public update access for app-icons" ON storage.objects
  FOR UPDATE USING (bucket_id = 'app-icons');

DROP POLICY IF EXISTS "Public delete access for app-icons" ON storage.objects;
CREATE POLICY "Public delete access for app-icons" ON storage.objects
  FOR DELETE USING (bucket_id = 'app-icons');

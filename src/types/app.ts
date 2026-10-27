export type IconType = 'library' | 'image' | 'favicon';
export type ImageFit = 'cover' | 'contain';
export type IconShape = 'squircle' | 'rounded' | 'circle';
export type FolderLayout = 'icons' | 'detail-2col' | 'cards-2col';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  layout?: FolderLayout;
}

export interface AppLink {
  id: string;
  title: string;
  url: string;
  description: string;
  category_id: string;
  icon_type: IconType;
  icon_name: string;
  icon_url: string;
  image_fit: ImageFit;
  bg_style: string;
  icon_color: string;
  badge_text?: string;
  is_dock: boolean;
  is_active?: boolean;
  sort_order: number;
  created_at?: string;
}

export interface AppSettings {
  id: string;
  hub_title: string;
  hub_subtitle: string;
  admin_pin: string;
  wallpaper_id: string;
  custom_wallpaper_url: string;
  icon_shape: IconShape;
  grid_columns: number;
  default_folder_layout?: FolderLayout;
}

export interface WallpaperPreset {
  id: string;
  name: string;
  style: string;
  thumbnail: string;
  isLight?: boolean;
  badge?: string;
}

export interface BgColorPreset {
  id: string;
  name: string;
  value: string;
  type: 'gradient' | 'solid';
}

export interface EmployeeProfile {
  seq: string;
  code: string; // รหัสพนักงาน เช่น 171785
  zone: string; // โซน เช่น D, B, A, C, AD
  branch: string; // สาขา เช่น บางพลี, สุขุมวิท 50, วังน้อย
  prefix: string; // คำนำหน้า เช่น นาย, นางสาว
  firstName: string; // ชื่อ
  lastName: string; // สกุล
  fullName: string; // ชื่อ-สกุลเต็ม
  position: string; // ตำแหน่ง
  startDate: string; // วันที่เริ่มงาน (DD/MM/YYYY)
}

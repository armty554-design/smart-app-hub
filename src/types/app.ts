export type IconType = 'library' | 'image';
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

export interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

export interface WallpaperPreset {
  id: string;
  name: string;
  style: string;
  thumbnail: string;
}

export interface BgColorPreset {
  id: string;
  name: string;
  value: string;
  type: 'gradient' | 'solid';
}

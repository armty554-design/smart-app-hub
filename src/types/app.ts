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

export interface EmployeeLinkItem {
  id: string;
  folderId: string;
  codeOrTopic: string;    // เช่น "ข้อ 1.1", "AD", "HR", "การบริหารจัดการ Job"
  subTopic?: string;      // เช่น "จัดส่งตรงเวลา"
  title: string;          // ชื่อลิงก์
  url: string;            // URL เป้าหมาย
  description: string;    // คำอธิบาย / แหล่งที่มา / กำหนดการลงข้อมูล
  badge?: string;         // เช่น "CRM", "Power BI", "MDFSS V.2", "GAS", "Form", "Sheet"
  iconName: string;
  bgStyle: string;
}

export interface EmployeeSheetFolder {
  id: string;
  sheetName: string;      // ชื่อแผ่นงานจริงใน Google Sheets
  gid: string;            // gid ของแผ่นงาน
  description: string;    // คำอธิบายโฟลเดอร์
  color: string;
  iconName: string;
  isArchive?: boolean;    // สำหรับแผ่นงานปีย้อนหลัง 64-68
  links: EmployeeLinkItem[];
}

export interface EmployeeScheduleItem {
  seq: string;
  title: string;
  frequency: 'ประจำวัน' | 'ประจำเดือน' | string;
  actionNote: string;
}

export type FolderNoteColor = 'amber' | 'sky' | 'emerald' | 'rose' | 'violet';

export interface FolderNoteItem {
  id: string;
  folderId: string;
  employeeCode: string; // รหัสพนักงานเจ้าของโน้ต หรือ 'admin'
  authorName: string;   // ชื่อผู้บันทึกโน้ต
  title: string;        // หัวข้อโน้ต
  content: string;      // รายละเอียดบันทึกช่วยจำ
  color: FolderNoteColor;
  isPinned?: boolean;
  isShared?: boolean;   // true = แชร์ในโฟลเดอร์ให้พนักงานคนอื่นเห็นด้วย, false = เห็นเฉพาะเจ้าของรหัสพนักงาน
  createdAt: string;
  updatedAt: string;
}

export interface EmployeePersonalFolder {
  id: string;
  employeeCode: string; // รหัสพนักงานเจ้าของโฟลเดอร์ เช่น 171785
  name: string;         // ชื่อโฟลเดอร์ส่วนตัว
  description: string;  // คำอธิบายโฟลเดอร์
  color: string;        // สีประจำโฟลเดอร์
  iconName: string;     // ชื่อไอคอน
  links: EmployeeLinkItem[];
  createdAt: string;
  updatedAt: string;
}

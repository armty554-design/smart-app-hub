import { AppLink, AppSettings, Category } from '../types/app';
import { DEFAULT_APP_LINKS, DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from '../constants/wallpapers';
import { getSupabaseClient } from '../lib/supabase';

const LS_LINKS_KEY = 'app_hub_links_v1';
const LS_CATEGORIES_KEY = 'app_hub_categories_v1';
const LS_SETTINGS_KEY = 'app_hub_settings_v1';

// ตัวล็อกป้องกันการดึงข้อมูลพื้นหลัง (Background Fetch) มาทับข้อมูลขณะที่ผู้ใช้กำลังกดเพิ่ม/ลบ/แก้ไข
let activeMutationsCount = 0;
let lastMutationCompletedAt = 0;

export function isMutationInProgressOrRecent(cooldownMs = 2500): boolean {
  if (activeMutationsCount > 0) return true;
  return Date.now() - lastMutationCompletedAt < cooldownMs;
}

function beginMutation() {
  activeMutationsCount += 1;
}

function endMutation() {
  activeMutationsCount = Math.max(0, activeMutationsCount - 1);
  lastMutationCompletedAt = Date.now();
}

export interface HubDataBundle {
  links: AppLink[];
  categories: Category[];
  settings: AppSettings;
  source: 'supabase' | 'local';
  supabaseError?: string;
}

export function getLocalLinks(): AppLink[] {
  try {
    const raw = localStorage.getItem(LS_LINKS_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as AppLink[];
      if (Array.isArray(parsed)) {
        // คืนค่าตามจริง แม้ว่าจะเป็น Array ว่าง [] (กรณีผู้ใช้ลบลิงก์ทั้งหมดออกแล้ว) เพื่อไม่ให้ข้อมูลตัวอย่างเก่าเด้งกลับมาอีก
        return [...parsed].sort((a, b) => a.sort_order - b.sort_order);
      }
    }
  } catch {
    // ignore
  }
  localStorage.setItem(LS_LINKS_KEY, JSON.stringify(DEFAULT_APP_LINKS));
  return [...DEFAULT_APP_LINKS];
}

export function setLocalLinks(links: AppLink[]): void {
  localStorage.setItem(LS_LINKS_KEY, JSON.stringify(links));
}

export function getLocalCategories(): Category[] {
  try {
    const raw = localStorage.getItem(LS_CATEGORIES_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Category[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return [...parsed].sort((a, b) => a.sort_order - b.sort_order);
      }
    }
  } catch {
    // ignore
  }
  localStorage.setItem(LS_CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
  return [...DEFAULT_CATEGORIES];
}

export function setLocalCategories(categories: Category[]): void {
  localStorage.setItem(LS_CATEGORIES_KEY, JSON.stringify(categories));
}

export function getLocalSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS_KEY);
    if (raw !== null) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
  return { ...DEFAULT_SETTINGS };
}

export function setLocalSettings(settings: AppSettings): void {
  localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
}

export async function fetchAllHubData(): Promise<HubDataBundle> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      links: getLocalLinks(),
      categories: getLocalCategories(),
      settings: getLocalSettings(),
      source: 'local',
    };
  }

  try {
    const [linksRes, catsRes, settingsRes] = await Promise.all([
      supabase.from('app_links').select('*').order('sort_order', { ascending: true }),
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('app_settings').select('*').eq('id', 'default').maybeSingle(),
    ]);

    if (linksRes.error) throw new Error(linksRes.error.message);
    if (catsRes.error) throw new Error(catsRes.error.message);

    // ใช้ข้อมูลจาก Supabase เป็นความจริงหลัก 100% (Single Source of Truth)
    // ไม่นำ localLinks กลับไปทับใน Supabase เด็ดขาด เพื่อป้องกันลิงก์เก่าที่เคยลบไปแล้วเด้งกลับมา
    const links: AppLink[] = (linksRes.data as AppLink[]) || [];
    let categories: Category[] = (catsRes.data as Category[]) || [];
    const settings: AppSettings = settingsRes.data
      ? { ...DEFAULT_SETTINGS, ...(settingsRes.data as AppSettings) }
      : getLocalSettings();

    // สร้างหมวดหมู่เริ่มต้นเฉพาะกรณีที่ตาราง categories ว่างเปล่าจริงๆ เท่านั้น
    if (categories.length === 0) {
      await supabase.from('categories').upsert(DEFAULT_CATEGORIES);
      categories = [...DEFAULT_CATEGORIES];
    }

    if (!settingsRes.data) {
      await supabase.from('app_settings').upsert({ ...settings, id: 'default' });
    }

    // อัปเดต Cache ในเครื่องให้ตรงกับ Supabase ล่าสุดเสมอ
    setLocalLinks(links);
    setLocalCategories(categories);
    setLocalSettings(settings);

    return {
      links,
      categories,
      settings,
      source: 'supabase',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อตารางใน Supabase ได้';
    return {
      links: getLocalLinks(),
      categories: getLocalCategories(),
      settings: getLocalSettings(),
      source: 'local',
      supabaseError: message,
    };
  }
}

export async function upsertAppLink(link: AppLink, currentLinks: AppLink[]): Promise<AppLink[]> {
  beginMutation();
  try {
    const exists = currentLinks.some((item) => item.id === link.id);
    const updatedLinks = exists
      ? currentLinks.map((item) => (item.id === link.id ? link : item))
      : [...currentLinks, link];

    const sorted = [...updatedLinks].sort((a, b) => a.sort_order - b.sort_order);
    setLocalLinks(sorted);

    const supabase = getSupabaseClient();
    if (supabase) {
      const dbPayload = {
        id: link.id,
        title: link.title,
        url: link.url,
        description: link.description || '',
        category_id: link.category_id && link.category_id !== 'all' ? link.category_id : 'work-script',
        icon_type: link.icon_type || 'library',
        icon_name: link.icon_name || 'Globe',
        icon_url: link.icon_url || '',
        image_fit: link.image_fit || 'cover',
        bg_style: link.bg_style || '#ffffff',
        icon_color: link.icon_color || '#ffffff',
        badge_text: link.badge_text || '',
        is_dock: Boolean(link.is_dock),
        is_active: link.is_active !== false,
        sort_order: link.sort_order,
      };

      const { error } = await supabase.from('app_links').upsert(dbPayload);
      if (error) {
        console.error('Supabase upsertAppLink error:', error.message);
        throw new Error(`บันทึกขึ้น Supabase ไม่สำเร็จ: ${error.message}`);
      }
    }

    return sorted;
  } finally {
    endMutation();
  }
}

export async function deleteAppLink(linkId: string, currentLinks: AppLink[]): Promise<AppLink[]> {
  beginMutation();
  try {
    const filtered = currentLinks
      .filter((item) => item.id !== linkId)
      .map((item, idx) => ({ ...item, sort_order: idx + 1 }));

    setLocalLinks(filtered);

    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('app_links').delete().eq('id', linkId);
      if (error) {
        console.error('Supabase deleteAppLink error:', error.message);
        throw new Error(`ลบลิงก์ใน Supabase ไม่สำเร็จ: ${error.message}`);
      }
    }

    return filtered;
  } finally {
    endMutation();
  }
}

export async function reorderAppLinks(reorderedLinks: AppLink[]): Promise<AppLink[]> {
  beginMutation();
  try {
    const normalized = reorderedLinks.map((item, index) => ({
      ...item,
      sort_order: index + 1,
    }));

    setLocalLinks(normalized);

    const supabase = getSupabaseClient();
    if (supabase && normalized.length > 0) {
      const payload = normalized.map((link) => ({
        id: link.id,
        title: link.title,
        url: link.url,
        description: link.description || '',
        category_id: link.category_id && link.category_id !== 'all' ? link.category_id : 'work-script',
        icon_type: link.icon_type || 'library',
        icon_name: link.icon_name || 'Globe',
        icon_url: link.icon_url || '',
        image_fit: link.image_fit || 'cover',
        bg_style: link.bg_style || '#ffffff',
        icon_color: link.icon_color || '#ffffff',
        badge_text: link.badge_text || '',
        is_dock: Boolean(link.is_dock),
        is_active: link.is_active !== false,
        sort_order: link.sort_order,
      }));
      const { error } = await supabase.from('app_links').upsert(payload);
      if (error) {
        console.warn('Supabase reorderAppLinks warning:', error.message);
      }
    }

    return normalized;
  } finally {
    endMutation();
  }
}

export async function upsertCategory(category: Category, currentCategories: Category[]): Promise<Category[]> {
  beginMutation();
  try {
    const exists = currentCategories.some((c) => c.id === category.id);
    const updated = exists
      ? currentCategories.map((c) => (c.id === category.id ? category : c))
      : [...currentCategories, category];

    const sorted = [...updated].sort((a, b) => a.sort_order - b.sort_order);
    setLocalCategories(sorted);

    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('categories').upsert({
        id: category.id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        layout: category.layout || 'detail-2col',
        sort_order: category.sort_order,
      });
      if (error) {
        console.warn('Supabase upsertCategory warning:', error.message);
      }
    }

    return sorted;
  } finally {
    endMutation();
  }
}

export async function deleteCategory(categoryId: string, currentCategories: Category[]): Promise<Category[]> {
  beginMutation();
  try {
    const filtered = currentCategories.filter((c) => c.id !== categoryId);
    setLocalCategories(filtered);

    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('categories').delete().eq('id', categoryId);
      if (error) {
        console.warn('Supabase deleteCategory warning:', error.message);
      }
    }

    return filtered;
  } finally {
    endMutation();
  }
}

export async function updateHubSettings(settings: AppSettings): Promise<AppSettings> {
  beginMutation();
  try {
    const normalized = { ...settings, id: 'default' };
    setLocalSettings(normalized);

    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('app_settings').upsert({
        id: 'default',
        hub_title: normalized.hub_title,
        hub_subtitle: normalized.hub_subtitle,
        admin_pin: normalized.admin_pin,
        wallpaper_id: normalized.wallpaper_id,
        custom_wallpaper_url: normalized.custom_wallpaper_url || '',
        icon_shape: normalized.icon_shape,
        grid_columns: normalized.grid_columns,
        default_folder_layout: normalized.default_folder_layout || 'detail-2col',
        updated_at: new Date().toISOString(),
      });
      if (error) {
        console.error('Supabase updateHubSettings error:', error.message);
        throw new Error(`บันทึกการตั้งค่าขึ้น Supabase ไม่สำเร็จ: ${error.message}`);
      }
    }

    return normalized;
  } finally {
    endMutation();
  }
}

/**
 * ส่งข้อมูลชุดปัจจุบันในหน้าจอไปบันทึกทับใน Supabase
 */
export async function pushLocalDataToSupabase(currentState?: {
  links: AppLink[];
  categories: Category[];
  settings: AppSettings;
}): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, message: 'ยังไม่ได้ตั้งค่า URL และ Anon Key ของ Supabase' };
  }

  beginMutation();
  try {
    const links = currentState ? currentState.links : getLocalLinks();
    const categories = currentState ? currentState.categories : getLocalCategories();
    const settings = currentState ? currentState.settings : getLocalSettings();

    // ลบรายการใน Supabase ที่ไม่มีอยู่ในชุดข้อมูลปัจจุบัน
    const { data: existingLinks } = await supabase.from('app_links').select('id');
    const currentLinkIds = links.map((l) => l.id);
    const toDeleteIds = (existingLinks || [])
      .map((row: { id: string }) => row.id)
      .filter((id) => !currentLinkIds.includes(id));

    if (toDeleteIds.length > 0) {
      await supabase.from('app_links').delete().in('id', toDeleteIds);
    }

    if (categories.length > 0) {
      const { error: catErr } = await supabase.from('categories').upsert(
        categories.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          color: c.color,
          layout: c.layout || 'detail-2col',
          sort_order: c.sort_order,
        }))
      );
      if (catErr) throw new Error(`Categories: ${catErr.message}`);
    }

    if (links.length > 0) {
      const { error: linkErr } = await supabase.from('app_links').upsert(
        links.map((l) => ({
          id: l.id,
          title: l.title,
          url: l.url,
          description: l.description || '',
          category_id: l.category_id && l.category_id !== 'all' ? l.category_id : 'work-script',
          icon_type: l.icon_type || 'library',
          icon_name: l.icon_name || 'Globe',
          icon_url: l.icon_url || '',
          image_fit: l.image_fit || 'cover',
          bg_style: l.bg_style || '#ffffff',
          icon_color: l.icon_color || '#ffffff',
          badge_text: l.badge_text || '',
          is_dock: Boolean(l.is_dock),
          is_active: l.is_active !== false,
          sort_order: l.sort_order,
        }))
      );
      if (linkErr) throw new Error(`App Links: ${linkErr.message}`);
    }

    const { error: setErr } = await supabase.from('app_settings').upsert({
      id: 'default',
      hub_title: settings.hub_title,
      hub_subtitle: settings.hub_subtitle,
      admin_pin: settings.admin_pin,
      wallpaper_id: settings.wallpaper_id,
      custom_wallpaper_url: settings.custom_wallpaper_url || '',
      icon_shape: settings.icon_shape,
      grid_columns: settings.grid_columns,
      default_folder_layout: settings.default_folder_layout || 'detail-2col',
      updated_at: new Date().toISOString(),
    });
    if (setErr) throw new Error(`Settings: ${setErr.message}`);

    return { ok: true, message: 'ซิงค์ข้อมูลทั้งหมดขึ้นฐานข้อมูล Supabase เรียบร้อยแล้ว!' };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการซิงค์ข้อมูล',
    };
  } finally {
    endMutation();
  }
}

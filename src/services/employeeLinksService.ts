import {
  EmployeeLinkItem,
  EmployeePersonalFolder,
  EmployeeScheduleItem,
  EmployeeSheetFolder,
  FolderNoteColor,
  FolderNoteItem,
} from '../types/app';
import {
  EMPLOYEE_LINKS_DEFAULT_URL,
  EMPLOYEE_LINKS_SPREADSHEET_ID,
  EMPLOYEE_SCHEDULE_ITEMS,
  EMPLOYEE_SHEET_FOLDERS_FALLBACK,
} from '../constants/employeeLinksFallback';
import { getSupabaseClient } from '../lib/supabase';

const STORAGE_KEY_EMPLOYEE_FOLDERS = 'smart_hub_employee_folders_v1';
const STORAGE_KEY_PERSONAL_FOLDERS_PREFIX = 'smart_hub_emp_personal_folders_v1_';
const STORAGE_KEY_FOLDER_NOTES = 'smart_hub_folder_notes_v1';

const SUPABASE_NOTES_ROW_ID = 'hub_folder_notes_v1';
const SUPABASE_EMP_WORKSPACE_PREFIX = 'emp_workspace_';

export function getEmployeeFolders(): EmployeeSheetFolder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EMPLOYEE_FOLDERS);
    if (raw) {
      const parsed = JSON.parse(raw) as EmployeeSheetFolder[];
      if (Array.isArray(parsed) && parsed.length >= 15) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return EMPLOYEE_SHEET_FOLDERS_FALLBACK;
}

export function getEmployeeScheduleItems(): EmployeeScheduleItem[] {
  return EMPLOYEE_SCHEDULE_ITEMS;
}

export function getEmployeeLinksSheetUrl(gid = '224623018'): string {
  return `https://docs.google.com/spreadsheets/d/${EMPLOYEE_LINKS_SPREADSHEET_ID}/edit?gid=${gid}#gid=${gid}`;
}

export function getDefaultEmployeeLinksMainUrl(): string {
  return EMPLOYEE_LINKS_DEFAULT_URL;
}

export interface EmployeeSearchResult {
  folder: EmployeeSheetFolder;
  link: EmployeeLinkItem;
  isPersonalFolder?: boolean;
}

export function searchAcrossEmployeeFolders(
  query: string,
  folders: EmployeeSheetFolder[] = getEmployeeFolders(),
  includeArchives = true,
  personalFolders: EmployeePersonalFolder[] = []
): EmployeeSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: EmployeeSearchResult[] = [];

  // 1. ค้นหาในโฟลเดอร์ส่วนตัวของพนักงานก่อน
  for (const pFolder of personalFolders) {
    const mappedFolder: EmployeeSheetFolder = {
      id: pFolder.id,
      sheetName: `⭐ ${pFolder.name}`,
      gid: 'personal',
      description: pFolder.description,
      color: pFolder.color,
      iconName: pFolder.iconName,
      links: pFolder.links,
    };
    for (const link of pFolder.links) {
      const hay = `${pFolder.name} ${link.codeOrTopic} ${link.subTopic || ''} ${link.title} ${
        link.description
      } ${link.badge || ''} ${link.url}`.toLowerCase();
      if (hay.includes(q)) {
        results.push({ folder: mappedFolder, link, isPersonalFolder: true });
      }
    }
  }

  // 2. ค้นหาใน 17 โฟลเดอร์แผ่นงาน
  for (const folder of folders) {
    if (!includeArchives && folder.isArchive) continue;
    for (const link of folder.links) {
      const hay = `${folder.sheetName} ${link.codeOrTopic} ${link.subTopic || ''} ${link.title} ${
        link.description
      } ${link.badge || ''} ${link.url}`.toLowerCase();
      if (hay.includes(q)) {
        results.push({ folder, link, isPersonalFolder: false });
      }
    }
  }
  return results;
}

// ============================================================================
// ระบบตรวจจับไอคอนและป้ายกำกับอัตโนมัติสำหรับลิงก์ส่วนตัวของพนักงาน
// ============================================================================
export function detectEmployeeLinkAppearance(rawUrl: string): {
  badge: string;
  iconName: string;
  bgStyle: string;
} {
  const u = (rawUrl || '').toLowerCase();
  if (u.includes('powerbi.com')) {
    return {
      badge: 'Power BI',
      iconName: 'BarChart3',
      bgStyle: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    };
  }
  if (u.includes('script.google.com')) {
    return {
      badge: 'Apps Script',
      iconName: 'FileSpreadsheet',
      bgStyle: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
    };
  }
  if (u.includes('forms.gle') || u.includes('docs.google.com/forms')) {
    return {
      badge: 'Google Form',
      iconName: 'ClipboardCheck',
      bgStyle: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    };
  }
  if (u.includes('docs.google.com/spreadsheets')) {
    return {
      badge: 'Google Sheet',
      iconName: 'FileSpreadsheet',
      bgStyle: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    };
  }
  if (u.includes('drive.google.com')) {
    return {
      badge: 'Google Drive',
      iconName: 'FolderOpen',
      bgStyle: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    };
  }
  if (u.includes('35.197.149.70') || u.includes('nadm')) {
    return {
      badge: 'CRM',
      iconName: 'Database',
      bgStyle: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    };
  }
  if (u.includes('103.86.50.146') || u.includes('mdfss')) {
    return {
      badge: 'MDFSS V.2',
      iconName: 'Truck',
      bgStyle: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
    };
  }
  return {
    badge: 'ลิงก์ส่วนตัว',
    iconName: 'Globe',
    bgStyle: 'linear-gradient(135deg, #ec4899 0%, #6366f1 100%)',
  };
}

// ============================================================================
// ส่วนที่ 1: โฟลเดอร์ส่วนตัวของพนักงานแต่ละคน (แยกตามรหัสพนักงาน employeeCode)
// ============================================================================
function getPersonalFoldersStorageKey(employeeCode: string): string {
  return `${STORAGE_KEY_PERSONAL_FOLDERS_PREFIX}${employeeCode.trim()}`;
}

function createDefaultPersonalFolder(employeeCode: string): EmployeePersonalFolder {
  const now = new Date().toISOString();
  return {
    id: `personal-main-${employeeCode.trim()}`,
    employeeCode: employeeCode.trim(),
    name: 'โฟลเดอร์ส่วนตัวของฉัน',
    description: 'เก็บลิงก์งานที่ใช้บ่อยและสมุดโน้ตส่วนตัวเฉพาะรหัสพนักงานของคุณ',
    color: '#ec4899',
    iconName: 'Star',
    links: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function getPersonalFoldersForEmployee(employeeCode: string): EmployeePersonalFolder[] {
  const cleanCode = (employeeCode || '').trim();
  if (!cleanCode) return [];

  try {
    const raw = localStorage.getItem(getPersonalFoldersStorageKey(cleanCode));
    if (raw) {
      const parsed = JSON.parse(raw) as EmployeePersonalFolder[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore parse error
  }

  const initial = [createDefaultPersonalFolder(cleanCode)];
  try {
    localStorage.setItem(getPersonalFoldersStorageKey(cleanCode), JSON.stringify(initial));
  } catch {
    // ignore storage error
  }
  return initial;
}

async function persistPersonalFoldersForEmployee(
  employeeCode: string,
  folders: EmployeePersonalFolder[]
): Promise<EmployeePersonalFolder[]> {
  const cleanCode = employeeCode.trim();
  try {
    localStorage.setItem(getPersonalFoldersStorageKey(cleanCode), JSON.stringify(folders));
  } catch {
    // ignore storage error
  }

  // ซิงค์ขึ้น Supabase (เก็บในตาราง app_settings แถวเฉพาะรหัสพนักงาน เพื่อซิงค์ข้ามอุปกรณ์)
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('app_settings').upsert({
        id: `${SUPABASE_EMP_WORKSPACE_PREFIX}${cleanCode}`,
        hub_title: `Employee Workspace ${cleanCode}`,
        hub_subtitle: 'personal_folders_v1',
        admin_pin: '0000',
        wallpaper_id: 'aurora-night',
        custom_wallpaper_url: JSON.stringify(folders),
        icon_shape: 'squircle',
        grid_columns: 4,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // ignore cloud sync error and keep local
    }
  }

  return folders;
}

export async function createPersonalFolder(
  employeeCode: string,
  input: {
    name: string;
    description?: string;
    color?: string;
    iconName?: string;
  }
): Promise<EmployeePersonalFolder[]> {
  const cleanCode = employeeCode.trim();
  const current = getPersonalFoldersForEmployee(cleanCode);
  const now = new Date().toISOString();

  const newFolder: EmployeePersonalFolder = {
    id: `personal-${cleanCode}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    employeeCode: cleanCode,
    name: input.name.trim() || 'โฟลเดอร์ส่วนตัวใหม่',
    description:
      (input.description || '').trim() ||
      'โฟลเดอร์ส่วนตัวสำหรับเก็บลิงก์และบันทึกช่วยจำเฉพาะพนักงาน',
    color: input.color || '#0ea5e9',
    iconName: input.iconName || 'FolderHeart',
    links: [],
    createdAt: now,
    updatedAt: now,
  };

  return persistPersonalFoldersForEmployee(cleanCode, [...current, newFolder]);
}

export async function updatePersonalFolder(
  employeeCode: string,
  folderId: string,
  updates: {
    name?: string;
    description?: string;
    color?: string;
    iconName?: string;
  }
): Promise<EmployeePersonalFolder[]> {
  const cleanCode = employeeCode.trim();
  const current = getPersonalFoldersForEmployee(cleanCode);
  const now = new Date().toISOString();

  const updated = current.map((folder) =>
    folder.id === folderId
      ? {
          ...folder,
          name: updates.name !== undefined ? updates.name.trim() || folder.name : folder.name,
          description:
            updates.description !== undefined ? updates.description.trim() : folder.description,
          color: updates.color || folder.color,
          iconName: updates.iconName || folder.iconName,
          updatedAt: now,
        }
      : folder
  );

  return persistPersonalFoldersForEmployee(cleanCode, updated);
}

export async function deletePersonalFolder(
  employeeCode: string,
  folderId: string
): Promise<EmployeePersonalFolder[]> {
  const cleanCode = employeeCode.trim();
  const current = getPersonalFoldersForEmployee(cleanCode);
  const filtered = current.filter((f) => f.id !== folderId);
  const next = filtered.length > 0 ? filtered : [createDefaultPersonalFolder(cleanCode)];
  return persistPersonalFoldersForEmployee(cleanCode, next);
}

export async function addLinkToPersonalFolder(
  employeeCode: string,
  folderId: string,
  linkInput: {
    title: string;
    url: string;
    description?: string;
    codeOrTopic?: string;
    badge?: string;
    iconName?: string;
    bgStyle?: string;
  }
): Promise<EmployeePersonalFolder[]> {
  const cleanCode = employeeCode.trim();
  const current = getPersonalFoldersForEmployee(cleanCode);
  const now = new Date().toISOString();

  let cleanUrl = linkInput.url.trim();
  if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = `https://${cleanUrl}`;
  }

  const detected = detectEmployeeLinkAppearance(cleanUrl);

  const newLink: EmployeeLinkItem = {
    id: `plink-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    folderId,
    codeOrTopic: (linkInput.codeOrTopic || 'ส่วนตัว').trim(),
    title: linkInput.title.trim() || cleanUrl,
    url: cleanUrl,
    description:
      (linkInput.description || '').trim() || 'ลิงก์บันทึกไว้ในโฟลเดอร์ส่วนตัวของพนักงาน',
    badge: linkInput.badge || detected.badge,
    iconName: linkInput.iconName || detected.iconName,
    bgStyle: linkInput.bgStyle || detected.bgStyle,
  };

  const updated = current.map((folder) =>
    folder.id === folderId
      ? {
          ...folder,
          links: [...folder.links, newLink],
          updatedAt: now,
        }
      : folder
  );

  return persistPersonalFoldersForEmployee(cleanCode, updated);
}

export async function updateLinkInPersonalFolder(
  employeeCode: string,
  folderId: string,
  linkId: string,
  updates: Partial<EmployeeLinkItem>
): Promise<EmployeePersonalFolder[]> {
  const cleanCode = employeeCode.trim();
  const current = getPersonalFoldersForEmployee(cleanCode);
  const now = new Date().toISOString();

  const updated = current.map((folder) => {
    if (folder.id !== folderId) return folder;
    return {
      ...folder,
      links: folder.links.map((item) => {
        if (item.id !== linkId) return item;
        let nextUrl = updates.url !== undefined ? updates.url.trim() : item.url;
        if (nextUrl && !/^https?:\/\//i.test(nextUrl)) {
          nextUrl = `https://${nextUrl}`;
        }
        return {
          ...item,
          ...updates,
          url: nextUrl,
        };
      }),
      updatedAt: now,
    };
  });

  return persistPersonalFoldersForEmployee(cleanCode, updated);
}

export async function removeLinkFromPersonalFolder(
  employeeCode: string,
  folderId: string,
  linkId: string
): Promise<EmployeePersonalFolder[]> {
  const cleanCode = employeeCode.trim();
  const current = getPersonalFoldersForEmployee(cleanCode);
  const now = new Date().toISOString();

  const updated = current.map((folder) =>
    folder.id === folderId
      ? {
          ...folder,
          links: folder.links.filter((l) => l.id !== linkId),
          updatedAt: now,
        }
      : folder
  );

  return persistPersonalFoldersForEmployee(cleanCode, updated);
}

// ============================================================================
// ส่วนที่ 2: ระบบสมุดโน้ตในโฟลเดอร์ (Folder Notes - รองรับทุกโฟลเดอร์)
// ============================================================================
export function getAllFolderNotes(): FolderNoteItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FOLDER_NOTES);
    if (raw) {
      const parsed = JSON.parse(raw) as FolderNoteItem[];
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore parse error
  }
  return [];
}

async function persistAllFolderNotes(notes: FolderNoteItem[]): Promise<FolderNoteItem[]> {
  try {
    localStorage.setItem(STORAGE_KEY_FOLDER_NOTES, JSON.stringify(notes));
  } catch {
    // ignore storage error
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('app_settings').upsert({
        id: SUPABASE_NOTES_ROW_ID,
        hub_title: 'Smart Hub Folder Notes',
        hub_subtitle: 'folder_notes_v1',
        admin_pin: '0000',
        wallpaper_id: 'aurora-night',
        custom_wallpaper_url: JSON.stringify(notes),
        icon_shape: 'squircle',
        grid_columns: 4,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // ignore cloud sync error
    }
  }

  return notes;
}

export function getFolderNotes(folderId: string, employeeCode?: string): FolderNoteItem[] {
  const cleanCode = (employeeCode || 'public').trim();
  const all = getAllFolderNotes();

  return all
    .filter((note) => {
      if (note.folderId !== folderId) return false;
      // แสดงโน้ตที่เป็นแบบแชร์ในโฟลเดอร์ หรือโน้ตส่วนตัวของรหัสพนักงานคนนั้น
      return Boolean(note.isShared) || note.employeeCode === cleanCode || cleanCode === 'admin';
    })
    .sort((a, b) => {
      if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
        return a.isPinned ? -1 : 1;
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });
}

export function getFolderNotesCountMap(employeeCode?: string): Record<string, number> {
  const cleanCode = (employeeCode || 'public').trim();
  const all = getAllFolderNotes();
  const counts: Record<string, number> = {};

  for (const note of all) {
    if (Boolean(note.isShared) || note.employeeCode === cleanCode || cleanCode === 'admin') {
      counts[note.folderId] = (counts[note.folderId] || 0) + 1;
    }
  }
  return counts;
}

export async function upsertFolderNote(input: {
  id?: string;
  folderId: string;
  employeeCode: string;
  authorName: string;
  title: string;
  content: string;
  color?: FolderNoteColor;
  isPinned?: boolean;
  isShared?: boolean;
}): Promise<FolderNoteItem[]> {
  const all = getAllFolderNotes();
  const now = new Date().toISOString();

  const existingIdx = input.id ? all.findIndex((n) => n.id === input.id) : -1;

  if (existingIdx >= 0) {
    const updatedNote: FolderNoteItem = {
      ...all[existingIdx],
      title: input.title.trim() || 'โน้ตช่วยจำ',
      content: input.content.trim(),
      color: input.color || all[existingIdx].color || 'amber',
      isPinned: input.isPinned ?? all[existingIdx].isPinned,
      isShared: input.isShared ?? all[existingIdx].isShared,
      updatedAt: now,
    };
    const next = [...all];
    next[existingIdx] = updatedNote;
    await persistAllFolderNotes(next);
    return getFolderNotes(input.folderId, input.employeeCode);
  }

  const newNote: FolderNoteItem = {
    id: `fnote-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    folderId: input.folderId,
    employeeCode: (input.employeeCode || 'public').trim(),
    authorName: (input.authorName || 'พนักงาน').trim(),
    title: input.title.trim() || 'โน้ตช่วยจำ',
    content: input.content.trim(),
    color: input.color || 'amber',
    isPinned: Boolean(input.isPinned),
    isShared: input.isShared !== undefined ? input.isShared : false,
    createdAt: now,
    updatedAt: now,
  };

  const next = [newNote, ...all];
  await persistAllFolderNotes(next);
  return getFolderNotes(input.folderId, input.employeeCode);
}

export async function deleteFolderNote(
  noteId: string,
  folderId: string,
  employeeCode?: string
): Promise<FolderNoteItem[]> {
  const all = getAllFolderNotes();
  const filtered = all.filter((n) => n.id !== noteId);
  await persistAllFolderNotes(filtered);
  return getFolderNotes(folderId, employeeCode);
}

export async function togglePinFolderNote(
  noteId: string,
  folderId: string,
  employeeCode?: string
): Promise<FolderNoteItem[]> {
  const all = getAllFolderNotes();
  const now = new Date().toISOString();
  const next = all.map((n) =>
    n.id === noteId ? { ...n, isPinned: !n.isPinned, updatedAt: now } : n
  );
  await persistAllFolderNotes(next);
  return getFolderNotes(folderId, employeeCode);
}

// ============================================================================
// ส่วนที่ 3: ซิงค์ข้อมูลโฟลเดอร์ส่วนตัวและโน้ตจาก Supabase Cloud
// ============================================================================
export async function syncEmployeeWorkspaceFromCloud(employeeCode?: string): Promise<{
  personalFolders: EmployeePersonalFolder[];
  notes: FolderNoteItem[];
}> {
  const cleanCode = (employeeCode || '').trim();
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      personalFolders: cleanCode ? getPersonalFoldersForEmployee(cleanCode) : [],
      notes: getAllFolderNotes(),
    };
  }

  try {
    const idsToFetch = [SUPABASE_NOTES_ROW_ID];
    if (cleanCode) {
      idsToFetch.push(`${SUPABASE_EMP_WORKSPACE_PREFIX}${cleanCode}`);
    }

    const { data } = await supabase
      .from('app_settings')
      .select('id, custom_wallpaper_url')
      .in('id', idsToFetch);

    if (Array.isArray(data)) {
      for (const row of data) {
        if (row.id === SUPABASE_NOTES_ROW_ID && row.custom_wallpaper_url) {
          try {
            const cloudNotes = JSON.parse(row.custom_wallpaper_url) as FolderNoteItem[];
            if (Array.isArray(cloudNotes)) {
              localStorage.setItem(STORAGE_KEY_FOLDER_NOTES, JSON.stringify(cloudNotes));
            }
          } catch {
            // ignore invalid json
          }
        }
        if (
          cleanCode &&
          row.id === `${SUPABASE_EMP_WORKSPACE_PREFIX}${cleanCode}` &&
          row.custom_wallpaper_url
        ) {
          try {
            const cloudFolders = JSON.parse(
              row.custom_wallpaper_url
            ) as EmployeePersonalFolder[];
            if (Array.isArray(cloudFolders) && cloudFolders.length > 0) {
              localStorage.setItem(
                getPersonalFoldersStorageKey(cleanCode),
                JSON.stringify(cloudFolders)
              );
            }
          } catch {
            // ignore invalid json
          }
        }
      }
    }
  } catch {
    // ignore network error and fall back to local cache
  }

  return {
    personalFolders: cleanCode ? getPersonalFoldersForEmployee(cleanCode) : [],
    notes: getAllFolderNotes(),
  };
}

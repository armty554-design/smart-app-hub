import {
  EmployeeLinkItem,
  EmployeeScheduleItem,
  EmployeeSheetFolder,
} from '../types/app';
import {
  EMPLOYEE_LINKS_DEFAULT_URL,
  EMPLOYEE_LINKS_SPREADSHEET_ID,
  EMPLOYEE_SCHEDULE_ITEMS,
  EMPLOYEE_SHEET_FOLDERS_FALLBACK,
} from '../constants/employeeLinksFallback';

const STORAGE_KEY_EMPLOYEE_FOLDERS = 'smart_hub_employee_folders_v1';

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
}

export function searchAcrossEmployeeFolders(
  query: string,
  folders: EmployeeSheetFolder[] = getEmployeeFolders(),
  includeArchives = true
): EmployeeSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: EmployeeSearchResult[] = [];
  for (const folder of folders) {
    if (!includeArchives && folder.isArchive) continue;
    for (const link of folder.links) {
      const hay = `${folder.sheetName} ${link.codeOrTopic} ${link.subTopic || ''} ${link.title} ${
        link.description
      } ${link.badge || ''} ${link.url}`.toLowerCase();
      if (hay.includes(q)) {
        results.push({ folder, link });
      }
    }
  }
  return results;
}

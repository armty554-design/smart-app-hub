import { EmployeeProfile } from '../types/app';
import {
  DEFAULT_EMPLOYEE_SHEET_GID,
  DEFAULT_EMPLOYEE_SHEET_ID,
  DEFAULT_EMPLOYEE_SHEET_NAME,
  DEFAULT_EMPLOYEE_SHEET_URL,
  FALLBACK_EMPLOYEES,
} from '../constants/employeesFallback';

const LS_EMPLOYEES_CACHE_KEY = 'app_hub_employees_cache_v1';
const LS_CURRENT_EMPLOYEE_KEY = 'app_hub_current_employee_v1';
const LS_SHEET_URL_KEY = 'app_hub_employee_sheet_url_v1';

/**
 * แยกบรรทัด CSV โดยรองรับเครื่องหมายอัญประกาศ ("...")
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * แปลงข้อความ CSV จากแผ่นงาน "พนักงาน" เป็นรายการ EmployeeProfile[]
 */
export function parseEmployeesFromCsv(csvText: string): EmployeeProfile[] {
  const lines = csvText.split(/\r?\n/);
  const employees: EmployeeProfile[] = [];
  const seenCodes = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const cols = parseCsvLine(rawLine);
    const code = (cols[1] || '').trim();

    // รหัสพนักงานเป็นตัวเลข (เช่น 171785, 274176, 180282)
    if (!code || !/^\d{3,10}$/.test(code)) continue;
    if (seenCodes.has(code)) continue;
    seenCodes.add(code);

    const seq = (cols[0] || '').replace(/[^\d]/g, '').trim();
    const zone = (cols[3] || '').trim();
    const branch = (cols[4] || '').trim();
    const prefix = (cols[5] || '').trim();
    const firstName = (cols[6] || '').trim();
    const lastName = (cols[7] || '').trim();
    const position = (cols[8] || '').trim() || 'เจ้าหน้าที่ประจำสาขา';
    const startDate = (cols[9] || '').trim();

    const fullName = `${prefix}${firstName}${lastName ? ' ' + lastName : ''}`.trim();
    if (!firstName && !fullName) continue;

    employees.push({
      seq,
      code,
      zone,
      branch,
      prefix,
      firstName,
      lastName,
      fullName: fullName || code,
      position,
      startDate,
    });
  }

  return employees;
}

/**
 * ดึงค่า URL ของ Google Sheets แผ่นงานพนักงานที่ตั้งค่าไว้
 */
export function getEmployeeSheetUrl(): string {
  try {
    const saved = localStorage.getItem(LS_SHEET_URL_KEY);
    if (saved && saved.trim().includes('docs.google.com/spreadsheets')) {
      return saved.trim();
    }
  } catch {
    // ignore
  }
  return DEFAULT_EMPLOYEE_SHEET_URL;
}

export function setEmployeeSheetUrl(url: string): void {
  try {
    if (!url.trim()) {
      localStorage.removeItem(LS_SHEET_URL_KEY);
    } else {
      localStorage.setItem(LS_SHEET_URL_KEY, url.trim());
    }
  } catch {
    // ignore
  }
}

/**
 * แปลงลิงก์ Google Sheets ปกติ ให้เป็นลิงก์ดึงข้อมูล CSV แบบรองรับ CORS (gviz/tq)
 */
export function buildGoogleSheetCsvEndpoints(rawSheetUrl?: string): string[] {
  const url = (rawSheetUrl || getEmployeeSheetUrl()).trim();
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = url.match(/[?#&]gid=(\d+)/);

  const sheetId = idMatch ? idMatch[1] : DEFAULT_EMPLOYEE_SHEET_ID;
  const gid = gidMatch ? gidMatch[1] : DEFAULT_EMPLOYEE_SHEET_GID;

  return [
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
      DEFAULT_EMPLOYEE_SHEET_NAME
    )}`,
  ];
}

/**
 * อ่านรายชื่อพนักงานจาก Cache ในเครื่อง หรือใช้ข้อมูลเริ่มต้น 176 คนจากแผ่นงาน "พนักงาน"
 */
export function getCachedEmployees(): EmployeeProfile[] {
  try {
    const raw = localStorage.getItem(LS_EMPLOYEES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as EmployeeProfile[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return FALLBACK_EMPLOYEES;
}

/**
 * ดึงข้อมูลรายชื่อพนักงานล่าสุดจาก Google Sheets แบบเรียลไทม์
 */
export async function syncEmployeesFromGoogleSheet(customSheetUrl?: string): Promise<{
  employees: EmployeeProfile[];
  fromLiveSheet: boolean;
  error?: string;
}> {
  if (import.meta.env.MODE === 'test') {
    return { employees: FALLBACK_EMPLOYEES, fromLiveSheet: false };
  }

  const endpoints = buildGoogleSheetCsvEndpoints(customSheetUrl);

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { cache: 'no-store' });
      if (!res.ok) continue;
      const csvText = await res.text();
      const parsed = parseEmployeesFromCsv(csvText);
      if (parsed.length > 0) {
        localStorage.setItem(LS_EMPLOYEES_CACHE_KEY, JSON.stringify(parsed));
        return { employees: parsed, fromLiveSheet: true };
      }
    } catch {
      // ลอง endpoint ถัดไป
    }
  }

  const cached = getCachedEmployees();
  return {
    employees: cached,
    fromLiveSheet: false,
    error: 'ใช้ข้อมูลสำรองล่าสุดในระบบ (ตรวจสอบการแชร์ลิงก์ Google Sheets แบบผู้มีลิงก์ดูได้)',
  };
}

/**
 * ค้นหาพนักงานจากรหัสพนักงาน
 */
export function findEmployeeByCode(
  code: string,
  employees: EmployeeProfile[] = getCachedEmployees()
): EmployeeProfile | null {
  const clean = code.trim();
  if (!clean) return null;
  return employees.find((emp) => emp.code.trim() === clean) || null;
}

/**
 * อ่านข้อมูลพนักงานที่ล็อกอินค้างไว้ในเครื่อง
 */
export function getLoggedInEmployee(): EmployeeProfile | null {
  try {
    const raw = localStorage.getItem(LS_CURRENT_EMPLOYEE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as EmployeeProfile;
      if (parsed && parsed.code) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveLoggedInEmployee(employee: EmployeeProfile | null): void {
  try {
    if (!employee) {
      localStorage.removeItem(LS_CURRENT_EMPLOYEE_KEY);
    } else {
      localStorage.setItem(LS_CURRENT_EMPLOYEE_KEY, JSON.stringify(employee));
    }
  } catch {
    // ignore
  }
}

/**
 * คำนวณอายุงานจากวันที่เริ่มงาน (รูปแบบ DD/MM/YYYY)
 */
export function calculateWorkTenure(startDateStr?: string): string {
  if (!startDateStr || !startDateStr.includes('/')) return '-';
  const parts = startDateStr.trim().split('/');
  if (parts.length !== 3) return '-';

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  let year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return '-';

  // รองรับทั้งปี พ.ศ. และ ค.ศ.
  if (year > 2400) {
    year -= 543;
  }

  const start = new Date(year, month, day);
  const now = new Date();
  if (start > now) {
    return 'เริ่มงานเร็วๆ นี้';
  }

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years <= 0 && months <= 0) {
    return 'น้อยกว่า 1 เดือน';
  }
  const yText = years > 0 ? `${years} ปี` : '';
  const mText = months > 0 ? `${months} เดือน` : '';
  return `${yText} ${mText}`.trim();
}

// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLocalLinks,
  upsertAppLink,
  deleteAppLink,
  reorderAppLinks,
  getLocalCategories,
  upsertCategory,
  deleteCategory,
  getLocalSettings,
  updateHubSettings,
} from '../services/linkService';
import { AppLink, Category } from '../types/app';
import { ICON_LIBRARY, BG_COLOR_PRESETS } from '../constants/icons';
import { WALLPAPER_PRESETS } from '../constants/wallpapers';
import {
  getCachedEmployees,
  findEmployeeByCode,
  parseEmployeesFromCsv,
  calculateWorkTenure,
} from '../services/employeeService';
import {
  addLinkToEmployeeSheetFolder,
  addLinkToPersonalFolder,
  buildFolderShareText,
  buildFolderShareUrl,
  buildLinkItemShareText,
  createPersonalFolder,
  deleteFolderNote,
  formatLinkUpdatedTime,
  getEmployeeFolders,
  getEmployeeScheduleItems,
  getFolderNotes,
  getPersonalFoldersForEmployee,
  removeLinkFromPersonalFolder,
  searchAcrossEmployeeFolders,
  togglePinFolderNote,
  updateEmployeeSheetFolderLink,
  upsertFolderNote,
} from '../services/employeeLinksService';

describe('App Hub Launcher - Link & Icon Studio Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads default Google Apps Script links on first visit', () => {
    const links = getLocalLinks();
    expect(links.length).toBeGreaterThanOrEqual(8);
    expect(links.some((l) => l.url.includes('script.google.com'))).toBe(true);
    expect(links.filter((l) => l.is_dock).length).toBe(4);
  });

  it('creates a new Google Apps Script link with custom icon and gradient background', async () => {
    const initial = getLocalLinks();
    const newGasLink: AppLink = {
      id: 'gas-custom-1',
      title: 'ระบบแจ้งลาออนไลน์',
      url: 'https://script.google.com/macros/s/AKfycbx-leave-system/exec',
      description: 'ฟอร์มยื่นใบลาพร้อมอนุมัติผ่าน LINE',
      category_id: 'hr-team',
      icon_type: 'library',
      icon_name: 'CalendarCheck',
      icon_url: '',
      image_fit: 'cover',
      bg_style: BG_COLOR_PRESETS[2].value,
      icon_color: '#ffffff',
      badge_text: 'GAS',
      is_dock: false,
      sort_order: initial.length + 1,
    };

    const afterAdd = await upsertAppLink(newGasLink, initial);
    expect(afterAdd.length).toBe(initial.length + 1);
    const saved = afterAdd.find((l) => l.id === 'gas-custom-1');
    expect(saved?.title).toBe('ระบบแจ้งลาออนไลน์');
    expect(saved?.icon_name).toBe('CalendarCheck');
    expect(saved?.badge_text).toBe('GAS');
  });

  it('supports custom uploaded image / Image URL icons', async () => {
    const initial = getLocalLinks();
    const imgLink: AppLink = {
      id: 'gas-image-icon',
      title: 'ระบบใบเสนอราคา',
      url: 'https://script.google.com/macros/s/AKfycbx-quote/exec',
      description: 'ออกใบเสนอราคา PDF อัตโนมัติ',
      category_id: 'finance-doc',
      icon_type: 'image',
      icon_name: 'FileText',
      icon_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      image_fit: 'contain',
      bg_style: '#ffffff',
      icon_color: '#000000',
      is_dock: true,
      sort_order: initial.length + 1,
    };

    const updated = await upsertAppLink(imgLink, initial);
    const found = updated.find((l) => l.id === 'gas-image-icon');
    expect(found?.icon_type).toBe('image');
    expect(found?.icon_url.startsWith('data:image/png')).toBe(true);
    expect(found?.is_dock).toBe(true);
  });

  it('reorders app links and updates sort_order sequentially (Drag & Drop)', async () => {
    const initial = getLocalLinks();
    const reversed = [...initial].reverse();
    const reordered = await reorderAppLinks(reversed);

    expect(reordered[0].id).toBe(initial[initial.length - 1].id);
    expect(reordered[0].sort_order).toBe(1);
    expect(reordered[reordered.length - 1].sort_order).toBe(initial.length);
  });

  it('deletes an app link and re-indexes sort_order without resurrecting defaults when all are deleted', async () => {
    let current = getLocalLinks();
    const targetId = current[0].id;
    const remaining = await deleteAppLink(targetId, current);

    expect(remaining.length).toBe(current.length - 1);
    expect(remaining.some((l) => l.id === targetId)).toBe(false);
    expect(remaining[0].sort_order).toBe(1);

    // Delete all remaining links one by one
    current = remaining;
    for (const item of [...current]) {
      current = await deleteAppLink(item.id, current);
    }
    expect(current.length).toBe(0);
    // Subsequent reads must stay empty and never resurrect DEFAULT_APP_LINKS
    expect(getLocalLinks().length).toBe(0);
  });

  it('manages categories, folder layout modes (2-column detail/cards/icons), and admin PIN settings', async () => {
    const cats = getLocalCategories();
    const newCat: Category = {
      id: 'cat-ai',
      name: 'เครื่องมือ AI',
      icon: 'Sparkles',
      color: '#ec4899',
      layout: 'detail-2col',
      sort_order: cats.length + 1,
    };

    const withAdded = await upsertCategory(newCat, cats);
    const savedCat = withAdded.find((c) => c.id === 'cat-ai');
    expect(savedCat).toBeDefined();
    expect(savedCat?.layout).toBe('detail-2col');

    const withUpdatedLayout = await upsertCategory({ ...newCat, layout: 'icons' }, withAdded);
    expect(withUpdatedLayout.find((c) => c.id === 'cat-ai')?.layout).toBe('icons');

    const afterDelete = await deleteCategory('cat-ai', withUpdatedLayout);
    expect(afterDelete.some((c) => c.id === 'cat-ai')).toBe(false);

    const settings = getLocalSettings();
    const updatedSettings = await updateHubSettings({
      ...settings,
      admin_pin: '248900',
      wallpaper_id: 'sky-white',
      hub_title: 'My Company GAS Portal',
      default_folder_layout: 'detail-2col',
    });
    expect(updatedSettings.admin_pin).toBe('248900');
    expect(updatedSettings.wallpaper_id).toBe('sky-white');
    expect(updatedSettings.hub_title).toBe('My Company GAS Portal');
    expect(updatedSettings.default_folder_layout).toBe('detail-2col');
    expect(getLocalSettings().admin_pin).toBe('248900');
    expect(getLocalSettings().wallpaper_id).toBe('sky-white');
  });

  it('provides a rich icon library, background presets, and both Light (Sky-White) and Dark themes', () => {
    expect(ICON_LIBRARY.length).toBeGreaterThan(80);
    expect(BG_COLOR_PRESETS.length).toBeGreaterThan(15);
    const lightThemes = WALLPAPER_PRESETS.filter((w) => w.isLight);
    const darkThemes = WALLPAPER_PRESETS.filter((w) => !w.isLight);
    expect(lightThemes.some((w) => w.id === 'sky-white')).toBe(true);
    expect(lightThemes.length).toBeGreaterThanOrEqual(5);
    expect(darkThemes.length).toBeGreaterThanOrEqual(6);
  });

  it('authenticates employees by Employee ID from the "พนักงาน" Google Sheet dataset', () => {
    const employees = getCachedEmployees();
    expect(employees.length).toBeGreaterThanOrEqual(170);

    // ตรวจสอบรหัสพนักงานจริงจากแผ่นงาน "พนักงาน"
    const emp1 = findEmployeeByCode('171785', employees);
    expect(emp1).toBeDefined();
    expect(emp1?.firstName).toBe('หทัยวรรณ');
    expect(emp1?.branch).toBe('บางพลี');
    expect(emp1?.position).toBe('ผู้จัดการสาขา');

    const emp1b = findEmployeeByCode('171781', employees);
    expect(emp1b).toBeDefined();
    expect(emp1b?.firstName).toBe('ปรีชา');

    const emp2 = findEmployeeByCode('110208', employees);
    expect(emp2).toBeDefined();
    expect(emp2?.branch).toBe('สำนักงาน');

    // ทดสอบการแปลง CSV จาก Google Sheets
    const sampleCsv = `"ลำดับ","รหัส","","zone","สาขา","คำนำหน้า","ชื่อ","สกุล","ตำแหน่ง","วันที่เริ่มงาน"\n"1","999888","","A","สุขุมวิท 50","นาย","ทดสอบ","ระบบ","ผู้จัดการสาขา","01/05/2020"`;
    const parsed = parseEmployeesFromCsv(sampleCsv);
    expect(parsed.length).toBe(1);
    expect(parsed[0].code).toBe('999888');
    expect(parsed[0].fullName).toBe('นายทดสอบ ระบบ');
    expect(calculateWorkTenure('01/05/2020')).toContain('ปี');
  });

  it('organizes employee-only links into 17 worksheet folders with descriptions from รวม Link DARUNEE', () => {
    const folders = getEmployeeFolders();
    expect(folders.length).toBe(17);

    const std69 = folders.find((f) => f.sheetName === 'Link มาตรฐาน 69');
    expect(std69).toBeDefined();
    expect(std69?.links.length).toBeGreaterThanOrEqual(55);
    expect(std69?.links.every((l) => Boolean(l.title && l.url && l.description))).toBe(true);

    const appScriptFolder = folders.find((f) => f.sheetName === 'AppScript');
    expect(appScriptFolder).toBeDefined();
    expect(appScriptFolder?.links.length).toBe(7);

    const powerBiFolder = folders.find((f) => f.sheetName === 'List power BI');
    expect(powerBiFolder).toBeDefined();
    expect(powerBiFolder?.links.length).toBeGreaterThanOrEqual(45);

    const schedule = getEmployeeScheduleItems();
    expect(schedule.length).toBeGreaterThanOrEqual(15);

    const searchRes = searchAcrossEmployeeFolders('จัดส่งตรงเวลา', folders);
    expect(searchRes.length).toBeGreaterThan(0);
  });

  it('supports personal folders per employee and folder notes (both private and shared)', async () => {
    // 1. พนักงานแต่ละคนมีโฟลเดอร์ส่วนตัวแยกตามรหัสพนักงาน
    const emp1Folders = getPersonalFoldersForEmployee('171785');
    expect(emp1Folders.length).toBe(1);
    expect(emp1Folders[0].employeeCode).toBe('171785');

    const afterCreate = await createPersonalFolder('171785', {
      name: 'งานส่งรายงานสาขาบางพลี',
      description: 'ลิงก์ที่ใช้ส่งงานทุกเช้า',
      color: '#0ea5e9',
    });
    expect(afterCreate.length).toBe(2);

    // พนักงานอีกคน (110208) ต้องไม่เห็นโฟลเดอร์ส่วนตัวของ 171785
    const emp2Folders = getPersonalFoldersForEmployee('110208');
    expect(emp2Folders.length).toBe(1);
    expect(emp2Folders.some((f) => f.name === 'งานส่งรายงานสาขาบางพลี')).toBe(false);

    // 2. เพิ่มและลบลิงก์ในโฟลเดอร์ส่วนตัวของพนักงาน
    const targetFolderId = afterCreate[1].id;
    const withLink = await addLinkToPersonalFolder('171785', targetFolderId, {
      title: 'ชีตสรุปงานประจำวันบางพลี',
      url: 'https://docs.google.com/spreadsheets/d/test-bangplee',
      codeOrTopic: 'งานเช้า',
      description: 'อัปเดตก่อน 10:00 น.',
    });
    const updatedFolder = withLink.find((f) => f.id === targetFolderId);
    expect(updatedFolder?.links.length).toBe(1);
    expect(updatedFolder?.links[0].badge).toBe('Google Sheet');

    const afterRemoveLink = await removeLinkFromPersonalFolder(
      '171785',
      targetFolderId,
      updatedFolder!.links[0].id
    );
    expect(afterRemoveLink.find((f) => f.id === targetFolderId)?.links.length).toBe(0);

    // 3. เพิ่มโน้ตในโฟลเดอร์ (ทดสอบทั้งโน้ตส่วนตัว และโน้ตแชร์ในโฟลเดอร์)
    await upsertFolderNote({
      folderId: 'sheet-link-69',
      employeeCode: '171785',
      authorName: 'หทัยวรรณ (171785)',
      title: 'โน้ตส่วนตัวของฉัน',
      content: 'รหัสผ่านเข้าดูรายงานสาขา',
      color: 'amber',
      isShared: false,
    });

    await upsertFolderNote({
      folderId: 'sheet-link-69',
      employeeCode: '171785',
      authorName: 'หทัยวรรณ (171785)',
      title: 'โน้ตแจ้งเตือนส่วนกลาง',
      content: 'ส่งขอยกเว้นภายในวันที่ 3 ของเดือนถัดไป',
      color: 'emerald',
      isShared: true,
    });

    // เจ้าของรหัส 171785 เห็นทั้ง 2 โน้ต
    const notesFor171785 = getFolderNotes('sheet-link-69', '171785');
    expect(notesFor171785.length).toBe(2);

    // พนักงานรหัสอื่น (110208) เห็นเฉพาะโน้ตที่แชร์ในโฟลเดอร์เท่านั้น
    const notesFor110208 = getFolderNotes('sheet-link-69', '110208');
    expect(notesFor110208.length).toBe(1);
    expect(notesFor110208[0].title).toBe('โน้ตแจ้งเตือนส่วนกลาง');

    // ปักหมุดและลบโน้ต
    const pinned = await togglePinFolderNote(
      notesFor171785[0].id,
      'sheet-link-69',
      '171785'
    );
    expect(pinned.find((n) => n.id === notesFor171785[0].id)?.isPinned).toBe(true);

    const afterDeleteNote = await deleteFolderNote(
      notesFor171785[0].id,
      'sheet-link-69',
      '171785'
    );
    expect(afterDeleteNote.length).toBe(1);
  });

  it('builds dedicated folder share URLs, tracks link update timestamps, and formats copy-to-share messages', async () => {
    // 1. ทดสอบการสร้างลิงก์เฉพาะประจำโฟลเดอร์ (?folder=... และ ?cat=...)
    const sheetShareUrl = buildFolderShareUrl({
      folderId: 'sheet-link-69',
      employeeCode: '171785',
    });
    expect(sheetShareUrl).toContain('folder=sheet-link-69');

    const personalShareUrl = buildFolderShareUrl({
      folderId: 'personal-171785-default',
      employeeCode: '171785',
    });
    expect(personalShareUrl).toContain('folder=personal-171785-default');
    expect(personalShareUrl).toContain('emp=171785');

    const catShareUrl = buildFolderShareUrl({
      categoryId: 'work-script',
    });
    expect(catShareUrl).toContain('cat=work-script');

    // 2. ทดสอบการเปลี่ยนลิงก์ในโฟลเดอร์แผ่นงานพร้อมบันทึกเวลาเปลี่ยนลิงก์ล่าสุด (updatedAt & updatedBy)
    const initialFolders = getEmployeeFolders();
    const targetFolder = initialFolders.find((f) => f.sheetName === 'Link มาตรฐาน 69')!;
    const targetFolderId = targetFolder.id;
    const firstLink = targetFolder.links[0];

    const updatedFolders = await updateEmployeeSheetFolderLink(
      targetFolderId,
      firstLink.id,
      {
        title: `${firstLink.title} (อัปเดตลิงก์ใหม่)`,
        url: 'https://docs.google.com/spreadsheets/d/updated-link-2026/edit',
        codeOrTopic: firstLink.codeOrTopic,
        description: 'เปลี่ยนลิงก์ใหม่สำหรับไตรมาสล่าสุด',
        updatedBy: 'หทัยวรรณ (171785)',
      }
    );

    const modifiedLink = updatedFolders
      .find((f) => f.id === targetFolderId)
      ?.links.find((l) => l.id === firstLink.id);

    expect(modifiedLink?.url).toBe('https://docs.google.com/spreadsheets/d/updated-link-2026/edit');
    expect(modifiedLink?.updatedAt).toBeDefined();
    expect(modifiedLink?.updatedBy).toBe('หทัยวรรณ (171785)');
    expect(formatLinkUpdatedTime(modifiedLink?.updatedAt)).not.toBeNull();

    // 3. ทดสอบการเพิ่มลิงก์ใหม่เข้าไปในโฟลเดอร์แผ่นงานและตรวจสอบข้อความก็อปส่งต่อ
    const afterAddCustom = await addLinkToEmployeeSheetFolder(targetFolderId, {
      title: 'ลิงก์เฉพาะกิจประจำเดือน',
      url: 'https://script.google.com/macros/s/AKfycbx-special/exec',
      codeOrTopic: 'KPI พิเศษ',
      description: 'สำหรับส่งรายงานเฉพาะกิจ',
      updatedBy: 'หทัยวรรณ (171785)',
    });

    const folderAfterAdd = afterAddCustom.find((f) => f.id === targetFolderId)!;
    expect(folderAfterAdd.links[0].title).toBe('ลิงก์เฉพาะกิจประจำเดือน');
    expect(folderAfterAdd.links[0].isCustomAdded).toBe(true);
    expect(folderAfterAdd.links[0].updatedAt).toBeDefined();

    const folderShareMsg = buildFolderShareText({
      folderName: folderAfterAdd.sheetName,
      description: folderAfterAdd.description,
      shareUrl: sheetShareUrl,
      linkCount: folderAfterAdd.links.length,
    });
    expect(folderShareMsg).toContain('Link มาตรฐาน 69');
    expect(folderShareMsg).toContain('folder=sheet-link-69');

    const linkShareMsg = buildLinkItemShareText({
      folderName: folderAfterAdd.sheetName,
      title: modifiedLink!.title,
      url: modifiedLink!.url,
      description: modifiedLink!.description,
      updatedAt: modifiedLink!.updatedAt,
      updatedBy: modifiedLink!.updatedBy,
    });
    expect(linkShareMsg).toContain('https://docs.google.com/spreadsheets/d/updated-link-2026/edit');
    expect(linkShareMsg).toContain('เปลี่ยนลิงก์ล่าสุดเมื่อ');
  });
});

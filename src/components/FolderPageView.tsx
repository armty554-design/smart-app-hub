import React, { useState, useEffect } from 'react';
import {
  AppLink,
  Category,
  EmployeeLinkItem,
  EmployeePersonalFolder,
  EmployeeProfile,
  EmployeeSheetFolder,
  IconShape,
} from '../types/app';
import {
  addLinkToEmployeeSheetFolder,
  addLinkToPersonalFolder,
  buildFolderShareText,
  buildFolderShareUrl,
  buildLinkItemShareText,
  deleteLinkFromEmployeeSheetFolder,
  formatLinkUpdatedTime,
  getEmployeeLinksSheetUrl,
  removeLinkFromPersonalFolder,
  updateEmployeeSheetFolderLink,
  updateLinkInPersonalFolder,
  updatePersonalFolder,
} from '../services/employeeLinksService';
import { IconRenderer } from './IconRenderer';
import { FolderNotesSection } from './FolderNotesSection';
import {
  ArrowLeft,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Search,
  Plus,
  Pencil,
  Trash2,
  BookmarkPlus,
  Clock,
  FileSpreadsheet,
  Folder,
  Star,
  Lock,
  X,
  CheckCircle2,
  Link2,
  FolderOpen,
} from 'lucide-react';

interface FolderPageViewProps {
  mode: 'employee-sheet' | 'employee-personal' | 'category';
  sheetFolder?: EmployeeSheetFolder | null;
  personalFolder?: EmployeePersonalFolder | null;
  category?: Category | null;
  categoryLinks?: AppLink[];
  allSheetFolders: EmployeeSheetFolder[];
  allPersonalFolders: EmployeePersonalFolder[];
  allCategories: Category[];
  currentEmployee: EmployeeProfile | null;
  iconShape: IconShape;
  isLightTheme: boolean;
  isEditMode: boolean;
  onBackToHome: () => void;
  onSwitchFolder: (target: { folderId?: string; categoryId?: string }) => void;
  onRefreshWorkspace: () => void;
  onAddCategoryLink?: (categoryId: string) => void;
  onEditCategoryLink?: (link: AppLink) => void;
  onDeleteCategoryLink?: (link: AppLink) => void;
}

export const FolderPageView: React.FC<FolderPageViewProps> = ({
  mode,
  sheetFolder,
  personalFolder,
  category,
  categoryLinks = [],
  allSheetFolders,
  allPersonalFolders,
  allCategories,
  currentEmployee,
  iconShape,
  isLightTheme,
  isEditMode,
  onBackToHome,
  onSwitchFolder,
  onRefreshWorkspace,
  onAddCategoryLink,
  onEditCategoryLink,
  onDeleteCategoryLink,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [copiedFolderUrl, setCopiedFolderUrl] = useState(false);
  const [copiedFolderSummary, setCopiedFolderSummary] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState('');

  // ฟอร์มเพิ่มหรือเปลี่ยนลิงก์เฉพาะในโฟลเดอร์
  const [isLinkFormOpen, setIsLinkFormOpen] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [descInput, setDescInput] = useState('');

  // ฟอร์มแก้ไขชื่อโฟลเดอร์ส่วนตัว
  const [isEditingFolderMeta, setIsEditingFolderMeta] = useState(false);
  const [folderNameEdit, setFolderNameEdit] = useState('');
  const [folderDescEdit, setFolderDescEdit] = useState('');

  // สิทธิ์การแก้ไข: พนักงานทั่วไปแก้ไขได้เฉพาะใน "โฟลเดอร์ส่วนตัว" เท่านั้น ส่วนกลางต้องเปิดโหมดแอดมิน (isEditMode)
  const canManageCurrentFolder =
    mode === 'employee-personal' ? Boolean(currentEmployee) : isEditMode;

  const activeFolderId =
    mode === 'employee-personal'
      ? personalFolder?.id || ''
      : mode === 'employee-sheet'
      ? sheetFolder?.id || ''
      : category?.id || '';

  const activeFolderName =
    mode === 'employee-personal'
      ? personalFolder?.name || 'โฟลเดอร์ส่วนตัว'
      : mode === 'employee-sheet'
      ? sheetFolder?.sheetName || 'โฟลเดอร์แผ่นงาน'
      : category?.name || 'โฟลเดอร์หมวดหมู่';

  const activeFolderDesc =
    mode === 'employee-personal'
      ? personalFolder?.description || ''
      : mode === 'employee-sheet'
      ? sheetFolder?.description || ''
      : 'รวบรวมเว็บแอปพลิเคชันและลิงก์ระบบงานในหมวดหมู่นี้';

  const activeFolderColor =
    mode === 'employee-personal'
      ? personalFolder?.color || '#ec4899'
      : mode === 'employee-sheet'
      ? sheetFolder?.color || '#0ea5e9'
      : category?.color || '#6366f1';

  useEffect(() => {
    setSearchQuery('');
    setSelectedTopic('all');
    setIsLinkFormOpen(false);
    setEditingLinkId(null);
    setIsEditingFolderMeta(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeFolderId]);

  const showTempBanner = (msg: string) => {
    setBannerMsg(msg);
    setTimeout(() => {
      setBannerMsg((prev) => (prev === msg ? '' : prev));
    }, 3400);
  };

  // สร้างลิงก์เฉพาะของโฟลเดอร์นี้ (Shareable Deep Link)
  const shareUrl = buildFolderShareUrl({
    folderId:
      mode === 'employee-personal' || mode === 'employee-sheet'
        ? activeFolderId
        : undefined,
    categoryId: mode === 'category' ? activeFolderId : undefined,
    employeeCode: currentEmployee?.code,
  });

  const employeeItems: EmployeeLinkItem[] =
    mode === 'employee-personal'
      ? personalFolder?.links || []
      : mode === 'employee-sheet'
      ? sheetFolder?.links || []
      : [];

  const totalItemCount =
    mode === 'category' ? categoryLinks.length : employeeItems.length;

  const topics =
    mode === 'category'
      ? []
      : Array.from(new Set(employeeItems.map((l) => l.codeOrTopic).filter(Boolean)));

  const filteredEmployeeItems = employeeItems.filter((item) => {
    if (selectedTopic !== 'all' && item.codeOrTopic !== selectedTopic) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return `${item.codeOrTopic} ${item.subTopic || ''} ${item.title} ${item.description} ${
      item.badge || ''
    } ${item.url}`
      .toLowerCase()
      .includes(q);
  });

  const filteredCategoryLinks = categoryLinks.filter((link) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return `${link.title} ${link.description} ${link.url}`.toLowerCase().includes(q);
  });

  const handleCopyFolderUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedFolderUrl(true);
    showTempBanner('คัดลอกลิงก์เฉพาะของโฟลเดอร์นี้แล้ว! นำไปวางส่งต่อให้เพื่อนร่วมงานได้ทันที');
    setTimeout(() => setCopiedFolderUrl(false), 2200);
  };

  const handleCopyFolderSummary = () => {
    const text = buildFolderShareText({
      folderName: activeFolderName,
      description: activeFolderDesc,
      linkCount: totalItemCount,
      shareUrl,
    });
    navigator.clipboard.writeText(text);
    setCopiedFolderSummary(true);
    showTempBanner('คัดลอกข้อความสรุปโฟลเดอร์พร้อมลิงก์เฉพาะแล้ว! วางส่งต่อใน LINE ได้เลย');
    setTimeout(() => setCopiedFolderSummary(false), 2200);
  };

  const handleCopySingleLink = (
    item: {
      id: string;
      title: string;
      url: string;
      description?: string;
      updatedAt?: string;
      updatedBy?: string;
    },
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    const text = buildLinkItemShareText({
      title: item.title,
      url: item.url,
      description: item.description,
      folderName: activeFolderName,
      updatedAt: item.updatedAt,
      updatedBy: item.updatedBy,
    });
    navigator.clipboard.writeText(text);
    setCopiedLinkId(item.id);
    showTempBanner(`คัดลอกลิงก์ "${item.title}" พร้อมรายละเอียดสำหรับส่งต่อแล้ว!`);
    setTimeout(() => {
      setCopiedLinkId((prev) => (prev === item.id ? null : prev));
    }, 2000);
  };

  const handleOpenAddLink = () => {
    if (!canManageCurrentFolder) return;
    if (mode === 'category' && category) {
      onAddCategoryLink?.(category.id);
      return;
    }
    setEditingLinkId(null);
    setTitleInput('');
    setUrlInput('');
    setTopicInput(mode === 'employee-personal' ? 'งานประจำวัน' : 'ลิงก์อัปเดตใหม่');
    setDescInput('');
    setIsLinkFormOpen(true);
  };

  const handleOpenEditLink = (item: EmployeeLinkItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!canManageCurrentFolder) return;
    setEditingLinkId(item.id);
    setTitleInput(item.title);
    setUrlInput(item.url);
    setTopicInput(item.codeOrTopic || '');
    setDescInput(item.description || '');
    setIsLinkFormOpen(true);
  };

  const handleSaveEmployeeLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageCurrentFolder) return;
    if (!titleInput.trim() || !urlInput.trim()) return;

    const actorLabel = currentEmployee
      ? `${currentEmployee.firstName} (${currentEmployee.code})`
      : 'ผู้ดูแลระบบ';

    if (mode === 'employee-personal' && personalFolder && currentEmployee) {
      if (editingLinkId) {
        await updateLinkInPersonalFolder(
          currentEmployee.code,
          personalFolder.id,
          editingLinkId,
          {
            title: titleInput,
            url: urlInput,
            codeOrTopic: topicInput,
            description: descInput,
            updatedBy: actorLabel,
          }
        );
        showTempBanner(`เปลี่ยนลิงก์ "${titleInput.trim()}" ในโฟลเดอร์ส่วนตัวเรียบร้อยแล้ว!`);
      } else {
        await addLinkToPersonalFolder(currentEmployee.code, personalFolder.id, {
          title: titleInput,
          url: urlInput,
          codeOrTopic: topicInput,
          description: descInput,
          updatedBy: actorLabel,
        });
        showTempBanner(`เพิ่มลิงก์ "${titleInput.trim()}" ลงในโฟลเดอร์ส่วนตัวแล้ว!`);
      }
    } else if (mode === 'employee-sheet' && sheetFolder && isEditMode) {
      if (editingLinkId) {
        await updateEmployeeSheetFolderLink(sheetFolder.id, editingLinkId, {
          title: titleInput,
          url: urlInput,
          codeOrTopic: topicInput,
          description: descInput,
          updatedBy: actorLabel,
        });
        showTempBanner(`เปลี่ยนลิงก์ "${titleInput.trim()}" และบันทึกเวลาอัปเดตเรียบร้อยแล้ว!`);
      } else {
        await addLinkToEmployeeSheetFolder(sheetFolder.id, {
          title: titleInput,
          url: urlInput,
          codeOrTopic: topicInput,
          description: descInput,
          updatedBy: actorLabel,
        });
        showTempBanner(`เพิ่มลิงก์ "${titleInput.trim()}" ลงในโฟลเดอร์ "${sheetFolder.sheetName}" แล้ว!`);
      }
    }

    setIsLinkFormOpen(false);
    setEditingLinkId(null);
    onRefreshWorkspace();
  };

  const handleDeleteEmployeeLink = async (item: EmployeeLinkItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!canManageCurrentFolder) return;
    if (!window.confirm(`ต้องการลบลิงก์ "${item.title}" ออกจากโฟลเดอร์นี้ใช่หรือไม่?`)) {
      return;
    }

    if (mode === 'employee-personal' && personalFolder && currentEmployee) {
      await removeLinkFromPersonalFolder(currentEmployee.code, personalFolder.id, item.id);
    } else if (mode === 'employee-sheet' && sheetFolder && isEditMode) {
      await deleteLinkFromEmployeeSheetFolder(sheetFolder.id, item.id);
    }

    showTempBanner(`ลบลิงก์ "${item.title}" เรียบร้อยแล้ว`);
    onRefreshWorkspace();
  };

  const handleBookmarkToPersonal = async (item: EmployeeLinkItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentEmployee || allPersonalFolders.length === 0) return;
    const target = allPersonalFolders[0];
    const actorLabel = `${currentEmployee.firstName} (${currentEmployee.code})`;

    await addLinkToPersonalFolder(currentEmployee.code, target.id, {
      title: item.title,
      url: item.url,
      codeOrTopic: item.codeOrTopic || 'เก็บจากแผ่นงาน',
      description: item.description,
      badge: item.badge,
      iconName: item.iconName,
      bgStyle: item.bgStyle,
      updatedBy: actorLabel,
    });
    showTempBanner(`⭐ เก็บลิงก์ "${item.title}" เข้าโฟลเดอร์ส่วนตัว "${target.name}" แล้ว! (แก้ไขลิงก์ต่อในโฟลเดอร์ส่วนตัวได้ทันที)`);
    onRefreshWorkspace();
  };

  const handleSaveFolderMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalFolder || !currentEmployee || !folderNameEdit.trim()) return;
    await updatePersonalFolder(currentEmployee.code, personalFolder.id, {
      name: folderNameEdit,
      description: folderDescEdit,
    });
    setIsEditingFolderMeta(false);
    showTempBanner(`อัปเดตชื่อโฟลเดอร์ส่วนตัว "${folderNameEdit.trim()}" เรียบร้อยแล้ว`);
    onRefreshWorkspace();
  };

  // ค่าที่เลือกอยู่ใน Dropdown สลับโฟลเดอร์ด่วน
  const currentSwitcherValue =
    mode === 'category' ? `cat:${activeFolderId}` : `folder:${activeFolderId}`;

  const handleSwitcherSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val.startsWith('cat:')) {
      onSwitchFolder({ categoryId: val.slice(4) });
    } else if (val.startsWith('folder:')) {
      onSwitchFolder({ folderId: val.slice(7) });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* =====================================================================
          กล่องหัวข้อโฟลเดอร์แบบรวมศูนย์ (สะอาด ไม่ซ้อนหลายกล่อง และสลับโฟลเดอร์ด่วนไม่ล้นจอ)
         ===================================================================== */}
      <div
        className={`rounded-3xl backdrop-blur-2xl border shadow-lg transition-colors overflow-hidden ${
          isLightTheme
            ? 'bg-white/95 border-sky-200/90 text-slate-800 shadow-sky-900/5'
            : 'bg-slate-950/80 border-white/15 text-white'
        }`}
      >
        {/* แถบบนสุด: ปุ่มกลับหน้าหลัก + Dropdown สลับโฟลเดอร์ด่วน (ไม่ล้นจอ) + ปุ่มแชร์/จัดการ */}
        <div
          className={`px-4 sm:px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2.5 ${
            isLightTheme
              ? 'bg-sky-50/70 border-sky-100'
              : 'bg-slate-900/60 border-white/10'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onBackToHome}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 shadow-2xs ${
                isLightTheme
                  ? 'bg-sky-600 hover:bg-sky-500 text-white'
                  : 'bg-white/12 hover:bg-sky-600 text-white border border-white/15'
              }`}
            >
              <ArrowLeft size={14} />
              <span>หน้าหลัก</span>
            </button>

            {/* ตัวเลือกสลับโฟลเดอร์ด่วนแบบ Dropdown กะทัดรัด ไม่ล้นขอบขวา */}
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="relative flex items-center">
                <FolderOpen
                  size={13}
                  className={`absolute left-2.5 pointer-events-none ${
                    isLightTheme ? 'text-sky-700' : 'text-sky-400'
                  }`}
                />
                <select
                  aria-label="สลับโฟลเดอร์ด่วน"
                  value={currentSwitcherValue}
                  onChange={handleSwitcherSelectChange}
                  className={`pl-7 pr-7 py-1.5 rounded-xl border text-xs font-bold cursor-pointer focus:outline-none transition max-w-[220px] sm:max-w-[270px] truncate ${
                    isLightTheme
                      ? 'bg-white hover:bg-sky-50 border-sky-200 text-slate-800 focus:border-sky-500'
                      : 'bg-slate-900 hover:bg-slate-800 border-white/15 text-white focus:border-sky-400'
                  }`}
                >
                  {currentEmployee && allPersonalFolders.length > 0 && (
                    <optgroup label="⭐ โฟลเดอร์ส่วนตัวของฉัน (แก้ไขได้)">
                      {allPersonalFolders.map((pf) => (
                        <option key={pf.id} value={`folder:${pf.id}`}>
                          ⭐ {pf.name} ({pf.links.length} ลิงก์)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {currentEmployee && allSheetFolders.length > 0 && (
                    <optgroup label="📂 โฟลเดอร์แผ่นงานพนักงาน (17 แผ่นงาน)">
                      {allSheetFolders.map((sf) => (
                        <option key={sf.id} value={`folder:${sf.id}`}>
                          📂 {sf.sheetName} ({sf.links.length} ลิงก์)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {allCategories.length > 0 && (
                    <optgroup label="🗂️ หมวดหมู่ระบบงานกลาง">
                      {allCategories.map((cat) => (
                        <option key={cat.id} value={`cat:${cat.id}`}>
                          🗂️ {cat.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* ปุ่มลัดสลับเข้าโฟลเดอร์ส่วนตัวใน 1 คลิก */}
              {currentEmployee &&
                allPersonalFolders.length > 0 &&
                mode !== 'employee-personal' && (
                  <button
                    type="button"
                    onClick={() => onSwitchFolder({ folderId: allPersonalFolders[0].id })}
                    className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition ${
                      isLightTheme
                        ? 'bg-pink-50 hover:bg-pink-100 border-pink-300 text-pink-900'
                        : 'bg-pink-500/15 hover:bg-pink-500/25 border-pink-400/30 text-pink-200'
                    }`}
                    title="สลับไปที่โฟลเดอร์ส่วนตัวเพื่อเพิ่มหรือแก้ไขลิงก์ของฉัน"
                  >
                    <Star size={12} className="fill-current text-pink-500" />
                    <span>โฟลเดอร์ส่วนตัว</span>
                  </button>
                )}
            </div>
          </div>

          {/* ปุ่มแชร์ลิงก์เฉพาะของโฟลเดอร์ + ปุ่มจัดการ (ขนาดกะทัดรัด สะอาดตา) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyFolderUrl}
              title={`คัดลอกลิงก์เฉพาะของหน้าโฟลเดอร์นี้: ${shareUrl}`}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                copiedFolderUrl
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : isLightTheme
                  ? 'bg-white hover:bg-sky-50 border-sky-200 text-sky-900 shadow-2xs'
                  : 'bg-white/10 hover:bg-white/15 border-white/15 text-sky-200'
              }`}
            >
              {copiedFolderUrl ? <Check size={13} /> : <Link2 size={13} />}
              <span>{copiedFolderUrl ? 'คัดลอกลิงก์แล้ว' : 'ก็อปลิงก์โฟลเดอร์'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyFolderSummary}
              title="คัดลอกชื่อโฟลเดอร์ + ลิงก์เฉพาะสำหรับส่งต่อใน LINE"
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                copiedFolderSummary
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : isLightTheme
                  ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/30 text-emerald-200'
              }`}
            >
              {copiedFolderSummary ? <Check size={13} /> : <Share2 size={13} />}
              <span className="hidden xs:inline">
                {copiedFolderSummary ? 'คัดลอกข้อความแล้ว' : 'ส่งต่อ LINE'}
              </span>
            </button>

            {mode === 'employee-sheet' && sheetFolder && (
              <a
                href={getEmployeeLinksSheetUrl(sheetFolder.gid)}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition ${
                  isLightTheme
                    ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                    : 'bg-white/10 hover:bg-white/15 border-white/15 text-slate-200'
                }`}
                title="เปิดแผ่นงาน Google Sheet ต้นฉบับ"
              >
                <FileSpreadsheet size={13} className="text-emerald-600" />
                <span className="hidden md:inline">ชีตต้นฉบับ</span>
                <ExternalLink size={11} />
              </a>
            )}

            {/* ปุ่มแก้ไขชื่อโฟลเดอร์ & เพิ่มลิงก์ (แสดงเฉพาะโฟลเดอร์ส่วนตัว หรือเมื่อแอดมินปลดล็อกเท่านั้น) */}
            {mode === 'employee-personal' && personalFolder && canManageCurrentFolder && (
              <button
                type="button"
                onClick={() => {
                  setFolderNameEdit(personalFolder.name);
                  setFolderDescEdit(personalFolder.description);
                  setIsEditingFolderMeta((prev) => !prev);
                }}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition ${
                  isLightTheme
                    ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                    : 'bg-white/10 hover:bg-white/20 border-white/15 text-slate-200'
                }`}
              >
                <Pencil size={12} />
                <span className="hidden sm:inline">ตั้งชื่อโฟลเดอร์</span>
              </button>
            )}

            {canManageCurrentFolder && (
              <button
                type="button"
                onClick={handleOpenAddLink}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-xs font-bold text-white flex items-center gap-1 shadow-sm transition"
              >
                <Plus size={14} />
                <span>เพิ่มลิงก์</span>
              </button>
            )}
          </div>
        </div>

        {/* แถวหลัก: ชื่อโฟลเดอร์ + ป้ายสิทธิ์การใช้งาน + ช่องค้นหาในแถวเดียวกันบนจอคอมฯ */}
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{
                background: `linear-gradient(135deg, ${activeFolderColor} 0%, #1e293b 100%)`,
              }}
            >
              {mode === 'employee-personal' ? (
                <Star size={20} className="fill-white/90" />
              ) : (
                <Folder size={20} />
              )}
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  className={`text-base sm:text-xl font-bold truncate ${
                    isLightTheme ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  {activeFolderName}
                </h1>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                    isLightTheme
                      ? 'bg-sky-600 border-sky-700 text-white'
                      : 'bg-sky-500/25 border-sky-400/40 text-sky-200'
                  }`}
                >
                  {totalItemCount} ลิงก์
                </span>

                {mode === 'employee-personal' ? (
                  <span
                    className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold inline-flex items-center gap-1 ${
                      isLightTheme
                        ? 'bg-pink-100 border-pink-300 text-pink-900'
                        : 'bg-pink-500/20 border-pink-400/30 text-pink-200'
                    }`}
                  >
                    <Pencil size={10} /> โฟลเดอร์ส่วนตัว ({currentEmployee?.code}) • เพิ่ม/แก้ไขลิงก์ได้
                  </span>
                ) : !isEditMode ? (
                  <span
                    className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold inline-flex items-center gap-1 ${
                      isLightTheme
                        ? 'bg-slate-100 border-slate-300 text-slate-700'
                        : 'bg-white/10 border-white/15 text-slate-300'
                    }`}
                    title="ข้อมูลส่วนกลางแก้ไขได้เฉพาะแอดมิน พนักงานสามารถกด 'เก็บส่วนตัว' เพื่อนำไปแก้ไขต่อในโฟลเดอร์ส่วนตัวได้"
                  >
                    <Lock size={10} /> ส่วนกลาง (อ่านอย่างเดียว)
                  </span>
                ) : null}
              </div>

              <p
                className={`text-xs line-clamp-1 ${
                  isLightTheme ? 'text-slate-600' : 'text-slate-300'
                }`}
              >
                {activeFolderDesc}
              </p>
            </div>
          </div>

          {/* ช่องค้นหาในโฟลเดอร์ (วางชิดขวาในแถวเดียวกับชื่อโฟลเดอร์บนจอคอมพิวเตอร์) */}
          <div className="relative w-full lg:w-80 shrink-0">
            <Search
              size={15}
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                isLightTheme ? 'text-sky-600' : 'text-sky-400'
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`ค้นหาใน "${activeFolderName}"...`}
              className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none transition ${
                isLightTheme
                  ? 'bg-slate-50/90 focus:bg-white border-sky-200 focus:border-sky-500 text-slate-800 placeholder:text-slate-400'
                  : 'bg-slate-900 border-white/15 focus:border-sky-400 text-white placeholder:text-slate-500'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* แถบตัวกรองหัวข้อย่อย (แสดงครบทุกหัวข้อ เช่น Link มาตรฐาน 69 ทั้ง 38 หัวข้อ) */}
        {topics.length > 1 && (
          <div
            className={`px-4 sm:px-5 py-3 border-t space-y-2 ${
              isLightTheme
                ? 'bg-slate-50/80 border-sky-100'
                : 'bg-slate-900/45 border-white/10'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`text-[11px] font-bold ${
                  isLightTheme ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                กรองตามหัวข้อ ({topics.length} หัวข้อ):
              </span>
              {selectedTopic !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedTopic('all')}
                  className={`text-[11px] font-bold underline ${
                    isLightTheme ? 'text-sky-700 hover:text-sky-900' : 'text-sky-300 hover:text-white'
                  }`}
                >
                  แสดงครบทุกหัวข้อ ({employeeItems.length} ลิงก์)
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedTopic('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition border ${
                  selectedTopic === 'all'
                    ? 'bg-sky-600 border-sky-700 text-white shadow-xs'
                    : isLightTheme
                    ? 'bg-white hover:bg-sky-100 border-slate-300 text-slate-900'
                    : 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
                }`}
              >
                ทุกหัวข้อ ({employeeItems.length})
              </button>
              {topics.map((topic) => {
                const topicItems = employeeItems.filter((item) => item.codeOrTopic === topic);
                const subTopicLabel = topicItems.find((item) => item.subTopic)?.subTopic || '';
                const isSelected = selectedTopic === topic;
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setSelectedTopic(topic)}
                    title={
                      subTopicLabel
                        ? `หัวข้อ ${topic}: ${subTopicLabel} (${topicItems.length} ลิงก์)`
                        : `หัวข้อ ${topic} (${topicItems.length} ลิงก์)`
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition border flex items-center gap-1 ${
                      isSelected
                        ? 'bg-sky-600 border-sky-700 text-white shadow-xs'
                        : isLightTheme
                        ? 'bg-white hover:bg-sky-50 border-sky-300 text-sky-950 shadow-2xs'
                        : 'bg-slate-900 hover:bg-sky-500/25 border-sky-400/35 text-sky-200'
                    }`}
                  >
                    <span>{topic}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        isSelected
                          ? 'bg-white/25 text-white'
                          : isLightTheme
                          ? 'bg-sky-100 text-sky-900'
                          : 'bg-sky-500/30 text-sky-100'
                      }`}
                    >
                      {topicItems.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedTopic !== 'all' && (
              <div
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
                  isLightTheme
                    ? 'bg-sky-100/90 border-sky-300 text-sky-950'
                    : 'bg-sky-500/15 border-sky-400/35 text-sky-200'
                }`}
              >
                <span>
                  กำลังดูหัวข้อ <span className="underline">{selectedTopic}</span>
                  {employeeItems.find((i) => i.codeOrTopic === selectedTopic && i.subTopic)?.subTopic
                    ? ` : ${employeeItems.find((i) => i.codeOrTopic === selectedTopic && i.subTopic)?.subTopic}`
                    : ''}{' '}
                  ({filteredEmployeeItems.length} ลิงก์)
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* แถบแจ้งเตือนสถานะเมื่อคัดลอกหรือบันทึก */}
      {bannerMsg && (
        <div
          className={`p-3 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-between gap-2 shadow-md animate-fade-in ${
            isLightTheme
              ? 'bg-emerald-100 border-emerald-300 text-emerald-950'
              : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
          }`}
        >
          <span className="flex items-center gap-2">
            <CheckCircle2
              size={16}
              className={isLightTheme ? 'text-emerald-700 shrink-0' : 'text-emerald-400 shrink-0'}
            />
            <span>{bannerMsg}</span>
          </span>
          <button
            type="button"
            onClick={() => setBannerMsg('')}
            className={
              isLightTheme ? 'text-emerald-800 hover:text-emerald-950' : 'text-emerald-300 hover:text-white'
            }
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ฟอร์มแก้ไขชื่อโฟลเดอร์ส่วนตัว */}
      {isEditingFolderMeta && mode === 'employee-personal' && canManageCurrentFolder && (
        <form
          onSubmit={handleSaveFolderMeta}
          className={`p-4 rounded-2xl border-2 space-y-3 animate-fade-in ${
            isLightTheme
              ? 'bg-white border-pink-300 text-slate-800 shadow-md'
              : 'bg-slate-950 border-pink-500/40 text-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold ${
                isLightTheme ? 'text-pink-800' : 'text-pink-300'
              }`}
            >
              แก้ไขชื่อและคำอธิบายโฟลเดอร์ส่วนตัว
            </span>
            <button
              type="button"
              onClick={() => setIsEditingFolderMeta(false)}
              className={`p-1 rounded-lg ${
                isLightTheme ? 'bg-slate-100 text-slate-600' : 'bg-white/10 text-slate-300'
              }`}
            >
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={folderNameEdit}
              onChange={(e) => setFolderNameEdit(e.target.value)}
              placeholder="ชื่อโฟลเดอร์ส่วนตัว"
              className={`px-3.5 py-2 rounded-xl border text-xs sm:text-sm ${
                isLightTheme
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-slate-900 border-white/15 text-white'
              }`}
            />
            <input
              type="text"
              value={folderDescEdit}
              onChange={(e) => setFolderDescEdit(e.target.value)}
              placeholder="คำอธิบายโฟลเดอร์"
              className={`px-3.5 py-2 rounded-xl border text-xs sm:text-sm ${
                isLightTheme
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-slate-900 border-white/15 text-white'
              }`}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditingFolderMeta(false)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                isLightTheme ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-slate-300'
              }`}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-bold text-white"
            >
              บันทึกชื่อโฟลเดอร์
            </button>
          </div>
        </form>
      )}

      {/* สมุดโน้ตประจำโฟลเดอร์ (แก้ไขได้เฉพาะโฟลเดอร์ส่วนตัว หรือเมื่อแอดมินปลดล็อกเท่านั้น) */}
      <FolderNotesSection
        folderId={mode === 'category' ? `cat-${activeFolderId}` : activeFolderId}
        folderName={activeFolderName}
        employeeCode={currentEmployee ? currentEmployee.code : isEditMode ? 'admin' : 'public'}
        authorName={
          currentEmployee
            ? `${currentEmployee.firstName} (${currentEmployee.code})`
            : isEditMode
            ? 'ผู้ดูแลระบบ (Admin)'
            : 'ผู้ใช้งาน'
        }
        isPersonalFolder={mode === 'employee-personal'}
        canEdit={canManageCurrentFolder}
        isLightTheme={isLightTheme}
        onNotesChanged={onRefreshWorkspace}
      />

      {/* ฟอร์มเพิ่มลิงก์ใหม่ หรือเปลี่ยนลิงก์ (อนุญาตเฉพาะโฟลเดอร์ส่วนตัว หรือแอดมินเท่านั้น) */}
      {isLinkFormOpen && mode !== 'category' && canManageCurrentFolder && (
        <form
          onSubmit={handleSaveEmployeeLink}
          className={`p-4 sm:p-5 rounded-3xl border-2 space-y-3.5 shadow-xl animate-fade-in ${
            isLightTheme
              ? 'bg-white border-sky-300 text-slate-800'
              : 'bg-slate-950 border-sky-500/50 text-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className={isLightTheme ? 'text-sky-600' : 'text-sky-400'} />
              <h4 className="text-xs sm:text-sm font-bold">
                {editingLinkId
                  ? 'แก้ไขรายละเอียดลิงก์ (บันทึกวัน-เวลาที่เปลี่ยนลิงก์ให้อัตโนมัติ)'
                  : `เพิ่มลิงก์ใหม่ลงในโฟลเดอร์ "${activeFolderName}"`}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsLinkFormOpen(false);
                setEditingLinkId(null);
              }}
              className={`p-1.5 rounded-xl ${
                isLightTheme
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  : 'bg-white/10 hover:bg-white/20 text-slate-300'
              }`}
            >
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label
                className={`block text-[11px] font-bold mb-1 ${
                  isLightTheme ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                ชื่อลิงก์ / รายงาน *
              </label>
              <input
                type="text"
                required
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="เช่น รายงานจัดส่งตรงเวลา เดือนล่าสุด..."
                className={`w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none ${
                  isLightTheme
                    ? 'bg-slate-50 border-slate-300 focus:border-sky-500 text-slate-900'
                    : 'bg-slate-900 border-white/15 focus:border-sky-400 text-white'
                }`}
              />
            </div>

            <div className="sm:col-span-5">
              <label
                className={`block text-[11px] font-bold mb-1 ${
                  isLightTheme ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                URL ลิงก์เฉพาะ *
              </label>
              <input
                type="text"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/..."
                className={`w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-mono focus:outline-none ${
                  isLightTheme
                    ? 'bg-slate-50 border-sky-300 focus:border-sky-500 text-slate-900'
                    : 'bg-slate-900 border-sky-400/40 focus:border-sky-400 text-white'
                }`}
              />
            </div>

            <div className="sm:col-span-2">
              <label
                className={`block text-[11px] font-bold mb-1 ${
                  isLightTheme ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                หัวข้อ / ป้ายกำกับ
              </label>
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="เช่น งานเช้า"
                className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none ${
                  isLightTheme
                    ? 'bg-slate-50 border-slate-300 focus:border-sky-500 text-slate-900'
                    : 'bg-slate-900 border-white/15 focus:border-sky-400 text-white'
                }`}
              />
            </div>
          </div>

          <div>
            <label
              className={`block text-[11px] font-bold mb-1 ${
                isLightTheme ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              คำอธิบายการใช้งาน / หมายเหตุ
            </label>
            <input
              type="text"
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              placeholder="เช่น อัปเดตลิงก์ชีตประจำเดือนใหม่ / ส่งข้อมูลก่อน 11:00 น."
              className={`w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none ${
                isLightTheme
                  ? 'bg-slate-50 border-slate-300 focus:border-sky-500 text-slate-900'
                  : 'bg-slate-900 border-white/15 focus:border-sky-400 text-white'
              }`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span
              className={`text-[11px] font-semibold flex items-center gap-1.5 ${
                isLightTheme ? 'text-amber-800' : 'text-amber-300'
              }`}
            >
              <Clock size={13} />
              <span>
                ประทับเวลาเปลี่ยนลิงก์ล่าสุดอัตโนมัติ ({formatLinkUpdatedTime(new Date().toISOString())} น.)
              </span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsLinkFormOpen(false);
                  setEditingLinkId(null);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${
                  isLightTheme
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300'
                }`}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-xs font-bold text-white shadow"
              >
                {editingLinkId ? 'บันทึกการแก้ไขลิงก์' : 'บันทึกลิงก์ลงโฟลเดอร์'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* =====================================================================
          ตารางรายการลิงก์แบบสะอาดตาบนจอคอมพิวเตอร์
         ===================================================================== */}
      <div className="space-y-2">
        <div
          className={`hidden sm:grid grid-cols-12 gap-3 px-4 py-2.5 rounded-2xl border text-xs font-bold ${
            isLightTheme
              ? 'bg-sky-100/80 border-sky-200 text-sky-950'
              : 'bg-slate-950/85 border-white/15 text-sky-300'
          }`}
        >
          <div className="col-span-5">ชื่อระบบ / รายงาน ({activeFolderName})</div>
          <div className="col-span-7 flex items-center justify-between">
            <span>คำอธิบายการใช้งาน</span>
            <span>คำสั่งด่วน</span>
          </div>
        </div>

        {mode === 'category' ? (
          filteredCategoryLinks.length === 0 ? (
            <div
              className={`p-8 rounded-3xl border text-center text-xs font-medium ${
                isLightTheme
                  ? 'bg-white/90 border-sky-200 text-slate-500'
                  : 'bg-slate-950/60 border-white/10 text-slate-400'
              }`}
            >
              ไม่พบลิงก์ในหมวดหมู่นี้
            </div>
          ) : (
            filteredCategoryLinks.map((link) => (
              <div
                key={link.id}
                onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                className={`group grid grid-cols-12 gap-3 items-center p-3.5 sm:px-4 sm:py-3 rounded-2xl backdrop-blur-xl border shadow-xs cursor-pointer transition-all ${
                  isLightTheme
                    ? 'bg-white/95 hover:bg-white border-sky-200/80 hover:border-sky-400 hover:shadow-md'
                    : 'bg-slate-950/80 hover:bg-slate-900 border-white/10 hover:border-sky-400/50'
                }`}
              >
                <div
                  className={`col-span-12 sm:col-span-5 flex items-center gap-3 min-w-0 sm:border-r sm:pr-3 ${
                    isLightTheme ? 'sm:border-slate-200/80' : 'sm:border-white/10'
                  }`}
                >
                  <IconRenderer
                    iconType={link.icon_type}
                    iconName={link.icon_name}
                    iconUrl={link.icon_url}
                    linkUrl={link.url}
                    imageFit={link.image_fit}
                    bgStyle={link.bg_style}
                    iconColor={link.icon_color}
                    shape={iconShape}
                    size="sm"
                    badgeText={link.badge_text}
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-xs sm:text-sm font-bold truncate ${
                        isLightTheme
                          ? 'text-slate-900 group-hover:text-sky-700'
                          : 'text-white group-hover:text-sky-300'
                      }`}
                    >
                      {link.title}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                        isLightTheme ? 'text-sky-700' : 'text-sky-400'
                      }`}
                    >
                      เปิดลิงก์ <ExternalLink size={10} />
                    </span>
                  </div>
                </div>

                <div className="col-span-12 sm:col-span-7 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                  <div className="min-w-0">
                    <p
                      className={`text-xs sm:text-sm leading-relaxed ${
                        isLightTheme ? 'text-slate-700 font-medium' : 'text-slate-200'
                      }`}
                    >
                      {link.description || 'คลิกเพื่อเปิดใช้งานระบบ'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) =>
                        handleCopySingleLink(
                          {
                            id: link.id,
                            title: link.title,
                            url: link.url,
                            description: link.description,
                            updatedAt: link.updated_at,
                            updatedBy: link.updated_by,
                          },
                          e
                        )
                      }
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition ${
                        isLightTheme
                          ? 'bg-sky-50 hover:bg-sky-100 border-sky-300 text-sky-950'
                          : 'bg-sky-500/15 hover:bg-sky-500/30 border-sky-400/30 text-sky-200'
                      }`}
                      title="คัดลอกลิงก์พร้อมรายละเอียดส่งต่อ"
                    >
                      {copiedLinkId === link.id ? (
                        <>
                          <Check
                            size={12}
                            className={isLightTheme ? 'text-emerald-700' : 'text-emerald-400'}
                          />
                          <span className={isLightTheme ? 'text-emerald-800' : 'text-emerald-300'}>
                            ก็อปแล้ว
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>ก็อปส่งต่อ</span>
                        </>
                      )}
                    </button>

                    {/* ปุ่มแก้ไขและลบลิงก์ส่วนกลาง แสดงเฉพาะเมื่อแอดมินปลดล็อก (isEditMode) เท่านั้น */}
                    {isEditMode && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditCategoryLink?.(link);
                          }}
                          className={`p-2 rounded-xl border ${
                            isLightTheme
                              ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-800'
                              : 'bg-indigo-500/20 hover:bg-indigo-500/35 border-indigo-400/30 text-indigo-300'
                          }`}
                          title="แก้ไขลิงก์ (แอดมิน)"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCategoryLink?.(link);
                          }}
                          className={`p-2 rounded-xl border ${
                            isLightTheme
                              ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800'
                              : 'bg-rose-500/20 hover:bg-rose-500/35 border-rose-400/30 text-rose-300'
                          }`}
                          title="ลบลิงก์ (แอดมิน)"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )
        ) : filteredEmployeeItems.length === 0 ? (
          <div
            className={`p-8 rounded-3xl border border-dashed text-center space-y-3 ${
              isLightTheme
                ? 'bg-white/90 border-sky-200 text-slate-600'
                : 'bg-slate-950/70 border-white/15 text-slate-300'
            }`}
          >
            <p className="text-xs sm:text-sm font-medium">
              ยังไม่มีลิงก์ในโฟลเดอร์นี้ หรือไม่พบลิงก์ที่ตรงกับคำค้นหา
            </p>
            {canManageCurrentFolder && (
              <button
                type="button"
                onClick={handleOpenAddLink}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-xs font-bold text-white inline-flex items-center gap-1.5 shadow"
              >
                <Plus size={14} />
                <span>เพิ่มลิงก์รายการแรกในโฟลเดอร์นี้</span>
              </button>
            )}
          </div>
        ) : (
          filteredEmployeeItems.map((item) => {
            const updatedTimeStr = formatLinkUpdatedTime(item.updatedAt);
            return (
              <div
                key={item.id}
                onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                className={`group grid grid-cols-12 gap-3 items-center p-3.5 sm:px-4 sm:py-3 rounded-2xl backdrop-blur-xl border shadow-xs cursor-pointer transition-all ${
                  isLightTheme
                    ? 'bg-white/95 hover:bg-white border-sky-200/80 hover:border-sky-400 hover:shadow-md'
                    : 'bg-slate-950/80 hover:bg-slate-900 border-white/10 hover:border-sky-400/50'
                }`}
              >
                {/* คอลัมน์ที่ 1: ไอคอน + ป้ายหัวข้อ + ชื่อลิงก์ + เวลาเปลี่ยนลิงก์ล่าสุด */}
                <div
                  className={`col-span-12 sm:col-span-5 flex items-center gap-3 min-w-0 sm:border-r sm:pr-3 ${
                    isLightTheme ? 'sm:border-slate-200/80' : 'sm:border-white/10'
                  }`}
                >
                  <div className="shrink-0 transition-transform group-hover:scale-105">
                    <IconRenderer
                      iconType="library"
                      iconName={item.iconName}
                      iconUrl=""
                      linkUrl={item.url}
                      imageFit="cover"
                      bgStyle={item.bgStyle}
                      iconColor="#ffffff"
                      shape={iconShape}
                      size="sm"
                      badgeText={item.badge}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {item.codeOrTopic && (
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[11px] font-extrabold tracking-tight ${
                            isLightTheme
                              ? 'bg-sky-600 border-sky-700 text-white shadow-2xs'
                              : 'bg-sky-500/25 border-sky-400/40 text-sky-200'
                          }`}
                        >
                          {item.codeOrTopic}
                        </span>
                      )}
                      {item.subTopic && item.subTopic !== item.codeOrTopic && (
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-bold truncate max-w-[220px] sm:max-w-[260px] ${
                            isLightTheme
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-950'
                              : 'bg-indigo-500/20 border-indigo-400/30 text-indigo-200'
                          }`}
                          title={item.subTopic}
                        >
                          {item.subTopic}
                        </span>
                      )}
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                            isLightTheme
                              ? 'bg-slate-100 border-slate-300 text-slate-800'
                              : 'bg-white/10 border-white/15 text-slate-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>

                    <p
                      className={`text-xs sm:text-sm font-bold leading-snug ${
                        isLightTheme
                          ? 'text-slate-900 group-hover:text-sky-700'
                          : 'text-white group-hover:text-sky-300'
                      }`}
                    >
                      {item.title}
                    </p>

                    {updatedTimeStr && (
                      <div
                        className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                          isLightTheme
                            ? 'bg-amber-100 border-amber-300 text-amber-950'
                            : 'bg-amber-500/15 border-amber-400/30 text-amber-300'
                        }`}
                      >
                        <Clock size={10} />
                        <span>
                          เปลี่ยนลิงก์ล่าสุด: {updatedTimeStr} น.
                          {item.updatedBy ? ` (${item.updatedBy})` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* คอลัมน์ที่ 2: คำอธิบาย + ปุ่มคำสั่งด่วน */}
                <div className="col-span-12 sm:col-span-7 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:pl-1 min-w-0">
                  <div className="min-w-0">
                    <p
                      className={`text-xs sm:text-sm leading-relaxed ${
                        isLightTheme ? 'text-slate-700 font-medium' : 'text-slate-200'
                      }`}
                    >
                      {item.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {/* ปุ่มก็อปส่งต่อ (ทุกคนกดคัดลอกไปส่ง LINE ได้) */}
                    <button
                      type="button"
                      onClick={(e) => handleCopySingleLink(item, e)}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition ${
                        isLightTheme
                          ? 'bg-sky-50 hover:bg-sky-100 border-sky-300 text-sky-950'
                          : 'bg-sky-500/15 hover:bg-sky-500/30 border-sky-400/30 text-sky-200'
                      }`}
                      title="คัดลอกลิงก์พร้อมคำอธิบายเพื่อส่งต่อใน LINE"
                    >
                      {copiedLinkId === item.id ? (
                        <>
                          <Check
                            size={12}
                            className={isLightTheme ? 'text-emerald-700' : 'text-emerald-400'}
                          />
                          <span className={isLightTheme ? 'text-emerald-900' : 'text-emerald-300'}>
                            ก็อปแล้ว!
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>ก็อปส่งต่อ</span>
                        </>
                      )}
                    </button>

                    {/* ปุ่มเก็บเข้าโฟลเดอร์ส่วนตัว (กรณีดูอยู่ในโฟลเดอร์แผ่นงานส่วนกลาง 17 แผ่นงาน) */}
                    {mode === 'employee-sheet' && currentEmployee && (
                      <button
                        type="button"
                        onClick={(e) => handleBookmarkToPersonal(item, e)}
                        className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition ${
                          isLightTheme
                            ? 'bg-pink-50 hover:bg-pink-100 border-pink-300 text-pink-950'
                            : 'bg-pink-500/15 hover:bg-pink-500/30 border-pink-400/30 text-pink-200'
                        }`}
                        title="คัดลอกลิงก์นี้ไปเก็บไว้ในโฟลเดอร์ส่วนตัวของฉัน (แก้ไขต่อในโฟลเดอร์ส่วนตัวได้)"
                      >
                        <BookmarkPlus size={12} />
                        <span>เก็บส่วนตัว</span>
                      </button>
                    )}

                    {/* ปุ่มเปลี่ยนลิงก์ & ลบลิงก์: แสดงเฉพาะในโฟลเดอร์ส่วนตัวของพนักงาน หรือเมื่อแอดมินปลดล็อกเท่านั้น */}
                    {canManageCurrentFolder && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditLink(item, e)}
                          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition ${
                            isLightTheme
                              ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-950'
                              : 'bg-amber-500/15 hover:bg-amber-500/30 border-amber-400/30 text-amber-200'
                          }`}
                          title="เปลี่ยนลิงก์ URL ใหม่ หรือแก้ไขคำอธิบาย"
                        >
                          <Pencil size={12} />
                          <span>เปลี่ยนลิงก์</span>
                        </button>

                        {(mode === 'employee-personal' || item.isCustomAdded) && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteEmployeeLink(item, e)}
                            className={`p-1.5 rounded-xl border transition ${
                              isLightTheme
                                ? 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-800'
                                : 'bg-rose-500/15 hover:bg-rose-500/30 border-rose-400/30 text-rose-300'
                            }`}
                            title="ลบลิงก์นี้"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

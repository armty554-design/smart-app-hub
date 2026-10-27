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

  // ฟอร์มเพิ่มหรือเปลี่ยนลิงก์เฉพาะในโฟลเดอร์ (รองรับทั้งโฟลเดอร์แผ่นงานและโฟลเดอร์ส่วนตัว)
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
    setEditingLinkId(item.id);
    setTitleInput(item.title);
    setUrlInput(item.url);
    setTopicInput(item.codeOrTopic || '');
    setDescInput(item.description || '');
    setIsLinkFormOpen(true);
  };

  const handleSaveEmployeeLink = async (e: React.FormEvent) => {
    e.preventDefault();
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
        showTempBanner(`เปลี่ยนลิงก์ "${titleInput.trim()}" และบันทึกเวลาอัปเดตเรียบร้อยแล้ว!`);
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
    } else if (mode === 'employee-sheet' && sheetFolder) {
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
    if (!window.confirm(`ต้องการลบลิงก์ "${item.title}" ออกจากโฟลเดอร์นี้ใช่หรือไม่?`)) {
      return;
    }

    if (mode === 'employee-personal' && personalFolder && currentEmployee) {
      await removeLinkFromPersonalFolder(currentEmployee.code, personalFolder.id, item.id);
    } else if (mode === 'employee-sheet' && sheetFolder) {
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
    showTempBanner(`⭐ เก็บลิงก์ "${item.title}" เข้าโฟลเดอร์ส่วนตัว "${target.name}" แล้ว!`);
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

  return (
    <div className="space-y-5 animate-fade-in">
      {/* แถบนำทางด้านบนของหน้าโฟลเดอร์ (Breadcrumb + ปุ่มย้อนกลับหน้าหลัก + ตัวสลับโฟลเดอร์ด่วน) */}
      <div
        className={`p-4 sm:p-5 rounded-3xl backdrop-blur-2xl border shadow-xl transition-colors space-y-4 ${
          isLightTheme
            ? 'bg-white/90 border-sky-200 text-slate-800'
            : 'bg-slate-950/75 border-white/15 text-white'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackToHome}
              className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition shrink-0 shadow-sm ${
                isLightTheme
                  ? 'bg-sky-600 hover:bg-sky-500 text-white'
                  : 'bg-white/12 hover:bg-sky-600 text-white border border-white/15'
              }`}
            >
              <ArrowLeft size={16} />
              <span>กลับหน้าโฮมหลัก</span>
            </button>

            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${activeFolderColor} 0%, #1e293b 100%)`,
                }}
              >
                {mode === 'employee-personal' ? (
                  <Star size={21} className="fill-white/90" />
                ) : (
                  <Folder size={21} />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {mode === 'employee-personal' && (
                    <span
                      className={`px-2 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1 ${
                        isLightTheme
                          ? 'bg-pink-100 border-pink-300 text-pink-900'
                          : 'bg-pink-500/20 border-pink-400/30 text-pink-300'
                      }`}
                    >
                      <Lock size={10} /> โฟลเดอร์ส่วนตัว ({currentEmployee?.code})
                    </span>
                  )}
                  <h1
                    className={`text-base sm:text-xl font-bold truncate ${
                      isLightTheme ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    {activeFolderName}
                  </h1>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      isLightTheme
                        ? 'bg-sky-100 border-sky-300 text-sky-800'
                        : 'bg-sky-500/20 border-sky-400/30 text-sky-300'
                    }`}
                  >
                    {totalItemCount} ลิงก์
                  </span>
                </div>
                <p
                  className={`text-xs mt-0.5 line-clamp-2 ${
                    isLightTheme ? 'text-slate-600' : 'text-slate-300'
                  }`}
                >
                  {activeFolderDesc}
                </p>
              </div>
            </div>
          </div>

          {/* ปุ่มเพิ่มลิงก์ใหม่ / เปิด Google Sheet ต้นฉบับ */}
          <div className="flex flex-wrap items-center gap-2">
            {(mode !== 'category' || isEditMode) && (
              <button
                type="button"
                onClick={handleOpenAddLink}
                className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-sky-500/20 transition"
              >
                <Plus size={15} />
                <span>+ เพิ่มลิงก์ในโฟลเดอร์นี้</span>
              </button>
            )}

            {mode === 'employee-personal' && personalFolder && (
              <button
                type="button"
                onClick={() => {
                  setFolderNameEdit(personalFolder.name);
                  setFolderDescEdit(personalFolder.description);
                  setIsEditingFolderMeta((prev) => !prev);
                }}
                className={`px-3 py-2 rounded-2xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                  isLightTheme
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    : 'bg-white/10 hover:bg-white/20 border-white/15 text-slate-200'
                }`}
              >
                <Pencil size={13} />
                <span>แก้ไขชื่อโฟลเดอร์</span>
              </button>
            )}

            {mode === 'employee-sheet' && sheetFolder && (
              <a
                href={getEmployeeLinksSheetUrl(sheetFolder.gid)}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-3 py-2 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition ${
                  isLightTheme
                    ? 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-900 shadow-xs'
                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/30 text-emerald-300'
                }`}
              >
                <FileSpreadsheet size={14} />
                <span>เปิดแผ่นงาน Google Sheet</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>

        {/* =====================================================================
            กล่องลิงก์เฉพาะของโฟลเดอร์ (Shareable Folder URL) + ปุ่มก็อปส่งต่อ
           ===================================================================== */}
        <div
          className={`p-3.5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            isLightTheme
              ? 'bg-sky-50/90 border-sky-200/90'
              : 'bg-slate-900/90 border-sky-400/30'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
              <Link2 size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-bold ${
                    isLightTheme ? 'text-sky-900' : 'text-sky-300'
                  }`}
                >
                  ลิงก์เฉพาะของหน้าโฟลเดอร์นี้ (คัดลอกส่งต่อให้เพื่อนเปิดเข้าโฟลเดอร์นี้ได้ทันที):
                </span>
              </div>
              <p
                className={`text-xs font-mono truncate mt-0.5 select-all ${
                  isLightTheme ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                {shareUrl}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyFolderUrl}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition"
            >
              {copiedFolderUrl ? (
                <>
                  <Check size={14} />
                  <span>คัดลอกลิงก์แล้ว!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>ก็อปลิงก์โฟลเดอร์ส่งต่อ</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyFolderSummary}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                isLightTheme
                  ? 'bg-white hover:bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/35 text-emerald-300'
              }`}
            >
              {copiedFolderSummary ? (
                <>
                  <Check size={14} />
                  <span>คัดลอกข้อความแล้ว!</span>
                </>
              ) : (
                <>
                  <Share2 size={14} />
                  <span>ก็อปข้อความ + ลิงก์ส่ง LINE</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* แถบสลับโฟลเดอร์ด่วน (เปลี่ยนโฟลเดอร์พร้อมเปลี่ยนลิงก์เฉพาะทันที) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span
            className={`text-[11px] font-bold shrink-0 mr-1 ${
              isLightTheme ? 'text-slate-700' : 'text-slate-300'
            }`}
          >
            สลับโฟลเดอร์ด่วน:
          </span>

          {currentEmployee &&
            allPersonalFolders.map((pf) => {
              const active = mode === 'employee-personal' && pf.id === activeFolderId;
              return (
                <button
                  key={pf.id}
                  type="button"
                  onClick={() => onSwitchFolder({ folderId: pf.id })}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap flex items-center gap-1 transition ${
                    active
                      ? 'bg-pink-600 text-white shadow'
                      : isLightTheme
                      ? 'bg-pink-50 hover:bg-pink-100 text-pink-900 border border-pink-300'
                      : 'bg-pink-500/15 hover:bg-pink-500/25 text-pink-200 border border-pink-400/25'
                  }`}
                >
                  <Star size={11} className="fill-current" />
                  <span>{pf.name}</span>
                </button>
              );
            })}

          {currentEmployee &&
            allSheetFolders
              .filter((sf) => !sf.isArchive)
              .map((sf) => {
                const active = mode === 'employee-sheet' && sf.id === activeFolderId;
                return (
                  <button
                    key={sf.id}
                    type="button"
                    onClick={() => onSwitchFolder({ folderId: sf.id })}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition ${
                      active
                        ? 'bg-sky-600 text-white shadow'
                        : isLightTheme
                        ? 'bg-slate-100 hover:bg-sky-100 text-slate-800 border border-slate-300'
                        : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10'
                    }`}
                  >
                    {sf.sheetName}
                  </button>
                );
              })}

          {mode === 'category' &&
            allCategories.map((cat) => {
              const active = cat.id === activeFolderId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSwitchFolder({ categoryId: cat.id })}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition ${
                    active
                      ? 'bg-indigo-600 text-white shadow'
                      : isLightTheme
                      ? 'bg-slate-100 hover:bg-indigo-50 text-slate-800 border border-slate-300'
                      : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
        </div>
      </div>

      {/* แถบแจ้งเตือนสถานะเมื่อคัดลอกหรือเปลี่ยนลิงก์ */}
      {bannerMsg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-between gap-2 shadow-lg animate-fade-in ${
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
            className={isLightTheme ? 'text-emerald-800 hover:text-emerald-950' : 'text-emerald-300 hover:text-white'}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ฟอร์มแก้ไขชื่อโฟลเดอร์ส่วนตัว */}
      {isEditingFolderMeta && mode === 'employee-personal' && (
        <form
          onSubmit={handleSaveFolderMeta}
          className="p-4 rounded-2xl bg-slate-950 border-2 border-pink-500/40 space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-pink-300">
              แก้ไขชื่อและคำอธิบายโฟลเดอร์ส่วนตัว
            </span>
            <button
              type="button"
              onClick={() => setIsEditingFolderMeta(false)}
              className="p-1 rounded-lg bg-white/10 text-slate-300"
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
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs sm:text-sm text-white"
            />
            <input
              type="text"
              value={folderDescEdit}
              onChange={(e) => setFolderDescEdit(e.target.value)}
              placeholder="คำอธิบายโฟลเดอร์"
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs sm:text-sm text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditingFolderMeta(false)}
              className="px-3 py-1.5 rounded-xl bg-white/10 text-xs text-slate-300"
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

      {/* สมุดโน้ตประจำโฟลเดอร์ */}
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
        onNotesChanged={onRefreshWorkspace}
      />

      {/* ฟอร์มเพิ่มลิงก์ใหม่ หรือเปลี่ยนลิงก์เฉพาะ พร้อมบันทึกเวลาอัปเดตอัตโนมัติ */}
      {isLinkFormOpen && mode !== 'category' && (
        <form
          onSubmit={handleSaveEmployeeLink}
          className="p-4 sm:p-5 rounded-3xl bg-slate-950 border-2 border-sky-500/50 space-y-3.5 shadow-2xl animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-sky-400" />
              <h4 className="text-xs sm:text-sm font-bold text-white">
                {editingLinkId
                  ? 'เปลี่ยนลิงก์เฉพาะ / แก้ไขรายละเอียดลิงก์ (ระบบจะบันทึกวัน-เวลาที่เปลี่ยนลิงก์ให้อัตโนมัติ)'
                  : `เพิ่มลิงก์ใหม่ลงในโฟลเดอร์ "${activeFolderName}"`}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsLinkFormOpen(false);
                setEditingLinkId(null);
              }}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300"
            >
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                ชื่อลิงก์ / รายงาน *
              </label>
              <input
                type="text"
                required
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="เช่น รายงานจัดส่งตรงเวลา เดือนล่าสุด..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/15 focus:border-sky-400 text-xs sm:text-sm text-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                URL ลิงก์เฉพาะใหม่ *
              </label>
              <input
                type="text"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-sky-400/40 focus:border-sky-400 text-xs sm:text-sm text-white font-mono focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                หัวข้อ / ข้อประเมิน
              </label>
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="เช่น ข้อ 1.1"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 focus:border-sky-400 text-xs sm:text-sm text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              คำอธิบายการใช้งาน / หมายเหตุการเปลี่ยนลิงก์
            </label>
            <input
              type="text"
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              placeholder="เช่น อัปเดตลิงก์ชีตประจำเดือนใหม่ / ส่งข้อมูลก่อน 11:00 น."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/15 focus:border-sky-400 text-xs sm:text-sm text-white focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-amber-300 flex items-center gap-1.5">
              <Clock size={13} />
              <span>
                เมื่อกดบันทึก ระบบจะประทับเวลาเปลี่ยนลิงก์ล่าสุด ({formatLinkUpdatedTime(new Date().toISOString())} น.) ให้ทันที
              </span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsLinkFormOpen(false);
                  setEditingLinkId(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-slate-300"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-xs font-bold text-white shadow"
              >
                {editingLinkId ? 'บันทึกการเปลี่ยนลิงก์ & เวลาอัปเดต' : 'บันทึกลิงก์ลงโฟลเดอร์'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* แถบค้นหาในโฟลเดอร์ + ตัวกรองหัวข้อย่อย */}
      <div
        className={`p-4 rounded-3xl backdrop-blur-2xl border shadow-lg space-y-3 ${
          isLightTheme
            ? 'bg-white/85 border-sky-200/90'
            : 'bg-slate-950/65 border-white/15'
        }`}
      >
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`ค้นหาลิงก์หรือคำอธิบายในโฟลเดอร์ "${activeFolderName}"...`}
            className={`w-full pl-10 pr-9 py-2.5 rounded-2xl border text-xs sm:text-sm focus:outline-none ${
              isLightTheme
                ? 'bg-white border-sky-200 focus:border-sky-500 text-slate-800 placeholder:text-slate-400'
                : 'bg-slate-900 border-white/15 focus:border-sky-400 text-white placeholder:text-slate-500'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {topics.length > 1 && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`text-[11px] font-bold ${
                  isLightTheme ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                เลือกกรองตามหัวข้อ ({topics.length} หัวข้อทั้งหมดในแผ่นงานนี้):
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                  selectedTopic === 'all'
                    ? 'bg-sky-600 border-sky-700 text-white shadow'
                    : isLightTheme
                    ? 'bg-slate-100 hover:bg-sky-100 border-slate-300 text-slate-900'
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
                    title={subTopicLabel ? `ข้อ ${topic}: ${subTopicLabel} (${topicItems.length} ลิงก์)` : `หัวข้อ ${topic} (${topicItems.length} ลิงก์)`}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border flex items-center gap-1 ${
                      isSelected
                        ? 'bg-sky-600 border-sky-700 text-white shadow-md'
                        : isLightTheme
                        ? 'bg-sky-50 hover:bg-sky-100 border-sky-300 text-sky-950 shadow-2xs'
                        : 'bg-slate-900 hover:bg-sky-500/25 border-sky-400/35 text-sky-200'
                    }`}
                  >
                    <span>{topic}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        isSelected
                          ? 'bg-white/25 text-white'
                          : isLightTheme
                          ? 'bg-sky-200/90 text-sky-950'
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
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
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

      {/* ตารางรายการลิงก์แบบ 2 คอลัมน์ พร้อมเวลาเปลี่ยนลิงก์ล่าสุด & ปุ่มก็อปส่งต่อ */}
      <div className="space-y-2.5">
        <div
          className={`hidden sm:grid grid-cols-12 gap-3 px-4 py-2.5 rounded-2xl border text-xs font-semibold ${
            isLightTheme
              ? 'bg-sky-100/90 border-sky-200 text-sky-900'
              : 'bg-slate-950/85 border-white/15 text-sky-300'
          }`}
        >
          <div className="col-span-5">
            คอลัมน์ที่ 1 : เว็บ / ลิงก์รายงาน ({activeFolderName})
          </div>
          <div className="col-span-7">
            คอลัมน์ที่ 2 : คำอธิบาย, เวลาเปลี่ยนลิงก์ล่าสุด & ปุ่มคัดลอกส่งต่อ
          </div>
        </div>

        {mode === 'category' ? (
          filteredCategoryLinks.length === 0 ? (
            <div className="p-8 rounded-3xl bg-slate-950/60 border border-white/10 text-center text-xs text-slate-400">
              ไม่พบลิงก์ในหมวดหมู่นี้
            </div>
          ) : (
            filteredCategoryLinks.map((link) => (
              <div
                key={link.id}
                onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                className={`group grid grid-cols-12 gap-3 items-center p-4 rounded-2xl backdrop-blur-xl border shadow-md cursor-pointer transition-all ${
                  isLightTheme
                    ? 'bg-white/90 hover:bg-white border-sky-200/90 hover:border-sky-400'
                    : 'bg-slate-950/80 hover:bg-slate-900 border-white/10 hover:border-sky-400/50'
                }`}
              >
                <div className="col-span-12 sm:col-span-5 flex items-center gap-3 min-w-0 sm:border-r sm:border-white/10 sm:pr-3">
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
                        isLightTheme ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      {link.title}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-sky-400">
                      คลิกเปิดลิงก์ <ExternalLink size={10} />
                    </span>
                  </div>
                </div>

                <div className="col-span-12 sm:col-span-7 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                  <div className="min-w-0">
                    <p
                      className={`text-xs sm:text-sm leading-relaxed ${
                        isLightTheme ? 'text-slate-700' : 'text-slate-200'
                      }`}
                    >
                      {link.description || 'คลิกเพื่อเปิดใช้งานระบบ'}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                      {link.url}
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
                          ? 'bg-sky-100 hover:bg-sky-200 border-sky-300 text-sky-900'
                          : 'bg-sky-500/15 hover:bg-sky-500/30 border-sky-400/30 text-sky-200'
                      }`}
                      title="คัดลอกลิงก์พร้อมรายละเอียดส่งต่อ"
                    >
                      {copiedLinkId === link.id ? (
                        <>
                          <Check size={12} className={isLightTheme ? 'text-emerald-700' : 'text-emerald-400'} />
                          <span className={isLightTheme ? 'text-emerald-800' : 'text-emerald-300'}>ก็อปแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>ก็อปส่งต่อ</span>
                        </>
                      )}
                    </button>

                    {isEditMode && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditCategoryLink?.(link);
                          }}
                          className="p-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-300"
                          title="แก้ไขลิงก์"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteCategoryLink?.(link);
                          }}
                          className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 text-rose-300"
                          title="ลบลิงก์"
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
          <div className="p-8 rounded-3xl bg-slate-950/70 border border-dashed border-white/15 text-center space-y-3">
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              ยังไม่มีลิงก์ในโฟลเดอร์นี้ หรือไม่พบลิงก์ที่ตรงกับคำค้นหา
            </p>
            <button
              type="button"
              onClick={handleOpenAddLink}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-xs font-bold text-white inline-flex items-center gap-1.5 shadow"
            >
              <Plus size={14} />
              <span>เพิ่มลิงก์รายการแรกในโฟลเดอร์นี้</span>
            </button>
          </div>
        ) : (
          filteredEmployeeItems.map((item) => {
            const updatedTimeStr = formatLinkUpdatedTime(item.updatedAt);
            return (
              <div
                key={item.id}
                onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                className={`group grid grid-cols-12 gap-3 items-center p-3.5 sm:p-4 rounded-2xl backdrop-blur-xl border shadow-md cursor-pointer transition-all ${
                  isLightTheme
                    ? 'bg-white/90 hover:bg-white border-sky-200/90 hover:border-sky-400'
                    : 'bg-slate-950/80 hover:bg-slate-900 border-white/10 hover:border-sky-400/50'
                }`}
              >
                {/* คอลัมน์ที่ 1: ไอคอน + ป้ายหัวข้อ + ชื่อลิงก์ + เวลาเปลี่ยนลิงก์ล่าสุด */}
                <div className="col-span-12 sm:col-span-5 flex items-center gap-3 min-w-0 sm:border-r sm:border-white/10 sm:pr-3">
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
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-bold truncate max-w-[230px] sm:max-w-[280px] ${
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

                {/* คอลัมน์ที่ 2: คำอธิบาย + ปุ่มเปลี่ยนลิงก์ & ปุ่มก็อปส่งต่อ */}
                <div className="col-span-12 sm:col-span-7 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:pl-1 min-w-0">
                  <div className="min-w-0">
                    <p
                      className={`text-xs sm:text-sm leading-relaxed ${
                        isLightTheme ? 'text-slate-800 font-medium' : 'text-slate-200'
                      }`}
                    >
                      {item.description}
                    </p>
                    <p
                      className={`text-[10px] font-mono truncate mt-1 ${
                        isLightTheme ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      {item.url}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {/* ปุ่มก็อปส่งต่อ (คัดลอกชื่อลิงก์ + คำอธิบาย + เวลาอัปเดต + URL) */}
                    <button
                      type="button"
                      onClick={(e) => handleCopySingleLink(item, e)}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition ${
                        isLightTheme
                          ? 'bg-sky-100 hover:bg-sky-200 border-sky-300 text-sky-950 shadow-2xs'
                          : 'bg-sky-500/15 hover:bg-sky-500/30 border-sky-400/30 text-sky-200'
                      }`}
                      title="คัดลอกลิงก์พร้อมคำอธิบายเพื่อส่งต่อใน LINE"
                    >
                      {copiedLinkId === item.id ? (
                        <>
                          <Check size={12} className={isLightTheme ? 'text-emerald-700' : 'text-emerald-400'} />
                          <span className={isLightTheme ? 'text-emerald-900' : 'text-emerald-300'}>ก็อปแล้ว!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>ก็อปส่งต่อ</span>
                        </>
                      )}
                    </button>

                    {/* ปุ่มเปลี่ยนลิงก์เฉพาะ / แก้ไขลิงก์ */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditLink(item, e)}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition ${
                        isLightTheme
                          ? 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-950 shadow-2xs'
                          : 'bg-amber-500/15 hover:bg-amber-500/30 border-amber-400/30 text-amber-200'
                      }`}
                      title="เปลี่ยนลิงก์ URL ใหม่ หรือแก้ไขคำอธิบาย (พร้อมบันทึกเวลาเปลี่ยนลิงก์)"
                    >
                      <Pencil size={12} />
                      <span>เปลี่ยนลิงก์</span>
                    </button>

                    {/* ปุ่มเก็บเข้าโฟลเดอร์ส่วนตัว (กรณีดูอยู่ในโฟลเดอร์แผ่นงาน 17 แผ่นงาน) */}
                    {mode === 'employee-sheet' && currentEmployee && (
                      <button
                        type="button"
                        onClick={(e) => handleBookmarkToPersonal(item, e)}
                        className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition ${
                          isLightTheme
                            ? 'bg-pink-100 hover:bg-pink-200 border-pink-300 text-pink-950 shadow-2xs'
                            : 'bg-pink-500/15 hover:bg-pink-500/30 border-pink-400/30 text-pink-200'
                        }`}
                        title="เก็บลิงก์นี้เข้าโฟลเดอร์ส่วนตัวของฉัน"
                      >
                        <BookmarkPlus size={12} />
                        <span className="hidden lg:inline">เก็บส่วนตัว</span>
                      </button>
                    )}

                    {/* ปุ่มลบลิงก์ (สำหรับโฟลเดอร์ส่วนตัว หรือลิงก์ที่เพิ่มเอง) */}
                    {(mode === 'employee-personal' || item.isCustomAdded) && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteEmployeeLink(item, e)}
                        className={`p-1.5 rounded-xl border transition ${
                          isLightTheme
                            ? 'bg-rose-100 hover:bg-rose-200 border-rose-300 text-rose-800'
                            : 'bg-rose-500/15 hover:bg-rose-500/30 border-rose-400/30 text-rose-300'
                        }`}
                        title="ลบลิงก์นี้"
                      >
                        <Trash2 size={13} />
                      </button>
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

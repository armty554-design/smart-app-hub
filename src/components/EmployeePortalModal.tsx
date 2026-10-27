import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AppLink,
  EmployeeLinkItem,
  EmployeePersonalFolder,
  EmployeeProfile,
  EmployeeSheetFolder,
  IconShape,
} from '../types/app';
import {
  calculateWorkTenure,
  findEmployeeByCode,
} from '../services/employeeService';
import {
  addLinkToPersonalFolder,
  createPersonalFolder,
  deletePersonalFolder,
  getEmployeeFolders,
  getEmployeeLinksSheetUrl,
  getEmployeeScheduleItems,
  getFolderNotesCountMap,
  getPersonalFoldersForEmployee,
  movePersonalFolderOrder,
  removeLinkFromPersonalFolder,
  searchAcrossEmployeeFolders,
  syncEmployeeWorkspaceFromCloud,
  updateLinkInPersonalFolder,
  updatePersonalFolder,
} from '../services/employeeLinksService';
import { IconRenderer } from './IconRenderer';
import { FolderNotesSection } from './FolderNotesSection';
import {
  UserCheck,
  Building2,
  MapPin,
  Briefcase,
  Calendar,
  Clock,
  LogOut,
  X,
  Delete,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Users,
  ExternalLink,
  RefreshCw,
  BadgeCheck,
  Sparkles,
  LogIn,
  Folder,
  FolderOpen,
  FolderPlus,
  Search,
  ArrowLeft,
  FileSpreadsheet,
  History,
  Layers,
  Star,
  Plus,
  Pencil,
  Trash2,
  BookmarkPlus,
  StickyNote,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface EmployeePortalModalProps {
  isOpen: boolean;
  pageMode?: boolean;
  isLightTheme?: boolean;
  currentEmployee: EmployeeProfile | null;
  employees: EmployeeProfile[];
  links: AppLink[];
  iconShape: IconShape;
  isSyncingSheet: boolean;
  isLiveSheet: boolean;
  initialFolderId?: string | null;
  requireLogin?: boolean;
  pendingFolderBanner?: string | null;
  onLoginSuccess: (employee: EmployeeProfile) => void;
  onLogout: () => void;
  onRefreshSheet: () => Promise<void>;
  onWorkspaceChanged?: () => void;
  onOpenFolderPage?: (folderId: string) => void;
  onClose: () => void;
}

const PERSONAL_FOLDER_COLOR_PRESETS = [
  { label: 'ชมพูบานเย็น', value: '#ec4899' },
  { label: 'ฟ้าสดใส', value: '#0ea5e9' },
  { label: 'น้ำเงินคราม', value: '#6366f1' },
  { label: 'เขียวมรกต', value: '#10b981' },
  { label: 'ส้มอำพัน', value: '#f59e0b' },
  { label: 'ม่วงไวโอเล็ต', value: '#8b5cf6' },
  { label: 'แดงโรส', value: '#f43f5e' },
];

export const EmployeePortalModal: React.FC<EmployeePortalModalProps> = ({
  isOpen,
  pageMode = false,
  isLightTheme = false,
  currentEmployee,
  employees,
  iconShape,
  isSyncingSheet,
  isLiveSheet,
  initialFolderId = null,
  requireLogin = false,
  pendingFolderBanner = null,
  onLoginSuccess,
  onLogout,
  onRefreshSheet,
  onWorkspaceChanged,
  onOpenFolderPage,
  onClose,
}) => {
  const [enteredCode, setEnteredCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorShake, setErrorShake] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [activePortalTab, setActivePortalTab] = useState<
    'folders' | 'schedule' | 'card' | 'branch-team'
  >('card');

  // State สำหรับโฟลเดอร์ลิงก์พนักงาน (กรองแผ่นงานที่มีลิงก์จริง ไม่รวม ชีต5 ที่ไม่มีลิงก์)
  const employeeFolders = useMemo(
    () => getEmployeeFolders().filter((f) => f.id !== 'folder-sheet5' && f.links.length > 0),
    []
  );
  const scheduleItems = useMemo(() => getEmployeeScheduleItems(), []);

  // State สำหรับโฟลเดอร์ส่วนตัวของพนักงานแต่ละคน + จำนวนโน้ตในแต่ละโฟลเดอร์
  const [personalFolders, setPersonalFolders] = useState<EmployeePersonalFolder[]>([]);
  const [notesCountMap, setNotesCountMap] = useState<Record<string, number>>({});
  const [statusBanner, setStatusBanner] = useState<string>('');

  // ฟอร์มสร้าง/แก้ไขโฟลเดอร์ส่วนตัว
  const [isFolderFormOpen, setIsFolderFormOpen] = useState(false);
  const [editingPersonalFolderId, setEditingPersonalFolderId] = useState<string | null>(null);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [folderDescInput, setFolderDescInput] = useState('');
  const [folderColorInput, setFolderColorInput] = useState('#ec4899');

  // ฟอร์มเพิ่ม/แก้ไขลิงก์ส่วนตัวในโฟลเดอร์ส่วนตัว
  const [isPersonalLinkFormOpen, setIsPersonalLinkFormOpen] = useState(false);
  const [editingPersonalLinkId, setEditingPersonalLinkId] = useState<string | null>(null);
  const [linkTitleInput, setLinkTitleInput] = useState('');
  const [linkUrlInput, setLinkUrlInput] = useState('');
  const [linkTopicInput, setLinkTopicInput] = useState('');
  const [linkDescInput, setLinkDescInput] = useState('');

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderCategoryFilter, setFolderCategoryFilter] = useState<
    'active' | 'personal' | 'archive' | 'all'
  >('active');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [inFolderSearch, setInFolderSearch] = useState('');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>('all');

  const refreshPersonalWorkspace = useCallback(
    async (empCode?: string) => {
      const code = empCode || currentEmployee?.code;
      if (!code) {
        setPersonalFolders([]);
        setNotesCountMap(getFolderNotesCountMap('public'));
        return;
      }
      const localFolders = getPersonalFoldersForEmployee(code);
      setPersonalFolders(localFolders);
      setNotesCountMap(getFolderNotesCountMap(code));

      // ซิงค์ข้อมูลจาก Supabase Cloud แบบพื้นหลัง
      const synced = await syncEmployeeWorkspaceFromCloud(code);
      setPersonalFolders(synced.personalFolders);
      setNotesCountMap(getFolderNotesCountMap(code));
      onWorkspaceChanged?.();
    },
    [currentEmployee?.code, onWorkspaceChanged]
  );

  useEffect(() => {
    if (isOpen) {
      setEnteredCode('');
      setErrorMsg('');
      setErrorShake(false);
      refreshPersonalWorkspace(currentEmployee?.code);

      if (initialFolderId === '__create_personal__') {
        setActivePortalTab('folders');
        setSelectedFolderId(null);
        setEditingPersonalFolderId(null);
        setFolderNameInput('');
        setFolderDescInput('');
        setFolderColorInput('#ec4899');
        setIsFolderFormOpen(true);
      } else if (initialFolderId === '__all_folders__') {
        setActivePortalTab('folders');
        setSelectedFolderId(null);
      } else if (initialFolderId === '__user_profile__') {
        setActivePortalTab('card');
        setSelectedFolderId(null);
      } else if (initialFolderId) {
        setActivePortalTab('folders');
        setSelectedFolderId(initialFolderId);
        setInFolderSearch('');
        setSelectedTopicFilter('all');
      } else {
        setActivePortalTab('card');
      }
    }
  }, [isOpen, currentEmployee?.code, initialFolderId, refreshPersonalWorkspace]);

  // ตรวจจับการกดปุ่มตัวเลขบนคีย์บอร์ดเมื่ออยู่ในหน้าล็อกอินพนักงาน
  useEffect(() => {
    if (!isOpen || currentEmployee) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleAttemptLogin(enteredCode);
      } else if (e.key === 'Escape' && !requireLogin) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!isOpen) return null;

  const showTempBanner = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => {
      setStatusBanner((prev) => (prev === msg ? '' : prev));
    }, 3200);
  };

  const matchedPreview =
    enteredCode.length >= 4 ? findEmployeeByCode(enteredCode, employees) : null;

  const handleDigit = (digit: string) => {
    if (enteredCode.length >= 10) return;
    const next = enteredCode + digit;
    setEnteredCode(next);
    setErrorMsg('');

    const found = findEmployeeByCode(next, employees);
    if (found && next.length === 6) {
      setTimeout(() => {
        onLoginSuccess(found);
      }, 180);
    }
  };

  const handleBackspace = () => {
    setEnteredCode((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleAttemptLogin = (codeToTry: string) => {
    const clean = codeToTry.trim();
    if (!clean) {
      setErrorMsg('กรุณากรอกรหัสพนักงาน (เช่น 171785)');
      return;
    }
    const found = findEmployeeByCode(clean, employees);
    if (found) {
      onLoginSuccess(found);
    } else {
      setErrorShake(true);
      setErrorMsg(`ไม่พบรหัสพนักงาน "${clean}" ในแผ่นงาน "พนักงาน"`);
      setTimeout(() => setErrorShake(false), 550);
    }
  };

  const handleCopyEmpCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // ============================================================================
  // การจัดการโฟลเดอร์ส่วนตัวของพนักงาน (สร้าง / แก้ไข / ลบโฟลเดอร์ และเพิ่ม/ลบลิงก์)
  // ============================================================================
  const handleOpenCreatePersonalFolder = () => {
    setEditingPersonalFolderId(null);
    setFolderNameInput('');
    setFolderDescInput('');
    setFolderColorInput('#ec4899');
    setIsFolderFormOpen(true);
  };

  const handleOpenEditPersonalFolder = (folder: EmployeePersonalFolder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingPersonalFolderId(folder.id);
    setFolderNameInput(folder.name);
    setFolderDescInput(folder.description);
    setFolderColorInput(folder.color || '#ec4899');
    setIsFolderFormOpen(true);
  };

  const handleSavePersonalFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee || !folderNameInput.trim()) return;

    if (editingPersonalFolderId) {
      const updated = await updatePersonalFolder(currentEmployee.code, editingPersonalFolderId, {
        name: folderNameInput,
        description: folderDescInput,
        color: folderColorInput,
      });
      setPersonalFolders(updated);
      showTempBanner(`แก้ไขโฟลเดอร์ส่วนตัว "${folderNameInput.trim()}" เรียบร้อยแล้ว`);
    } else {
      const updated = await createPersonalFolder(currentEmployee.code, {
        name: folderNameInput,
        description: folderDescInput,
        color: folderColorInput,
      });
      setPersonalFolders(updated);
      showTempBanner(`สร้างโฟลเดอร์ส่วนตัว "${folderNameInput.trim()}" เรียบร้อยแล้ว`);
    }

    setIsFolderFormOpen(false);
    setEditingPersonalFolderId(null);
    onWorkspaceChanged?.();
  };

  const handleDeletePersonalFolder = async (
    folder: EmployeePersonalFolder,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    if (!currentEmployee) return;
    if (
      !window.confirm(
        `ต้องการลบโฟลเดอร์ส่วนตัว "${folder.name}" ของคุณใช่หรือไม่?`
      )
    ) {
      return;
    }
    const updated = await deletePersonalFolder(currentEmployee.code, folder.id);
    setPersonalFolders(updated);
    if (selectedFolderId === folder.id) {
      setSelectedFolderId(null);
    }
    showTempBanner(`ลบโฟลเดอร์ส่วนตัว "${folder.name}" เรียบร้อยแล้ว`);
    onWorkspaceChanged?.();
  };

  const handleMovePersonalFolder = async (
    folderId: string,
    direction: 'left' | 'right',
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    if (!currentEmployee) return;
    const updated = await movePersonalFolderOrder(currentEmployee.code, folderId, direction);
    setPersonalFolders(updated);
    onWorkspaceChanged?.();
  };

  const handleOpenAddPersonalLink = () => {
    setEditingPersonalLinkId(null);
    setLinkTitleInput('');
    setLinkUrlInput('');
    setLinkTopicInput('งานประจำวัน');
    setLinkDescInput('');
    setIsPersonalLinkFormOpen(true);
  };

  const handleOpenEditPersonalLink = (link: EmployeeLinkItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingPersonalLinkId(link.id);
    setLinkTitleInput(link.title);
    setLinkUrlInput(link.url);
    setLinkTopicInput(link.codeOrTopic || 'ส่วนตัว');
    setLinkDescInput(link.description || '');
    setIsPersonalLinkFormOpen(true);
  };

  const handleSavePersonalLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee || !selectedFolderId || !linkTitleInput.trim() || !linkUrlInput.trim()) {
      return;
    }

    if (editingPersonalLinkId) {
      const updated = await updateLinkInPersonalFolder(
        currentEmployee.code,
        selectedFolderId,
        editingPersonalLinkId,
        {
          title: linkTitleInput,
          url: linkUrlInput,
          codeOrTopic: linkTopicInput,
          description: linkDescInput,
        }
      );
      setPersonalFolders(updated);
      showTempBanner(`อัปเดตลิงก์ส่วนตัว "${linkTitleInput.trim()}" เรียบร้อยแล้ว`);
    } else {
      const updated = await addLinkToPersonalFolder(currentEmployee.code, selectedFolderId, {
        title: linkTitleInput,
        url: linkUrlInput,
        codeOrTopic: linkTopicInput,
        description: linkDescInput,
      });
      setPersonalFolders(updated);
      showTempBanner(`เพิ่มลิงก์ "${linkTitleInput.trim()}" ลงในโฟลเดอร์ส่วนตัวแล้ว`);
    }

    setIsPersonalLinkFormOpen(false);
    setEditingPersonalLinkId(null);
    onWorkspaceChanged?.();
  };

  const handleRemovePersonalLink = async (link: EmployeeLinkItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentEmployee || !selectedFolderId) return;
    if (!window.confirm(`ต้องการลบลิงก์ "${link.title}" ออกจากโฟลเดอร์ส่วนตัวใช่หรือไม่?`)) {
      return;
    }
    const updated = await removeLinkFromPersonalFolder(
      currentEmployee.code,
      selectedFolderId,
      link.id
    );
    setPersonalFolders(updated);
    showTempBanner(`นำลิงก์ "${link.title}" ออกจากโฟลเดอร์ส่วนตัวแล้ว`);
    onWorkspaceChanged?.();
  };

  const handleBookmarkLinkToPersonal = async (
    item: EmployeeLinkItem,
    targetPersonalFolderId?: string,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    if (!currentEmployee) return;
    const targetFolder =
      personalFolders.find((f) => f.id === targetPersonalFolderId) || personalFolders[0];
    if (!targetFolder) return;

    const alreadyExists = targetFolder.links.some((l) => l.url === item.url && l.title === item.title);
    if (alreadyExists) {
      showTempBanner(`ลิงก์ "${item.title}" อยู่ในโฟลเดอร์ "${targetFolder.name}" แล้ว`);
      return;
    }

    const updated = await addLinkToPersonalFolder(currentEmployee.code, targetFolder.id, {
      title: item.title,
      url: item.url,
      codeOrTopic: item.codeOrTopic || 'บันทึกจากแผ่นงาน',
      description: item.description,
      badge: item.badge,
      iconName: item.iconName,
      bgStyle: item.bgStyle,
    });
    setPersonalFolders(updated);
    showTempBanner(`⭐ เก็บลิงก์ "${item.title}" เข้าโฟลเดอร์ส่วนตัว "${targetFolder.name}" แล้ว!`);
    onWorkspaceChanged?.();
  };

  const branchColleagues = currentEmployee
    ? employees.filter((e) => e.branch && e.branch === currentEmployee.branch)
    : [];

  // ตรวจสอบว่าโฟลเดอร์ที่กำลังเปิดอยู่เป็น "โฟลเดอร์ส่วนตัว" หรือ "โฟลเดอร์แผ่นงาน 17 แผ่นงาน"
  const activePersonalFolder: EmployeePersonalFolder | null = selectedFolderId
    ? personalFolders.find((f) => f.id === selectedFolderId) || null
    : null;

  const activeSheetFolder: EmployeeSheetFolder | null =
    selectedFolderId && !activePersonalFolder
      ? employeeFolders.find((f) => f.id === selectedFolderId) || null
      : null;

  const activeFolder: EmployeeSheetFolder | null = activePersonalFolder
    ? {
        id: activePersonalFolder.id,
        sheetName: activePersonalFolder.name,
        gid: 'personal',
        description: activePersonalFolder.description,
        color: activePersonalFolder.color,
        iconName: activePersonalFolder.iconName,
        links: activePersonalFolder.links,
      }
    : activeSheetFolder;

  const isViewingPersonalFolder = Boolean(activePersonalFolder);

  const visibleFolders = employeeFolders.filter((f) => {
    if (folderCategoryFilter === 'personal') return false;
    if (folderCategoryFilter === 'active') return !f.isArchive;
    if (folderCategoryFilter === 'archive') return Boolean(f.isArchive);
    return true;
  });

  const totalLinksCount = employeeFolders.reduce(
    (sum, f) => sum + f.links.length,
    0
  );

  // รายการหัวข้อย่อยในโฟลเดอร์ที่เปิดอยู่
  const folderTopics = activeFolder
    ? Array.from(
        new Set(activeFolder.links.map((l) => l.codeOrTopic).filter(Boolean))
      )
    : [];

  const filteredFolderLinks = activeFolder
    ? activeFolder.links.filter((item) => {
        if (
          selectedTopicFilter !== 'all' &&
          item.codeOrTopic !== selectedTopicFilter
        ) {
          return false;
        }
        if (!inFolderSearch.trim()) return true;
        const q = inFolderSearch.trim().toLowerCase();
        return `${item.codeOrTopic} ${item.subTopic || ''} ${item.title} ${
          item.description
        } ${item.badge || ''}`
          .toLowerCase()
          .includes(q);
      })
    : [];

  const globalSearchResults = globalSearchQuery.trim()
    ? searchAcrossEmployeeFolders(
        globalSearchQuery,
        employeeFolders,
        true,
        personalFolders
      )
    : [];

  return (
    <div
      onClick={() => {
        if (!pageMode && (!requireLogin || currentEmployee)) onClose();
      }}
      className={
        pageMode
          ? 'w-full space-y-4 animate-fade-in'
          : 'fixed inset-0 z-[65] flex items-center justify-center p-2.5 sm:p-5 bg-slate-950/80 backdrop-blur-2xl overflow-y-auto animate-fade-in'
      }
    >
      {/* แถบนำทางด้านบนเมื่อเปิดแบบหน้าเต็ม (เปลี่ยนหน้าแทนป๊อปอัพ) */}
      {pageMode && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-3xl backdrop-blur-2xl border shadow-lg ${
            isLightTheme
              ? 'bg-white/90 border-sky-200 text-slate-900'
              : 'bg-slate-950/75 border-white/15 text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className={`px-3.5 py-2 rounded-2xl border text-xs sm:text-sm font-bold flex items-center gap-2 transition shadow-sm ${
                isLightTheme
                  ? 'bg-sky-600 hover:bg-sky-500 border-sky-600 text-white'
                  : 'bg-white/15 hover:bg-sky-600 border-white/20 text-white'
              }`}
            >
              <ArrowLeft size={16} />
              <span>กลับหน้าโฮมหลัก</span>
            </button>
            <span
              className={`text-xs sm:text-sm font-bold ${
                isLightTheme ? 'text-slate-800' : 'text-slate-200'
              }`}
            >
              {currentEmployee
                ? `หน้าข้อมูลพนักงาน & พื้นที่ส่วนตัวของ ${currentEmployee.fullName}`
                : 'หน้าเข้าสู่ระบบสำหรับพนักงาน'}
            </span>
          </div>

          {currentEmployee && (
            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 py-2 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-bold text-rose-500 dark:text-rose-300 flex items-center gap-1.5 transition"
            >
              <LogOut size={14} />
              <span>สลับรหัสพนักงาน / ออกจากระบบ</span>
            </button>
          )}
        </div>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${
          pageMode
            ? currentEmployee
              ? 'w-full'
              : 'max-w-lg mx-auto'
            : currentEmployee
            ? 'max-w-5xl my-auto max-h-[93vh]'
            : 'max-w-md my-auto max-h-[93vh]'
        } rounded-3xl bg-slate-900 border border-white/15 shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col ${
          errorShake ? 'animate-shake' : ''
        }`}
      >
        {/* ปุ่มปิดหน้าต่าง (แสดงเฉพาะโหมดป๊อปอัพ) */}
        {!pageMode && (!requireLogin || currentEmployee) && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/75 hover:text-white transition"
          >
            <X size={18} />
          </button>
        )}

        {/* =====================================================================
            กรณีที่ 1: ยังไม่ได้ล็อกอิน -> แสดงหน้าเข้าสู่ระบบด้วยรหัสพนักงาน
           ===================================================================== */}
        {!currentEmployee ? (
          <div className="p-6 sm:p-8 text-center space-y-5">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/30 border border-white/20">
              <UserCheck size={28} />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-semibold text-emerald-300 mb-2">
                <Sparkles size={11} />
                <span>
                  สำหรับพนักงาน ({employees.length} คน) • โฟลเดอร์ส่วนตัว + 17 แผ่นงาน
                </span>
              </div>
              <h2 className="text-xl font-bold text-white">
                เข้าสู่ระบบสำหรับพนักงาน
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                กรอก <strong className="text-sky-300">รหัสพนักงาน 6 หลัก</strong>{' '}
                เพื่อเข้าถึงโฟลเดอร์ส่วนตัว สมุดโน้ต และโฟลเดอร์ลิงก์งาน 17 แผ่นงาน
              </p>
              {pendingFolderBanner && (
                <div className="mt-3 p-2.5 rounded-xl bg-sky-500/15 border border-sky-400/35 text-xs font-semibold text-sky-200">
                  {pendingFolderBanner}
                </div>
              )}
            </div>

            {/* ช่องแสดงรหัสพนักงานที่พิมพ์ */}
            <div className="space-y-2">
              <div className="relative max-w-[280px] mx-auto">
                <input
                  type="text"
                  inputMode="numeric"
                  value={enteredCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setEnteredCode(val);
                    setErrorMsg('');
                    const found = findEmployeeByCode(val, employees);
                    if (found && val.length === 6) {
                      setTimeout(() => onLoginSuccess(found), 180);
                    }
                  }}
                  placeholder="กรอกรหัสพนักงาน..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border-2 border-sky-500/40 focus:border-sky-400 text-center text-xl font-mono font-bold tracking-[0.25em] text-white placeholder:text-slate-600 placeholder:tracking-normal placeholder:text-sm focus:outline-none"
                />
              </div>

              {matchedPreview && (
                <div className="max-w-[280px] mx-auto p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-xs text-emerald-200 flex items-center justify-center gap-2 animate-fade-in">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span className="truncate font-semibold">
                    {matchedPreview.fullName} ({matchedPreview.branch})
                  </span>
                </div>
              )}

              {errorMsg && (
                <p className="text-xs text-rose-400 font-medium flex items-center justify-center gap-1.5">
                  <AlertCircle size={14} />
                  <span>{errorMsg}</span>
                </p>
              )}
            </div>

            {/* แป้นกดตัวเลข */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleDigit(num)}
                  className="h-13 py-3 rounded-2xl bg-white/10 hover:bg-sky-500/25 active:scale-95 border border-white/10 hover:border-sky-400/40 text-lg font-bold text-white transition flex items-center justify-center shadow-sm"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setEnteredCode('');
                  setErrorMsg('');
                }}
                className="h-13 py-3 rounded-2xl bg-white/5 hover:bg-white/15 active:scale-95 text-xs font-medium text-slate-300 transition flex items-center justify-center"
              >
                ล้างค่า
              </button>
              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="h-13 py-3 rounded-2xl bg-white/10 hover:bg-sky-500/25 active:scale-95 border border-white/10 hover:border-sky-400/40 text-lg font-bold text-white transition flex items-center justify-center shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-13 py-3 rounded-2xl bg-white/5 hover:bg-white/15 active:scale-95 text-slate-300 transition flex items-center justify-center"
                title="ลบตัวเลข"
              >
                <Delete size={19} />
              </button>
            </div>

            <div className="max-w-[260px] mx-auto pt-1 space-y-2.5">
              <button
                type="button"
                onClick={() => handleAttemptLogin(enteredCode)}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition"
              >
                <LogIn size={16} />
                เข้าสู่ระบบพนักงาน
              </button>

              <button
                type="button"
                onClick={onRefreshSheet}
                disabled={isSyncingSheet}
                className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 transition"
              >
                <RefreshCw
                  size={12}
                  className={isSyncingSheet ? 'animate-spin text-sky-400' : ''}
                />
                <span>
                  {isSyncingSheet
                    ? 'กำลังดึงข้อมูลล่าสุดจาก Google Sheets...'
                    : 'ซิงค์รายชื่อล่าสุดจาก Google Sheets'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* =====================================================================
              กรณีที่ 2: ล็อกอินแล้ว -> แสดงโฟลเดอร์ส่วนตัวของพนักงาน + โฟลเดอร์ 17 แผ่นงาน + โน้ตในโฟลเดอร์
             ===================================================================== */
          <div className="flex flex-col h-full overflow-hidden">
            {/* ส่วนหัวบัตรพนักงาน */}
            <div className="relative px-5 sm:px-6 pt-5 pb-4 bg-gradient-to-br from-sky-700 via-indigo-800 to-slate-900 border-b border-white/15">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-9">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-xl border-2 border-white/30 flex flex-col items-center justify-center text-white shadow-xl shrink-0">
                    <span className="text-[9px] uppercase tracking-wider text-sky-200 font-semibold">
                      ZONE
                    </span>
                    <span className="text-lg font-black leading-none mt-0.5">
                      {currentEmployee.zone || '-'}
                    </span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/30 text-[10px] font-semibold text-emerald-200">
                        <BadgeCheck size={12} className="text-emerald-300" />
                        <span>รหัสพนักงาน {currentEmployee.code}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-400/20 border border-sky-300/30 text-[10px] font-semibold text-sky-100">
                        สาขา{currentEmployee.branch || '-'}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
                      {currentEmployee.fullName}
                    </h2>
                    <p className="text-xs text-sky-200 font-medium">
                      {currentEmployee.position || 'เจ้าหน้าที่ประจำสาขา'} • อายุงาน{' '}
                      {calculateWorkTenure(currentEmployee.startDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* แถบเมนูย่อยในหน้าสำหรับพนักงาน */}
              <div className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActivePortalTab('card')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                    activePortalTab === 'card'
                      ? 'bg-white text-slate-900 shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-white/90'
                  }`}
                >
                  <UserCheck
                    size={14}
                    className={activePortalTab === 'card' ? 'text-sky-600' : 'text-sky-300'}
                  />
                  <span>บัตรข้อมูลพนักงาน</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActivePortalTab('folders');
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                    activePortalTab === 'folders'
                      ? 'bg-white text-slate-900 shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-white/90'
                  }`}
                >
                  <FolderOpen
                    size={14}
                    className={activePortalTab === 'folders' ? 'text-sky-600' : 'text-sky-300'}
                  />
                  <span>
                    จัดการโฟลเดอร์ส่วนตัว ({personalFolders.length}) & แผ่นงาน ({employeeFolders.length})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePortalTab('branch-team')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    activePortalTab === 'branch-team'
                      ? 'bg-white text-slate-900 shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-white/85'
                  }`}
                >
                  <Users size={14} />
                  <span>เพื่อนร่วมสาขา ({branchColleagues.length})</span>
                </button>
              </div>
            </div>

            {/* แถบแจ้งเตือนสถานะเมื่อบันทึกโฟลเดอร์/โน้ต/ลิงก์ */}
            {statusBanner && (
              <div className="mx-4 sm:mx-6 mt-3 px-4 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-xs font-semibold text-emerald-200 flex items-center justify-between gap-2 animate-fade-in">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span>{statusBanner}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setStatusBanner('')}
                  className="text-emerald-300 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* เนื้อหาในแต่ละแท็บของหน้าพนักงาน */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* =====================================================================
                  แท็บที่ 1: โฟลเดอร์ส่วนตัวของพนักงานแต่ละคน + โฟลเดอร์ 17 แผ่นงาน + โน้ตในโฟลเดอร์
                 ===================================================================== */}
              {activePortalTab === 'folders' && (
                <>
                  {/* ฟอร์มสร้างหรือแก้ไขโฟลเดอร์ส่วนตัวของพนักงาน */}
                  {isFolderFormOpen && (
                    <form
                      onSubmit={handleSavePersonalFolder}
                      className="p-4 rounded-2xl bg-slate-950 border-2 border-pink-500/40 space-y-3.5 shadow-xl animate-fade-in"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FolderPlus size={17} className="text-pink-400" />
                          <h4 className="text-sm font-bold text-white">
                            {editingPersonalFolderId
                              ? 'แก้ไขโฟลเดอร์ส่วนตัวของคุณ'
                              : `สร้างโฟลเดอร์ส่วนตัวใหม่ (เฉพาะรหัสพนักงาน ${currentEmployee.code})`}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsFolderFormOpen(false);
                            setEditingPersonalFolderId(null);
                          }}
                          className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            ชื่อโฟลเดอร์ส่วนตัว *
                          </label>
                          <input
                            type="text"
                            required
                            value={folderNameInput}
                            onChange={(e) => setFolderNameInput(e.target.value)}
                            placeholder="เช่น งานประจำวันของฉัน, ลิงก์สาขา, รายงานส่งเช้า..."
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/15 focus:border-pink-400 text-xs sm:text-sm text-white focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            คำอธิบายโฟลเดอร์ส่วนตัว
                          </label>
                          <input
                            type="text"
                            value={folderDescInput}
                            onChange={(e) => setFolderDescInput(e.target.value)}
                            placeholder="เช่น รวมลิงก์และสมุดโน้ตที่ใช้ทุกวัน"
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/15 focus:border-pink-400 text-xs sm:text-sm text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-400">สีโฟลเดอร์:</span>
                          {PERSONAL_FOLDER_COLOR_PRESETS.map((preset) => (
                            <button
                              key={preset.value}
                              type="button"
                              onClick={() => setFolderColorInput(preset.value)}
                              className={`w-7 h-7 rounded-full border-2 transition flex items-center justify-center ${
                                folderColorInput === preset.value
                                  ? 'border-white scale-110 shadow-lg'
                                  : 'border-transparent opacity-75 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: preset.value }}
                              title={preset.label}
                            >
                              {folderColorInput === preset.value && (
                                <Check size={13} className="text-white" />
                              )}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsFolderFormOpen(false);
                              setEditingPersonalFolderId(null);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-slate-300"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-xs font-bold text-white shadow"
                          >
                            {editingPersonalFolderId ? 'บันทึกการแก้ไข' : 'สร้างโฟลเดอร์ส่วนตัว'}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {!activeFolder ? (
                    /* มุมมองรวมโฟลเดอร์: แสดงโฟลเดอร์ส่วนตัวของพนักงาน + โฟลเดอร์ 17 แผ่นงาน */
                    <div className="space-y-5">
                      {/* แถบค้นหาข้ามทุกโฟลเดอร์ + สวิตช์กรองหมวดโฟลเดอร์ */}
                      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                        <div className="relative flex-1">
                          <Search
                            size={16}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-400"
                          />
                          <input
                            type="text"
                            value={globalSearchQuery}
                            onChange={(e) => setGlobalSearchQuery(e.target.value)}
                            placeholder="ค้นหาลิงก์จากโฟลเดอร์ส่วนตัวและทั้ง 17 แผ่นงาน (เช่น 1.1, จัดส่งตรงเวลา, CRM, Power BI)..."
                            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-950 border border-white/15 focus:border-sky-400 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none"
                          />
                          {globalSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setGlobalSearchQuery('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-white/10 overflow-x-auto no-scrollbar shrink-0">
                          <button
                            type="button"
                            onClick={() => setFolderCategoryFilter('active')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                              folderCategoryFilter === 'active'
                                ? 'bg-sky-600 text-white shadow'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <Layers size={13} />
                            <span>หน้าหลัก + ปัจจุบัน</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFolderCategoryFilter('personal')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                              folderCategoryFilter === 'personal'
                                ? 'bg-pink-600 text-white shadow'
                                : 'text-pink-300 hover:text-white'
                            }`}
                          >
                            <Star size={13} />
                            <span>ส่วนตัวของฉัน ({personalFolders.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFolderCategoryFilter('archive')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                              folderCategoryFilter === 'archive'
                                ? 'bg-sky-600 text-white shadow'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <History size={13} />
                            <span>ปีย้อนหลัง 64-68 (5)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFolderCategoryFilter('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                              folderCategoryFilter === 'all'
                                ? 'bg-sky-600 text-white shadow'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            ทั้งหมด
                          </button>
                        </div>
                      </div>

                      {/* กรณีมีการพิมพ์ค้นหา -> แสดงผลลัพธ์การค้นหาแบบตาราง 2 คอลัมน์พร้อมปุ่มเก็บเข้าส่วนตัว */}
                      {globalSearchQuery.trim() ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                            <span>
                              ผลการค้นหา &quot;{globalSearchQuery}&quot; จากโฟลเดอร์ส่วนตัวและทุกแผ่นงาน
                            </span>
                            <span className="text-sky-300 font-semibold">
                              พบ {globalSearchResults.length} ลิงก์
                            </span>
                          </div>

                          {globalSearchResults.length === 0 ? (
                            <div className="p-8 rounded-2xl bg-slate-950/60 border border-white/10 text-center text-xs text-slate-400">
                              ไม่พบลิงก์ที่ตรงกับคำค้นหา &quot;{globalSearchQuery}&quot;
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {globalSearchResults.map(({ folder, link, isPersonalFolder }) => (
                                <div
                                  key={`${folder.id}-${link.id}`}
                                  onClick={() =>
                                    window.open(
                                      link.url,
                                      '_blank',
                                      'noopener,noreferrer'
                                    )
                                  }
                                  className="group grid grid-cols-12 gap-3 items-center p-3.5 rounded-2xl bg-slate-950/75 hover:bg-slate-800/80 border border-white/10 hover:border-sky-400/50 cursor-pointer transition"
                                >
                                  <div className="col-span-12 sm:col-span-5 flex items-center gap-3 min-w-0 sm:border-r sm:border-white/10 sm:pr-3">
                                    <div className="shrink-0">
                                      <IconRenderer
                                        iconType="library"
                                        iconName={link.iconName}
                                        iconUrl=""
                                        linkUrl={link.url}
                                        imageFit="cover"
                                        bgStyle={link.bgStyle}
                                        iconColor="#ffffff"
                                        shape={iconShape}
                                        size="sm"
                                        badgeText={link.badge}
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-1 mb-0.5">
                                        <span
                                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                            isPersonalFolder
                                              ? 'bg-pink-500/20 text-pink-300'
                                              : 'bg-sky-500/20 text-sky-300'
                                          }`}
                                        >
                                          {folder.sheetName}
                                        </span>
                                        {link.codeOrTopic && (
                                          <span className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 text-[10px] font-mono">
                                            {link.codeOrTopic}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs sm:text-sm font-bold text-white group-hover:text-sky-300 line-clamp-2">
                                        {link.title}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="col-span-12 sm:col-span-7 flex items-center justify-between gap-3 min-w-0">
                                    <div className="min-w-0">
                                      <p className="text-xs text-slate-200 leading-relaxed">
                                        {link.description}
                                      </p>
                                      <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                                        {link.url}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {!isPersonalFolder && (
                                        <button
                                          type="button"
                                          onClick={(e) =>
                                            handleBookmarkLinkToPersonal(link, undefined, e)
                                          }
                                          className="px-2.5 py-1.5 rounded-xl bg-pink-500/15 hover:bg-pink-500/30 border border-pink-400/30 text-[11px] font-semibold text-pink-200 flex items-center gap-1 transition"
                                          title="เก็บลิงก์นี้เข้าโฟลเดอร์ส่วนตัวของฉัน"
                                        >
                                          <BookmarkPlus size={13} />
                                          <span className="hidden md:inline">เก็บเข้าส่วนตัว</span>
                                        </button>
                                      )}
                                      <ExternalLink
                                        size={15}
                                        className="text-slate-400 group-hover:text-sky-300 shrink-0"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* ===============================================================
                              หมวดที่ 1: โฟลเดอร์ส่วนตัวของพนักงานแต่ละคน (แยกตามรหัสพนักงาน)
                             =============================================================== */}
                          {folderCategoryFilter !== 'archive' && (
                            <div className="p-4 rounded-3xl bg-gradient-to-br from-pink-950/35 via-slate-950/85 to-indigo-950/40 border border-pink-400/30 space-y-3.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Star size={17} className="text-pink-400 fill-pink-400" />
                                    <h3 className="text-sm sm:text-base font-bold text-white">
                                      โฟลเดอร์ส่วนตัวของ {currentEmployee.firstName} (เฉพาะรหัส{' '}
                                      {currentEmployee.code})
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-400/30 text-[10px] font-bold text-pink-200 flex items-center gap-1">
                                      <Lock size={10} /> ส่วนตัวเฉพาะคุณ
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-300 mt-0.5">
                                    สร้างโฟลเดอร์ส่วนตัว เก็บลิงก์ที่ใช้บ่อย และจดสมุดโน้ตส่วนตัวของคุณได้ไม่จำกัด
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={handleOpenCreatePersonalFolder}
                                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-pink-500/20 transition"
                                >
                                  <FolderPlus size={14} />
                                  <span>+ สร้างโฟลเดอร์ส่วนตัวใหม่</span>
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {personalFolders.map((pFolder, pIdx) => {
                                  const noteCount = notesCountMap[pFolder.id] || 0;
                                  return (
                                    <div
                                      key={pFolder.id}
                                      onClick={() => {
                                        if (onOpenFolderPage) {
                                          onOpenFolderPage(pFolder.id);
                                          return;
                                        }
                                        setSelectedFolderId(pFolder.id);
                                        setInFolderSearch('');
                                        setSelectedTopicFilter('all');
                                      }}
                                      className="group relative rounded-2xl bg-slate-900/90 hover:bg-slate-800/95 border border-pink-400/30 hover:border-pink-400/70 p-4 cursor-pointer transition-all hover:-translate-y-0.5 shadow-lg flex flex-col justify-between gap-3"
                                    >
                                      <div>
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex items-center gap-3 min-w-0">
                                            <div
                                              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                                              style={{
                                                background: `linear-gradient(135deg, ${pFolder.color} 0%, #1e293b 100%)`,
                                              }}
                                            >
                                              <Star size={20} className="fill-white/90" />
                                            </div>
                                            <div className="min-w-0">
                                              <h4 className="text-sm font-bold text-white group-hover:text-pink-300 truncate">
                                                {pFolder.name}
                                              </h4>
                                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                                <span className="text-[11px] font-semibold text-pink-300">
                                                  {pFolder.links.length} ลิงก์
                                                </span>
                                                <span className="text-slate-600">•</span>
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                                                  <StickyNote size={11} />
                                                  {noteCount} โน้ต
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1 shrink-0">
                                            {personalFolders.length > 1 && (
                                              <>
                                                <button
                                                  type="button"
                                                  disabled={pIdx === 0}
                                                  onClick={(e) =>
                                                    handleMovePersonalFolder(pFolder.id, 'left', e)
                                                  }
                                                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-slate-300 hover:text-white transition"
                                                  title="เลื่อนโฟลเดอร์ไปทางซ้าย"
                                                >
                                                  <ChevronLeft size={12} />
                                                </button>
                                                <button
                                                  type="button"
                                                  disabled={pIdx === personalFolders.length - 1}
                                                  onClick={(e) =>
                                                    handleMovePersonalFolder(pFolder.id, 'right', e)
                                                  }
                                                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-slate-300 hover:text-white transition"
                                                  title="เลื่อนโฟลเดอร์ไปทางขวา"
                                                >
                                                  <ChevronRight size={12} />
                                                </button>
                                              </>
                                            )}
                                            <button
                                              type="button"
                                              onClick={(e) =>
                                                handleOpenEditPersonalFolder(pFolder, e)
                                              }
                                              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
                                              title="แก้ไขชื่อ/สีโฟลเดอร์ส่วนตัว"
                                            >
                                              <Pencil size={12} />
                                            </button>
                                            {personalFolders.length > 1 && (
                                              <button
                                                type="button"
                                                onClick={(e) =>
                                                  handleDeletePersonalFolder(pFolder, e)
                                                }
                                                className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/30 text-rose-300 transition"
                                                title="ลบโฟลเดอร์ส่วนตัว"
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        <p className="mt-2 text-xs text-slate-300 leading-relaxed line-clamp-2">
                                          {pFolder.description}
                                        </p>
                                      </div>

                                      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                                        <span className="text-slate-400 truncate">
                                          {pFolder.links.length > 0
                                            ? `ลิงก์ล่าสุด: ${pFolder.links[0].title}`
                                            : 'คลิกเพื่อเพิ่มลิงก์หรือจดโน้ตส่วนตัว'}
                                        </span>
                                        <span className="text-pink-300 font-semibold shrink-0 ml-2">
                                          เปิดโฟลเดอร์ →
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* ===============================================================
                              หมวดที่ 2: กริดแสดงโฟลเดอร์แยกตามแผ่นงาน (1 แผ่นงาน = 1 โฟลเดอร์)
                             =============================================================== */}
                          {visibleFolders.length > 0 && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between px-1">
                                <h3 className="text-xs sm:text-sm font-bold text-sky-300 flex items-center gap-2">
                                  <FolderOpen size={16} />
                                  <span>
                                    โฟลเดอร์แผ่นงานกลาง ({visibleFolders.length} แผ่นงาน • สามารถเพิ่มโน้ตในทุกโฟลเดอร์ได้)
                                  </span>
                                </h3>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                {visibleFolders.map((folder) => {
                                  const noteCount = notesCountMap[folder.id] || 0;
                                  return (
                                    <div
                                      key={folder.id}
                                      onClick={() => {
                                        if (onOpenFolderPage) {
                                          onOpenFolderPage(folder.id);
                                          return;
                                        }
                                        setSelectedFolderId(folder.id);
                                        setInFolderSearch('');
                                        setSelectedTopicFilter('all');
                                      }}
                                      className="group relative rounded-2xl bg-slate-950/75 hover:bg-slate-800/85 border border-white/12 hover:border-sky-400/50 p-4 cursor-pointer transition-all hover:-translate-y-0.5 shadow-lg flex flex-col justify-between gap-3"
                                    >
                                      <div>
                                        <div className="flex items-start justify-between gap-2.5">
                                          <div className="flex items-center gap-3 min-w-0">
                                            <div
                                              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                                              style={{
                                                background: `linear-gradient(135deg, ${folder.color} 0%, #1e293b 100%)`,
                                              }}
                                            >
                                              <Folder size={22} />
                                            </div>
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-1.5">
                                                <h3 className="text-sm font-bold text-white group-hover:text-sky-300 truncate">
                                                  {folder.sheetName}
                                                </h3>
                                              </div>
                                              <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400">
                                                  {folder.links.length} ลิงก์
                                                </span>
                                                {noteCount > 0 && (
                                                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/30 text-[10px] font-bold text-amber-300 flex items-center gap-1">
                                                    <StickyNote size={10} /> {noteCount} โน้ต
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-medium text-slate-300 shrink-0">
                                            เปิดโฟลเดอร์ →
                                          </span>
                                        </div>

                                        <p className="mt-2.5 text-xs text-slate-300 leading-relaxed line-clamp-2">
                                          {folder.description}
                                        </p>
                                      </div>

                                      {/* ตัวอย่างลิงก์ย่อยในโฟลเดอร์ */}
                                      <div className="pt-2.5 border-t border-white/10 space-y-1">
                                        {folder.links.slice(0, 3).map((sample) => (
                                          <div
                                            key={sample.id}
                                            className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate"
                                          >
                                            <span
                                              className="w-1.5 h-1.5 rounded-full shrink-0"
                                              style={{ backgroundColor: folder.color }}
                                            />
                                            <span className="truncate">{sample.title}</span>
                                          </div>
                                        ))}
                                        {folder.links.length > 3 && (
                                          <p className="text-[10px] text-sky-400 font-medium pt-0.5">
                                            + ดูอีก {folder.links.length - 3} ลิงก์ & สมุดโน้ตในโฟลเดอร์...
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    /* =====================================================================
                        มุมมองภายในโฟลเดอร์ที่เลือก (รองรับทั้งโฟลเดอร์ส่วนตัว และโฟลเดอร์แผ่นงาน + สมุดโน้ตในโฟลเดอร์)
                       ===================================================================== */
                    <div className="space-y-4 animate-fade-in">
                      {/* แถบหัวโฟลเดอร์ + ปุ่มย้อนกลับ */}
                      <div
                        className={`p-4 rounded-2xl bg-slate-950/90 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isViewingPersonalFolder
                            ? 'border-pink-500/40'
                            : 'border-sky-500/30'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFolderId(null);
                              setIsPersonalLinkFormOpen(false);
                            }}
                            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-sky-600 text-xs font-bold text-white flex items-center gap-1.5 transition shrink-0"
                          >
                            <ArrowLeft size={15} />
                            <span>กลับหน้ารวมโฟลเดอร์</span>
                          </button>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              {isViewingPersonalFolder && (
                                <span className="px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-400/30 text-[10px] font-bold text-pink-300 flex items-center gap-1">
                                  <Lock size={10} /> โฟลเดอร์ส่วนตัว ({currentEmployee.code})
                                </span>
                              )}
                              <h3 className="text-base sm:text-lg font-bold text-white">
                                {isViewingPersonalFolder
                                  ? activeFolder.sheetName
                                  : `โฟลเดอร์แผ่นงาน: ${activeFolder.sheetName}`}
                              </h3>
                              <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/30 text-xs font-bold text-sky-300">
                                {filteredFolderLinks.length} ลิงก์
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-0.5">
                              {activeFolder.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {isViewingPersonalFolder ? (
                            <>
                              <button
                                type="button"
                                onClick={handleOpenAddPersonalLink}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-xs font-bold text-white shadow transition"
                              >
                                <Plus size={14} />
                                <span>เพิ่มลิงก์ส่วนตัวลงโฟลเดอร์นี้</span>
                              </button>
                              {activePersonalFolder && (
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleOpenEditPersonalFolder(activePersonalFolder, e)
                                  }
                                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
                                >
                                  <Pencil size={13} />
                                  <span>ตั้งค่าโฟลเดอร์</span>
                                </button>
                              )}
                            </>
                          ) : (
                            <a
                              href={getEmployeeLinksSheetUrl(activeFolder.gid)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-xs font-semibold text-emerald-300 shrink-0 transition"
                            >
                              <FileSpreadsheet size={14} />
                              <span>เปิดแผ่นงาน Google Sheet ต้นฉบับ</span>
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* ===============================================================
                          สมุดโน้ตประจำโฟลเดอร์ (เพิ่ม/แก้ไขได้เฉพาะโฟลเดอร์ส่วนตัวของพนักงาน)
                         =============================================================== */}
                      <FolderNotesSection
                        folderId={activeFolder.id}
                        folderName={activeFolder.sheetName}
                        employeeCode={currentEmployee.code}
                        authorName={`${currentEmployee.firstName} (${currentEmployee.code})`}
                        isPersonalFolder={isViewingPersonalFolder}
                        canEdit={isViewingPersonalFolder}
                        onNotesChanged={() => {
                          setNotesCountMap(getFolderNotesCountMap(currentEmployee.code));
                          onWorkspaceChanged?.();
                        }}
                      />

                      {/* ฟอร์มเพิ่ม/แก้ไขลิงก์ส่วนตัว (เฉพาะเมื่ออยู่ในโฟลเดอร์ส่วนตัวของพนักงาน) */}
                      {isViewingPersonalFolder && isPersonalLinkFormOpen && (
                        <form
                          onSubmit={handleSavePersonalLink}
                          className="p-4 rounded-2xl bg-slate-950 border-2 border-pink-500/40 space-y-3 animate-fade-in"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                              <Plus size={14} />
                              <span>
                                {editingPersonalLinkId
                                  ? 'แก้ไขลิงก์ในโฟลเดอร์ส่วนตัว'
                                  : `เพิ่มลิงก์ใหม่ลงใน "${activeFolder.sheetName}"`}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setIsPersonalLinkFormOpen(false);
                                setEditingPersonalLinkId(null);
                              }}
                              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="sm:col-span-5">
                              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                                ชื่อลิงก์ / ชื่อระบบ *
                              </label>
                              <input
                                type="text"
                                required
                                value={linkTitleInput}
                                onChange={(e) => setLinkTitleInput(e.target.value)}
                                placeholder="เช่น ตารางส่งงานสาขา, รายงานประจำวัน..."
                                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 focus:border-pink-400 text-xs sm:text-sm text-white focus:outline-none"
                              />
                            </div>

                            <div className="sm:col-span-5">
                              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                                URL เว็บไซต์ / Google Sheet *
                              </label>
                              <input
                                type="text"
                                required
                                value={linkUrlInput}
                                onChange={(e) => setLinkUrlInput(e.target.value)}
                                placeholder="https://docs.google.com/spreadsheets/..."
                                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 focus:border-pink-400 text-xs sm:text-sm text-white font-mono focus:outline-none"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                                หมวดย่อย / ป้าย
                              </label>
                              <input
                                type="text"
                                value={linkTopicInput}
                                onChange={(e) => setLinkTopicInput(e.target.value)}
                                placeholder="เช่น งานเช้า"
                                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 focus:border-pink-400 text-xs sm:text-sm text-white focus:outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-300 mb-1">
                              คำอธิบายการใช้งาน / หมายเหตุเตือนความจำของลิงก์นี้
                            </label>
                            <input
                              type="text"
                              value={linkDescInput}
                              onChange={(e) => setLinkDescInput(e.target.value)}
                              placeholder="เช่น อัปเดตตัวเลขทุกวันก่อน 10:00 น."
                              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 focus:border-pink-400 text-xs sm:text-sm text-white focus:outline-none"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsPersonalLinkFormOpen(false);
                                setEditingPersonalLinkId(null);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-slate-300"
                            >
                              ยกเลิก
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-xs font-bold text-white shadow"
                            >
                              {editingPersonalLinkId ? 'บันทึกการแก้ไขลิงก์' : 'บันทึกลิงก์ลงโฟลเดอร์'}
                            </button>
                          </div>
                        </form>
                      )}

                      {/* ช่องค้นหาในโฟลเดอร์ + ตัวกรองหัวข้อ */}
                      <div className="space-y-2.5">
                        <div className="relative">
                          <Search
                            size={15}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            type="text"
                            value={inFolderSearch}
                            onChange={(e) => setInFolderSearch(e.target.value)}
                            placeholder={`ค้นหาลิงก์หรือคำอธิบายในโฟลเดอร์ "${activeFolder.sheetName}"...`}
                            className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-950 border border-white/15 focus:border-sky-400 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none"
                          />
                          {inFolderSearch && (
                            <button
                              type="button"
                              onClick={() => setInFolderSearch('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        {folderTopics.length > 1 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedTopicFilter('all')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition border ${
                                selectedTopicFilter === 'all'
                                  ? 'bg-sky-600 border-sky-500 text-white'
                                  : 'bg-white/10 hover:bg-white/20 border-white/15 text-slate-200'
                              }`}
                            >
                              ทุกหัวข้อ ({activeFolder.links.length})
                            </button>
                            {folderTopics.map((topic) => {
                              const count = activeFolder.links.filter(
                                (item) => item.codeOrTopic === topic
                              ).length;
                              return (
                                <button
                                  key={topic}
                                  type="button"
                                  onClick={() => setSelectedTopicFilter(topic)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition border flex items-center gap-1 ${
                                    selectedTopicFilter === topic
                                      ? 'bg-sky-600 border-sky-500 text-white shadow'
                                      : 'bg-slate-900 hover:bg-sky-500/25 border-sky-400/35 text-sky-200'
                                  }`}
                                >
                                  <span>{topic}</span>
                                  <span className="px-1.5 py-0.2 rounded-full bg-white/15 text-[10px]">
                                    {count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* หัวตาราง 2 คอลัมน์ */}
                      <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs font-semibold text-sky-300">
                        <div className="col-span-5">
                          คอลัมน์ที่ 1 : เว็บ / ลิงก์รายงาน ({activeFolder.sheetName})
                        </div>
                        <div className="col-span-7">
                          คอลัมน์ที่ 2 : หัวข้อประเมิน & คำอธิบายการใช้งาน
                        </div>
                      </div>

                      {/* รายการลิงก์ในโฟลเดอร์พร้อมคำอธิบาย */}
                      {filteredFolderLinks.length === 0 ? (
                        <div className="p-8 rounded-2xl bg-slate-950/60 border border-dashed border-white/15 text-center space-y-3">
                          <p className="text-xs sm:text-sm text-slate-300 font-medium">
                            {isViewingPersonalFolder
                              ? 'ยังไม่มีลิงก์ในโฟลเดอร์ส่วนตัวนี้'
                              : 'ไม่พบลิงก์ที่ตรงกับตัวกรอง'}
                          </p>
                          {isViewingPersonalFolder && (
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={handleOpenAddPersonalLink}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-xs font-bold text-white flex items-center gap-1.5 shadow"
                              >
                                <Plus size={14} />
                                <span>เพิ่มลิงก์ส่วนตัวรายการแรก</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedFolderId(null)}
                                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-slate-300"
                              >
                                หรือเลือกเก็บลิงก์จาก 17 แผ่นงาน
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {filteredFolderLinks.map((item) => (
                            <div
                              key={item.id}
                              onClick={() =>
                                window.open(item.url, '_blank', 'noopener,noreferrer')
                              }
                              className="group grid grid-cols-12 gap-3 items-center p-3.5 rounded-2xl bg-slate-950/75 hover:bg-slate-800/90 border border-white/10 hover:border-sky-400/50 cursor-pointer transition-all shadow-md"
                            >
                              {/* คอลัมน์ที่ 1: ไอคอน + ป้ายหัวข้อ + ชื่อลิงก์ */}
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
                                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                    {item.codeOrTopic && (
                                      <span className="px-2 py-0.5 rounded-md bg-sky-500/25 border border-sky-400/40 text-sky-200 text-[10px] font-extrabold">
                                        {item.codeOrTopic}
                                      </span>
                                    )}
                                    {item.subTopic && item.subTopic !== item.codeOrTopic && (
                                      <span
                                        className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[10px] font-semibold truncate max-w-[220px]"
                                        title={item.subTopic}
                                      >
                                        {item.subTopic}
                                      </span>
                                    )}
                                    {item.badge && (
                                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-slate-200 text-[10px] font-medium">
                                        {item.badge}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs sm:text-sm font-bold text-white group-hover:text-sky-300 leading-snug">
                                    {item.title}
                                  </p>
                                  <span className="inline-flex items-center gap-1 text-[10px] text-sky-400 mt-0.5">
                                    คลิกเปิดลิงก์ <ExternalLink size={10} />
                                  </span>
                                </div>
                              </div>

                              {/* คอลัมน์ที่ 2: คำอธิบายและปุ่มเก็บเข้าส่วนตัว / แก้ไขลิงก์ส่วนตัว */}
                              <div className="col-span-12 sm:col-span-7 flex items-center justify-between gap-3 sm:pl-1 min-w-0">
                                <div className="min-w-0">
                                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                                    {item.description}
                                  </p>
                                  <p className="text-[10px] font-mono text-slate-500 truncate mt-1">
                                    {item.url}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isViewingPersonalFolder ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={(e) => handleOpenEditPersonalLink(item, e)}
                                        className="p-2 rounded-xl bg-white/10 hover:bg-indigo-500/30 text-slate-200 hover:text-white transition"
                                        title="แก้ไขลิงก์ส่วนตัว"
                                      >
                                        <Pencil size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handleRemovePersonalLink(item, e)}
                                        className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/30 text-rose-300 transition"
                                        title="ลบลิงก์ออกจากโฟลเดอร์ส่วนตัว"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        handleBookmarkLinkToPersonal(item, undefined, e)
                                      }
                                      className="px-2.5 py-1.5 rounded-xl bg-pink-500/15 hover:bg-pink-500/30 border border-pink-400/30 text-[11px] font-semibold text-pink-200 flex items-center gap-1 transition"
                                      title="เก็บลิงก์นี้ไว้ในโฟลเดอร์ส่วนตัวของฉัน"
                                    >
                                      <BookmarkPlus size={13} />
                                      <span className="hidden md:inline">เก็บเข้าส่วนตัว</span>
                                    </button>
                                  )}

                                  <ExternalLink
                                    size={16}
                                    className="text-slate-500 group-hover:text-sky-300 shrink-0 ml-1"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* =====================================================================
                  แท็บที่ 2: ตารางกำหนดการดึงข้อมูลประจำวัน/ประจำเดือน (จากแผ่นงาน ชีต5)
                 ===================================================================== */}
              {activePortalTab === 'schedule' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-400/25 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        ตารางกำหนดการเรียกข้อมูลและบันทึกข้อมูลประจำวัน / ประจำเดือน (แผ่นงาน &quot;ชีต5&quot;)
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        สรุปกำหนดการดึงรายงานและส่งขอยกเว้นสำหรับฝ่ายบริการจัดส่งและสาขา
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-white/10 rounded-2xl bg-slate-950/75 border border-white/10 overflow-hidden">
                    {scheduleItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/5"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${
                              item.frequency === 'ประจำวัน'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                            }`}
                          >
                            {item.frequency}
                          </span>
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-white">
                              {item.title}
                            </p>
                            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                              {item.actionNote}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* =====================================================================
                  แท็บที่ 3: บัตรข้อมูลพนักงาน
                 ===================================================================== */}
              {activePortalTab === 'card' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-300">
                        <UserCheck size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">
                          รหัสพนักงาน (Employee ID)
                        </p>
                        <p className="text-base font-mono font-bold text-white tracking-wider">
                          {currentEmployee.code}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyEmpCode(currentEmployee.code)}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-slate-200 flex items-center gap-1 transition"
                    >
                      {copiedCode ? (
                        <>
                          <Check size={13} className="text-emerald-400" />
                          <span className="text-emerald-300">คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>คัดลอก</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                      <Briefcase size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-400">
                        ตำแหน่งงาน (Position)
                      </p>
                      <p className="text-sm font-semibold text-white truncate">
                        {currentEmployee.position || 'เจ้าหน้าที่'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">
                        สังกัดสาขา (Branch)
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {currentEmployee.branch || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">โซนพื้นที่ (Zone)</p>
                      <p className="text-sm font-semibold text-white">
                        {currentEmployee.zone
                          ? `Zone ${currentEmployee.zone}`
                          : 'ส่วนกลาง / ทั่วไป'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">
                        วันที่เริ่มงาน (Start Date)
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {currentEmployee.startDate || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-400/30 flex items-center justify-center text-pink-300 shrink-0">
                      <Clock size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">
                        อายุงานปัจจุบัน (Tenure)
                      </p>
                      <p className="text-sm font-semibold text-emerald-300">
                        {calculateWorkTenure(currentEmployee.startDate)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* =====================================================================
                  แท็บที่ 4: รายชื่อเพื่อนร่วมทีมในสาขาเดียวกัน
                 ===================================================================== */}
              {activePortalTab === 'branch-team' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span>รายชื่อบุคลากรประจำสาขา {currentEmployee.branch}</span>
                    <span>ทั้งหมด {branchColleagues.length} คน</span>
                  </div>
                  <div className="divide-y divide-white/10 rounded-2xl bg-slate-950/60 border border-white/10 overflow-hidden">
                    {branchColleagues.map((colleague) => {
                      const isMe = colleague.code === currentEmployee.code;
                      return (
                        <div
                          key={colleague.code}
                          className={`flex items-center justify-between p-3.5 text-xs ${
                            isMe ? 'bg-sky-500/15' : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="px-2 py-1 rounded-lg bg-white/10 font-mono text-[11px] text-sky-300 font-semibold">
                              {colleague.code}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate">
                                {colleague.fullName}{' '}
                                {isMe && (
                                  <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                                    คุณ
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {colleague.position || 'เจ้าหน้าที่'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {colleague.zone ? `Zone ${colleague.zone}` : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* แถบด้านล่าง: สถานะการซิงค์ Google Sheets + ปุ่มออกจากระบบ */}
            <div className="px-5 sm:px-6 py-3.5 bg-slate-950/90 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isLiveSheet ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span>
                  โฟลเดอร์ส่วนตัว {personalFolders.length} โฟลเดอร์ • แผ่นงานกลาง 17 โฟลเดอร์ (
                  {totalLinksCount} ลิงก์)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white transition"
                >
                  กลับหน้าโฮม
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-semibold text-rose-300 flex items-center gap-1.5 transition"
                >
                  <LogOut size={14} />
                  สลับรหัสพนักงาน / ออก
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

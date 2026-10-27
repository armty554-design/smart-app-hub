import React, { useState, useEffect, useMemo } from 'react';
import {
  AppLink,
  EmployeeProfile,
  EmployeeSheetFolder,
  IconShape,
} from '../types/app';
import {
  calculateWorkTenure,
  findEmployeeByCode,
} from '../services/employeeService';
import {
  getEmployeeFolders,
  getEmployeeLinksSheetUrl,
  getEmployeeScheduleItems,
  searchAcrossEmployeeFolders,
} from '../services/employeeLinksService';
import { IconRenderer } from './IconRenderer';
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
  Search,
  ArrowLeft,
  CalendarClock,
  FileSpreadsheet,
  History,
  Layers,
} from 'lucide-react';

interface EmployeePortalModalProps {
  isOpen: boolean;
  currentEmployee: EmployeeProfile | null;
  employees: EmployeeProfile[];
  links: AppLink[];
  iconShape: IconShape;
  isSyncingSheet: boolean;
  isLiveSheet: boolean;
  initialFolderId?: string | null;
  requireLogin?: boolean;
  onLoginSuccess: (employee: EmployeeProfile) => void;
  onLogout: () => void;
  onRefreshSheet: () => Promise<void>;
  onClose: () => void;
}

export const EmployeePortalModal: React.FC<EmployeePortalModalProps> = ({
  isOpen,
  currentEmployee,
  employees,
  iconShape,
  isSyncingSheet,
  isLiveSheet,
  initialFolderId = null,
  requireLogin = false,
  onLoginSuccess,
  onLogout,
  onRefreshSheet,
  onClose,
}) => {
  const [enteredCode, setEnteredCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorShake, setErrorShake] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [activePortalTab, setActivePortalTab] = useState<
    'folders' | 'schedule' | 'card' | 'branch-team'
  >('folders');

  // State สำหรับโฟลเดอร์ลิงก์พนักงาน (17 แผ่นงาน)
  const employeeFolders = useMemo(() => getEmployeeFolders(), []);
  const scheduleItems = useMemo(() => getEmployeeScheduleItems(), []);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderCategoryFilter, setFolderCategoryFilter] = useState<
    'active' | 'archive' | 'all'
  >('active');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [inFolderSearch, setInFolderSearch] = useState('');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      setEnteredCode('');
      setErrorMsg('');
      setErrorShake(false);
      if (initialFolderId) {
        setActivePortalTab('folders');
        setSelectedFolderId(initialFolderId);
        setInFolderSearch('');
        setSelectedTopicFilter('all');
      }
    }
  }, [isOpen, currentEmployee, initialFolderId]);

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

  const branchColleagues = currentEmployee
    ? employees.filter((e) => e.branch && e.branch === currentEmployee.branch)
    : [];

  const activeFolder: EmployeeSheetFolder | null = selectedFolderId
    ? employeeFolders.find((f) => f.id === selectedFolderId) || null
    : null;

  const visibleFolders = employeeFolders.filter((f) => {
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
    ? searchAcrossEmployeeFolders(globalSearchQuery, employeeFolders, true)
    : [];

  return (
    <div
      onClick={() => {
        if (!requireLogin || currentEmployee) onClose();
      }}
      className="fixed inset-0 z-[65] flex items-center justify-center p-2.5 sm:p-5 bg-slate-950/80 backdrop-blur-2xl overflow-y-auto animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${
          currentEmployee ? 'max-w-5xl' : 'max-w-md'
        } rounded-3xl bg-slate-900 border border-white/15 shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden my-auto max-h-[93vh] flex flex-col ${
          errorShake ? 'animate-shake' : ''
        }`}
      >
        {/* ปุ่มปิดหน้าต่าง */}
        {(!requireLogin || currentEmployee) && (
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
                  สำหรับพนักงาน ({employees.length} คน) • ปลดล็อก 17 โฟลเดอร์ลิงก์งาน
                </span>
              </div>
              <h2 className="text-xl font-bold text-white">
                เข้าสู่ระบบสำหรับพนักงาน
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                กรอก <strong className="text-sky-300">รหัสพนักงาน 6 หลัก</strong>{' '}
                เพื่อเข้าถึงโฟลเดอร์ลิงก์เฉพาะพนักงาน (แยกตามแผ่นงาน)
              </p>
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
              กรณีที่ 2: ล็อกอินแล้ว -> แสดงคลังโฟลเดอร์ลิงก์เฉพาะพนักงาน 17 แผ่นงาน + บัตรพนักงาน
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
                  onClick={() => {
                    setActivePortalTab('folders');
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                    activePortalTab === 'folders'
                      ? 'bg-white text-slate-900 shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-white/90'
                  }`}
                >
                  <FolderOpen size={14} className={activePortalTab === 'folders' ? 'text-sky-600' : 'text-sky-300'} />
                  <span>
                    โฟลเดอร์ลิงก์พนักงาน ({employeeFolders.length} แผ่นงาน • {totalLinksCount} ลิงก์)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePortalTab('schedule')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    activePortalTab === 'schedule'
                      ? 'bg-white text-slate-900 shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-white/85'
                  }`}
                >
                  <CalendarClock size={14} />
                  <span>ตารางกำหนดการดึงข้อมูล (ชีต5)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePortalTab('card')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    activePortalTab === 'card'
                      ? 'bg-white text-slate-900 shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-white/85'
                  }`}
                >
                  <UserCheck size={14} />
                  <span>บัตรข้อมูลพนักงาน</span>
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

            {/* เนื้อหาในแต่ละแท็บของหน้าพนักงาน */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* =====================================================================
                  แท็บที่ 1: โฟลเดอร์ลิงก์เฉพาะพนักงาน (แยกตามแผ่นงาน 17 โฟลเดอร์ พร้อมคำอธิบาย)
                 ===================================================================== */}
              {activePortalTab === 'folders' && (
                <>
                  {!activeFolder ? (
                    /* มุมมองรวมโฟลเดอร์ (แผ่นงานละ 1 โฟลเดอร์) */
                    <div className="space-y-4">
                      {/* แถบค้นหาข้ามทุกแผ่นงาน + สวิตช์กรองแผ่นงาน */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="relative flex-1">
                          <Search
                            size={16}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-400"
                          />
                          <input
                            type="text"
                            value={globalSearchQuery}
                            onChange={(e) => setGlobalSearchQuery(e.target.value)}
                            placeholder="ค้นหาลิงก์พนักงานจากทุกโฟลเดอร์ (เช่น 1.1, จัดส่งตรงเวลา, CRM, Power BI, คูปอง, รถ S)..."
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

                        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-white/10 shrink-0">
                          <button
                            type="button"
                            onClick={() => setFolderCategoryFilter('active')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                              folderCategoryFilter === 'active'
                                ? 'bg-sky-600 text-white shadow'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <Layers size={13} />
                            <span>ใช้งานปัจจุบัน (12)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFolderCategoryFilter('archive')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
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
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                              folderCategoryFilter === 'all'
                                ? 'bg-sky-600 text-white shadow'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            ทั้งหมด (17)
                          </button>
                        </div>
                      </div>

                      {/* กรณีมีการพิมพ์ค้นหา -> แสดงผลลัพธ์การค้นหาแบบตาราง 2 คอลัมน์พร้อมชื่อโฟลเดอร์ */}
                      {globalSearchQuery.trim() ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                            <span>
                              ผลการค้นหา &quot;{globalSearchQuery}&quot; จากทุกแผ่นงาน
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
                              {globalSearchResults.map(({ folder, link }) => (
                                <div
                                  key={link.id}
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
                                        <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 text-[10px] font-bold">
                                          โฟลเดอร์: {folder.sheetName}
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
                                    <ExternalLink
                                      size={15}
                                      className="text-slate-400 group-hover:text-sky-300 shrink-0"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* กริดแสดงโฟลเดอร์แยกตามแผ่นงาน (1 แผ่นงาน = 1 โฟลเดอร์) */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {visibleFolders.map((folder) => (
                            <div
                              key={folder.id}
                              onClick={() => {
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
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400">
                                        {folder.links.length} ลิงก์ในโฟลเดอร์
                                      </span>
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
                                    + ดูอีก {folder.links.length - 3} ลิงก์พร้อมคำอธิบาย...
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* =====================================================================
                        มุมมองภายในโฟลเดอร์แผ่นงานที่เลือก (แสดงตาราง 2 คอลัมน์: ลิงก์ + คำอธิบาย)
                       ===================================================================== */
                    <div className="space-y-4 animate-fade-in">
                      {/* แถบหัวโฟลเดอร์ + ปุ่มย้อนกลับ */}
                      <div className="p-4 rounded-2xl bg-slate-950/90 border border-sky-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedFolderId(null)}
                            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-sky-600 text-xs font-bold text-white flex items-center gap-1.5 transition shrink-0"
                          >
                            <ArrowLeft size={15} />
                            <span>กลับหน้ารวมโฟลเดอร์</span>
                          </button>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base sm:text-lg font-bold text-white">
                                โฟลเดอร์แผ่นงาน: {activeFolder.sheetName}
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
                      </div>

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
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                            <button
                              type="button"
                              onClick={() => setSelectedTopicFilter('all')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                                selectedTopicFilter === 'all'
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-white/8 hover:bg-white/15 text-slate-300'
                              }`}
                            >
                              ทุกหัวข้อ ({activeFolder.links.length})
                            </button>
                            {folderTopics.map((topic) => (
                              <button
                                key={topic}
                                type="button"
                                onClick={() => setSelectedTopicFilter(topic)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition ${
                                  selectedTopicFilter === topic
                                    ? 'bg-sky-600 text-white font-semibold'
                                    : 'bg-white/8 hover:bg-white/15 text-slate-300'
                                }`}
                              >
                                {topic}
                              </button>
                            ))}
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
                                    <span className="px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/30 text-sky-300 text-[10px] font-bold">
                                      {item.codeOrTopic}
                                    </span>
                                  )}
                                  {item.badge && (
                                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 text-[10px] font-medium">
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

                            {/* คอลัมน์ที่ 2: คำอธิบายและหมายเหตุจากแผ่นงาน */}
                            <div className="col-span-12 sm:col-span-7 flex items-center justify-between gap-3 sm:pl-1 min-w-0">
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                                  {item.description}
                                </p>
                                <p className="text-[10px] font-mono text-slate-500 truncate mt-1">
                                  {item.url}
                                </p>
                              </div>
                              <ExternalLink
                                size={16}
                                className="text-slate-500 group-hover:text-sky-300 shrink-0"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
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
                  ปลดล็อก 17 โฟลเดอร์พนักงาน ({totalLinksCount} ลิงก์) • พนักงาน{' '}
                  {employees.length} คน
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

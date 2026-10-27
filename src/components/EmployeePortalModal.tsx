import React, { useState, useEffect } from 'react';
import { AppLink, EmployeeProfile, IconShape } from '../types/app';
import {
  calculateWorkTenure,
  findEmployeeByCode,
} from '../services/employeeService';
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
} from 'lucide-react';

interface EmployeePortalModalProps {
  isOpen: boolean;
  currentEmployee: EmployeeProfile | null;
  employees: EmployeeProfile[];
  links: AppLink[];
  iconShape: IconShape;
  isSyncingSheet: boolean;
  isLiveSheet: boolean;
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
  links,
  iconShape,
  isSyncingSheet,
  isLiveSheet,
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
  const [activePortalTab, setActivePortalTab] = useState<'card' | 'branch-team' | 'apps'>('card');

  useEffect(() => {
    if (isOpen) {
      setEnteredCode('');
      setErrorMsg('');
      setErrorShake(false);
    }
  }, [isOpen, currentEmployee]);

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

  const matchedPreview = enteredCode.length >= 4 ? findEmployeeByCode(enteredCode, employees) : null;

  const handleDigit = (digit: string) => {
    if (enteredCode.length >= 10) return;
    const next = enteredCode + digit;
    setEnteredCode(next);
    setErrorMsg('');

    // หากรหัสตรงกับฐานข้อมูลพอดี (ปกติรหัสพนักงาน 6 หลัก) สามารถกดเข้าสู่ระบบหรือล็อกอินอัตโนมัติได้
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

  // รายชื่อเพื่อนร่วมสาขาเดียวกัน (กรณีล็อกอินแล้ว)
  const branchColleagues = currentEmployee
    ? employees.filter((e) => e.branch && e.branch === currentEmployee.branch)
    : [];

  return (
    <div
      onClick={() => {
        if (!requireLogin || currentEmployee) onClose();
      }}
      className="fixed inset-0 z-[65] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-2xl overflow-y-auto animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${
          currentEmployee ? 'max-w-2xl' : 'max-w-md'
        } rounded-3xl bg-slate-900 border border-white/15 shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden my-auto max-h-[92vh] flex flex-col ${
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
                <span>เชื่อมข้อมูลจาก Google Sheets แผ่นงาน "พนักงาน" ({employees.length} คน)</span>
              </div>
              <h2 className="text-xl font-bold text-white">เข้าสู่ระบบสำหรับพนักงาน</h2>
              <p className="text-xs text-slate-400 mt-1">
                กรอก <strong className="text-sky-300">รหัสพนักงาน 6 หลัก</strong> ของคุณเพื่อเข้าสู่หน้าข้อมูลพนักงาน
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

              {/* แสดงตัวอย่างชื่อพนักงานทันทีที่พบรหัสตรงกัน */}
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

            {/* แป้นกดตัวเลขสำหรับหน้าจอมือถือและคอมพิวเตอร์ */}
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
                <RefreshCw size={12} className={isSyncingSheet ? 'animate-spin text-sky-400' : ''} />
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
              กรณีที่ 2: ล็อกอินแล้ว -> แสดงหน้าโปรไฟล์พนักงาน & บัตรพนักงานดิจิทัล
             ===================================================================== */
          <div className="flex flex-col h-full overflow-hidden">
            {/* ส่วนหัวบัตรพนักงาน */}
            <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-sky-600 via-indigo-700 to-slate-900 border-b border-white/15">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-xl border-2 border-white/30 flex flex-col items-center justify-center text-white shadow-xl shrink-0">
                    <span className="text-[10px] uppercase tracking-wider text-sky-200 font-semibold">
                      ZONE
                    </span>
                    <span className="text-xl font-black leading-none mt-0.5">
                      {currentEmployee.zone || '-'}
                    </span>
                  </div>

                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/30 text-[11px] font-semibold text-emerald-200 mb-1">
                      <BadgeCheck size={13} className="text-emerald-300" />
                      <span>ยืนยันตัวตนพนักงานแล้ว</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                      {currentEmployee.fullName}
                    </h2>
                    <p className="text-xs sm:text-sm text-sky-200 font-medium mt-0.5">
                      {currentEmployee.position || 'เจ้าหน้าที่ประจำสาขา'} • สาขา{currentEmployee.branch || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* แถบเมนูย่อยในหน้าสำหรับพนักงาน */}
              <div className="flex items-center gap-2 mt-5 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActivePortalTab('card')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    activePortalTab === 'card'
                      ? 'bg-white text-slate-900 shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-white/85'
                  }`}
                >
                  บัตรข้อมูลพนักงาน
                </button>
                <button
                  type="button"
                  onClick={() => setActivePortalTab('branch-team')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    activePortalTab === 'branch-team'
                      ? 'bg-white text-slate-900 shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-white/85'
                  }`}
                >
                  <Users size={13} />
                  <span>ทีมงานสาขา{currentEmployee.branch} ({branchColleagues.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePortalTab('apps')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    activePortalTab === 'apps'
                      ? 'bg-white text-slate-900 shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-white/85'
                  }`}
                >
                  ระบบงานสำหรับคุณ ({links.filter((l) => l.is_active !== false).length})
                </button>
              </div>
            </div>

            {/* เนื้อหาในแต่ละแท็บของหน้าพนักงาน */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {activePortalTab === 'card' && (
                <>
                  {/* ตารางรายละเอียดพนักงานจากแผ่นงาน "พนักงาน" */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* รหัสพนักงาน */}
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-300">
                          <UserCheck size={18} />
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400">รหัสพนักงาน (Employee ID)</p>
                          <p className="text-base font-mono font-bold text-white tracking-wider">
                            {currentEmployee.code}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyEmpCode(currentEmployee.code)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-slate-200 flex items-center gap-1 transition"
                        title="คัดลอกรหัสพนักงาน"
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

                    {/* ตำแหน่ง */}
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                        <Briefcase size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-400">ตำแหน่งงาน (Position)</p>
                        <p className="text-sm font-semibold text-white truncate">
                          {currentEmployee.position || 'เจ้าหน้าที่'}
                        </p>
                      </div>
                    </div>

                    {/* สาขา */}
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">สังกัดสาขา (Branch)</p>
                        <p className="text-sm font-semibold text-white">
                          {currentEmployee.branch || '-'}
                        </p>
                      </div>
                    </div>

                    {/* โซนพื้นที่ */}
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">โซนพื้นที่ (Zone)</p>
                        <p className="text-sm font-semibold text-white">
                          {currentEmployee.zone ? `Zone ${currentEmployee.zone}` : 'ส่วนกลาง / ทั่วไป'}
                        </p>
                      </div>
                    </div>

                    {/* วันที่เริ่มงาน */}
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">วันที่เริ่มงาน (Start Date)</p>
                        <p className="text-sm font-semibold text-white">
                          {currentEmployee.startDate || '-'}
                        </p>
                      </div>
                    </div>

                    {/* อายุงานคำนวณอัตโนมัติ */}
                    <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-400/30 flex items-center justify-center text-pink-300 shrink-0">
                        <Clock size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">อายุงานปัจจุบัน (Tenure)</p>
                        <p className="text-sm font-semibold text-emerald-300">
                          {calculateWorkTenure(currentEmployee.startDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* แท็บที่ 2: รายชื่อเพื่อนร่วมทีมในสาขาเดียวกัน */}
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

              {/* แท็บที่ 3: ทางลัดเข้าใช้งานระบบงานด่วน */}
              {activePortalTab === 'apps' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {links
                    .filter((l) => l.is_active !== false)
                    .map((link) => (
                      <div
                        key={link.id}
                        onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                        className="group flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950/60 hover:bg-white/10 border border-white/10 hover:border-sky-400/40 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0">
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
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-white group-hover:text-sky-300 truncate">
                              {link.title}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {link.description || 'คลิกเพื่อเปิดระบบงาน'}
                            </p>
                          </div>
                        </div>
                        <ExternalLink size={14} className="text-slate-400 group-hover:text-white shrink-0" />
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* แถบด้านล่าง: สถานะการซิงค์ Google Sheets + ปุ่มออกจากระบบ */}
            <div className="px-6 py-4 bg-slate-950/80 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isLiveSheet ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span>
                  ข้อมูลจากแผ่นงาน "พนักงาน" ({employees.length} รายชื่อ)
                </span>
                <button
                  type="button"
                  onClick={onRefreshSheet}
                  disabled={isSyncingSheet}
                  className="text-sky-400 hover:underline inline-flex items-center gap-1 ml-1"
                >
                  <RefreshCw size={11} className={isSyncingSheet ? 'animate-spin' : ''} />
                  อัปเดตข้อมูล
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white transition"
                >
                  เข้าใช้งานหน้าโฮม
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

import React, { useState, useEffect } from 'react';
import { FolderNoteColor, FolderNoteItem } from '../types/app';
import {
  deleteFolderNote,
  getFolderNotes,
  togglePinFolderNote,
  upsertFolderNote,
} from '../services/employeeLinksService';
import {
  StickyNote,
  Plus,
  Pin,
  Pencil,
  Trash2,
  Copy,
  Check,
  Lock,
  Globe,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface FolderNotesSectionProps {
  folderId: string;
  folderName: string;
  employeeCode?: string;
  authorName?: string;
  isPersonalFolder?: boolean;
  canEdit?: boolean;
  isLightTheme?: boolean;
  onNotesChanged?: () => void;
}

const NOTE_COLOR_STYLES: Record<
  FolderNoteColor,
  {
    label: string;
    dot: string;
    darkCard: string;
    lightCard: string;
    darkBadge: string;
    lightBadge: string;
  }
> = {
  amber: {
    label: 'เหลืองทอง',
    dot: 'bg-amber-400',
    darkCard: 'bg-amber-500/12 border-amber-400/35 text-amber-100',
    lightCard: 'bg-amber-50/95 border-amber-300 text-slate-800',
    darkBadge: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
    lightBadge: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  sky: {
    label: 'ฟ้าสว่าง',
    dot: 'bg-sky-400',
    darkCard: 'bg-sky-500/12 border-sky-400/35 text-sky-100',
    lightCard: 'bg-sky-50/95 border-sky-300 text-slate-800',
    darkBadge: 'bg-sky-400/20 text-sky-300 border-sky-400/30',
    lightBadge: 'bg-sky-100 text-sky-900 border-sky-300',
  },
  emerald: {
    label: 'เขียวมรกต',
    dot: 'bg-emerald-400',
    darkCard: 'bg-emerald-500/12 border-emerald-400/35 text-emerald-100',
    lightCard: 'bg-emerald-50/95 border-emerald-300 text-slate-800',
    darkBadge: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
    lightBadge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  },
  rose: {
    label: 'ชมพู-แดง',
    dot: 'bg-rose-400',
    darkCard: 'bg-rose-500/12 border-rose-400/35 text-rose-100',
    lightCard: 'bg-rose-50/95 border-rose-300 text-slate-800',
    darkBadge: 'bg-rose-400/20 text-rose-300 border-rose-400/30',
    lightBadge: 'bg-rose-100 text-rose-900 border-rose-300',
  },
  violet: {
    label: 'ม่วงพาสเทล',
    dot: 'bg-violet-400',
    darkCard: 'bg-violet-500/12 border-violet-400/35 text-violet-100',
    lightCard: 'bg-violet-50/95 border-violet-300 text-slate-800',
    darkBadge: 'bg-violet-400/20 text-violet-300 border-violet-400/30',
    lightBadge: 'bg-violet-100 text-violet-900 border-violet-300',
  },
};

export const FolderNotesSection: React.FC<FolderNotesSectionProps> = ({
  folderId,
  folderName,
  employeeCode = 'public',
  authorName = 'ผู้ใช้งาน',
  isPersonalFolder = false,
  canEdit,
  isLightTheme = false,
  onNotesChanged,
}) => {
  // อนุญาตให้เพิ่ม/แก้ไขโน้ตเฉพาะในโฟลเดอร์ส่วนตัว หรือเมื่อแอดมินปลดล็อกโหมดแก้ไขเท่านั้น
  const allowEdit = canEdit !== undefined ? canEdit : isPersonalFolder;

  const [notes, setNotes] = useState<FolderNoteItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<FolderNoteColor>('amber');
  const [isPinned, setIsPinned] = useState(false);
  const [isShared, setIsShared] = useState(!isPersonalFolder);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const reloadNotes = () => {
    setNotes(getFolderNotes(folderId, employeeCode));
  };

  useEffect(() => {
    reloadNotes();
    setIsFormOpen(false);
    setEditingNoteId(null);
  }, [folderId, employeeCode]);

  // หากเป็นโฟลเดอร์ส่วนกลางที่พนักงานไม่มีสิทธิ์แก้ไข และยังไม่มีโน้ตประกาศจากแอดมิน ให้ซ่อนกล่องไปเลยเพื่อความสะอาดของหน้าจอ
  if (!allowEdit && notes.length === 0) {
    return null;
  }

  const handleOpenAddForm = () => {
    if (!allowEdit) return;
    setEditingNoteId(null);
    setTitle('');
    setContent('');
    setColor('amber');
    setIsPinned(false);
    setIsShared(!isPersonalFolder);
    setIsFormOpen(true);
    setIsExpanded(true);
  };

  const handleOpenEditForm = (note: FolderNoteItem) => {
    if (!allowEdit) return;
    setEditingNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color || 'amber');
    setIsPinned(Boolean(note.isPinned));
    setIsShared(Boolean(note.isShared));
    setIsFormOpen(true);
    setIsExpanded(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowEdit) return;
    if (!title.trim() && !content.trim()) return;

    const updated = await upsertFolderNote({
      id: editingNoteId || undefined,
      folderId,
      employeeCode,
      authorName,
      title: title.trim() || 'บันทึกช่วยจำ',
      content: content.trim(),
      color,
      isPinned,
      isShared: isPersonalFolder ? false : isShared,
    });
    setNotes(updated);
    setIsFormOpen(false);
    setEditingNoteId(null);
    setTitle('');
    setContent('');
    onNotesChanged?.();
  };

  const handleDelete = async (note: FolderNoteItem) => {
    if (!allowEdit) return;
    if (!window.confirm(`ต้องการลบโน้ต "${note.title}" ใช่หรือไม่?`)) return;
    const updated = await deleteFolderNote(note.id, folderId, employeeCode);
    setNotes(updated);
    onNotesChanged?.();
  };

  const handleTogglePin = async (note: FolderNoteItem) => {
    if (!allowEdit) return;
    const updated = await togglePinFolderNote(note.id, folderId, employeeCode);
    setNotes(updated);
    onNotesChanged?.();
  };

  const handleCopyContent = (note: FolderNoteItem) => {
    const textToCopy = `${note.title}\n${note.content}`.trim();
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div
      className={`rounded-2xl border p-3.5 sm:px-4 sm:py-3 space-y-3 transition-colors ${
        isLightTheme
          ? 'bg-amber-50/75 border-amber-200/90 text-slate-800 shadow-xs'
          : 'bg-slate-950/80 border-amber-400/25 text-white shadow-lg'
      }`}
    >
      {/* แถบหัวข้อสมุดโน้ตประจำโฟลเดอร์ */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div
            className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
              isLightTheme
                ? 'bg-amber-100 border-amber-300 text-amber-800'
                : 'bg-amber-500/20 border-amber-400/35 text-amber-300'
            }`}
          >
            <StickyNote size={15} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h4
              className={`text-xs sm:text-sm font-bold ${
                isLightTheme ? 'text-slate-900' : 'text-white'
              }`}
            >
              {isPersonalFolder
                ? `สมุดโน้ตส่วนตัวใน "${folderName}"`
                : `ประกาศ / โน้ตประจำโฟลเดอร์ "${folderName}"`}
            </h4>
            <span
              className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                isLightTheme
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-amber-500/20 border-amber-400/30 text-amber-300'
              }`}
            >
              {notes.length} โน้ต
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {allowEdit && (
            <button
              type="button"
              onClick={handleOpenAddForm}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus size={14} />
              <span>เพิ่มโน้ต</span>
            </button>
          )}

          {notes.length > 0 && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className={`p-1.5 rounded-xl border transition ${
                isLightTheme
                  ? 'bg-white hover:bg-amber-100 border-amber-200 text-slate-700'
                  : 'bg-white/10 hover:bg-white/20 border-white/10 text-slate-300 hover:text-white'
              }`}
              title={isExpanded ? 'พับเก็บโน้ต' : 'แสดงโน้ต'}
            >
              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          )}
        </div>
      </div>

      {/* ฟอร์มเพิ่ม/แก้ไขโน้ต (เฉพาะผู้มีสิทธิ์แก้ไข) */}
      {allowEdit && isFormOpen && (
        <form
          onSubmit={handleSaveNote}
          className={`p-3.5 rounded-2xl border space-y-3 animate-fade-in ${
            isLightTheme
              ? 'bg-white border-amber-300 shadow-sm'
              : 'bg-slate-900/95 border-amber-400/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold flex items-center gap-1.5 ${
                isLightTheme ? 'text-amber-900' : 'text-amber-300'
              }`}
            >
              <StickyNote size={14} />
              <span>
                {editingNoteId ? 'แก้ไขโน้ตบันทึกช่วยจำ' : 'สร้างโน้ตใหม่ในโฟลเดอร์นี้'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingNoteId(null);
              }}
              className={`p-1 rounded-lg ${
                isLightTheme
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  : 'bg-white/10 hover:bg-white/20 text-slate-300'
              }`}
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label
                className={`block text-[11px] font-bold mb-1 ${
                  isLightTheme ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                หัวข้อโน้ต *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น ขั้นตอนส่งรายงานก่อน 11:00 น., เบอร์ติดต่อ IT..."
                className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none ${
                  isLightTheme
                    ? 'bg-slate-50 border-slate-300 focus:border-amber-500 text-slate-900'
                    : 'bg-slate-950 border-white/15 focus:border-amber-400 text-white'
                }`}
              />
            </div>

            <div className="sm:col-span-6">
              <label
                className={`block text-[11px] font-bold mb-1 ${
                  isLightTheme ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                สีป้ายกระดาษโน้ต
              </label>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {(Object.keys(NOTE_COLOR_STYLES) as FolderNoteColor[]).map((cKey) => {
                  const cfg = NOTE_COLOR_STYLES[cKey];
                  const active = color === cKey;
                  return (
                    <button
                      key={cKey}
                      type="button"
                      onClick={() => setColor(cKey)}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition ${
                        active
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                          : isLightTheme
                          ? 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                          : 'bg-slate-950 text-slate-300 border-white/15 hover:border-white/30'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                      <span className="hidden md:inline">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label
              className={`block text-[11px] font-bold mb-1 ${
                isLightTheme ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              รายละเอียดโน้ต / ข้อความบันทึกช่วยจำ
            </label>
            <textarea
              rows={2}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="พิมพ์รายละเอียด ขั้นตอนการทำงาน รหัสอ้างอิง หรือรายการสิ่งที่ต้องทำ..."
              className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none leading-relaxed ${
                isLightTheme
                  ? 'bg-slate-50 border-slate-300 focus:border-amber-500 text-slate-900'
                  : 'bg-slate-950 border-white/15 focus:border-amber-400 text-white'
              }`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <label
              className={`inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                isLightTheme ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded border-slate-300 text-amber-500 focus:ring-0"
              />
              <span>📌 ปักหมุดไว้บนสุด</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingNoteId(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  isLightTheme
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300'
                }`}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-xs transition"
              >
                {editingNoteId ? 'บันทึกการแก้ไข' : 'บันทึกโน้ต'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* รายการโน้ตในโฟลเดอร์ */}
      {isExpanded && notes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
          {notes.map((note) => {
            const cfg = NOTE_COLOR_STYLES[note.color] || NOTE_COLOR_STYLES.amber;
            const dateStr = new Date(note.updatedAt).toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={note.id}
                className={`rounded-xl border p-3 flex flex-col justify-between gap-2 transition ${
                  isLightTheme ? cfg.lightCard : cfg.darkCard
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      {note.isPinned && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-extrabold flex items-center gap-1">
                          <Pin size={10} /> ปักหมุด
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-1 ${
                          isLightTheme ? cfg.lightBadge : cfg.darkBadge
                        }`}
                      >
                        {note.isShared ? (
                          <>
                            <Globe size={10} /> ประกาศส่วนกลาง
                          </>
                        ) : (
                          <>
                            <Lock size={10} /> โน้ตส่วนตัว ({note.employeeCode})
                          </>
                        )}
                      </span>
                      <h5
                        className={`text-xs sm:text-sm font-bold break-words ${
                          isLightTheme ? 'text-slate-900' : 'text-white'
                        }`}
                      >
                        {note.title}
                      </h5>
                    </div>

                    {/* ปุ่มจัดการโน้ต */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyContent(note)}
                        className={`p-1.5 rounded-lg border transition ${
                          isLightTheme
                            ? 'bg-white/80 hover:bg-white border-slate-300 text-slate-700'
                            : 'bg-black/25 hover:bg-black/40 border-white/10 text-slate-200'
                        }`}
                        title="คัดลอกข้อความโน้ต"
                      >
                        {copiedId === note.id ? (
                          <Check size={12} className="text-emerald-500" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                      {allowEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleTogglePin(note)}
                            className={`p-1.5 rounded-lg border transition ${
                              note.isPinned
                                ? 'bg-amber-400/30 border-amber-500 text-amber-900'
                                : isLightTheme
                                ? 'bg-white/80 hover:bg-white border-slate-300 text-slate-700'
                                : 'bg-black/25 border-white/10 text-slate-300 hover:text-white'
                            }`}
                            title={note.isPinned ? 'เลิกปักหมุด' : 'ปักหมุดไว้บนสุด'}
                          >
                            <Pin size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(note)}
                            className={`p-1.5 rounded-lg border transition ${
                              isLightTheme
                                ? 'bg-white/80 hover:bg-white border-slate-300 text-slate-700'
                                : 'bg-black/25 hover:bg-black/40 border-white/10 text-slate-200'
                            }`}
                            title="แก้ไขโน้ต"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(note)}
                            className={`p-1.5 rounded-lg border transition ${
                              isLightTheme
                                ? 'bg-white/80 hover:bg-rose-50 border-rose-200 text-rose-700'
                                : 'bg-black/25 hover:bg-rose-500/30 border-white/10 text-rose-300'
                            }`}
                            title="ลบโน้ต"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {note.content && (
                    <p
                      className={`text-xs whitespace-pre-line leading-relaxed pt-0.5 ${
                        isLightTheme ? 'text-slate-700' : 'text-slate-100/90'
                      }`}
                    >
                      {note.content}
                    </p>
                  )}
                </div>

                <div
                  className={`flex items-center justify-between text-[10px] pt-1 border-t ${
                    isLightTheme
                      ? 'text-slate-500 border-amber-200/70'
                      : 'text-slate-400/90 border-white/10'
                  }`}
                >
                  <span>โดย {note.authorName}</span>
                  <span>อัปเดต {dateStr}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

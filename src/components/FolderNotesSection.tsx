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
  onNotesChanged?: () => void;
}

const NOTE_COLOR_STYLES: Record<
  FolderNoteColor,
  {
    label: string;
    dot: string;
    card: string;
    badge: string;
  }
> = {
  amber: {
    label: 'เหลืองทอง',
    dot: 'bg-amber-400',
    card: 'bg-amber-500/12 border-amber-400/35 text-amber-100',
    badge: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
  },
  sky: {
    label: 'ฟ้าสว่าง',
    dot: 'bg-sky-400',
    card: 'bg-sky-500/12 border-sky-400/35 text-sky-100',
    badge: 'bg-sky-400/20 text-sky-300 border-sky-400/30',
  },
  emerald: {
    label: 'เขียวมรกต',
    dot: 'bg-emerald-400',
    card: 'bg-emerald-500/12 border-emerald-400/35 text-emerald-100',
    badge: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
  },
  rose: {
    label: 'ชมพู-แดง',
    dot: 'bg-rose-400',
    card: 'bg-rose-500/12 border-rose-400/35 text-rose-100',
    badge: 'bg-rose-400/20 text-rose-300 border-rose-400/30',
  },
  violet: {
    label: 'ม่วงพาสเทล',
    dot: 'bg-violet-400',
    card: 'bg-violet-500/12 border-violet-400/35 text-violet-100',
    badge: 'bg-violet-400/20 text-violet-300 border-violet-400/30',
  },
};

export const FolderNotesSection: React.FC<FolderNotesSectionProps> = ({
  folderId,
  folderName,
  employeeCode = 'public',
  authorName = 'ผู้ใช้งาน',
  isPersonalFolder = false,
  onNotesChanged,
}) => {
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

  const handleOpenAddForm = () => {
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
    if (!window.confirm(`ต้องการลบโน้ต "${note.title}" ใช่หรือไม่?`)) return;
    const updated = await deleteFolderNote(note.id, folderId, employeeCode);
    setNotes(updated);
    onNotesChanged?.();
  };

  const handleTogglePin = async (note: FolderNoteItem) => {
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
    <div className="rounded-2xl bg-slate-950/85 border border-amber-400/25 p-3.5 sm:p-4 space-y-3 shadow-lg">
      {/* แถบหัวข้อสมุดโน้ตประจำโฟลเดอร์ */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/35 flex items-center justify-center text-amber-300 shrink-0">
            <StickyNote size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-white">
                สมุดโน้ตประจำโฟลเดอร์ &quot;{folderName}&quot;
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-[10px] font-bold text-amber-300">
                {notes.length} โน้ต
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              จดบันทึกขั้นตอนการทำงาน รหัสอ้างอิง หรือข้อความเตือนความจำไว้ในโฟลเดอร์นี้ได้ทันที
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAddForm}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow transition"
          >
            <Plus size={14} />
            <span>เพิ่มโน้ตในโฟลเดอร์</span>
          </button>

          {notes.length > 0 && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
              title={isExpanded ? 'พับเก็บโน้ต' : 'แสดงโน้ต'}
            >
              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          )}
        </div>
      </div>

      {/* ฟอร์มเพิ่ม/แก้ไขโน้ตในโฟลเดอร์ */}
      {isFormOpen && (
        <form
          onSubmit={handleSaveNote}
          className="p-3.5 rounded-2xl bg-slate-900/95 border border-amber-400/40 space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
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
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                หัวข้อโน้ต *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น ขั้นตอนส่งรายงานก่อน 11:00 น., เบอร์ติดต่อ IT..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 focus:border-amber-400 text-xs sm:text-sm text-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                สีป้ายกระดาษโน้ต
              </label>
              <div className="flex items-center gap-1.5 pt-0.5">
                {(Object.keys(NOTE_COLOR_STYLES) as FolderNoteColor[]).map((cKey) => {
                  const cfg = NOTE_COLOR_STYLES[cKey];
                  const active = color === cKey;
                  return (
                    <button
                      key={cKey}
                      type="button"
                      onClick={() => setColor(cKey)}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition ${
                        active
                          ? 'bg-white text-slate-900 border-white shadow'
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
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              รายละเอียดโน้ต / ข้อความบันทึกช่วยจำ
            </label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="พิมพ์รายละเอียด ขั้นตอนการทำงาน รหัสอ้างอิง หรือรายการสิ่งที่ต้องทำ..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 focus:border-amber-400 text-xs sm:text-sm text-white focus:outline-none leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded border-white/20 bg-slate-950 text-amber-500 focus:ring-0"
                />
                <span>📌 ปักหมุดไว้บนสุด</span>
              </label>

              {!isPersonalFolder && employeeCode !== 'public' && (
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsShared(false)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition ${
                      !isShared
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Lock size={11} />
                    <span>เห็นเฉพาะฉัน ({employeeCode})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsShared(true)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition ${
                      isShared
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Globe size={11} />
                    <span>แชร์ในโฟลเดอร์นี้</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingNoteId(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-slate-300 transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow transition"
              >
                {editingNoteId ? 'บันทึกการแก้ไขโน้ต' : 'บันทึกโน้ตลงโฟลเดอร์'}
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
                className={`rounded-2xl border p-3.5 flex flex-col justify-between gap-2.5 transition ${cfg.card}`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      {note.isPinned && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-extrabold flex items-center gap-1">
                          <Pin size={10} /> ปักหมุด
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold flex items-center gap-1 ${cfg.badge}`}
                      >
                        {note.isShared ? (
                          <>
                            <Globe size={10} /> โน้ตแชร์ในโฟลเดอร์
                          </>
                        ) : (
                          <>
                            <Lock size={10} /> โน้ตส่วนตัว ({note.employeeCode})
                          </>
                        )}
                      </span>
                      <h5 className="text-xs sm:text-sm font-bold text-white break-words">
                        {note.title}
                      </h5>
                    </div>

                    {/* ปุ่มจัดการโน้ต */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(note)}
                        className={`p-1.5 rounded-lg border transition ${
                          note.isPinned
                            ? 'bg-amber-400/25 border-amber-300/50 text-amber-200'
                            : 'bg-black/25 border-white/10 text-slate-300 hover:text-white'
                        }`}
                        title={note.isPinned ? 'เลิกปักหมุด' : 'ปักหมุดไว้บนสุด'}
                      >
                        <Pin size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyContent(note)}
                        className="p-1.5 rounded-lg bg-black/25 hover:bg-black/40 border border-white/10 text-slate-200 transition"
                        title="คัดลอกข้อความโน้ต"
                      >
                        {copiedId === note.id ? (
                          <Check size={12} className="text-emerald-400" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditForm(note)}
                        className="p-1.5 rounded-lg bg-black/25 hover:bg-black/40 border border-white/10 text-slate-200 transition"
                        title="แก้ไขโน้ต"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(note)}
                        className="p-1.5 rounded-lg bg-black/25 hover:bg-rose-500/30 border border-white/10 text-rose-300 transition"
                        title="ลบโน้ต"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {note.content && (
                    <p className="text-xs text-slate-100/95 whitespace-pre-wrap leading-relaxed bg-black/20 rounded-xl p-2.5 border border-white/5">
                      {note.content}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-300/80 pt-1 border-t border-white/10">
                  <span>ผู้บันทึก: {note.authorName}</span>
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

import React, { useState, useEffect } from 'react';
import { AppLink, Category, FolderLayout, IconShape } from '../types/app';
import { IconRenderer } from './IconRenderer';
import {
  X,
  Plus,
  Pencil,
  Trash2,
  LayoutGrid,
  Columns2,
  Rows3,
  ExternalLink,
} from 'lucide-react';

interface FolderModalProps {
  category: Category | null;
  links: AppLink[];
  shape: IconShape;
  defaultLayout?: FolderLayout;
  isEditMode: boolean;
  onClose: () => void;
  onEditLink: (link: AppLink) => void;
  onDeleteLink: (link: AppLink) => void;
  onAddInCategory: (categoryId: string) => void;
  onChangeCategoryLayout: (category: Category, newLayout: FolderLayout) => void;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  category,
  links,
  shape,
  defaultLayout = 'detail-2col',
  isEditMode,
  onClose,
  onEditLink,
  onDeleteLink,
  onAddInCategory,
  onChangeCategoryLayout,
}) => {
  const [activeLayout, setActiveLayout] = useState<FolderLayout>('detail-2col');

  useEffect(() => {
    if (category) {
      setActiveLayout(category.layout || defaultLayout || 'detail-2col');
    }
  }, [category, defaultLayout]);

  if (!category) return null;

  const handleSelectLayout = (layout: FolderLayout) => {
    setActiveLayout(layout);
    onChangeCategoryLayout(category, layout);
  };

  const handleItemClick = (link: AppLink) => {
    if (isEditMode) {
      onEditLink(link);
    } else {
      window.open(link.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xl animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-[34px] bg-slate-900/90 backdrop-blur-2xl border border-white/20 p-5 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.75)] flex flex-col max-h-[86vh]"
      >
        {/* ส่วนหัวโฟลเดอร์ + ปุ่มสลับรูปแบบการแสดงผล (Layout Switcher) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span
              className="w-4 h-4 rounded-full shadow-sm"
              style={{ backgroundColor: category.color || '#6366f1' }}
            />
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {category.name}
                </h3>
                <span className="px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-white/10 text-slate-300">
                  {links.length} รายการ
                </span>
              </div>
              {isEditMode && (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  โหมดแอดมิน: เลือกรูปแบบการแสดงผลของโฟลเดอร์นี้ได้จากปุ่มด้านขวา
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* สวิตช์ปรับรูปแบบหน้าโฟลเดอร์ (แสดงเฉพาะตอนแอดมินปลดล็อกโหมดแก้ไขแล้วเท่านั้น) */}
            {isEditMode && (
              <div className="inline-flex items-center p-1 rounded-2xl bg-slate-950/80 border border-white/15">
                <button
                  type="button"
                  onClick={() => handleSelectLayout('detail-2col')}
                  title="แบบ 2 คอลัมน์: คอลัมน์ 1 แอป/เว็บ | คอลัมน์ 2 คำอธิบาย"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${
                    activeLayout === 'detail-2col'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Rows3 size={14} />
                  <span className="hidden sm:inline">2 คอลัมน์ (เว็บ + คำอธิบาย)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectLayout('cards-2col')}
                  title="แบบการ์ดคู่ 2 คอลัมน์ พร้อมคำอธิบายย่อ"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${
                    activeLayout === 'cards-2col'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Columns2 size={14} />
                  <span className="hidden sm:inline">การ์ดคู่</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectLayout('icons')}
                  title="แบบตารางไอคอนเหมือนหน้าจอมือถือ"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${
                    activeLayout === 'icons'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid size={14} />
                  <span className="hidden sm:inline">ไอคอน</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* พื้นที่แสดงรายการตามรูปแบบที่เลือก */}
        <div className="flex-1 overflow-y-auto pr-1">
          {/* รูปแบบที่ 1: แบบ 2 คอลัมน์ (คอลัมน์ที่ 1 = ไอคอนและชื่อเว็บ | คอลัมน์ที่ 2 = คำอธิบายรายละเอียด) */}
          {activeLayout === 'detail-2col' && (
            <div className="space-y-2.5">
              {/* หัวตาราง 2 คอลัมน์ */}
              <div className="grid grid-cols-12 gap-3 px-4 py-2 rounded-xl bg-slate-950/60 border border-white/10 text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                <div className="col-span-5 sm:col-span-5">คอลัมน์ 1 : เว็บ / ระบบที่ต้องการ</div>
                <div className="col-span-7 sm:col-span-7">คอลัมน์ 2 : คำอธิบายและรายละเอียด</div>
              </div>

              {links.map((link) => (
                <div
                  key={link.id}
                  onClick={() => handleItemClick(link)}
                  className="group relative grid grid-cols-12 gap-3 items-center p-3 sm:p-3.5 rounded-2xl bg-white/6 hover:bg-white/12 border border-white/10 hover:border-indigo-400/40 cursor-pointer transition-all"
                >
                  {/* คอลัมน์ที่ 1: ไอคอน + ชื่อเว็บ */}
                  <div className="col-span-5 sm:col-span-5 flex items-center gap-3 min-w-0 pr-2 border-r border-white/10">
                    <div className="shrink-0 transition-transform group-hover:scale-105">
                      <IconRenderer
                        iconType={link.icon_type}
                        iconName={link.icon_name}
                        iconUrl={link.icon_url}
                        imageFit={link.image_fit}
                        bgStyle={link.bg_style}
                        iconColor={link.icon_color}
                        shape={shape}
                        size="sm"
                        badgeText={link.badge_text}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white group-hover:text-indigo-200 truncate">
                        {link.title}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] text-indigo-300/80 truncate max-w-full">
                        เปิดลิงก์ <ExternalLink size={10} />
                      </span>
                    </div>
                  </div>

                  {/* คอลัมน์ที่ 2: คำอธิบาย */}
                  <div className="col-span-7 sm:col-span-7 flex items-center justify-between gap-2 pl-1 min-w-0">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 leading-relaxed">
                        {link.description || 'ไม่มีคำอธิบายเพิ่มเติม (สามารถกดปุ่มแก้ไขเพื่อเพิ่มคำอธิบายได้)'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                        {link.url}
                      </p>
                    </div>

                    {isEditMode && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditLink(link);
                          }}
                          className="w-7 h-7 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shadow"
                          title="แก้ไข"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteLink(link);
                          }}
                          className="w-7 h-7 rounded-lg bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow"
                          title="ลบ"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* ปุ่มเพิ่มลิงก์ใหม่ในหมวดนี้ (แสดงเฉพาะแอดมินที่ปลดล็อกแล้วเท่านั้น) */}
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAddInCategory(category.id);
                  }}
                  className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-white/20 hover:border-indigo-400 bg-white/5 hover:bg-indigo-500/15 flex items-center justify-center gap-2 text-xs font-medium text-slate-300 hover:text-white transition"
                >
                  <Plus size={16} />
                  เพิ่มลิงก์และคำอธิบายลงในหมวด "{category.name}"
                </button>
              )}
            </div>
          )}

          {/* รูปแบบที่ 2: แบบการ์ดคู่ 2 คอลัมน์ */}
          {activeLayout === 'cards-2col' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {links.map((link) => (
                <div
                  key={link.id}
                  onClick={() => handleItemClick(link)}
                  className="group relative flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/8 hover:bg-white/14 border border-white/10 hover:border-indigo-400/40 cursor-pointer transition"
                >
                  <div className="shrink-0 transition-transform group-hover:scale-105">
                    <IconRenderer
                      iconType={link.icon_type}
                      iconName={link.icon_name}
                      iconUrl={link.icon_url}
                      imageFit={link.image_fit}
                      bgStyle={link.bg_style}
                      iconColor={link.icon_color}
                      shape={shape}
                      size="sm"
                      badgeText={link.badge_text}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-sm font-semibold text-white truncate">{link.title}</h4>
                      <ExternalLink size={12} className="text-slate-400 shrink-0" />
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 mt-1 leading-snug">
                      {link.description || link.url}
                    </p>
                  </div>

                  {isEditMode && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditLink(link);
                        }}
                        className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLink(link);
                        }}
                        className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {isEditMode && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAddInCategory(category.id);
                  }}
                  className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-white/20 hover:border-indigo-400 bg-white/5 hover:bg-indigo-500/15 text-xs font-medium text-slate-300 hover:text-white transition"
                >
                  <Plus size={18} />
                  เพิ่มลิงก์ในหมวดนี้
                </button>
              )}
            </div>
          )}

          {/* รูปแบบที่ 3: แบบตารางไอคอนเหมือนหน้าจอมือถือ */}
          {activeLayout === 'icons' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-y-6 gap-x-4 py-2">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="group relative flex flex-col items-center cursor-pointer"
                  onClick={() => handleItemClick(link)}
                >
                  {isEditMode && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLink(link);
                        }}
                        className="absolute -top-2 left-2 z-20 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow"
                      >
                        <Trash2 size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditLink(link);
                        }}
                        className="absolute -top-2 right-2 z-20 w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow"
                      >
                        <Pencil size={11} />
                      </button>
                    </>
                  )}

                  <div className="transition-transform group-hover:scale-105 group-active:scale-95">
                    <IconRenderer
                      iconType={link.icon_type}
                      iconName={link.icon_name}
                      iconUrl={link.icon_url}
                      imageFit={link.image_fit}
                      bgStyle={link.bg_style}
                      iconColor={link.icon_color}
                      shape={shape}
                      size="md"
                      badgeText={link.badge_text}
                    />
                  </div>

                  <span className="mt-1.5 text-xs font-medium text-white text-center line-clamp-2 max-w-[90px]">
                    {link.title}
                  </span>
                </div>
              ))}

              {isEditMode && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAddInCategory(category.id);
                  }}
                  className="flex flex-col items-center justify-center group"
                >
                  <div className="w-[62px] h-[62px] sm:w-[68px] sm:h-[68px] rounded-[20px] border-2 border-dashed border-white/30 hover:border-indigo-400 bg-white/5 hover:bg-indigo-500/20 flex items-center justify-center text-white/70 group-hover:text-white transition">
                    <Plus size={26} />
                  </div>
                  <span className="mt-1.5 text-xs text-slate-300">เพิ่มในหมวดนี้</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

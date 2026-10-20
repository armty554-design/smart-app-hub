import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AppLink, IconShape } from '../types/app';
import { IconRenderer } from './IconRenderer';
import { Pencil, Trash2, Pin, PinOff } from 'lucide-react';

interface AppIconCardProps {
  link: AppLink;
  shape: IconShape;
  isEditMode: boolean;
  isDockItem?: boolean;
  isLightTheme?: boolean;
  onEdit: (link: AppLink) => void;
  onDelete: (link: AppLink) => void;
  onToggleDock: (link: AppLink) => void;
}

export const AppIconCard: React.FC<AppIconCardProps> = ({
  link,
  shape,
  isEditMode,
  isDockItem = false,
  isLightTheme = false,
  onEdit,
  onDelete,
  onToggleDock,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const handleOpenLink = (e: React.MouseEvent) => {
    if (isEditMode) {
      e.preventDefault();
      onEdit(link);
      return;
    }
    window.open(link.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isEditMode ? listeners : {})}
      className={`group relative flex flex-col items-center justify-start select-none ${
        isEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${isDragging ? 'opacity-80 scale-110 z-50' : ''}`}
    >
      {/* ปุ่มควบคุมมุมบนเมื่ออยู่ในโหมดแก้ไข (Admin Edit Mode) */}
      {isEditMode && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(link);
            }}
            title="ลบลิงก์นี้"
            className="absolute -top-2 -left-1 z-30 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg border border-white/30 transition-transform hover:scale-110"
          >
            <Trash2 size={12} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(link);
            }}
            title="แก้ไขไอคอน/ลิงก์"
            className="absolute -top-2 -right-1 z-30 w-6 h-6 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shadow-lg border border-white/30 transition-transform hover:scale-110"
          >
            <Pencil size={12} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleDock(link);
            }}
            title={link.is_dock ? 'นำออกจากแถบ Dock' : 'ปักหมุดไว้ในแถบ Dock ด้านล่าง'}
            className={`absolute top-11 -right-1 z-30 w-6 h-6 rounded-full ${
              link.is_dock ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-700 hover:bg-slate-600'
            } text-white flex items-center justify-center shadow-lg border border-white/30 transition-transform hover:scale-110`}
          >
            {link.is_dock ? <PinOff size={11} /> : <Pin size={11} />}
          </button>
        </>
      )}

      {/* ตัวไอคอนแอป */}
      <div
        onClick={handleOpenLink}
        title={link.description ? `${link.title} — ${link.description}` : link.title}
        className={`flex flex-col items-center transition-transform duration-200 ${
          isEditMode
            ? 'animate-jiggle'
            : ' group-hover:scale-105 group-active:scale-92'
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
          shape={shape}
          size="md"
          badgeText={!isEditMode ? link.badge_text : ''}
        />

        {/* ชื่อแอปด้านล่างไอคอน */}
        <span
          className={`mt-1.5 text-center leading-tight tracking-tight line-clamp-2 ${
            isLightTheme
              ? 'font-semibold text-slate-800 drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]'
              : 'font-medium text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]'
          } ${
            isDockItem
              ? 'text-[11px] max-w-[68px] sm:max-w-[76px]'
              : 'text-[12px] sm:text-[13px] max-w-[78px] sm:max-w-[88px]'
          }`}
        >
          {link.title}
        </span>
      </div>
    </div>
  );
};

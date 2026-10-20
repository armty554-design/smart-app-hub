import React from 'react';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { AppLink, IconShape } from '../types/app';
import { AppIconCard } from './AppIconCard';
import { Plus } from 'lucide-react';

interface DockBarProps {
  dockLinks: AppLink[];
  shape: IconShape;
  isEditMode: boolean;
  onEdit: (link: AppLink) => void;
  onDelete: (link: AppLink) => void;
  onToggleDock: (link: AppLink) => void;
  onAddDockLink: () => void;
}

export const DockBar: React.FC<DockBarProps> = ({
  dockLinks,
  shape,
  isEditMode,
  onEdit,
  onDelete,
  onToggleDock,
  onAddDockLink,
}) => {
  if (dockLinks.length === 0 && !isEditMode) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-0 right-0 z-30 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3 rounded-[28px] bg-white/12 dark:bg-slate-900/55 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.6)] max-w-full overflow-x-auto no-scrollbar">
        <SortableContext items={dockLinks.map((l) => l.id)} strategy={rectSortingStrategy}>
          {dockLinks.map((link) => (
            <AppIconCard
              key={link.id}
              link={link}
              shape={shape}
              isEditMode={isEditMode}
              isDockItem={true}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleDock={onToggleDock}
            />
          ))}
        </SortableContext>

        {isEditMode && dockLinks.length < 6 && (
          <button
            type="button"
            onClick={onAddDockLink}
            className="flex flex-col items-center justify-center group"
            title="เพิ่มแอปลงในแถบ Dock"
          >
            <div className="w-[62px] h-[62px] sm:w-[68px] sm:h-[68px] rounded-[18px] sm:rounded-[20px] border-2 border-dashed border-white/35 hover:border-indigo-400 bg-white/5 hover:bg-indigo-500/20 flex items-center justify-center text-white/70 group-hover:text-white transition-all">
              <Plus size={26} />
            </div>
            <span className="mt-1.5 text-[11px] text-white/70 font-medium">เพิ่มใน Dock</span>
          </button>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { AppLink, Category, IconShape } from '../types/app';
import { IconRenderer } from './IconRenderer';
import { Search, ExternalLink, X, CornerDownLeft } from 'lucide-react';

interface SpotlightModalProps {
  isOpen: boolean;
  links: AppLink[];
  categories: Category[];
  shape: IconShape;
  onClose: () => void;
}

export const SpotlightModal: React.FC<SpotlightModalProps> = ({
  isOpen,
  links,
  categories,
  shape,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const filtered = links.filter((l) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const catName = (catMap[l.category_id] || '').toLowerCase();
    return (
      l.title.toLowerCase().includes(q) ||
      (l.description || '').toLowerCase().includes(q) ||
      l.url.toLowerCase().includes(q) ||
      catName.includes(q)
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0
        );
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        window.open(filtered[selectedIndex].url, '_blank', 'noopener,noreferrer');
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-950/70 backdrop-blur-xl animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-3xl bg-slate-900/95 border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.75)] overflow-hidden"
      >
        <div className="flex items-center px-4 py-3.5 border-b border-white/10">
          <Search size={20} className="text-indigo-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อระบบ, Google Apps Script, หมวดหมู่..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2 divide-y divide-white/5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              ไม่พบแอปหรือลิงก์ที่ตรงกับ "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    window.open(item.url, '_blank', 'noopener,noreferrer');
                    onClose();
                  }}
                  className={`flex items-center justify-between gap-3 p-3 rounded-2xl cursor-pointer transition ${
                    isSelected ? 'bg-indigo-600/25 border border-indigo-400/30' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <IconRenderer
                      iconType={item.icon_type}
                      iconName={item.icon_name}
                      iconUrl={item.icon_url}
                      linkUrl={item.url}
                      imageFit={item.image_fit}
                      bgStyle={item.bg_style}
                      iconColor={item.icon_color}
                      shape={shape}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-white/10 text-slate-300">
                          {catMap[item.category_id] || 'ทั่วไป'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {item.description || item.url}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-xs text-indigo-300">
                    {isSelected && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-300 bg-white/10 px-2 py-1 rounded-lg">
                        เปิด <CornerDownLeft size={11} />
                      </span>
                    )}
                    <ExternalLink size={15} className="text-slate-400" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

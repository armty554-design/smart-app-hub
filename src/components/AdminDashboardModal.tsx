import React, { useState } from 'react';
import { AppLink, AppSettings, Category, FolderLayout, IconShape } from '../types/app';
import { IconRenderer } from './IconRenderer';
import {
  X,
  Plus,
  Search,
  Pencil,
  Trash2,
  Pin,
  PinOff,
  Eye,
  EyeOff,
  ExternalLink,
  FolderPlus,
  LayoutDashboard,
  Layers,
  Settings,
  ArrowUp,
  ArrowDown,
  Files,
} from 'lucide-react';

interface AdminDashboardModalProps {
  isOpen: boolean;
  links: AppLink[];
  categories: Category[];
  settings: AppSettings;
  onClose: () => void;
  onAddNewLink: (defaultCategoryId?: string, defaultIsDock?: boolean) => void;
  onEditLink: (link: AppLink) => void;
  onDuplicateLink: (link: AppLink) => Promise<void>;
  onDeleteLink: (link: AppLink) => Promise<void>;
  onUpdateLinkQuick: (link: AppLink) => Promise<void>;
  onMoveLinkOrder: (link: AppLink, direction: 'up' | 'down') => Promise<void>;
  onUpsertCategory: (category: Category) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onOpenAppearanceSettings: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  links,
  categories,
  settings,
  onClose,
  onAddNewLink,
  onEditLink,
  onDuplicateLink,
  onDeleteLink,
  onUpdateLinkQuick,
  onMoveLinkOrder,
  onUpsertCategory,
  onDeleteCategory,
  onOpenAppearanceSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'links' | 'categories'>('links');

  // ตัวกรองตารางลิงก์
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCatId, setFilterCatId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'hidden' | 'dock'>('all');

  // ฟอร์มสร้างหมวดหมู่ใหม่
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#6366f1');
  const [newCatLayout, setNewCatLayout] = useState<FolderLayout>('detail-2col');

  if (!isOpen) return null;

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  const filteredLinks = links.filter((link) => {
    const isActive = link.is_active !== false;
    if (filterCatId !== 'all' && link.category_id !== filterCatId) return false;
    if (filterStatus === 'active' && !isActive) return false;
    if (filterStatus === 'hidden' && isActive) return false;
    if (filterStatus === 'dock' && !link.is_dock) return false;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const catName = (catMap[link.category_id]?.name || '').toLowerCase();
    return (
      link.title.toLowerCase().includes(q) ||
      (link.description || '').toLowerCase().includes(q) ||
      link.url.toLowerCase().includes(q) ||
      catName.includes(q)
    );
  });

  const totalLinks = links.length;
  const activeCount = links.filter((l) => l.is_active !== false).length;
  const hiddenCount = totalLinks - activeCount;
  const dockCount = links.filter((l) => l.is_dock).length;

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      icon: 'Folder',
      color: newCatColor,
      layout: newCatLayout,
      sort_order: categories.length + 1,
    };
    await onUpsertCategory(newCat);
    setNewCatName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xl overflow-y-auto">
      <div className="relative w-full max-w-6xl rounded-3xl bg-slate-900 border border-white/15 shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden my-auto h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                ระบบจัดการหลังบ้าน (Admin CMS Dashboard)
              </h2>
              <p className="text-xs text-slate-400">
                จัดการทุกลิงก์ Google Apps Script, ปรับแต่งไอคอน และตั้งค่ารูปแบบโฟลเดอร์ 2 คอลัมน์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenAppearanceSettings}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition"
            >
              <Settings size={14} />
              ตั้งค่าหน้าจอ / PIN / Backup JSON
            </button>

            <button
              type="button"
              onClick={() => onAddNewLink(filterCatId !== 'all' ? filterCatId : undefined, false)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition"
            >
              <Plus size={15} />
              เพิ่มลิงก์ใหม่
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition ml-1"
              title="ปิดหน้าต่างจัดการหลังบ้าน"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs & Quick Stats */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-3 border-b border-white/10 bg-slate-950/30">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('links')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
                activeTab === 'links'
                  ? 'border-indigo-400 text-indigo-300 bg-indigo-500/10 rounded-t-xl'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard size={15} />
              ตารางจัดการลิงก์ทั้งหมด ({totalLinks})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
                activeTab === 'categories'
                  ? 'border-indigo-400 text-indigo-300 bg-indigo-500/10 rounded-t-xl'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Layers size={15} />
              จัดการหมวดหมู่ & รูปแบบโฟลเดอร์ ({categories.length})
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-4 pb-2 text-xs text-slate-400">
            <span>
              แสดงผลอยู่: <strong className="text-emerald-400">{activeCount}</strong>
            </span>
            <span>
              ซ่อนไว้: <strong className="text-amber-400">{hiddenCount}</strong>
            </span>
            <span>
              ปักหมุดใน Dock: <strong className="text-indigo-300">{dockCount}/6</strong>
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {/* TAB 1: ตารางจัดการลิงก์ทั้งหมด (Admin Table) */}
          {activeTab === 'links' && (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-white/10">
                <div className="md:col-span-5 relative">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาชื่อลิงก์, คำอธิบาย, URL, หมวดหมู่..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="md:col-span-4">
                  <select
                    value={filterCatId}
                    onChange={(e) => setFilterCatId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value="all">ทุกหมวดหมู่ ({links.length} รายการ)</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        หมวด: {cat.name} ({links.filter((l) => l.category_id === cat.id).length})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value="all">สถานะทั้งหมด</option>
                    <option value="active">แสดงผลอยู่ ({activeCount})</option>
                    <option value="hidden">ซ่อนไว้ชั่วคราว ({hiddenCount})</option>
                    <option value="dock">อยู่ในแถบ Dock ({dockCount})</option>
                  </select>
                </div>
              </div>

              {/* ตารางแสดงข้อมูลลิงก์ทั้งหมด */}
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-slate-950 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        <th className="py-3 px-3 w-14 text-center">ลำดับ</th>
                        <th className="py-3 px-3">ไอคอน & ชื่อระบบ (คอลัมน์ 1)</th>
                        <th className="py-3 px-3">คำอธิบาย & ลิงก์ URL (คอลัมน์ 2)</th>
                        <th className="py-3 px-3 w-44">หมวดหมู่ / โฟลเดอร์</th>
                        <th className="py-3 px-3 w-28 text-center">สถานะ / Dock</th>
                        <th className="py-3 px-4 w-36 text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {filteredLinks.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            ไม่พบรายการลิงก์ตามเงื่อนไขที่ค้นหา
                          </td>
                        </tr>
                      ) : (
                        filteredLinks.map((link, idx) => {
                          const isActive = link.is_active !== false;
                          return (
                            <tr
                              key={link.id}
                              className={`transition hover:bg-white/5 ${
                                !isActive ? 'opacity-50 bg-slate-950/80' : ''
                              }`}
                            >
                              <td className="py-3 px-2 text-center">
                                <div className="flex flex-col items-center gap-0.5">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => onMoveLinkOrder(link, 'up')}
                                    className="p-0.5 text-slate-400 hover:text-white disabled:opacity-25"
                                    title="เลื่อนขึ้น"
                                  >
                                    <ArrowUp size={12} />
                                  </button>
                                  <span className="font-mono text-[11px] text-slate-400">
                                    {link.sort_order}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={idx === filteredLinks.length - 1}
                                    onClick={() => onMoveLinkOrder(link, 'down')}
                                    className="p-0.5 text-slate-400 hover:text-white disabled:opacity-25"
                                    title="เลื่อนลง"
                                  >
                                    <ArrowDown size={12} />
                                  </button>
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <div className="flex items-center gap-3">
                                  <div
                                    onClick={() => onEditLink(link)}
                                    className="cursor-pointer shrink-0 transition-transform hover:scale-105"
                                    title="คลิกเพื่อแต่งไอคอน"
                                  >
                                    <IconRenderer
                                      iconType={link.icon_type}
                                      iconName={link.icon_name}
                                      iconUrl={link.icon_url}
                                      imageFit={link.image_fit}
                                      bgStyle={link.bg_style}
                                      iconColor={link.icon_color}
                                      shape={settings.icon_shape as IconShape}
                                      size="sm"
                                      badgeText={link.badge_text}
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-white text-sm truncate max-w-[180px]">
                                      {link.title}
                                    </p>
                                    <span className="text-[10px] text-slate-400">
                                      {link.icon_type === 'image'
                                        ? '🖼️ รูปภาพอัปโหลด/URL'
                                        : `✨ ไอคอน: ${link.icon_name}`}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-3 max-w-xs">
                                <p className="text-slate-200 line-clamp-1 font-medium">
                                  {link.description || (
                                    <span className="text-slate-500 italic">ยังไม่มีคำอธิบาย</span>
                                  )}
                                </p>
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200 font-mono truncate max-w-[260px] mt-0.5"
                                >
                                  <span className="truncate">{link.url}</span>
                                  <ExternalLink size={10} className="shrink-0" />
                                </a>
                              </td>

                              <td className="py-3 px-3">
                                <select
                                  value={link.category_id}
                                  onChange={(e) =>
                                    onUpdateLinkQuick({
                                      ...link,
                                      category_id: e.target.value,
                                    })
                                  }
                                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-slate-200 focus:outline-none focus:border-indigo-400"
                                >
                                  {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                      {cat.name}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              <td className="py-3 px-3 text-center">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onUpdateLinkQuick({
                                        ...link,
                                        is_active: !isActive,
                                      })
                                    }
                                    title={
                                      isActive
                                        ? 'แสดงผลอยู่ (คลิกเพื่อซ่อนจากหน้า User ชั่วคราว)'
                                        : 'ซ่อนอยู่ (คลิกเพื่อเปิดแสดงผลให้ User เห็น)'
                                    }
                                    className={`p-1.5 rounded-lg border transition ${
                                      isActive
                                        ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                                        : 'bg-slate-800 border-white/10 text-slate-400'
                                    }`}
                                  >
                                    {isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      onUpdateLinkQuick({
                                        ...link,
                                        is_dock: !link.is_dock,
                                      })
                                    }
                                    title={
                                      link.is_dock
                                        ? 'ปักหมุดในแถบ Dock ด้านล่างแล้ว'
                                        : 'คลิกเพื่อปักหมุดลงแถบ Dock'
                                    }
                                    className={`p-1.5 rounded-lg border transition ${
                                      link.is_dock
                                        ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                                        : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    {link.is_dock ? <Pin size={14} /> : <PinOff size={14} />}
                                  </button>
                                </div>
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => onEditLink(link)}
                                    className="px-2.5 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium flex items-center gap-1 transition"
                                    title="แก้ไขลิงก์/ไอคอน/คำอธิบาย"
                                  >
                                    <Pencil size={12} />
                                    แก้ไข
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => onDuplicateLink(link)}
                                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition"
                                    title="ทำสำเนาลิงก์นี้ (Duplicate)"
                                  >
                                    <Files size={13} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => onDeleteLink(link)}
                                    className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition"
                                    title="ลบลิงก์นี้"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: จัดการหมวดหมู่ & รูปแบบหน้าโฟลเดอร์ */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <form
                onSubmit={handleCreateCategory}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-4 rounded-2xl bg-slate-950/80 border border-white/10"
              >
                <div className="sm:col-span-5">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    ชื่อหมวดหมู่ / โฟลเดอร์ใหม่
                  </label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="เช่น ระบบฝ่ายบัญชี, รายงานผู้บริหาร, คลังสินค้า"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    รูปแบบเมื่อเปิดโฟลเดอร์
                  </label>
                  <select
                    value={newCatLayout}
                    onChange={(e) => setNewCatLayout(e.target.value as FolderLayout)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value="detail-2col">2 คอลัมน์ (เว็บ + คำอธิบาย)</option>
                    <option value="cards-2col">การ์ดคู่ 2 คอลัมน์</option>
                    <option value="icons">ตารางไอคอนเหมือนมือถือ</option>
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">สีป้าย</label>
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-full h-10 rounded-xl cursor-pointer bg-slate-900 border border-white/15 p-1"
                  />
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs sm:text-sm font-semibold text-white flex items-center justify-center gap-2 transition"
                  >
                    <FolderPlus size={16} />
                    สร้างหมวดหมู่ใหม่
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categories.map((cat) => {
                  const count = links.filter((l) => l.category_id === cat.id).length;
                  return (
                    <div
                      key={cat.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950/60 border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={cat.color || '#6366f1'}
                          onChange={(e) =>
                            onUpsertCategory({
                              ...cat,
                              color: e.target.value,
                            })
                          }
                          title="คลิกเพื่อเปลี่ยนสีหมวดหมู่"
                          className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                        <div>
                          <p className="text-sm font-semibold text-white">{cat.name}</p>
                          <span className="text-[11px] text-slate-400">มี {count} ลิงก์ในหมวดนี้</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={cat.layout || 'detail-2col'}
                          onChange={(e) =>
                            onUpsertCategory({
                              ...cat,
                              layout: e.target.value as FolderLayout,
                            })
                          }
                          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-slate-200 focus:outline-none focus:border-indigo-400"
                        >
                          <option value="detail-2col">2 คอลัมน์ (เว็บ + คำอธิบาย)</option>
                          <option value="cards-2col">การ์ดคู่ 2 คอลัมน์</option>
                          <option value="icons">ตารางไอคอน</option>
                        </select>

                        {categories.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteCategory(cat.id)}
                            className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/15 transition"
                            title="ลบหมวดหมู่"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

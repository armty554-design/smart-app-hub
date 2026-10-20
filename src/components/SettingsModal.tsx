import React, { useState, useRef } from 'react';
import { AppLink, AppSettings, Category, FolderLayout, IconShape } from '../types/app';
import { WALLPAPER_PRESETS } from '../constants/wallpapers';
import {
  X,
  Settings,
  FolderPlus,
  Trash2,
  Check,
  Download,
  Upload,
  Lock,
  Image as ImageIcon,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  categories: Category[];
  links: AppLink[];
  onSaveSettings: (newSettings: AppSettings) => Promise<void>;
  onAddCategory: (category: Category) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onImportBundle: (data: { links: AppLink[]; categories: Category[]; settings: AppSettings }) => Promise<void>;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  categories,
  links,
  onSaveSettings,
  onAddCategory,
  onDeleteCategory,
  onImportBundle,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'categories' | 'backup'>('appearance');

  // Appearance & PIN State
  const [hubTitle, setHubTitle] = useState(settings.hub_title);
  const [hubSubtitle, setHubSubtitle] = useState(settings.hub_subtitle);
  const [adminPin, setAdminPin] = useState(settings.admin_pin);
  const [wallpaperId, setWallpaperId] = useState(settings.wallpaper_id);
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState(settings.custom_wallpaper_url || '');
  const [iconShape, setIconShape] = useState<IconShape>(settings.icon_shape || 'squircle');
  const [gridColumns, setGridColumns] = useState(settings.grid_columns || 4);

  // Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#6366f1');
  const [newCatLayout, setNewCatLayout] = useState<FolderLayout>('detail-2col');

  const [saveBanner, setSaveBanner] = useState('');
  const importFileRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = adminPin.replace(/\D/g, '') || '1234';
    await onSaveSettings({
      ...settings,
      hub_title: hubTitle.trim() || 'Smart App Hub',
      hub_subtitle: hubSubtitle.trim(),
      admin_pin: cleanPin.length >= 4 ? cleanPin : '1234',
      wallpaper_id: wallpaperId,
      custom_wallpaper_url: customWallpaperUrl.trim(),
      icon_shape: iconShape,
      grid_columns: gridColumns,
    });
    setSaveBanner('บันทึกการตั้งค่าหน้าจอและรหัส PIN เรียบร้อยแล้ว');
    setTimeout(() => setSaveBanner(''), 3000);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const cat: Category = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      icon: 'Folder',
      color: newCatColor,
      layout: newCatLayout,
      sort_order: categories.length + 1,
    };
    await onAddCategory(cat);
    setNewCatName('');
  };

  const handleExportJson = () => {
    const bundle = {
      exportedAt: new Date().toISOString(),
      settings,
      categories,
      links,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `app-hub-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (Array.isArray(parsed.links)) {
          await onImportBundle({
            links: parsed.links,
            categories: Array.isArray(parsed.categories) ? parsed.categories : categories,
            settings: parsed.settings ? { ...settings, ...parsed.settings } : settings,
          });
          setSaveBanner('นำเข้าข้อมูลสำรอง (Import JSON) สำเร็จแล้ว!');
          setTimeout(() => setSaveBanner(''), 3000);
        }
      } catch {
        alert('ไฟล์ JSON ไม่ถูกต้อง');
      }
    };
    reader.readAsText(file);
    if (importFileRef.current) importFileRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xl overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border border-white/15 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/95">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Settings size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white">
                ตั้งค่าระบบหลังบ้าน (Admin Settings)
              </h2>
              <p className="text-xs text-slate-400">
                ปรับแต่งหน้าจอโฮม, หมวดหมู่, รหัส PIN และสำรองข้อมูล JSON
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-6 pt-3 border-b border-white/10 bg-slate-950/50 overflow-x-auto no-scrollbar">
          {[
            { id: 'appearance', label: 'หน้าจอ & รหัส PIN', icon: ImageIcon },
            { id: 'categories', label: 'หมวดหมู่ / โฟลเดอร์', icon: Layers },
            { id: 'backup', label: 'สำรองข้อมูล (Export / Import JSON)', icon: Download },
          ].map((tab) => {
            const IconComp = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition ${
                  active
                    ? 'border-indigo-400 text-indigo-300 bg-indigo-500/10 rounded-t-xl'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <IconComp size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {saveBanner && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-xs text-emerald-300 flex items-center gap-2 font-medium">
              <CheckCircle2 size={16} />
              {saveBanner}
            </div>
          )}

          {/* TAB 1: หน้าจอ & รหัส PIN */}
          {activeTab === 'appearance' && (
            <form onSubmit={handleSaveGeneral} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    หัวข้อหน้าจอหลัก (Hub Title)
                  </label>
                  <input
                    type="text"
                    value={hubTitle}
                    onChange={(e) => setHubTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    คำอธิบายใต้หัวข้อ
                  </label>
                  <input
                    type="text"
                    value={hubSubtitle}
                    onChange={(e) => setHubSubtitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Lock size={13} className="text-amber-400" />
                    รหัส PIN เข้าโหมด Admin (ตัวเลข 4-6 หลัก)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    รูปทรงไอคอนแอป (Icon Shape)
                  </label>
                  <select
                    value={iconShape}
                    onChange={(e) => setIconShape(e.target.value as IconShape)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value="squircle">Squircle (สไตล์ iOS / iPhone)</option>
                    <option value="rounded">Rounded Square (สี่เหลี่ยมขอบมน)</option>
                    <option value="circle">Circle (วงกลมสไตล์ Android Pixel)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    จำนวนคอลัมน์บนหน้าจอคอมฯ
                  </label>
                  <select
                    value={gridColumns}
                    onChange={(e) => setGridColumns(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value={4}>4 คอลัมน์ (เหมือนหน้าจอมือถือ)</option>
                    <option value={5}>5 คอลัมน์ (เหมือน iPad / แท็บเล็ต)</option>
                    <option value={6}>6 คอลัมน์ (จอกว้างจุได้เยอะ)</option>
                  </select>
                </div>
              </div>

              {/* เลือก Wallpaper */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2.5">
                  ภาพพื้นหลังหน้าจอ (Wallpaper Presets)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {WALLPAPER_PRESETS.map((wp) => {
                    const selected = wallpaperId === wp.id && !customWallpaperUrl;
                    return (
                      <button
                        key={wp.id}
                        type="button"
                        onClick={() => {
                          setWallpaperId(wp.id);
                          setCustomWallpaperUrl('');
                        }}
                        className={`p-2 rounded-2xl border text-left transition ${
                          selected
                            ? 'border-indigo-400 bg-indigo-500/15 ring-2 ring-indigo-400/40'
                            : 'border-white/10 bg-slate-950/60 hover:border-white/25'
                        }`}
                      >
                        <div
                          className="h-14 w-full rounded-xl mb-2 border border-white/10"
                          style={{ background: wp.thumbnail }}
                        />
                        <div className="flex items-center justify-between px-1">
                          <span className="text-xs font-medium text-white truncate">{wp.name}</span>
                          {selected && <Check size={14} className="text-indigo-400 shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  หรือใช้ลิงก์รูปภาพพื้นหลังกำหนดเอง (Custom Wallpaper Image URL)
                </label>
                <input
                  type="text"
                  value={customWallpaperUrl}
                  onChange={(e) => setCustomWallpaperUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition"
                >
                  บันทึกการตั้งค่าหน้าจอ
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: จัดการหมวดหมู่ / โฟลเดอร์ */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <form
                onSubmit={handleCreateCategory}
                className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 p-4 rounded-2xl bg-slate-950/80 border border-white/10"
              >
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    ชื่อหมวดหมู่ / โฟลเดอร์ใหม่
                  </label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="เช่น ระบบฝ่ายขาย, รายงานผู้บริหาร, เครื่องมือ AI"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-sm text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    รูปแบบหน้าโฟลเดอร์เริ่มต้น
                  </label>
                  <select
                    value={newCatLayout}
                    onChange={(e) => setNewCatLayout(e.target.value as FolderLayout)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value="detail-2col">2 คอลัมน์ (เว็บ + คำอธิบาย)</option>
                    <option value="cards-2col">การ์ดคู่ 2 คอลัมน์</option>
                    <option value="icons">ตารางไอคอนปกติ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">สีประจำหมวด</label>
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-12 h-10 rounded-xl cursor-pointer bg-slate-900 border border-white/15 p-1"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs sm:text-sm font-semibold text-white flex items-center justify-center gap-2 transition"
                >
                  <FolderPlus size={16} />
                  เพิ่มหมวดหมู่
                </button>
              </form>

              <div className="space-y-2.5">
                {categories.map((cat) => {
                  const count = links.filter((l) => l.category_id === cat.id).length;
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-white/10"
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: cat.color || '#6366f1' }}
                        />
                        <span className="text-sm font-medium text-white">{cat.name}</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300">
                          {count} แอป
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={cat.layout || 'detail-2col'}
                          onChange={(e) =>
                            onAddCategory({
                              ...cat,
                              layout: e.target.value as FolderLayout,
                            })
                          }
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-slate-200 focus:outline-none focus:border-indigo-400"
                          title="เลือกรูปแบบการแสดงผลเมื่อเปิดโฟลเดอร์นี้"
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
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: สำรองข้อมูล Export / Import JSON */}
          {activeTab === 'backup' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/10 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-white">ส่งออกข้อมูลสำรอง (Export JSON)</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    ดาวน์โหลดรายการลิงก์ทั้งหมด, ไอคอนที่ตั้งค่าไว้, หมวดหมู่ และการตั้งค่าหน้าจอเก็บไว้เป็นไฟล์ `.json`
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center justify-center gap-2 transition"
                >
                  <Download size={16} />
                  ดาวน์โหลดไฟล์ Backup (.json)
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/10 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-white">นำเข้าข้อมูล (Import JSON)</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    กู้คืนรายการลิงก์และไอคอนจากไฟล์ `.json` ที่เคยสำรองไว้
                  </p>
                </div>
                <input
                  ref={importFileRef}
                  type="file"
                  accept="application/json"
                  onChange={handleImportJson}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => importFileRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white flex items-center justify-center gap-2 transition"
                >
                  <Upload size={16} />
                  เลือกไฟล์ JSON เพื่อนำเข้า
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { AppLink, AppSettings, Category, FolderLayout } from './types/app';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, WALLPAPER_PRESETS } from './constants/wallpapers';
import {
  fetchAllHubData,
  upsertAppLink,
  deleteAppLink,
  reorderAppLinks,
  upsertCategory,
  deleteCategory,
  updateHubSettings,
  setLocalLinks,
  setLocalCategories,
  setLocalSettings,
} from './services/linkService';
import { AppIconCard } from './components/AppIconCard';
import { DockBar } from './components/DockBar';
import { PinLockModal } from './components/PinLockModal';
import { LinkFormModal } from './components/LinkFormModal';
import { FolderModal } from './components/FolderModal';
import { SpotlightModal } from './components/SpotlightModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { AndroidInstallPrompt } from './components/AndroidInstallPrompt';
import { IconRenderer } from './components/IconRenderer';
import {
  Search,
  Plus,
  Settings,
  Lock,
  Unlock,
  LayoutGrid,
  LayoutDashboard,
  Folder,
  Rows3,
  ExternalLink,
  Pencil,
  Trash2,
  Sparkles,
  Wifi,
  Check,
  Monitor,
  Smartphone,
  Pin,
} from 'lucide-react';

export function App() {
  const [links, setLinks] = useState<AppLink[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Navigation & View Mode
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'folders' | 'detail-2col'>('grid');
  const [openedFolderCategory, setOpenedFolderCategory] = useState<Category | null>(null);

  // Admin & Modals State
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingAdminAction, setPendingAdminAction] = useState<'edit' | 'add' | 'settings'>('edit');

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<AppLink | null>(null);
  const [defaultAddCategory, setDefaultAddCategory] = useState<string>('all');
  const [defaultAddIsDock, setDefaultAddIsDock] = useState<boolean>(false);

  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);

  // Clock for Mobile Status Bar
  const [now, setNow] = useState(new Date());

  const loadHubData = useCallback(async () => {
    setIsLoading(true);
    const bundle = await fetchAllHubData();
    setLinks(bundle.links);
    setCategories(bundle.categories);
    setSettings(bundle.settings);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadHubData();
  }, [loadHubData]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // คีย์ลัด Ctrl+K หรือ Cmd+K เพื่อเปิด Spotlight Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSpotlightOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Drag & Drop Sensors (รองรับทั้งเมาส์และหน้าจอสัมผัสบนมือถือ)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = links.findIndex((item) => item.id === active.id);
    const newIndex = links.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(links, oldIndex, newIndex);
    setLinks(reordered);
    const saved = await reorderAppLinks(reordered);
    setLinks(saved);
  };

  // การเข้าสู่โหมด Admin ด้วยรหัส PIN
  const requestAdminAccess = (action: 'edit' | 'add' | 'settings' | 'dashboard') => {
    if (isEditMode) {
      if (action === 'edit') {
        setIsEditMode(false);
      } else if (action === 'add') {
        openAddLinkModal(activeCategoryId, false);
      } else if (action === 'settings') {
        setIsSettingsOpen(true);
      } else if (action === 'dashboard') {
        setIsAdminDashboardOpen(true);
      }
      return;
    }

    setPendingAdminAction(action as 'edit' | 'add' | 'settings');
    setIsPinModalOpen(true);
  };

  const handlePinVerified = () => {
    setIsPinModalOpen(false);
    setIsEditMode(true);
    if (pendingAdminAction === 'add') {
      openAddLinkModal(activeCategoryId, false);
    } else if (pendingAdminAction === 'settings') {
      setIsSettingsOpen(true);
    } else {
      setIsAdminDashboardOpen(true);
    }
  };

  const openAddLinkModal = (categoryId = 'all', isDock = false) => {
    setEditingLink(null);
    setDefaultAddCategory(categoryId);
    setDefaultAddIsDock(isDock);
    setIsLinkModalOpen(true);
  };

  const openEditLinkModal = (link: AppLink) => {
    setEditingLink(link);
    setIsLinkModalOpen(true);
  };

  const handleSaveLink = async (linkPayload: AppLink) => {
    const updated = await upsertAppLink(linkPayload, links);
    setLinks(updated);
  };

  const handleDeleteLink = async (link: AppLink) => {
    if (!window.confirm(`ต้องการลบลิงก์ "${link.title}" ออกจากหน้าจอโฮมใช่หรือไม่?`)) {
      return;
    }
    const updated = await deleteAppLink(link.id, links);
    setLinks(updated);
  };

  const handleToggleDock = async (link: AppLink) => {
    const currentDockCount = links.filter((l) => l.is_dock).length;
    if (!link.is_dock && currentDockCount >= 6) {
      alert('แถบ Dock ด้านล่างรองรับได้สูงสุด 6 แอปพลิเคชันครับ');
      return;
    }
    const updated = await upsertAppLink({ ...link, is_dock: !link.is_dock }, links);
    setLinks(updated);
  };

  const handleDuplicateLink = async (link: AppLink) => {
    const copy: AppLink = {
      ...link,
      id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: `${link.title} (สำเนา)`,
      sort_order: links.length + 1,
    };
    const updated = await upsertAppLink(copy, links);
    setLinks(updated);
  };

  const handleMoveLinkOrder = async (link: AppLink, direction: 'up' | 'down') => {
    const idx = links.findIndex((l) => l.id === link.id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= links.length) return;
    const reordered = arrayMove(links, idx, targetIdx);
    const saved = await reorderAppLinks(reordered);
    setLinks(saved);
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    const saved = await updateHubSettings(newSettings);
    setSettings(saved);
  };

  const handleAddCategory = async (category: Category) => {
    const updated = await upsertCategory(category, categories);
    setCategories(updated);
  };

  const handleChangeCategoryLayout = async (category: Category, newLayout: FolderLayout) => {
    const updatedCat: Category = { ...category, layout: newLayout };
    const updated = await upsertCategory(updatedCat, categories);
    setCategories(updated);
    setOpenedFolderCategory(updatedCat);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('ต้องการลบหมวดหมู่นี้ใช่หรือไม่? (แอปข้างในจะถูกย้ายไปหมวดหมู่แรกแทน)')) {
      return;
    }
    const fallbackCatId = categories.find((c) => c.id !== categoryId)?.id || 'work-script';
    const updatedCats = await deleteCategory(categoryId, categories);
    setCategories(updatedCats);

    // ย้ายลิงก์ที่อยู่ในหมวดที่ถูกลบไปยังหมวดสำรอง
    const updatedLinks = links.map((l) =>
      l.category_id === categoryId ? { ...l, category_id: fallbackCatId } : l
    );
    const savedLinks = await reorderAppLinks(updatedLinks);
    setLinks(savedLinks);
    if (activeCategoryId === categoryId) {
      setActiveCategoryId('all');
    }
  };

  const handleImportBundle = async (bundle: {
    links: AppLink[];
    categories: Category[];
    settings: AppSettings;
  }) => {
    setLocalLinks(bundle.links);
    setLocalCategories(bundle.categories);
    setLocalSettings(bundle.settings);
    setLinks(bundle.links);
    setCategories(bundle.categories);
    setSettings(bundle.settings);
  };

  // คำนวณภาพพื้นหลัง Wallpaper
  const activeWallpaper =
    WALLPAPER_PRESETS.find((w) => w.id === settings.wallpaper_id) || WALLPAPER_PRESETS[0];

  const wallpaperStyle: React.CSSProperties = settings.custom_wallpaper_url
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(9, 13, 22, 0.55) 0%, rgba(9, 13, 22, 0.78) 100%), url(${settings.custom_wallpaper_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        background: activeWallpaper.style,
      };

  // แยกรายการลิงก์ที่เปิดแสดงผล (สำหรับ User ทั่วไปจะเห็นเฉพาะ is_active !== false)
  const visibleLinks = isEditMode ? links : links.filter((l) => l.is_active !== false);
  const dockLinks = visibleLinks.filter((l) => l.is_dock);
  const mainGridLinks = visibleLinks.filter((l) => {
    if (activeCategoryId === 'all') {
      return !l.is_dock;
    }
    return l.category_id === activeCategoryId;
  });

  const gridColsClass =
    settings.grid_columns === 6
      ? 'grid-cols-4 sm:grid-cols-5 lg:grid-cols-6'
      : settings.grid_columns === 5
      ? 'grid-cols-4 sm:grid-cols-5'
      : 'grid-cols-4 sm:grid-cols-4 lg:grid-cols-5';

  const activeCategoryObj = categories.find((c) => c.id === activeCategoryId) || null;

  const timeString = now.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const dateString = now.toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div
      style={wallpaperStyle}
      className="min-h-screen w-full flex flex-col justify-between pb-36 transition-all duration-500 select-none"
    >
      {/* แถบ Status Bar ด้านบนสุด (แยกดีไซน์ Mobile Status Bar vs Desktop Top Bar) */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-slate-950/40 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs font-medium text-white/90">
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-wide text-sm">{timeString}</span>
            <span className="hidden sm:inline text-white/40">|</span>
            <span className="hidden sm:inline text-white/80">{dateString}</span>
            <span className="hidden lg:inline-flex items-center gap-1.5 ml-2 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-[11px] text-indigo-200">
              <Monitor size={12} className="text-indigo-400" />
              Desktop Workspace Mode
            </span>
            <span className="inline-flex lg:hidden items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-slate-300">
              <Smartphone size={11} className="text-emerald-400" />
              Mobile
            </span>
          </div>

          {/* แถบปุ่มติดตั้งแอป Android + สถานะโหมดแก้ไข */}
          <div className="flex items-center gap-2">
            {/* ปุ่มไอคอนสำหรับติดตั้งลงหน้าจอ Android / มือถือ */}
            <AndroidInstallPrompt hubTitle={settings.hub_title} />

            <Wifi size={14} className="text-white/80 hidden sm:block" />

            {/* ปุ่มสลับโหมดแก้ไข (Admin Mode) */}
            {isEditMode ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAdminDashboardOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg transition"
                >
                  <LayoutDashboard size={13} />
                  <span className="hidden xs:inline">ตารางหลังบ้าน (CMS)</span>
                </button>
                <button
                  type="button"
                  onClick={() => openAddLinkModal(activeCategoryId, false)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition"
                >
                  <Plus size={13} />
                  <span className="hidden sm:inline">เพิ่มลิงก์</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg transition"
                >
                  <Check size={13} />
                  ล็อกกลับ
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => requestAdminAccess('dashboard')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/50 hover:text-white/90 text-[11px] font-medium transition"
                title="สำหรับผู้ดูแลระบบเท่านั้น (Admin Lock)"
              >
                <Lock size={11} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* โครงสร้างหลัก: แยกความต่างระหว่าง โทรศัพท์ (Mobile Home Screen) กับ คอมพิวเตอร์ (Desktop Command Center Sidebar + Workspace) */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 lg:pt-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
          {/* =====================================================================
              ฝั่งซ้ายบนคอมพิวเตอร์ (Desktop Sidebar Navigation - ซ่อนบนโทรศัพท์)
             ===================================================================== */}
          <aside className="hidden lg:flex lg:col-span-3 flex-col gap-5 sticky top-16 rounded-3xl bg-slate-950/55 backdrop-blur-2xl border border-white/15 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            {/* โลโก้และชื่อระบบบนคอมพิวเตอร์ */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-white/10">
              <img
                src="/app-icon.svg"
                alt="App Hub Logo"
                className="w-12 h-12 rounded-2xl shadow-lg border border-white/20 shrink-0"
              />
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white truncate">{settings.hub_title}</h2>
                <p className="text-[11px] text-indigo-300 truncate">
                  {settings.hub_subtitle || 'Google Apps Script Hub'}
                </p>
              </div>
            </div>

            {/* ปุ่มค้นหาด่วนบน Sidebar คอมพิวเตอร์ */}
            <button
              type="button"
              onClick={() => setIsSpotlightOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white/80 transition"
            >
              <span className="flex items-center gap-2">
                <Search size={15} className="text-indigo-400" />
                <span>ค้นหาระบบด่วน...</span>
              </span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-black/40 text-slate-300 border border-white/10">
                Ctrl K
              </kbd>
            </button>

            {/* รายการหมวดหมู่ / โฟลเดอร์ สำหรับคลิกบนจอคอมพิวเตอร์ */}
            <div className="space-y-1.5">
              <div className="px-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                <span>หมวดหมู่ระบบงาน</span>
                <span>{visibleLinks.length} แอป</span>
              </div>

              <button
                type="button"
                onClick={() => setActiveCategoryId('all')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition ${
                  activeCategoryId === 'all'
                    ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/30'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <LayoutGrid size={15} />
                  <span>รวมทุกระบบ (All Apps)</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/25">
                  {visibleLinks.length}
                </span>
              </button>

              {categories.map((cat) => {
                const count = visibleLinks.filter((l) => l.category_id === cat.id).length;
                const isActive = activeCategoryId === cat.id;
                return (
                  <div key={cat.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveCategoryId(cat.id)}
                      className={`flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition min-w-0 ${
                        isActive
                          ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/30'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color || '#6366f1' }}
                        />
                        <span className="truncate">{cat.name}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/25 shrink-0">
                        {count}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOpenedFolderCategory(cat)}
                      title={`เปิดหน้าต่างโฟลเดอร์ "${cat.name}" แบบขยาย`}
                      className="p-2.5 rounded-2xl bg-white/5 hover:bg-indigo-500/30 text-slate-300 hover:text-white border border-white/10 transition shrink-0"
                    >
                      <Folder size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* รายการปักหมุดด่วน (Pinned Dock) บน Sidebar คอมพิวเตอร์ */}
            {dockLinks.length > 0 && (
              <div className="pt-4 border-t border-white/10 space-y-2">
                <div className="px-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                  <Pin size={12} />
                  <span>ระบบที่ใช้บ่อย (Pinned)</span>
                </div>
                <div className="space-y-1.5">
                  {dockLinks.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (isEditMode) {
                          openEditLinkModal(item);
                        } else {
                          window.open(item.url, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      className="group flex items-center justify-between gap-2.5 p-2 rounded-2xl bg-white/5 hover:bg-white/12 border border-white/10 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="scale-90 origin-left shrink-0">
                          <IconRenderer
                            iconType={item.icon_type}
                            iconName={item.icon_name}
                            iconUrl={item.icon_url}
                            linkUrl={item.url}
                            imageFit={item.image_fit}
                            bgStyle={item.bg_style}
                            iconColor={item.icon_color}
                            shape={settings.icon_shape}
                            size="sm"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate group-hover:text-indigo-200">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {item.description || 'คลิกเพื่อเปิดใช้งาน'}
                          </p>
                        </div>
                      </div>
                      <ExternalLink size={12} className="text-slate-400 group-hover:text-white shrink-0 mr-1" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* =====================================================================
              พื้นที่แสดงผลหลัก (Mobile = Phone Home Screen | Desktop = Workspace Area)
             ===================================================================== */}
          <main className="lg:col-span-9 w-full">
            {/* ส่วนหัวสำหรับหน้าจอมือถือ (Mobile Header - แสดงเฉพาะจอโทรศัพท์/แท็บเล็ตแนวตั้ง) */}
            <div className="flex lg:hidden flex-col items-center text-center mb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] text-indigo-200 mb-2 backdrop-blur-md">
                <Sparkles size={12} className="text-indigo-400" />
                <span>{settings.hub_subtitle || 'Google Apps Script & Web App Launcher'}</span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">
                {settings.hub_title}
              </h1>

              {/* แถบค้นหา Spotlight สไตล์มือถือ */}
              <div className="w-full max-w-md mt-3.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSpotlightOpen(true)}
                  className="flex-1 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/12 hover:bg-white/18 backdrop-blur-xl border border-white/20 text-left text-xs text-white/80 shadow-lg transition"
                >
                  <span className="flex items-center gap-2">
                    <Search size={15} className="text-indigo-300" />
                    <span>ค้นหาแอป, ระบบงาน, ลิงก์...</span>
                  </span>
                </button>

                <div className="inline-flex items-center p-1 rounded-2xl bg-white/12 backdrop-blur-xl border border-white/20 shadow-lg">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-xl transition ${
                      viewMode === 'grid' ? 'bg-indigo-600 text-white shadow' : 'text-white/75'
                    }`}
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('folders')}
                    className={`p-2 rounded-xl transition ${
                      viewMode === 'folders' ? 'bg-indigo-600 text-white shadow' : 'text-white/75'
                    }`}
                  >
                    <Folder size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('detail-2col')}
                    className={`p-2 rounded-xl transition ${
                      viewMode === 'detail-2col' ? 'bg-indigo-600 text-white shadow' : 'text-white/75'
                    }`}
                  >
                    <Rows3 size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* ส่วนหัวสำหรับหน้าจอคอมพิวเตอร์ (Desktop Workspace Header - แสดงเฉพาะจอคอมฯ) */}
            <div className="hidden lg:flex items-center justify-between gap-4 mb-6 p-5 rounded-3xl bg-slate-950/50 backdrop-blur-2xl border border-white/15 shadow-xl">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-bold text-white tracking-tight">
                    {activeCategoryObj ? activeCategoryObj.name : settings.hub_title}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-xs font-semibold text-indigo-200">
                    {activeCategoryId === 'all' ? `${visibleLinks.length} ระบบทั้งหมด` : `${mainGridLinks.length} ระบบในหมวดนี้`}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {settings.hub_subtitle || 'คลิกที่ไอคอนเพื่อเปิดลิงก์ระบบงาน หรือสลับมุมมองตาราง 2 คอลัมน์ด้านขวา'}
                </p>
              </div>

              {/* สวิตช์สลับมุมมองขนาดใหญ่สำหรับหน้าจอคอมพิวเตอร์ */}
              <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-white/15">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    viewMode === 'grid'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <LayoutGrid size={15} />
                  <span>ไอคอนแอป</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('folders')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    viewMode === 'folders'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Folder size={15} />
                  <span>โฟลเดอร์</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('detail-2col')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    viewMode === 'detail-2col'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Rows3 size={15} />
                  <span>ตาราง 2 คอลัมน์ (เว็บ + คำอธิบาย)</span>
                </button>
              </div>
            </div>

        {/* แถบแจ้งเตือนโหมดแก้ไข (Admin Edit Banner) */}
        {isEditMode && (
          <div className="mb-5 p-3.5 rounded-2xl bg-indigo-950/75 border border-indigo-400/40 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shadow-xl animate-fade-in">
            <div className="flex items-center gap-2.5 text-xs text-indigo-100">
              <Unlock size={16} className="text-emerald-400 shrink-0" />
              <span>
                <strong>โหมดแอดมิน:</strong> เปิดตารางจัดการข้อมูลหลังบ้าน (CMS) หรือลากไอคอนบนหน้าจอเพื่อจัดเรียงได้ทันที
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdminDashboardOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition"
              >
                <LayoutDashboard size={14} /> เปิดตารางจัดการหลังบ้าน (CMS)
              </button>
              <button
                type="button"
                onClick={() => openAddLinkModal(activeCategoryId, false)}
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-medium flex items-center gap-1 transition"
              >
                <Plus size={14} /> เพิ่มลิงก์ด่วน
              </button>
            </div>
          </div>
        )}

        {/* แถบเลือกหมวดหมู่แนวนอนสำหรับโทรศัพท์ (Mobile Category Pills - ซ่อนบนจอคอมฯ เพราะมี Sidebar ด้านซ้ายแล้ว) */}
        {(viewMode === 'grid' || viewMode === 'detail-2col') && (
          <div className="flex lg:hidden items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-3 mb-5 no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveCategoryId('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition backdrop-blur-md ${
                activeCategoryId === 'all'
                  ? 'bg-white text-slate-950 shadow-md font-semibold'
                  : 'bg-white/10 hover:bg-white/20 text-white/85 border border-white/15'
              }`}
            >
              หน้าโฮมทั้งหมด ({visibleLinks.length})
            </button>

            {categories.map((cat) => {
              const count = visibleLinks.filter((l) => l.category_id === cat.id).length;
              const isActive = activeCategoryId === cat.id;
              return (
                <div key={cat.id} className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveCategoryId(cat.id)}
                    onDoubleClick={() => setOpenedFolderCategory(cat)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition backdrop-blur-md ${
                      isActive
                        ? 'bg-white text-slate-950 shadow-md font-semibold'
                        : 'bg-white/10 hover:bg-white/20 text-white/85 border border-white/15'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cat.color || '#6366f1' }}
                    />
                    <span>{cat.name}</span>
                    <span
                      className={`text-[10px] ${
                        isActive ? 'text-slate-600' : 'text-white/60'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenedFolderCategory(cat)}
                    title={`เปิดป๊อปอัปโฟลเดอร์ "${cat.name}"`}
                    className="p-1.5 rounded-full bg-white/8 hover:bg-indigo-500/40 text-white/70 hover:text-white border border-white/10 transition"
                  >
                    <Folder size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* พื้นที่แสดงผลไอคอนแอป */}
        {isLoading ? (
          <div className="grid grid-cols-4 gap-y-7 gap-x-4 py-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center animate-pulse">
                <div className="w-16 h-16 rounded-[20px] bg-white/15" />
                <div className="w-14 h-3 rounded bg-white/15 mt-2" />
              </div>
            ))}
          </div>
        ) : viewMode === 'folders' ? (
          /* มุมมองโฟลเดอร์สไตล์ iOS (จัดกลุ่มตามหมวดหมู่) */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 py-2">
            {categories.map((cat) => {
              const catLinks = visibleLinks.filter((l) => l.category_id === cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => setOpenedFolderCategory(cat)}
                  className="group cursor-pointer rounded-[32px] bg-white/12 hover:bg-white/18 backdrop-blur-2xl border border-white/20 p-4 shadow-xl transition-transform hover:scale-[1.02] active:scale-98 flex flex-col items-center"
                >
                  {/* มินิไอคอน 3x3 ในโฟลเดอร์ */}
                  <div className="w-36 h-36 rounded-[26px] bg-slate-950/35 border border-white/10 p-3 grid grid-cols-3 grid-rows-3 gap-2 items-center justify-items-center">
                    {catLinks.slice(0, 9).map((item) => (
                      <div key={item.id} className="scale-[0.65] origin-center">
                        <IconRenderer
                          iconType={item.icon_type}
                          iconName={item.icon_name}
                          iconUrl={item.icon_url}
                          imageFit={item.image_fit}
                          bgStyle={item.bg_style}
                          iconColor={item.icon_color}
                          shape={settings.icon_shape}
                          size="sm"
                        />
                      </div>
                    ))}
                  </div>
                  <span className="mt-3 text-sm font-semibold text-white">{cat.name}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-white/60">{catLinks.length} แอป</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/25 border border-indigo-400/30 text-indigo-200">
                      {(cat.layout || 'detail-2col') === 'detail-2col'
                        ? '2 คอลัมน์ (เว็บ+คำอธิบาย)'
                        : cat.layout === 'cards-2col'
                        ? 'การ์ดคู่'
                        : 'ตารางไอคอน'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'detail-2col' ? (
          /* มุมมองตาราง 2 คอลัมน์ (คอลัมน์ที่ 1: เว็บที่ต้องการ | คอลัมน์ที่ 2: คำอธิบาย) */
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-12 gap-3 px-4 py-2.5 rounded-2xl bg-slate-950/65 backdrop-blur-xl border border-white/15 text-xs font-semibold text-indigo-300">
              <div className="col-span-5 sm:col-span-4">คอลัมน์ที่ 1 : เว็บ / แอปที่ต้องการ</div>
              <div className="col-span-7 sm:col-span-8">คอลัมน์ที่ 2 : คำอธิบายการใช้งาน</div>
            </div>

            {(activeCategoryId === 'all'
              ? visibleLinks
              : visibleLinks.filter((l) => l.category_id === activeCategoryId)
            ).map((link) => (
              <div
                key={link.id}
                onClick={() => {
                  if (isEditMode) {
                    openEditLinkModal(link);
                  } else {
                    window.open(link.url, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="group grid grid-cols-12 gap-3 items-center p-3.5 rounded-2xl bg-white/10 hover:bg-white/16 backdrop-blur-xl border border-white/15 hover:border-indigo-400/50 shadow-lg cursor-pointer transition-all"
              >
                {/* คอลัมน์ที่ 1: ไอคอน + ชื่อเว็บ */}
                <div className="col-span-5 sm:col-span-4 flex items-center gap-3 min-w-0 pr-2 border-r border-white/15">
                  <div className="shrink-0 transition-transform group-hover:scale-105">
                    <IconRenderer
                      iconType={link.icon_type}
                      iconName={link.icon_name}
                      iconUrl={link.icon_url}
                      linkUrl={link.url}
                      imageFit={link.image_fit}
                      bgStyle={link.bg_style}
                      iconColor={link.icon_color}
                      shape={settings.icon_shape}
                      size="sm"
                      badgeText={link.badge_text}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-white group-hover:text-indigo-200 truncate">
                      {link.title}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-indigo-300">
                      กดเปิดเว็บ <ExternalLink size={10} />
                    </span>
                  </div>
                </div>

                {/* คอลัมน์ที่ 2: คำอธิบาย */}
                <div className="col-span-7 sm:col-span-8 flex items-center justify-between gap-3 pl-1 min-w-0">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-white/90 leading-relaxed line-clamp-2">
                      {link.description || 'ไม่มีคำอธิบาย (เข้าโหมดจัดการเพื่อเพิ่มคำอธิบายได้)'}
                    </p>
                    <p className="text-[10px] text-white/50 font-mono truncate mt-0.5">{link.url}</p>
                  </div>

                  {isEditMode && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditLinkModal(link);
                        }}
                        className="w-8 h-8 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shadow"
                        title="แก้ไข"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLink(link);
                        }}
                        className="w-8 h-8 rounded-xl bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow"
                        title="ลบ"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isEditMode && (
              <button
                type="button"
                onClick={() => openAddLinkModal(activeCategoryId, false)}
                className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-white/25 hover:border-indigo-400 bg-white/8 hover:bg-indigo-500/20 flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-white/85 hover:text-white transition"
              >
                <Plus size={18} />
                เพิ่มลิงก์และคำอธิบายใหม่ (เฉพาะ Admin)
              </button>
            )}
          </div>
        ) : (
          /* มุมมองตารางไอคอนหน้าจอมือถือ (รองรับ Drag & Drop เฉพาะตอนแอดมินปลดล็อกแล้ว) */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={mainGridLinks.map((l) => l.id)}
              strategy={rectSortingStrategy}
            >
              <div
                className={`grid ${gridColsClass} gap-y-7 gap-x-3 sm:gap-x-6 py-2 lg:p-6 lg:rounded-3xl lg:bg-slate-950/40 lg:backdrop-blur-2xl lg:border lg:border-white/15 lg:shadow-xl justify-items-center`}
              >
                {mainGridLinks.map((link) => (
                  <AppIconCard
                    key={link.id}
                    link={link}
                    shape={settings.icon_shape}
                    isEditMode={isEditMode}
                    onEdit={openEditLinkModal}
                    onDelete={handleDeleteLink}
                    onToggleDock={handleToggleDock}
                  />
                ))}

                {/* ปุ่มบวก (+) สำหรับเพิ่มลิงก์ใหม่บนหน้าจอ (แสดงเฉพาะแอดมินที่ใส่รหัส PIN แล้วเท่านั้น) */}
                {isEditMode && (
                  <button
                    type="button"
                    onClick={() => openAddLinkModal(activeCategoryId, false)}
                    className="flex flex-col items-center justify-start group cursor-pointer"
                    title="เพิ่มลิงก์ Google Apps Script หรือเว็บใหม่"
                  >
                    <div className="w-[62px] h-[62px] sm:w-[68px] sm:h-[68px] rounded-[18px] sm:rounded-[20px] border-2 border-dashed border-white/30 group-hover:border-indigo-300 bg-white/8 group-hover:bg-indigo-500/25 flex items-center justify-center text-white/75 group-hover:text-white transition-all duration-200 group-hover:scale-105 shadow-md">
                      <Plus size={28} />
                    </div>
                    <span className="mt-1.5 text-[12px] sm:text-[13px] font-medium text-white/80 group-hover:text-white">
                      เพิ่มลิงก์ใหม่
                    </span>
                  </button>
                )}
              </div>
            </SortableContext>

            {/* แถบ Dock ด้านล่างสไตล์ iOS/Android */}
            <DockBar
              dockLinks={dockLinks}
              shape={settings.icon_shape}
              isEditMode={isEditMode}
              onEdit={openEditLinkModal}
              onDelete={handleDeleteLink}
              onToggleDock={handleToggleDock}
              onAddDockLink={() => openAddLinkModal(activeCategoryId, true)}
            />
          </DndContext>
        )}
          </main>
        </div>
      </div>

      {/* Modals ทั้งหมด (จัดลำดับให้ LinkFormModal และ SettingsModal อยู่บนสุดเสมอ ไม่โดน AdminDashboardModal บัง) */}
      <FolderModal
        category={openedFolderCategory}
        links={
          openedFolderCategory
            ? visibleLinks.filter((l) => l.category_id === openedFolderCategory.id)
            : []
        }
        shape={settings.icon_shape}
        defaultLayout={settings.default_folder_layout || 'detail-2col'}
        isEditMode={isEditMode}
        onClose={() => setOpenedFolderCategory(null)}
        onEditLink={(link) => {
          setOpenedFolderCategory(null);
          openEditLinkModal(link);
        }}
        onDeleteLink={handleDeleteLink}
        onAddInCategory={(catId) => openAddLinkModal(catId, false)}
        onChangeCategoryLayout={handleChangeCategoryLayout}
      />

      <SpotlightModal
        isOpen={isSpotlightOpen}
        links={visibleLinks}
        categories={categories}
        shape={settings.icon_shape}
        onClose={() => setIsSpotlightOpen(false)}
      />

      <AdminDashboardModal
        isOpen={isAdminDashboardOpen}
        links={links}
        categories={categories}
        settings={settings}
        onClose={() => setIsAdminDashboardOpen(false)}
        onAddNewLink={(catId, isDock) => openAddLinkModal(catId || activeCategoryId, isDock || false)}
        onEditLink={(link) => openEditLinkModal(link)}
        onDuplicateLink={handleDuplicateLink}
        onDeleteLink={handleDeleteLink}
        onUpdateLinkQuick={handleSaveLink}
        onMoveLinkOrder={handleMoveLinkOrder}
        onUpsertCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
        onOpenAppearanceSettings={() => setIsSettingsOpen(true)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        categories={categories}
        links={links}
        onSaveSettings={handleSaveSettings}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
        onImportBundle={handleImportBundle}
        onClose={() => setIsSettingsOpen(false)}
      />

      <LinkFormModal
        isOpen={isLinkModalOpen}
        editingLink={editingLink}
        categories={categories}
        defaultCategoryId={defaultAddCategory}
        defaultIsDock={defaultAddIsDock}
        iconShape={settings.icon_shape}
        nextSortOrder={links.length + 1}
        onSave={handleSaveLink}
        onClose={() => setIsLinkModalOpen(false)}
      />

      <PinLockModal
        isOpen={isPinModalOpen}
        expectedPin={settings.admin_pin || '1234'}
        onSuccess={handlePinVerified}
        onClose={() => setIsPinModalOpen(false)}
      />
    </div>
  );
}

export default App;

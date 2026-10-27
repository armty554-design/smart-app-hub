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
import {
  AppLink,
  AppSettings,
  Category,
  EmployeePersonalFolder,
  EmployeeProfile,
  EmployeeSheetFolder,
  FolderLayout,
} from './types/app';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, WALLPAPER_PRESETS } from './constants/wallpapers';
import {
  fetchAllHubData,
  upsertAppLink,
  deleteAppLink,
  reorderAppLinks,
  upsertCategory,
  deleteCategory,
  updateHubSettings,
  pushLocalDataToSupabase,
  isMutationInProgressOrRecent,
  setLocalLinks,
  setLocalCategories,
  setLocalSettings,
} from './services/linkService';
import {
  getCachedEmployees,
  getLoggedInEmployee,
  saveLoggedInEmployee,
  syncEmployeesFromGoogleSheet,
  calculateWorkTenure,
} from './services/employeeService';
import {
  buildFolderShareUrl,
  createPersonalFolder,
  deletePersonalFolder,
  EmployeeFolderLayoutPrefs,
  FolderDisplayStyle,
  getEmployeeFolderLayoutPrefs,
  getEmployeeFolders,
  getFolderNotesCountMap,
  getPersonalFoldersForEmployee,
  movePersonalFolderOrder,
  saveEmployeeFolderLayoutPrefs,
  syncEmployeeWorkspaceFromCloud,
  updatePersonalFolder,
} from './services/employeeLinksService';
import { AppIconCard } from './components/AppIconCard';
import { getSupabaseClient } from './lib/supabase';
import { DockBar } from './components/DockBar';
import { PinLockModal } from './components/PinLockModal';
import { LinkFormModal } from './components/LinkFormModal';
import { FolderModal } from './components/FolderModal';
import { FolderPageView } from './components/FolderPageView';
import { SpotlightModal } from './components/SpotlightModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { EmployeePortalModal } from './components/EmployeePortalModal';
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
  FolderPlus,
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
  Database,
  IdCard,
  UserCheck,
  Building2,
  Briefcase,
  LogOut,
  FolderOpen,
  History,
  Star,
  StickyNote,
  ChevronLeft,
  ChevronRight,
  X,
  SlidersHorizontal,
} from 'lucide-react';

const HOME_PERSONAL_FOLDER_COLORS = [
  '#ec4899',
  '#0ea5e9',
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#f43f5e',
];

export function App() {
  const [links, setLinks] = useState<AppLink[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [dataSource, setDataSource] = useState<'supabase' | 'local'>('local');
  const [supabaseError, setSupabaseError] = useState<string | undefined>(undefined);
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

  // Employee Portal & Google Sheets Sync State
  const [employees, setEmployees] = useState<EmployeeProfile[]>(() => getCachedEmployees());
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeProfile | null>(() =>
    getLoggedInEmployee()
  );
  const [isEmployeePortalOpen, setIsEmployeePortalOpen] = useState(false);
  const [selectedEmployeeFolderId, setSelectedEmployeeFolderId] = useState<string | null>(null);
  const [showArchiveEmployeeFolders, setShowArchiveEmployeeFolders] = useState(false);
  const [isSyncingEmployees, setIsSyncingEmployees] = useState(false);
  const [isLiveEmployeeSheet, setIsLiveEmployeeSheet] = useState(false);

  // Full-Page Folder Navigation & Deep-Link State (?folder=... / ?cat=...)
  const [activePageFolder, setActivePageFolder] = useState<{
    folderId?: string;
    categoryId?: string;
  } | null>(null);
  const [pendingSharedFolderId, setPendingSharedFolderId] = useState<string | null>(null);

  const [employeeFolders, setEmployeeFolders] = useState<EmployeeSheetFolder[]>(() =>
    getEmployeeFolders()
  );
  const [personalFolders, setPersonalFolders] = useState<EmployeePersonalFolder[]>(() =>
    currentEmployee ? getPersonalFoldersForEmployee(currentEmployee.code) : []
  );
  const [notesCountMap, setNotesCountMap] = useState<Record<string, number>>(() =>
    getFolderNotesCountMap(currentEmployee?.code || 'public')
  );

  // การตั้งค่ารูปแบบการแสดงผลโฟลเดอร์บนคอมพิวเตอร์ (Bookmark Bar / Desktop Icons / Cards)
  const [folderLayoutPrefs, setFolderLayoutPrefs] = useState<EmployeeFolderLayoutPrefs>(() =>
    getEmployeeFolderLayoutPrefs(currentEmployee?.code)
  );
  const [isFolderCustomizeOpen, setIsFolderCustomizeOpen] = useState(false);

  // ฟอร์มสร้าง/แก้ไขโฟลเดอร์ส่วนตัวแบบ Inline บนหน้าโฮมโดยตรง (ไม่ต้องเปิดป๊อปอัพ)
  const [isInlinePersonalFormOpen, setIsInlinePersonalFormOpen] = useState(false);
  const [editingInlineFolderId, setEditingInlineFolderId] = useState<string | null>(null);
  const [inlineFolderName, setInlineFolderName] = useState('');
  const [inlineFolderDesc, setInlineFolderDesc] = useState('');
  const [inlineFolderColor, setInlineFolderColor] = useState('#ec4899');
  const [inlineFolderStatusMsg, setInlineFolderStatusMsg] = useState('');

  const showInlineFolderBanner = (msg: string) => {
    setInlineFolderStatusMsg(msg);
    setTimeout(() => {
      setInlineFolderStatusMsg((prev) => (prev === msg ? '' : prev));
    }, 3400);
  };

  const updateFolderLayoutPrefs = (patch: Partial<EmployeeFolderLayoutPrefs>) => {
    setFolderLayoutPrefs((prev) => {
      const next = { ...prev, ...patch };
      saveEmployeeFolderLayoutPrefs(currentEmployee?.code, next);
      return next;
    });
  };

  const togglePinSheetFolder = (folderId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const currentPinned = folderLayoutPrefs.pinnedSheetFolderIds;
    const isPinned = currentPinned.includes(folderId);
    const nextPinned = isPinned
      ? currentPinned.filter((id) => id !== folderId)
      : [...currentPinned, folderId];
    updateFolderLayoutPrefs({ pinnedSheetFolderIds: nextPinned });
  };

  const handleOpenInlineCreatePersonalFolder = () => {
    setEditingInlineFolderId(null);
    setInlineFolderName('');
    setInlineFolderDesc('');
    setInlineFolderColor('#ec4899');
    setIsInlinePersonalFormOpen(true);
  };

  const handleOpenInlineEditPersonalFolder = (
    folder: EmployeePersonalFolder,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    setEditingInlineFolderId(folder.id);
    setInlineFolderName(folder.name);
    setInlineFolderDesc(folder.description);
    setInlineFolderColor(folder.color || '#ec4899');
    setIsInlinePersonalFormOpen(true);
  };

  const handleSaveInlinePersonalFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee || !inlineFolderName.trim()) return;
    const cleanName = inlineFolderName.trim();
    if (editingInlineFolderId) {
      const updated = await updatePersonalFolder(currentEmployee.code, editingInlineFolderId, {
        name: cleanName,
        description: inlineFolderDesc,
        color: inlineFolderColor,
      });
      setPersonalFolders(updated);
      showInlineFolderBanner(`แก้ไขโฟลเดอร์ส่วนตัว "${cleanName}" เรียบร้อยแล้ว!`);
    } else {
      const updated = await createPersonalFolder(currentEmployee.code, {
        name: cleanName,
        description: inlineFolderDesc,
        color: inlineFolderColor,
      });
      setPersonalFolders(updated);
      showInlineFolderBanner(`สร้างโฟลเดอร์ส่วนตัว "${cleanName}" เรียบร้อยแล้ว!`);
    }
    setIsInlinePersonalFormOpen(false);
    setEditingInlineFolderId(null);
  };

  const handleDeleteInlinePersonalFolder = async (
    folder: EmployeePersonalFolder,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    if (!currentEmployee) return;
    if (!window.confirm(`ต้องการลบโฟลเดอร์ส่วนตัว "${folder.name}" ของคุณใช่หรือไม่?`)) {
      return;
    }
    const updated = await deletePersonalFolder(currentEmployee.code, folder.id);
    setPersonalFolders(updated);
    showInlineFolderBanner(`ลบโฟลเดอร์ส่วนตัว "${folder.name}" เรียบร้อยแล้ว`);
  };

  const handleMoveInlinePersonalFolder = async (
    folderId: string,
    direction: 'left' | 'right',
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    if (!currentEmployee) return;
    const updated = await movePersonalFolderOrder(currentEmployee.code, folderId, direction);
    setPersonalFolders(updated);
  };

  // เปิดหน้าข้อมูลของ User แบบเปลี่ยนหน้าเต็มจอ (แทนป๊อปอัพ)
  const openUserPage = useCallback((initialTarget: string | null = '__user_profile__') => {
    setOpenedFolderCategory(null);
    setActivePageFolder(null);
    setSelectedEmployeeFolderId(initialTarget);
    setIsEmployeePortalOpen(true);
    const cleanUrl = `${window.location.pathname}?page=user`;
    window.history.pushState({}, '', cleanUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const closeUserPage = useCallback(() => {
    setIsEmployeePortalOpen(false);
    setSelectedEmployeeFolderId(null);
    setPendingSharedFolderId(null);
    window.history.pushState({}, '', window.location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const refreshEmployeeWorkspaceState = useCallback(async (empCode?: string) => {
    const code = empCode ?? currentEmployee?.code;
    setEmployeeFolders(getEmployeeFolders());
    setFolderLayoutPrefs(getEmployeeFolderLayoutPrefs(code));
    if (code) {
      setPersonalFolders(getPersonalFoldersForEmployee(code));
      setNotesCountMap(getFolderNotesCountMap(code));
      const synced = await syncEmployeeWorkspaceFromCloud(code);
      setEmployeeFolders(getEmployeeFolders());
      setPersonalFolders(synced.personalFolders);
      setNotesCountMap(getFolderNotesCountMap(code));
    } else {
      setPersonalFolders([]);
      setNotesCountMap(getFolderNotesCountMap('public'));
    }
  }, [currentEmployee?.code]);

  useEffect(() => {
    refreshEmployeeWorkspaceState(currentEmployee?.code);
  }, [currentEmployee?.code, refreshEmployeeWorkspaceState]);

  // ระบบเปลี่ยนหน้าเข้าโฟลเดอร์เต็มจอ + เปลี่ยนลิงก์ URL เฉพาะ (?folder=... หรือ ?cat=...)
  const navigateToFolderPage = useCallback(
    (
      target: { folderId?: string; categoryId?: string } | null,
      options?: { replaceHistory?: boolean }
    ) => {
      setOpenedFolderCategory(null);
      if (!target || (!target.folderId && !target.categoryId)) {
        setActivePageFolder(null);
        setIsEmployeePortalOpen(false);
        const cleanUrl = window.location.pathname;
        if (options?.replaceHistory) {
          window.history.replaceState({}, '', cleanUrl);
        } else {
          window.history.pushState({}, '', cleanUrl);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (target.folderId && !currentEmployee) {
        setPendingSharedFolderId(target.folderId);
        setIsEmployeePortalOpen(true);
        return;
      }

      setIsEmployeePortalOpen(false);
      setSelectedEmployeeFolderId(null);
      setActivePageFolder(target);

      const shareUrl = buildFolderShareUrl({
        folderId: target.folderId,
        categoryId: target.categoryId,
        employeeCode: currentEmployee?.code,
      });
      if (options?.replaceHistory) {
        window.history.replaceState({}, '', shareUrl);
      } else {
        window.history.pushState({}, '', shareUrl);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [currentEmployee]
  );

  // ตรวจจับลิงก์เฉพาะโฟลเดอร์จาก URL (?folder=... / ?cat=... / ?page=user) และปุ่มย้อนกลับของเบราว์เซอร์ (popstate)
  useEffect(() => {
    const syncRouteFromLocation = () => {
      const params = new URLSearchParams(window.location.search);
      const folderParam = params.get('folder');
      const catParam = params.get('cat');
      const pageParam = params.get('page');

      if (pageParam === 'user') {
        setActivePageFolder(null);
        setIsEmployeePortalOpen(true);
      } else if (folderParam) {
        if (currentEmployee) {
          setIsEmployeePortalOpen(false);
          setActivePageFolder({ folderId: folderParam });
          setPendingSharedFolderId(null);
        } else {
          setActivePageFolder(null);
          setPendingSharedFolderId(folderParam);
          setIsEmployeePortalOpen(true);
        }
      } else if (catParam) {
        setIsEmployeePortalOpen(false);
        setActivePageFolder({ categoryId: catParam });
      } else {
        setActivePageFolder(null);
        setIsEmployeePortalOpen(false);
      }
    };

    syncRouteFromLocation();
    window.addEventListener('popstate', syncRouteFromLocation);
    return () => window.removeEventListener('popstate', syncRouteFromLocation);
  }, [currentEmployee]);

  // Clock for Mobile Status Bar
  const [now, setNow] = useState(new Date());

  const handleRefreshEmployees = useCallback(async () => {
    setIsSyncingEmployees(true);
    const res = await syncEmployeesFromGoogleSheet();
    setEmployees(res.employees);
    setIsLiveEmployeeSheet(res.fromLiveSheet);
    // หากพนักงานล็อกอินอยู่ ให้อัปเดตข้อมูลล่าสุดจาก Sheet ด้วย
    setCurrentEmployee((prev) => {
      if (!prev) return null;
      const updated = res.employees.find((e) => e.code === prev.code);
      if (updated) {
        saveLoggedInEmployee(updated);
        return updated;
      }
      return prev;
    });
    setIsSyncingEmployees(false);
  }, []);

  const loadHubData = useCallback(async (silent = false) => {
    if (silent && isMutationInProgressOrRecent()) {
      return;
    }
    if (!silent) setIsLoading(true);
    const bundle = await fetchAllHubData();
    // หากระหว่างรอผลลัพธ์ ผู้ใช้มีการกดเพิ่ม/ลบ/แก้ไขพอดี ไม่ให้นำข้อมูลเก่ามาทับหน้าจอ
    if (silent && isMutationInProgressOrRecent()) {
      return;
    }
    // อัปเดต State เฉพาะเมื่อข้อมูลมีการเปลี่ยนแปลงจริงๆ เท่านั้น เพื่อไม่ให้หน้าจอกระพริบ (Zero-Flicker Silent Sync)
    setLinks((prev) =>
      JSON.stringify(prev) === JSON.stringify(bundle.links) ? prev : bundle.links
    );
    setCategories((prev) =>
      JSON.stringify(prev) === JSON.stringify(bundle.categories) ? prev : bundle.categories
    );
    setSettings((prev) =>
      JSON.stringify(prev) === JSON.stringify(bundle.settings) ? prev : bundle.settings
    );
    setDataSource(bundle.source);
    setSupabaseError(bundle.supabaseError);
    if (!silent) setIsLoading(false);
  }, []);

  useEffect(() => {
    loadHubData(false);
    handleRefreshEmployees();

    // 1. ซิงค์ข้อมูลแบบเงียบอัตโนมัติเมื่อสลับแท็บหรือสลับแอปมือถือกลับมา
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isMutationInProgressOrRecent()) {
        loadHubData(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 2. รีเฟรชอัตโนมัติแบบเงียบๆ (Silent Background Polling) ทุกๆ 6 วินาที
    // ช่วยให้เปิดจอมือถือคู่กับจอคอมฯ แล้วเห็นข้อมูลอัปเดตตรงกันเองโดยไม่ต้องกดรีเฟรชมือ และหน้าจอไม่กระพริบ
    const silentPollTimer = setInterval(() => {
      if (document.visibilityState === 'visible' && !isMutationInProgressOrRecent()) {
        loadHubData(true);
      }
    }, 6000);

    // 3. เชื่อมต่อ Supabase Realtime เพื่อซิงค์ทันทีเมื่อมีการเปลี่ยนแปลง
    const supabase = getSupabaseClient();
    const channel = supabase
      ? supabase
          .channel('smart-app-hub-sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'app_links' }, () => {
            if (!isMutationInProgressOrRecent()) loadHubData(true);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
            if (!isMutationInProgressOrRecent()) loadHubData(true);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, () => {
            if (!isMutationInProgressOrRecent()) loadHubData(true);
          })
          .subscribe()
      : null;

    return () => {
      clearInterval(silentPollTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadHubData, handleRefreshEmployees]);

  const handleEmployeeLogin = (employee: EmployeeProfile) => {
    setCurrentEmployee(employee);
    saveLoggedInEmployee(employee);
    if (pendingSharedFolderId) {
      const targetId = pendingSharedFolderId;
      setPendingSharedFolderId(null);
      setIsEmployeePortalOpen(false);
      setActivePageFolder({ folderId: targetId });
      const shareUrl = buildFolderShareUrl({
        folderId: targetId,
        employeeCode: employee.code,
      });
      window.history.replaceState({}, '', shareUrl);
    }
  };

  const handleEmployeeLogout = () => {
    setCurrentEmployee(null);
    saveLoggedInEmployee(null);
    if (activePageFolder?.folderId) {
      setActivePageFolder(null);
      window.history.pushState({}, '', window.location.pathname);
    }
  };

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
    const stampedPayload: AppLink = {
      ...linkPayload,
      updated_at: new Date().toISOString(),
      updated_by: currentEmployee
        ? `${currentEmployee.firstName} (${currentEmployee.code})`
        : 'ผู้ดูแลระบบ (Admin)',
    };
    const updated = await upsertAppLink(stampedPayload, links);
    setLinks(updated);
  };

  const handleDeleteLink = async (link: AppLink) => {
    if (!window.confirm(`ต้องการลบลิงก์ "${link.title}" ออกจากหน้าจอโฮมใช่หรือไม่?`)) {
      return;
    }
    try {
      const updated = await deleteAppLink(link.id, links);
      setLinks(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ไม่สามารถลบลิงก์ได้');
    }
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
    await pushLocalDataToSupabase();
  };

  // คำนวณภาพพื้นหลัง Wallpaper และตรวจสอบว่าเป็นธีมโทนสว่าง (Light Theme) หรือไม่
  const activeWallpaper =
    WALLPAPER_PRESETS.find((w) => w.id === settings.wallpaper_id) || WALLPAPER_PRESETS[0];

  const isLightTheme = Boolean(activeWallpaper.isLight && !settings.custom_wallpaper_url);

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

  // ตรวจสอบว่ากำลังเปิดหน้าโฟลเดอร์แบบเต็มจอ (Full-Page Folder View) อยู่หรือไม่
  const activeSheetFolderObj = activePageFolder?.folderId
    ? employeeFolders.find((f) => f.id === activePageFolder.folderId) || null
    : null;
  const activePersonalFolderObj = activePageFolder?.folderId
    ? personalFolders.find((f) => f.id === activePageFolder.folderId) || null
    : null;
  const activeCategoryPageObj = activePageFolder?.categoryId
    ? categories.find((c) => c.id === activePageFolder.categoryId) || null
    : null;
  const isFolderPageOpen = Boolean(
    activeSheetFolderObj || activePersonalFolderObj || activeCategoryPageObj
  );
  const pendingFolderBannerText = pendingSharedFolderId
    ? employeeFolders.find((f) => f.id === pendingSharedFolderId)?.sheetName ||
      'โฟลเดอร์ที่เพื่อนร่วมงานแชร์ลิงก์มาให้'
    : null;

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
      {/* แถบ Status Bar ด้านบนสุด (แยกดีไซน์ Mobile Status Bar vs Desktop Top Bar ไม่ให้ล้นจอมือถือเมื่อล็อกอินทั้งพนักงานและแอดมิน) */}
      <header
        className={`sticky top-0 z-20 backdrop-blur-xl border-b transition-colors ${
          isLightTheme
            ? 'bg-white/80 border-sky-200/80 shadow-sm text-slate-800'
            : 'bg-slate-950/60 border-white/10 text-white/90'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 text-xs font-medium">
          {/* แถวที่ 1: เวลา + ปุ่มพนักงาน + ปุ่มแอดมิน (จัดขนาดพอดีจอมือถือ 100% ไม่ล้นขอบ) */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <span className="font-bold tracking-wide text-xs sm:text-sm whitespace-nowrap">
                {timeString}
              </span>
              <span className={`hidden sm:inline ${isLightTheme ? 'text-slate-300' : 'text-white/40'}`}>
                |
              </span>
              <span className={`hidden sm:inline ${isLightTheme ? 'text-slate-600' : 'text-white/80'}`}>
                {dateString}
              </span>
              <span
                className={`hidden lg:inline-flex items-center gap-1.5 ml-2 px-2.5 py-0.5 rounded-full border text-[11px] ${
                  isLightTheme
                    ? 'bg-sky-100/90 border-sky-300 text-sky-800 font-semibold'
                    : 'bg-indigo-500/20 border-indigo-400/30 text-indigo-200'
                }`}
              >
                <Monitor size={12} className={isLightTheme ? 'text-sky-600' : 'text-indigo-400'} />
                Desktop Workspace Mode
              </span>
              {!isEditMode && (
                <span
                  className={`hidden md:inline-flex lg:hidden items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${
                    isLightTheme
                      ? 'bg-sky-100 text-sky-800 border border-sky-200 font-semibold'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  <Smartphone
                    size={11}
                    className={isLightTheme ? 'text-sky-600' : 'text-emerald-400'}
                  />
                  Mobile
                </span>
              )}
            </div>

            {/* แถบปุ่มติดตั้งแอป Android + ปุ่มพนักงาน + สถานะโหมดแก้ไข */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 justify-end">
              {/* ปุ่มเข้าสู่ระบบพนักงาน / ดูบัตรพนักงานดิจิทัล */}
              <button
                type="button"
                onClick={() => openUserPage('__user_profile__')}
                className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border text-[11px] font-semibold shadow-sm transition min-w-0 whitespace-nowrap ${
                  isEmployeePortalOpen
                    ? 'bg-sky-600 border-sky-600 text-white shadow'
                    : currentEmployee
                    ? isLightTheme
                      ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/40 text-emerald-200'
                    : isLightTheme
                    ? 'bg-sky-600 hover:bg-sky-500 border-sky-600 text-white'
                    : 'bg-sky-500/25 hover:bg-sky-500/35 border-sky-400/40 text-sky-200'
                }`}
                title={
                  currentEmployee
                    ? `${currentEmployee.fullName} (${currentEmployee.code}) - คลิกเพื่อเปิดหน้าข้อมูลพนักงาน`
                    : 'เข้าสู่ระบบสำหรับพนักงานด้วยรหัสพนักงาน'
                }
              >
                {currentEmployee ? (
                  <>
                    <UserCheck size={12} className="shrink-0" />
                    <span className="truncate max-w-[115px] sm:max-w-[160px]">
                      {currentEmployee.firstName} ({currentEmployee.code})
                    </span>
                  </>
                ) : (
                  <>
                    <IdCard size={13} className="shrink-0" />
                    <span>สำหรับพนักงาน</span>
                  </>
                )}
              </button>

              {/* สถานะการเชื่อมต่อฐานข้อมูล */}
              {dataSource === 'supabase' && (
                <span
                  className={`hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold shrink-0 ${
                    isLightTheme
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                      : 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
                  }`}
                >
                  <Database size={10} />
                  Cloud Sync
                </span>
              )}

              {/* ปุ่มไอคอนสำหรับติดตั้งลงหน้าจอ Android / มือถือ (ซ่อนชั่วคราวบนจอมือถือเมื่อเปิดโหมดแอดมินเพื่อไม่ให้เบียดกัน) */}
              <div className={isEditMode ? 'hidden sm:block shrink-0' : 'shrink-0'}>
                <AndroidInstallPrompt hubTitle={settings.hub_title} />
              </div>

              <Wifi
                size={14}
                className={`hidden sm:block shrink-0 ${
                  isLightTheme ? 'text-slate-600' : 'text-white/80'
                }`}
              />

              {/* ปุ่มสลับโหมดแก้ไข (Admin Mode) */}
              {isEditMode ? (
                <>
                  {/* บนจอแท็บเล็ต/คอมพิวเตอร์ แสดงปุ่มแอดมินเรียงในแถวเดียว */}
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsAdminDashboardOpen(true)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg transition whitespace-nowrap"
                    >
                      <LayoutDashboard size={13} />
                      <span>ตารางหลังบ้าน (CMS)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(true)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition whitespace-nowrap ${
                        isLightTheme
                          ? 'bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300'
                          : 'bg-white/15 hover:bg-white/25 text-white'
                      }`}
                      title="ตั้งค่าธีมสว่าง/มืด และรหัส PIN"
                    >
                      <Settings size={13} />
                      <span>ธีม & PIN</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openAddLinkModal(activeCategoryId, false)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition whitespace-nowrap ${
                        isLightTheme
                          ? 'bg-slate-800 hover:bg-slate-700 text-white'
                          : 'bg-white/15 hover:bg-white/25 text-white'
                      }`}
                    >
                      <Plus size={13} />
                      <span>เพิ่มลิงก์</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg transition whitespace-nowrap"
                    >
                      <Check size={13} />
                      <span>ล็อกกลับ</span>
                    </button>
                  </div>

                  {/* บนจอมือถือ แถวที่ 1 แสดงเฉพาะปุ่ม "ล็อกกลับ" กะทัดรัด ส่วนเครื่องมือแอดมินแสดงในแถวย่อยด้านล่าง */}
                  <button
                    type="button"
                    onClick={() => setIsEditMode(false)}
                    className="inline-flex sm:hidden items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold shadow transition whitespace-nowrap shrink-0"
                  >
                    <Check size={12} />
                    <span>ล็อกกลับ</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => requestAdminAccess('dashboard')}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-medium transition shrink-0 ${
                    isLightTheme
                      ? 'bg-white/80 hover:bg-sky-50 border-slate-300 text-slate-600 hover:text-slate-900 shadow-sm'
                      : 'bg-white/5 hover:bg-white/15 border-white/10 text-white/50 hover:text-white/90'
                  }`}
                  title="สำหรับผู้ดูแลระบบเท่านั้น (Admin Lock)"
                >
                  <Lock size={11} />
                </button>
              )}
            </div>
          </div>

          {/* แถวที่ 2 เฉพาะจอมือถือเมื่อเปิดโหมดแอดมิน: จัดวางปุ่มจัดการ 3 คอลัมน์เต็มความกว้าง ไม่ล้นหน้าจอ */}
          {isEditMode && (
            <div
              className={`grid sm:hidden grid-cols-3 gap-1.5 pt-2 mt-2 border-t ${
                isLightTheme ? 'border-sky-200/80' : 'border-white/10'
              }`}
            >
              <button
                type="button"
                onClick={() => setIsAdminDashboardOpen(true)}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow transition truncate"
              >
                <LayoutDashboard size={12} className="shrink-0" />
                <span className="truncate">หลังบ้าน (CMS)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[11px] font-bold border transition truncate ${
                  isLightTheme
                    ? 'bg-sky-100 hover:bg-sky-200 text-sky-900 border-sky-300'
                    : 'bg-white/15 hover:bg-white/25 text-white border-white/15'
                }`}
              >
                <Settings size={12} className="shrink-0" />
                <span className="truncate">ธีม & PIN</span>
              </button>
              <button
                type="button"
                onClick={() => openAddLinkModal(activeCategoryId, false)}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition truncate ${
                  isLightTheme
                    ? 'bg-slate-800 hover:bg-slate-700 text-white'
                    : 'bg-white/15 hover:bg-white/25 text-white border border-white/15'
                }`}
              >
                <Plus size={12} className="shrink-0" />
                <span className="truncate">เพิ่มลิงก์</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* โครงสร้างหลัก: แยกความต่างระหว่าง โทรศัพท์ (Mobile Home Screen) กับ คอมพิวเตอร์ (Desktop Command Center Sidebar + Workspace) */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 lg:pt-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
          {/* =====================================================================
              ฝั่งซ้ายบนคอมพิวเตอร์ (Desktop Sidebar Navigation - ซ่อนบนโทรศัพท์)
             ===================================================================== */}
          <aside
            className={`hidden lg:flex lg:col-span-3 flex-col gap-5 sticky top-16 rounded-3xl backdrop-blur-2xl border p-5 transition-colors ${
              isLightTheme
                ? 'bg-white/85 border-sky-200/90 shadow-[0_18px_45px_rgba(14,116,144,0.12)] text-slate-800'
                : 'bg-slate-950/55 border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-white'
            }`}
          >
            {/* โลโก้และชื่อระบบบนคอมพิวเตอร์ */}
            <div
              className={`flex items-center gap-3.5 pb-4 border-b ${
                isLightTheme ? 'border-slate-200' : 'border-white/10'
              }`}
            >
              <img
                src="/app-icon.svg"
                alt="App Hub Logo"
                className="w-12 h-12 rounded-2xl shadow-lg border border-white/20 shrink-0"
              />
              <div className="min-w-0">
                <h2
                  className={`text-base font-bold truncate ${
                    isLightTheme ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  {settings.hub_title}
                </h2>
                <p
                  className={`text-[11px] truncate ${
                    isLightTheme ? 'text-sky-700 font-medium' : 'text-indigo-300'
                  }`}
                >
                  {settings.hub_subtitle || 'Google Apps Script Hub'}
                </p>
              </div>
            </div>

            {/* ปุ่มค้นหาด่วนบน Sidebar คอมพิวเตอร์ */}
            <button
              type="button"
              onClick={() => setIsSpotlightOpen(true)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl border text-xs transition ${
                isLightTheme
                  ? 'bg-sky-50/90 hover:bg-sky-100/80 border-sky-200/90 text-slate-700'
                  : 'bg-white/10 hover:bg-white/15 border-white/15 text-white/80'
              }`}
            >
              <span className="flex items-center gap-2">
                <Search size={15} className={isLightTheme ? 'text-sky-600' : 'text-indigo-400'} />
                <span>ค้นหาระบบด่วน...</span>
              </span>
              <kbd
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded border ${
                  isLightTheme
                    ? 'bg-white text-slate-600 border-slate-200'
                    : 'bg-black/40 text-slate-300 border-white/10'
                }`}
              >
                Ctrl K
              </kbd>
            </button>

            {/* กล่องข้อมูลพนักงานบน Sidebar คอมพิวเตอร์ */}
            <div
              onClick={() => openUserPage('__user_profile__')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                isEmployeePortalOpen
                  ? isLightTheme
                    ? 'bg-sky-100/90 border-sky-400 ring-2 ring-sky-400/40 shadow-sm'
                    : 'bg-sky-900/50 border-sky-400 ring-2 ring-sky-400/30'
                  : currentEmployee
                  ? isLightTheme
                    ? 'bg-gradient-to-br from-emerald-50/90 to-sky-50/90 hover:from-emerald-100/80 hover:to-sky-100/80 border-emerald-200 shadow-2xs'
                    : 'bg-gradient-to-br from-emerald-950/60 to-sky-950/50 hover:from-emerald-900/60 hover:to-sky-900/50 border-emerald-400/30'
                  : isLightTheme
                  ? 'bg-sky-50/80 hover:bg-sky-100/80 border-sky-200'
                  : 'bg-sky-500/10 hover:bg-sky-500/20 border-sky-400/25'
              }`}
            >
              {currentEmployee ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isLightTheme
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-500/25 text-emerald-300'
                      }`}
                    >
                      <UserCheck size={11} /> รหัส {currentEmployee.code}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEmployeeLogout();
                      }}
                      title="ออกจากระบบพนักงาน"
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                        isLightTheme
                          ? 'bg-white/90 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200'
                          : 'bg-white/10 hover:bg-rose-500/25 text-slate-300 hover:text-rose-200'
                      }`}
                    >
                      <LogOut size={10} />
                      <span>ออก</span>
                    </button>
                  </div>
                  <div>
                    <p
                      className={`text-xs font-bold truncate ${
                        isLightTheme ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      {currentEmployee.fullName}
                    </p>
                    <p
                      className={`text-[11px] truncate ${
                        isLightTheme ? 'text-slate-600' : 'text-slate-300'
                      }`}
                    >
                      {currentEmployee.position} • สาขา{currentEmployee.branch}
                    </p>
                  </div>
                  {personalFolders.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToFolderPage({ folderId: personalFolders[0].id });
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center justify-between transition ${
                        activePageFolder?.folderId === personalFolders[0].id
                          ? 'bg-pink-600 border-pink-600 text-white shadow-xs'
                          : isLightTheme
                          ? 'bg-white hover:bg-pink-50 border-pink-200 text-pink-900'
                          : 'bg-pink-500/15 hover:bg-pink-500/25 border-pink-400/30 text-pink-200'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Star size={12} className="fill-current text-pink-500 shrink-0" />
                        <span className="truncate">โฟลเดอร์ส่วนตัวของฉัน</span>
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                          activePageFolder?.folderId === personalFolders[0].id
                            ? 'bg-white/25 text-white'
                            : isLightTheme
                            ? 'bg-pink-100 text-pink-900'
                            : 'bg-pink-500/30 text-pink-100'
                        }`}
                      >
                        {personalFolders[0].links.length}
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isLightTheme
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'bg-sky-500/25 text-sky-300 border border-sky-400/30'
                    }`}
                  >
                    <IdCard size={18} />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-bold ${
                        isLightTheme ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      เข้าสู่ระบบสำหรับพนักงาน
                    </p>
                    <p
                      className={`text-[10px] truncate ${
                        isLightTheme ? 'text-slate-600' : 'text-slate-300'
                      }`}
                    >
                      ล็อกอินด้วยรหัสพนักงาน ({employees.length} คน)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* รายการหมวดหมู่ / โฟลเดอร์ สำหรับคลิกบนจอคอมพิวเตอร์ */}
            <div className="space-y-1.5">
              <div
                className={`px-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider mb-2 ${
                  isLightTheme ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                <span>หมวดหมู่ระบบงาน</span>
                <span className={isLightTheme ? 'text-sky-800 font-extrabold' : 'text-sky-300 font-bold'}>
                  {visibleLinks.length} แอป
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveCategoryId('all');
                  if (isFolderPageOpen || isEmployeePortalOpen) navigateToFolderPage(null);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition ${
                  activeCategoryId === 'all' && !isFolderPageOpen && !isEmployeePortalOpen
                    ? isLightTheme
                      ? 'bg-sky-600 text-white font-semibold shadow-md shadow-sky-500/25'
                      : 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/30'
                    : isLightTheme
                    ? 'text-slate-700 hover:bg-sky-50 hover:text-sky-900'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <LayoutGrid size={15} />
                  <span>รวมทุกระบบ (All Apps)</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    activeCategoryId === 'all' && !isFolderPageOpen && !isEmployeePortalOpen
                      ? 'bg-white/25 text-white'
                      : isLightTheme
                      ? 'bg-sky-100 text-sky-900'
                      : 'bg-white/15 text-white'
                  }`}
                >
                  {visibleLinks.length}
                </span>
              </button>

              {categories.map((cat) => {
                const count = visibleLinks.filter((l) => l.category_id === cat.id).length;
                const isActive =
                  (activeCategoryId === cat.id && !isFolderPageOpen && !isEmployeePortalOpen) ||
                  activePageFolder?.categoryId === cat.id;
                return (
                  <div key={cat.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCategoryId(cat.id);
                        if (isFolderPageOpen || isEmployeePortalOpen) navigateToFolderPage(null);
                      }}
                      className={`flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition min-w-0 ${
                        isActive
                          ? isLightTheme
                            ? 'bg-sky-600 text-white font-semibold shadow-md shadow-sky-500/25'
                            : 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/30'
                          : isLightTheme
                          ? 'text-slate-700 hover:bg-sky-50 hover:text-sky-900'
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
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                          isActive
                            ? 'bg-white/25 text-white'
                            : isLightTheme
                            ? 'bg-sky-100 text-sky-900'
                            : 'bg-white/15 text-white'
                        }`}
                      >
                        {count}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateToFolderPage({ categoryId: cat.id })}
                      title={`เปิดหน้าโฟลเดอร์ "${cat.name}" แบบเต็มจอพร้อมลิงก์เฉพาะ`}
                      className={`p-2.5 rounded-2xl border transition shrink-0 ${
                        activePageFolder?.categoryId === cat.id
                          ? 'bg-sky-600 border-sky-500 text-white shadow'
                          : isLightTheme
                          ? 'bg-slate-100/80 hover:bg-sky-100 text-slate-600 hover:text-sky-800 border-slate-200'
                          : 'bg-white/5 hover:bg-indigo-500/30 text-slate-300 hover:text-white border-white/10'
                      }`}
                    >
                      <Folder size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* รายการปักหมุดด่วน (Pinned Dock) บน Sidebar คอมพิวเตอร์ */}
            {dockLinks.length > 0 && (
              <div
                className={`pt-4 border-t space-y-2 ${
                  isLightTheme ? 'border-slate-200' : 'border-white/10'
                }`}
              >
                <div
                  className={`px-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${
                    isLightTheme ? 'text-amber-600' : 'text-amber-300'
                  }`}
                >
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
                      className={`group flex items-center justify-between gap-2.5 p-2 rounded-2xl border cursor-pointer transition ${
                        isLightTheme
                          ? 'bg-sky-50/60 hover:bg-sky-100/80 border-sky-200/70'
                          : 'bg-white/5 hover:bg-white/12 border-white/10'
                      }`}
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
                          <p
                            className={`text-xs font-semibold truncate ${
                              isLightTheme
                                ? 'text-slate-800 group-hover:text-sky-700'
                                : 'text-white group-hover:text-indigo-200'
                            }`}
                          >
                            {item.title}
                          </p>
                          <p
                            className={`text-[10px] truncate ${
                              isLightTheme ? 'text-slate-500' : 'text-slate-400'
                            }`}
                          >
                            {item.description || 'คลิกเพื่อเปิดใช้งาน'}
                          </p>
                        </div>
                      </div>
                      <ExternalLink
                        size={12}
                        className={`shrink-0 mr-1 ${
                          isLightTheme
                            ? 'text-slate-400 group-hover:text-sky-700'
                            : 'text-slate-400 group-hover:text-white'
                        }`}
                      />
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
            {isEmployeePortalOpen ? (
              <EmployeePortalModal
                isOpen={isEmployeePortalOpen}
                pageMode={true}
                isLightTheme={isLightTheme}
                employees={employees}
                currentEmployee={currentEmployee}
                links={visibleLinks}
                iconShape={settings.icon_shape}
                isSyncingSheet={isSyncingEmployees}
                isLiveSheet={isLiveEmployeeSheet}
                initialFolderId={selectedEmployeeFolderId}
                pendingFolderBanner={pendingFolderBannerText}
                onLoginSuccess={handleEmployeeLogin}
                onLogout={handleEmployeeLogout}
                onRefreshSheet={handleRefreshEmployees}
                onWorkspaceChanged={() => refreshEmployeeWorkspaceState(currentEmployee?.code)}
                onOpenFolderPage={(folderId) => navigateToFolderPage({ folderId })}
                onClose={() => {
                  closeUserPage();
                  refreshEmployeeWorkspaceState(currentEmployee?.code);
                }}
              />
            ) : isFolderPageOpen ? (
              <FolderPageView
                mode={
                  activeSheetFolderObj
                    ? 'employee-sheet'
                    : activePersonalFolderObj
                    ? 'employee-personal'
                    : 'category'
                }
                sheetFolder={activeSheetFolderObj}
                personalFolder={activePersonalFolderObj}
                category={activeCategoryPageObj}
                categoryLinks={
                  activeCategoryPageObj
                    ? visibleLinks.filter((l) => l.category_id === activeCategoryPageObj.id)
                    : []
                }
                allSheetFolders={employeeFolders.filter(
                  (f) => f.id !== 'folder-sheet5' && f.links.length > 0
                )}
                allPersonalFolders={personalFolders}
                allCategories={categories}
                currentEmployee={currentEmployee}
                isLightTheme={isLightTheme}
                isEditMode={isEditMode}
                iconShape={settings.icon_shape}
                onBackToHome={() => navigateToFolderPage(null)}
                onSwitchFolder={(target) => navigateToFolderPage(target)}
                onRefreshWorkspace={() => refreshEmployeeWorkspaceState(currentEmployee?.code)}
                onEditCategoryLink={(link) => openEditLinkModal(link)}
                onDeleteCategoryLink={handleDeleteLink}
                onAddCategoryLink={(catId) => openAddLinkModal(catId, false)}
              />
            ) : (
              <>
            {/* ส่วนหัวสำหรับหน้าจอมือถือ (Mobile Header - แสดงเฉพาะจอโทรศัพท์/แท็บเล็ตแนวตั้ง) */}
            <div className="flex lg:hidden flex-col items-center text-center mb-5">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] mb-2 backdrop-blur-md ${
                  isLightTheme
                    ? 'bg-white/80 border-sky-200 text-sky-800 font-medium shadow-sm'
                    : 'bg-white/10 border-white/15 text-indigo-200'
                }`}
              >
                <Sparkles size={12} className={isLightTheme ? 'text-sky-600' : 'text-indigo-400'} />
                <span>{settings.hub_subtitle || 'Google Apps Script & Web App Launcher'}</span>
              </div>

              <h1
                className={`text-2xl font-bold tracking-tight ${
                  isLightTheme ? 'text-slate-900' : 'text-white drop-shadow-sm'
                }`}
              >
                {settings.hub_title}
              </h1>

              {/* แถบค้นหา Spotlight สไตล์มือถือ */}
              <div className="w-full max-w-md mt-3.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSpotlightOpen(true)}
                  className={`flex-1 flex items-center justify-between px-4 py-2.5 rounded-2xl backdrop-blur-xl border text-left text-xs shadow-lg transition ${
                    isLightTheme
                      ? 'bg-white/85 hover:bg-white border-sky-200/90 text-slate-700'
                      : 'bg-white/12 hover:bg-white/18 border-white/20 text-white/80'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Search size={15} className={isLightTheme ? 'text-sky-600' : 'text-indigo-300'} />
                    <span>ค้นหาแอป, ระบบงาน, ลิงก์...</span>
                  </span>
                </button>

                <div
                  className={`inline-flex items-center p-1 rounded-2xl backdrop-blur-xl border shadow-lg ${
                    isLightTheme ? 'bg-white/85 border-sky-200/90' : 'bg-white/12 border-white/20'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-xl transition ${
                      viewMode === 'grid'
                        ? isLightTheme
                          ? 'bg-sky-600 text-white shadow'
                          : 'bg-indigo-600 text-white shadow'
                        : isLightTheme
                        ? 'text-slate-600'
                        : 'text-white/75'
                    }`}
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('folders')}
                    className={`p-2 rounded-xl transition ${
                      viewMode === 'folders'
                        ? isLightTheme
                          ? 'bg-sky-600 text-white shadow'
                          : 'bg-indigo-600 text-white shadow'
                        : isLightTheme
                        ? 'text-slate-600'
                        : 'text-white/75'
                    }`}
                  >
                    <Folder size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('detail-2col')}
                    className={`p-2 rounded-xl transition ${
                      viewMode === 'detail-2col'
                        ? isLightTheme
                          ? 'bg-sky-600 text-white shadow'
                          : 'bg-indigo-600 text-white shadow'
                        : isLightTheme
                        ? 'text-slate-600'
                        : 'text-white/75'
                    }`}
                  >
                    <Rows3 size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* ส่วนหัวสำหรับหน้าจอคอมพิวเตอร์ (Desktop Workspace Header - แสดงเฉพาะจอคอมฯ) */}
            <div
              className={`hidden lg:flex items-center justify-between gap-4 mb-6 p-5 rounded-3xl backdrop-blur-2xl border shadow-xl transition-colors ${
                isLightTheme
                  ? 'bg-white/85 border-sky-200/90 shadow-sky-900/5'
                  : 'bg-slate-950/50 border-white/15'
              }`}
            >
              <div>
                <div className="flex items-center gap-2.5">
                  <h1
                    className={`text-2xl font-bold tracking-tight ${
                      isLightTheme ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    {activeCategoryObj ? activeCategoryObj.name : settings.hub_title}
                  </h1>
                  <span
                    className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${
                      isLightTheme
                        ? 'bg-sky-100 border-sky-300 text-sky-800'
                        : 'bg-indigo-500/20 border-indigo-400/30 text-indigo-200'
                    }`}
                  >
                    {activeCategoryId === 'all' ? `${visibleLinks.length} ระบบทั้งหมด` : `${mainGridLinks.length} ระบบในหมวดนี้`}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${isLightTheme ? 'text-slate-600' : 'text-slate-300'}`}>
                  {settings.hub_subtitle || 'คลิกที่ไอคอนเพื่อเปิดลิงก์ระบบงาน หรือสลับมุมมองตาราง 2 คอลัมน์ด้านขวา'}
                </p>
              </div>

              {/* สวิตช์สลับมุมมองขนาดใหญ่สำหรับหน้าจอคอมพิวเตอร์ */}
              <div
                className={`flex items-center gap-2 p-1.5 rounded-2xl border ${
                  isLightTheme ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-900/90 border-white/15'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    viewMode === 'grid'
                      ? isLightTheme
                        ? 'bg-sky-600 text-white shadow'
                        : 'bg-indigo-600 text-white shadow'
                      : isLightTheme
                      ? 'text-slate-600 hover:text-slate-900'
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
                      ? isLightTheme
                        ? 'bg-sky-600 text-white shadow'
                        : 'bg-indigo-600 text-white shadow'
                      : isLightTheme
                      ? 'text-slate-600 hover:text-slate-900'
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
                      ? isLightTheme
                        ? 'bg-sky-600 text-white shadow'
                        : 'bg-indigo-600 text-white shadow'
                      : isLightTheme
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Rows3 size={15} />
                  <span>ตาราง 2 คอลัมน์ (เว็บ + คำอธิบาย)</span>
                </button>
              </div>
            </div>

        {/* แถบการ์ดข้อมูลพนักงาน (แสดงเฉพาะบนจอมือถือ/แท็บเล็ต เพราะบนคอมฯ มีการ์ดพนักงานบน Sidebar ซ้ายแล้ว) */}
        {currentEmployee ? (
          <div
            className={`lg:hidden mb-5 p-4 rounded-3xl backdrop-blur-2xl border shadow-xl flex flex-wrap items-center justify-between gap-3 transition-colors ${
              isLightTheme
                ? 'bg-gradient-to-r from-white/95 via-sky-50/90 to-emerald-50/90 border-sky-200/90 text-slate-800 shadow-sky-900/5'
                : 'bg-gradient-to-r from-slate-900/85 via-sky-950/65 to-emerald-950/55 border-sky-400/30 text-white'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                onClick={() => openUserPage('__user_profile__')}
                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-lg shadow-sky-500/25 shrink-0 cursor-pointer"
              >
                {currentEmployee.firstName.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isLightTheme
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                        : 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
                    }`}
                  >
                    รหัสพนักงาน {currentEmployee.code}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      isLightTheme
                        ? 'bg-sky-100 border-sky-200 text-sky-800'
                        : 'bg-sky-500/20 border-sky-400/30 text-sky-200'
                    }`}
                  >
                    สาขา{currentEmployee.branch} (Zone {currentEmployee.zone})
                  </span>
                </div>
                <h2
                  className={`text-sm sm:text-base font-bold truncate mt-1 ${
                    isLightTheme ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  สวัสดีคุณ {currentEmployee.fullName}
                </h2>
                <p
                  className={`text-xs flex flex-wrap items-center gap-x-3 gap-y-0.5 ${
                    isLightTheme ? 'text-slate-600' : 'text-slate-300'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    <Briefcase size={12} className="text-sky-500" /> {currentEmployee.position}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Building2 size={12} className="text-indigo-400" /> อายุงาน:{' '}
                    {calculateWorkTenure(currentEmployee.startDate)}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openUserPage('__user_profile__')}
                className="px-3.5 py-2 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-600/25 transition"
              >
                <UserCheck size={15} />
                <span>เปิดหน้าข้อมูลพนักงาน</span>
              </button>
              <button
                type="button"
                onClick={handleEmployeeLogout}
                title="ออกจากระบบพนักงาน"
                className={`p-2 rounded-2xl border text-xs transition ${
                  isLightTheme
                    ? 'bg-white hover:bg-rose-50 border-slate-200 text-slate-600 hover:text-rose-600'
                    : 'bg-white/10 hover:bg-rose-500/20 border-white/15 text-slate-300 hover:text-rose-300'
                }`}
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => openUserPage('__user_profile__')}
            className={`mb-5 p-3.5 rounded-2xl backdrop-blur-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
              isLightTheme
                ? 'bg-white/85 hover:bg-white border-sky-200/90 text-slate-800 shadow-sm'
                : 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  isLightTheme
                    ? 'bg-sky-100 text-sky-700 border border-sky-200'
                    : 'bg-sky-500/25 text-sky-300 border border-sky-400/30'
                }`}
              >
                <IdCard size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold truncate">
                  สำหรับพนักงาน: เข้าสู่ระบบด้วยรหัสพนักงาน 6 หลัก (ปลดล็อกโฟลเดอร์ลิงก์งาน)
                </p>
                <p
                  className={`text-[11px] truncate ${
                    isLightTheme ? 'text-slate-500' : 'text-slate-300'
                  }`}
                >
                  เข้าถึงลิงก์เฉพาะพนักงานแยกตามแผ่นงาน (Link มาตรฐาน 69, AppScript, Power BI, Fleet รถ, KPI ฯลฯ พร้อมคำอธิบาย)
                </p>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shrink-0 shadow">
              เข้าสู่ระบบ
            </span>
          </div>
        )}

        {/* โฟลเดอร์ส่วนตัวของพนักงานแต่ละคน + โฟลเดอร์ลิงก์เฉพาะพนักงาน (ปรับแต่งรูปแบบคล้ายโฟลเดอร์บนคอมพิวเตอร์ได้) */}
        {currentEmployee && (
          <div
            className={`mb-6 p-4 sm:p-5 rounded-3xl backdrop-blur-2xl border shadow-xl transition-colors space-y-4 ${
              isLightTheme
                ? 'bg-white/90 border-sky-200/90 text-slate-800 shadow-sky-900/5'
                : 'bg-slate-950/60 border-sky-400/25 text-white'
            }`}
          >
            {/* แถบโฟลเดอร์ด่วนแบบบุ๊กมาร์กบนคอมพิวเตอร์ (PC Bookmark Bar) + ปุ่มตั้งค่ารูปแบบโฟลเดอร์ */}
            <div
              className={`p-2.5 sm:p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2 ${
                isLightTheme
                  ? 'bg-slate-100/90 border-slate-200/90 text-slate-800'
                  : 'bg-slate-900/90 border-white/10 text-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span
                  className={`px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                    isLightTheme
                      ? 'bg-sky-100 text-sky-900 border border-sky-200'
                      : 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                  }`}
                >
                  <Monitor size={11} /> แถบโฟลเดอร์ด่วน
                </span>

                {/* โฟลเดอร์ส่วนตัวบนแถบบุ๊กมาร์ก */}
                {personalFolders.map((pf) => (
                  <button
                    key={`bm-${pf.id}`}
                    type="button"
                    onClick={() => navigateToFolderPage({ folderId: pf.id })}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition hover:scale-[1.02] ${
                      isLightTheme
                        ? 'bg-white hover:bg-pink-50 border-pink-200 text-slate-800 shadow-2xs'
                        : 'bg-slate-950 hover:bg-pink-950/50 border-pink-400/30 text-white'
                    }`}
                  >
                    <Folder size={13} style={{ color: pf.color }} className="fill-current shrink-0" />
                    <span className="truncate max-w-[140px]">{pf.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                        isLightTheme ? 'bg-pink-100 text-pink-900' : 'bg-pink-500/25 text-pink-200'
                      }`}
                    >
                      {pf.links.length}
                    </span>
                  </button>
                ))}

                {/* โฟลเดอร์แผ่นงานที่ปักหมุดไว้บนแถบบุ๊กมาร์ก */}
                {employeeFolders
                  .filter(
                    (ef) =>
                      ef.id !== 'folder-sheet5' &&
                      ef.links.length > 0 &&
                      folderLayoutPrefs.pinnedSheetFolderIds.includes(ef.id)
                  )
                  .map((ef) => (
                    <button
                      key={`bm-sheet-${ef.id}`}
                      type="button"
                      onClick={() => navigateToFolderPage({ folderId: ef.id })}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition hover:scale-[1.02] ${
                        isLightTheme
                          ? 'bg-white hover:bg-sky-50 border-slate-200 text-slate-800 shadow-2xs'
                          : 'bg-slate-950 hover:bg-slate-800 border-white/15 text-slate-200'
                      }`}
                    >
                      <Folder size={13} style={{ color: ef.color }} className="fill-current shrink-0" />
                      <span className="truncate max-w-[150px]">{ef.sheetName}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                          isLightTheme ? 'bg-sky-100 text-sky-900' : 'bg-sky-500/25 text-sky-200'
                        }`}
                      >
                        {ef.links.length}
                      </span>
                    </button>
                  ))}

                <button
                  type="button"
                  onClick={handleOpenInlineCreatePersonalFolder}
                  className={`px-2.5 py-1 rounded-lg border border-dashed text-[11px] font-bold flex items-center gap-1 transition ${
                    isLightTheme
                      ? 'bg-pink-50/80 hover:bg-pink-100 border-pink-300 text-pink-800'
                      : 'bg-pink-500/15 hover:bg-pink-500/25 border-pink-400/40 text-pink-200'
                  }`}
                  title="สร้างโฟลเดอร์ส่วนตัวใหม่เพิ่มบนแถบโฟลเดอร์"
                >
                  <Plus size={12} />
                  <span>เพิ่มโฟลเดอร์</span>
                </button>
              </div>

              {/* ปุ่มปรับรูปแบบโฟลเดอร์บนคอม (Bookmark Bar / Desktop Icons / Cards + จำนวนคอลัมน์) */}
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <div
                  className={`inline-flex items-center p-0.5 rounded-xl border ${
                    isLightTheme ? 'bg-white border-slate-200' : 'bg-slate-950 border-white/15'
                  }`}
                >
                  {(
                    [
                      { id: 'bookmark-bar', label: 'แถบกะทัดรัด (เหมือนบนคอม)' },
                      { id: 'desktop-icons', label: 'ไอคอนโฟลเดอร์' },
                      { id: 'cards', label: 'การ์ดละเอียด' },
                    ] as { id: FolderDisplayStyle; label: string }[]
                  ).map((modeOpt) => (
                    <button
                      key={modeOpt.id}
                      type="button"
                      onClick={() => updateFolderLayoutPrefs({ displayStyle: modeOpt.id })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                        folderLayoutPrefs.displayStyle === modeOpt.id
                          ? 'bg-sky-600 text-white shadow-xs'
                          : isLightTheme
                          ? 'text-slate-600 hover:text-slate-900'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {modeOpt.label}
                    </button>
                  ))}
                </div>

                {folderLayoutPrefs.displayStyle !== 'bookmark-bar' && (
                  <button
                    type="button"
                    onClick={() => setIsFolderCustomizeOpen((prev) => !prev)}
                    className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition ${
                      isFolderCustomizeOpen
                        ? 'bg-sky-600 border-sky-600 text-white'
                        : isLightTheme
                        ? 'bg-white hover:bg-sky-50 border-slate-200 text-slate-700'
                        : 'bg-slate-950 hover:bg-white/10 border-white/15 text-slate-300'
                    }`}
                    title="ปรับจำนวนคอลัมน์และการจัดเรียงโฟลเดอร์บนคอม"
                  >
                    <SlidersHorizontal size={12} />
                    <span>ขนาด ({folderLayoutPrefs.gridCols} คอลัมน์)</span>
                  </button>
                )}
              </div>
            </div>

            {/* แผงปรับขนาดคอลัมน์โฟลเดอร์บนคอมพิวเตอร์ */}
            {isFolderCustomizeOpen && folderLayoutPrefs.displayStyle !== 'bookmark-bar' && (
              <div
                className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 animate-fade-in ${
                  isLightTheme
                    ? 'bg-sky-50/90 border-sky-200 text-slate-800'
                    : 'bg-slate-900/90 border-sky-500/30 text-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold">จำนวนโฟลเดอร์ต่อแถวบนจอคอม:</span>
                  {([2, 3, 4, 6] as const).map((colNum) => (
                    <button
                      key={colNum}
                      type="button"
                      onClick={() => updateFolderLayoutPrefs({ gridCols: colNum })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                        folderLayoutPrefs.gridCols === colNum
                          ? 'bg-sky-600 border-sky-600 text-white shadow-xs'
                          : isLightTheme
                          ? 'bg-white hover:bg-sky-100 border-sky-200 text-slate-700'
                          : 'bg-slate-950 hover:bg-white/10 border-white/15 text-slate-300'
                      }`}
                    >
                      {colNum} คอลัมน์
                    </button>
                  ))}
                </div>
                <span className="text-[11px] opacity-80">
                  💡 กดไอคอน 📌 บนโฟลเดอร์แผ่นงานเพื่อปักหมุดไว้บนแถบโฟลเดอร์ด่วนด้านบนสุดได้
                </span>
              </div>
            )}

            {/* ส่วนที่ 1: โฟลเดอร์ส่วนตัวของพนักงานแต่ละคน (สร้าง / แก้ไขชื่อ / เปลี่ยนสี / เลื่อนลำดับ / ลบ ได้โดยตรงบนหน้าโฮม) */}
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isLightTheme
                  ? 'bg-gradient-to-r from-pink-50/90 via-white to-sky-50/90 border-pink-200'
                  : 'bg-gradient-to-r from-pink-950/35 via-slate-900/90 to-indigo-950/40 border-pink-400/30'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Star size={17} className="text-pink-500 fill-pink-500" />
                    <h3 className="text-sm sm:text-base font-bold">
                      โฟลเดอร์ส่วนตัวของ {currentEmployee.firstName} (รหัส {currentEmployee.code})
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isLightTheme
                          ? 'bg-pink-100 border-pink-300 text-pink-800'
                          : 'bg-pink-500/20 border-pink-400/30 text-pink-200'
                      }`}
                    >
                      ส่วนตัวเฉพาะคุณ • ปรับแต่งโฟลเดอร์ เพิ่มลิงก์ & สมุดโน้ตได้
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-0.5 ${
                      isLightTheme ? 'text-slate-600' : 'text-slate-300'
                    }`}
                  >
                    คลิกเปิดโฟลเดอร์ส่วนตัวเพื่อเพิ่มลิงก์ที่ใช้บ่อย หรือกด ✏️ แก้ไขชื่อ/สี/จัดเรียงโฟลเดอร์ได้ทันที
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenInlineCreatePersonalFolder}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-xs font-bold text-white flex items-center gap-1.5 shadow transition"
                >
                  <FolderPlus size={14} />
                  <span>+ สร้างโฟลเดอร์ส่วนตัวใหม่</span>
                </button>
              </div>

              {/* แถบแจ้งเตือนเมื่อสร้าง/แก้ไขโฟลเดอร์ส่วนตัวสำเร็จ */}
              {inlineFolderStatusMsg && (
                <div
                  className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 animate-fade-in ${
                    isLightTheme
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                      : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Check size={14} className="shrink-0" />
                    <span>{inlineFolderStatusMsg}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setInlineFolderStatusMsg('')}
                    className="opacity-70 hover:opacity-100"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* ฟอร์มสร้างหรือแก้ไขโฟลเดอร์ส่วนตัวแบบ Inline (แสดงบนหน้าโฮมทันที ไม่เด้งป๊อปอัพ) */}
              {isInlinePersonalFormOpen && (
                <form
                  onSubmit={handleSaveInlinePersonalFolder}
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 space-y-3 animate-fade-in ${
                    isLightTheme
                      ? 'bg-white border-pink-300 shadow-md'
                      : 'bg-slate-950 border-pink-500/50 shadow-xl'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-bold flex items-center gap-1.5 ${
                        isLightTheme ? 'text-pink-800' : 'text-pink-300'
                      }`}
                    >
                      <FolderPlus size={15} />
                      <span>
                        {editingInlineFolderId
                          ? 'แก้ไขชื่อ / สีโฟลเดอร์ส่วนตัว'
                          : 'สร้างโฟลเดอร์ส่วนตัวใหม่บนคอมของคุณ'}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsInlinePersonalFormOpen(false);
                        setEditingInlineFolderId(null);
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        className={`block text-[11px] font-bold mb-1 ${
                          isLightTheme ? 'text-slate-700' : 'text-slate-300'
                        }`}
                      >
                        ชื่อโฟลเดอร์ส่วนตัว *
                      </label>
                      <input
                        type="text"
                        required
                        value={inlineFolderName}
                        onChange={(e) => setInlineFolderName(e.target.value)}
                        placeholder="เช่น ที่ทำงาน, ลงลิงก์ประจำวัน, ระบบงานสาขา..."
                        className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none ${
                          isLightTheme
                            ? 'bg-slate-50 border-slate-300 focus:border-pink-500 text-slate-900'
                            : 'bg-slate-900 border-white/15 focus:border-pink-400 text-white'
                        }`}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-[11px] font-bold mb-1 ${
                          isLightTheme ? 'text-slate-700' : 'text-slate-300'
                        }`}
                      >
                        คำอธิบายโฟลเดอร์
                      </label>
                      <input
                        type="text"
                        value={inlineFolderDesc}
                        onChange={(e) => setInlineFolderDesc(e.target.value)}
                        placeholder="เช่น รวมลิงก์ที่ใช้เปิดทำงานทุกเช้า"
                        className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none ${
                          isLightTheme
                            ? 'bg-slate-50 border-slate-300 focus:border-pink-500 text-slate-900'
                            : 'bg-slate-900 border-white/15 focus:border-pink-400 text-white'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs font-semibold ${
                          isLightTheme ? 'text-slate-600' : 'text-slate-400'
                        }`}
                      >
                        สีโฟลเดอร์:
                      </span>
                      {HOME_PERSONAL_FOLDER_COLORS.map((colorHex) => (
                        <button
                          key={colorHex}
                          type="button"
                          onClick={() => setInlineFolderColor(colorHex)}
                          className={`w-6 h-6 rounded-full border-2 transition flex items-center justify-center ${
                            inlineFolderColor === colorHex
                              ? 'border-slate-900 dark:border-white scale-110 shadow'
                              : 'border-transparent opacity-75 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: colorHex }}
                        >
                          {inlineFolderColor === colorHex && (
                            <Check size={12} className="text-white" />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsInlinePersonalFormOpen(false);
                          setEditingInlineFolderId(null);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                          isLightTheme
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-white/10 hover:bg-white/20 text-slate-300'
                        }`}
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-xs font-bold text-white shadow"
                      >
                        {editingInlineFolderId ? 'บันทึกการแก้ไข' : 'สร้างโฟลเดอร์'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* แสดงโฟลเดอร์ส่วนตัวตามรูปแบบที่เลือก (Bookmark Bar / Desktop Icons / Cards) */}
              {folderLayoutPrefs.displayStyle === 'bookmark-bar' ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {personalFolders.map((pFolder, idx) => (
                    <div
                      key={pFolder.id}
                      onClick={() => navigateToFolderPage({ folderId: pFolder.id })}
                      className={`group inline-flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition hover:-translate-y-0.5 ${
                        isLightTheme
                          ? 'bg-white hover:bg-pink-50 border-pink-200 shadow-2xs'
                          : 'bg-slate-950/90 hover:bg-slate-900 border-pink-400/35'
                      }`}
                    >
                      <Folder
                        size={16}
                        style={{ color: pFolder.color }}
                        className="fill-current shrink-0"
                      />
                      <span className="text-xs font-bold">{pFolder.name}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                          isLightTheme
                            ? 'bg-pink-100 text-pink-900'
                            : 'bg-pink-500/25 text-pink-200'
                        }`}
                      >
                        {pFolder.links.length}
                      </span>
                      <div className="flex items-center gap-0.5 ml-1">
                        {personalFolders.length > 1 && (
                          <>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={(e) =>
                                handleMoveInlinePersonalFolder(pFolder.id, 'left', e)
                              }
                              className="p-1 rounded hover:bg-black/10 disabled:opacity-30"
                              title="เลื่อนซ้าย"
                            >
                              <ChevronLeft size={11} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === personalFolders.length - 1}
                              onClick={(e) =>
                                handleMoveInlinePersonalFolder(pFolder.id, 'right', e)
                              }
                              className="p-1 rounded hover:bg-black/10 disabled:opacity-30"
                              title="เลื่อนขวา"
                            >
                              <ChevronRight size={11} />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleOpenInlineEditPersonalFolder(pFolder, e)}
                          className="p-1 rounded hover:bg-black/10"
                          title="แก้ไขโฟลเดอร์"
                        >
                          <Pencil size={11} />
                        </button>
                        {personalFolders.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteInlinePersonalFolder(pFolder, e)}
                            className="p-1 rounded hover:bg-rose-500/20 text-rose-500"
                            title="ลบโฟลเดอร์"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : folderLayoutPrefs.displayStyle === 'desktop-icons' ? (
                <div
                  className={`grid gap-3 ${
                    folderLayoutPrefs.gridCols === 6
                      ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6'
                      : folderLayoutPrefs.gridCols === 4
                      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                      : folderLayoutPrefs.gridCols === 2
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : 'grid-cols-2 sm:grid-cols-3'
                  }`}
                >
                  {personalFolders.map((pFolder) => (
                    <div
                      key={pFolder.id}
                      onClick={() => navigateToFolderPage({ folderId: pFolder.id })}
                      className={`group relative p-3 rounded-2xl border cursor-pointer transition hover:-translate-y-0.5 flex flex-col items-center text-center gap-1.5 ${
                        isLightTheme
                          ? 'bg-white hover:bg-pink-50/60 border-pink-200 shadow-2xs'
                          : 'bg-slate-950/85 hover:bg-slate-900 border-pink-400/30'
                      }`}
                    >
                      <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => handleOpenInlineEditPersonalFolder(pFolder, e)}
                          className="p-1 rounded-lg hover:bg-black/10"
                          title="แก้ไขโฟลเดอร์"
                        >
                          <Pencil size={11} />
                        </button>
                        {personalFolders.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteInlinePersonalFolder(pFolder, e)}
                            className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-500"
                            title="ลบโฟลเดอร์"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md"
                        style={{
                          background: `linear-gradient(135deg, ${pFolder.color} 0%, #1e293b 100%)`,
                        }}
                      >
                        <Folder size={24} className="fill-white/90" />
                      </div>
                      <p className="text-xs font-bold truncate w-full px-1">{pFolder.name}</p>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isLightTheme
                            ? 'bg-pink-100 text-pink-900'
                            : 'bg-pink-500/20 text-pink-200'
                        }`}
                      >
                        {pFolder.links.length} ลิงก์
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className={`grid gap-3 ${
                    folderLayoutPrefs.gridCols === 6
                      ? 'grid-cols-1 sm:grid-cols-3 lg:grid-cols-6'
                      : folderLayoutPrefs.gridCols === 4
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                      : folderLayoutPrefs.gridCols === 2
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  }`}
                >
                  {personalFolders.map((pFolder, idx) => {
                    const noteCount = notesCountMap[pFolder.id] || 0;
                    return (
                      <div
                        key={pFolder.id}
                        onClick={() => navigateToFolderPage({ folderId: pFolder.id })}
                        className={`group p-3.5 rounded-2xl border cursor-pointer transition-all hover:-translate-y-0.5 flex flex-col justify-between gap-2 ${
                          isLightTheme
                            ? 'bg-white hover:bg-pink-50/50 border-pink-200 hover:border-pink-400 shadow-sm'
                            : 'bg-slate-950/85 hover:bg-slate-900 border-pink-400/30 hover:border-pink-400/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow shrink-0"
                              style={{
                                background: `linear-gradient(135deg, ${pFolder.color} 0%, #1e293b 100%)`,
                              }}
                            >
                              <Star size={18} className="fill-white/90" />
                            </div>
                            <div className="min-w-0">
                              <h4
                                className={`text-xs sm:text-sm font-bold truncate ${
                                  isLightTheme
                                    ? 'text-slate-900 group-hover:text-pink-700'
                                    : 'text-white group-hover:text-pink-300'
                                }`}
                              >
                                {pFolder.name}
                              </h4>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`text-[11px] font-semibold ${
                                    isLightTheme ? 'text-pink-700' : 'text-pink-300'
                                  }`}
                                >
                                  {pFolder.links.length} ลิงก์
                                </span>
                                <span className="text-slate-400">•</span>
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                                    isLightTheme ? 'text-amber-700' : 'text-amber-300'
                                  }`}
                                >
                                  <StickyNote size={11} /> {noteCount} โน้ต
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* ปุ่มแก้ไข / เลื่อนลำดับ / ลบโฟลเดอร์ส่วนตัวโดยตรง */}
                          <div className="flex items-center gap-1 shrink-0">
                            {personalFolders.length > 1 && (
                              <>
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={(e) =>
                                    handleMoveInlinePersonalFolder(pFolder.id, 'left', e)
                                  }
                                  className={`p-1 rounded-lg border disabled:opacity-30 transition ${
                                    isLightTheme
                                      ? 'bg-slate-50 hover:bg-slate-200 border-slate-200 text-slate-700'
                                      : 'bg-white/10 hover:bg-white/20 border-white/10 text-slate-200'
                                  }`}
                                  title="เลื่อนโฟลเดอร์ไปทางซ้าย"
                                >
                                  <ChevronLeft size={12} />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === personalFolders.length - 1}
                                  onClick={(e) =>
                                    handleMoveInlinePersonalFolder(pFolder.id, 'right', e)
                                  }
                                  className={`p-1 rounded-lg border disabled:opacity-30 transition ${
                                    isLightTheme
                                      ? 'bg-slate-50 hover:bg-slate-200 border-slate-200 text-slate-700'
                                      : 'bg-white/10 hover:bg-white/20 border-white/10 text-slate-200'
                                  }`}
                                  title="เลื่อนโฟลเดอร์ไปทางขวา"
                                >
                                  <ChevronRight size={12} />
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleOpenInlineEditPersonalFolder(pFolder, e)}
                              className={`p-1.5 rounded-lg border transition ${
                                isLightTheme
                                  ? 'bg-pink-50 hover:bg-pink-100 border-pink-200 text-pink-700'
                                  : 'bg-white/10 hover:bg-white/20 border-white/10 text-slate-200'
                              }`}
                              title="แก้ไขชื่อ/สีโฟลเดอร์ส่วนตัว"
                            >
                              <Pencil size={12} />
                            </button>
                            {personalFolders.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteInlinePersonalFolder(pFolder, e)}
                                className={`p-1.5 rounded-lg border transition ${
                                  isLightTheme
                                    ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600'
                                    : 'bg-white/10 hover:bg-rose-500/30 border-white/10 text-rose-300'
                                }`}
                                title="ลบโฟลเดอร์ส่วนตัว"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        <p
                          className={`text-[11px] line-clamp-2 leading-relaxed ${
                            isLightTheme ? 'text-slate-600' : 'text-slate-300'
                          }`}
                        >
                          {pFolder.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ส่วนที่ 2: โฟลเดอร์ลิงก์เฉพาะพนักงาน (แยกตามแผ่นงาน - ไม่แสดง "ชีต5" ที่ไม่มีลิงก์) */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <FolderOpen size={18} className="text-sky-500" />
                    <h3 className="text-sm sm:text-base font-bold">
                      โฟลเดอร์ลิงก์เฉพาะพนักงาน (แยกตามแผ่นงาน)
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        isLightTheme
                          ? 'bg-sky-600 border-sky-700 text-white'
                          : 'bg-sky-500/20 border-sky-400/30 text-sky-300'
                      }`}
                    >
                      16 โฟลเดอร์ส่วนกลาง
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-0.5 ${
                      isLightTheme ? 'text-slate-600' : 'text-slate-300'
                    }`}
                  >
                    คลิกที่โฟลเดอร์เพื่อเปิดหน้าลิงก์ หรือกด 📌 ปักหมุดโฟลเดอร์ที่ใช้บ่อยไว้บนแถบโฟลเดอร์ด่วนด้านบนสุด
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowArchiveEmployeeFolders((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                      showArchiveEmployeeFolders
                        ? 'bg-sky-600 border-sky-500 text-white'
                        : isLightTheme
                        ? 'bg-slate-100 hover:bg-sky-50 border-slate-200 text-slate-700'
                        : 'bg-white/10 hover:bg-white/15 border-white/15 text-slate-200'
                    }`}
                  >
                    <History size={13} />
                    <span>
                      {showArchiveEmployeeFolders
                        ? 'ซ่อนปีย้อนหลัง (64-68)'
                        : 'ดูปีย้อนหลัง 64-68 (+5 โฟลเดอร์)'}
                    </span>
                  </button>
                </div>
              </div>

              {(() => {
                const activeSheetFolders = employeeFolders
                  .filter(
                    (f) =>
                      f.id !== 'folder-sheet5' &&
                      f.links.length > 0 &&
                      (showArchiveEmployeeFolders ? true : !f.isArchive)
                  )
                  .sort((a, b) => {
                    const aPinned = folderLayoutPrefs.pinnedSheetFolderIds.includes(a.id);
                    const bPinned = folderLayoutPrefs.pinnedSheetFolderIds.includes(b.id);
                    if (aPinned !== bPinned) return aPinned ? -1 : 1;
                    return 0;
                  });

                if (folderLayoutPrefs.displayStyle === 'bookmark-bar') {
                  return (
                    <div className="flex flex-wrap items-center gap-2">
                      {activeSheetFolders.map((folder) => {
                        const isPinned = folderLayoutPrefs.pinnedSheetFolderIds.includes(folder.id);
                        return (
                          <div
                            key={folder.id}
                            onClick={() => navigateToFolderPage({ folderId: folder.id })}
                            className={`group inline-flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition hover:-translate-y-0.5 ${
                              isLightTheme
                                ? 'bg-sky-50/80 hover:bg-white border-sky-200/90 hover:border-sky-400 shadow-2xs'
                                : 'bg-slate-900/80 hover:bg-slate-800 border-white/10 hover:border-sky-400/50'
                            }`}
                          >
                            <Folder
                              size={16}
                              style={{ color: folder.color }}
                              className="fill-current shrink-0"
                            />
                            <span className="text-xs font-bold">{folder.sheetName}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                                isLightTheme
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-sky-500/25 text-sky-200'
                              }`}
                            >
                              {folder.links.length}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => togglePinSheetFolder(folder.id, e)}
                              className={`p-1 rounded-lg transition ${
                                isPinned
                                  ? 'text-amber-500'
                                  : 'text-slate-400 opacity-60 hover:opacity-100'
                              }`}
                              title={
                                isPinned
                                  ? 'เลิกปักหมุดจากแถบโฟลเดอร์ด่วน'
                                  : 'ปักหมุดโฟลเดอร์นี้ไว้บนแถบโฟลเดอร์ด่วน'
                              }
                            >
                              <Pin size={11} className={isPinned ? 'fill-current' : ''} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                if (folderLayoutPrefs.displayStyle === 'desktop-icons') {
                  return (
                    <div
                      className={`grid gap-3 ${
                        folderLayoutPrefs.gridCols === 6
                          ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6'
                          : folderLayoutPrefs.gridCols === 4
                          ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                          : folderLayoutPrefs.gridCols === 2
                          ? 'grid-cols-1 sm:grid-cols-2'
                          : 'grid-cols-2 sm:grid-cols-3'
                      }`}
                    >
                      {activeSheetFolders.map((folder) => {
                        const isPinned = folderLayoutPrefs.pinnedSheetFolderIds.includes(folder.id);
                        return (
                          <div
                            key={folder.id}
                            onClick={() => navigateToFolderPage({ folderId: folder.id })}
                            className={`group relative p-3.5 rounded-2xl border cursor-pointer transition hover:-translate-y-0.5 flex flex-col items-center text-center gap-1.5 ${
                              isLightTheme
                                ? 'bg-sky-50/70 hover:bg-white border-sky-200/90 hover:border-sky-400 shadow-2xs'
                                : 'bg-slate-900/75 hover:bg-slate-900 border-white/10 hover:border-sky-400/50'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={(e) => togglePinSheetFolder(folder.id, e)}
                              className={`absolute top-2 right-2 p-1 rounded-lg transition ${
                                isPinned
                                  ? 'text-amber-500'
                                  : 'text-slate-400 opacity-50 group-hover:opacity-100'
                              }`}
                              title="ปักหมุดไว้บนแถบโฟลเดอร์ด่วน"
                            >
                              <Pin size={12} className={isPinned ? 'fill-current' : ''} />
                            </button>
                            <div
                              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md"
                              style={{
                                background: `linear-gradient(135deg, ${folder.color} 0%, #1e293b 100%)`,
                              }}
                            >
                              <Folder size={24} className="fill-white/90" />
                            </div>
                            <p className="text-xs font-bold truncate w-full px-1">
                              {folder.sheetName}
                            </p>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isLightTheme
                                  ? 'bg-sky-600 text-white'
                                  : 'bg-sky-500/20 text-sky-300'
                              }`}
                            >
                              {folder.links.length} ลิงก์
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                return (
                  <div
                    className={`grid gap-3 ${
                      folderLayoutPrefs.gridCols === 6
                        ? 'grid-cols-1 sm:grid-cols-3 lg:grid-cols-6'
                        : folderLayoutPrefs.gridCols === 4
                        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                        : folderLayoutPrefs.gridCols === 2
                        ? 'grid-cols-1 sm:grid-cols-2'
                        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    }`}
                  >
                    {activeSheetFolders.map((folder) => {
                      const noteCount = notesCountMap[folder.id] || 0;
                      const isPinned = folderLayoutPrefs.pinnedSheetFolderIds.includes(folder.id);
                      return (
                        <div
                          key={folder.id}
                          onClick={() => navigateToFolderPage({ folderId: folder.id })}
                          className={`group p-3.5 rounded-2xl border cursor-pointer transition-all hover:-translate-y-0.5 flex flex-col justify-between gap-2 ${
                            isLightTheme
                              ? 'bg-sky-50/70 hover:bg-white border-sky-200/90 hover:border-sky-400 shadow-sm'
                              : 'bg-slate-900/75 hover:bg-slate-900 border-white/10 hover:border-sky-400/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow shrink-0"
                                style={{
                                  background: `linear-gradient(135deg, ${folder.color} 0%, #1e293b 100%)`,
                                }}
                              >
                                <Folder size={19} />
                              </div>
                              <div className="min-w-0">
                                <h4
                                  className={`text-xs sm:text-sm font-bold truncate ${
                                    isLightTheme
                                      ? 'text-slate-900 group-hover:text-sky-700'
                                      : 'text-white group-hover:text-sky-300'
                                  }`}
                                >
                                  {folder.sheetName}
                                </h4>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`text-[11px] font-semibold ${
                                      isLightTheme ? 'text-sky-700' : 'text-sky-400'
                                    }`}
                                  >
                                    {folder.links.length} ลิงก์
                                  </span>
                                  {noteCount > 0 && (
                                    <span
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                        isLightTheme
                                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                          : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                                      }`}
                                    >
                                      <StickyNote size={10} /> {noteCount} โน้ต
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => togglePinSheetFolder(folder.id, e)}
                                className={`p-1.5 rounded-lg border transition ${
                                  isPinned
                                    ? isLightTheme
                                      ? 'bg-amber-50 border-amber-300 text-amber-600'
                                      : 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                                    : isLightTheme
                                    ? 'bg-white hover:bg-sky-50 border-sky-200 text-slate-400 hover:text-sky-700'
                                    : 'bg-white/5 hover:bg-white/15 border-white/10 text-slate-400 hover:text-white'
                                }`}
                                title={
                                  isPinned
                                    ? 'ปักหมุดบนแถบโฟลเดอร์ด่วนแล้ว (คลิกเพื่อเอาออก)'
                                    : 'ปักหมุดไว้บนแถบโฟลเดอร์ด่วนด้านบน'
                                }
                              >
                                <Pin size={12} className={isPinned ? 'fill-current' : ''} />
                              </button>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                                  isLightTheme
                                    ? 'bg-white text-sky-700 border border-sky-200'
                                    : 'bg-white/10 text-slate-300'
                                }`}
                              >
                                เปิดดู →
                              </span>
                            </div>
                          </div>

                          <p
                            className={`text-[11px] line-clamp-2 leading-relaxed ${
                              isLightTheme ? 'text-slate-600' : 'text-slate-300'
                            }`}
                          >
                            {folder.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* แถบแจ้งเตือนโหมดแก้ไข (Admin Edit Banner) */}
        {isEditMode && (
          <div className="mb-5 p-3.5 rounded-2xl bg-indigo-950/85 border border-indigo-400/40 backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 shadow-xl animate-fade-in">
            <div className="flex items-center gap-2.5 text-xs text-indigo-100">
              <Unlock size={16} className="text-emerald-400 shrink-0" />
              <span>
                <strong>โหมดแอดมิน:</strong> เปิดตารางจัดการหลังบ้าน (CMS), เปลี่ยนธีมสว่าง/มืด หรือลากไอคอนจัดเรียงได้ทันที
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdminDashboardOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition"
              >
                <LayoutDashboard size={14} /> ตารางจัดการหลังบ้าน (CMS)
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-sky-500/25 hover:bg-sky-500/35 border border-sky-400/40 text-sky-100 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Settings size={14} /> ตั้งค่าธีม & รหัส PIN
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
                  ? isLightTheme
                    ? 'bg-sky-600 text-white shadow-md font-semibold'
                    : 'bg-white text-slate-950 shadow-md font-semibold'
                  : isLightTheme
                  ? 'bg-white/80 hover:bg-white text-slate-700 border border-sky-200/90 shadow-sm'
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
                    onDoubleClick={() => navigateToFolderPage({ categoryId: cat.id })}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition backdrop-blur-md ${
                      isActive
                        ? isLightTheme
                          ? 'bg-sky-600 text-white shadow-md font-semibold'
                          : 'bg-white text-slate-950 shadow-md font-semibold'
                        : isLightTheme
                        ? 'bg-white/80 hover:bg-white text-slate-700 border border-sky-200/90 shadow-sm'
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
                        isActive
                          ? isLightTheme
                            ? 'text-sky-100'
                            : 'text-slate-600'
                          : isLightTheme
                          ? 'text-slate-500'
                          : 'text-white/60'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToFolderPage({ categoryId: cat.id })}
                    title={`เปิดหน้าโฟลเดอร์ "${cat.name}"`}
                    className={`p-1.5 rounded-full border transition ${
                      isLightTheme
                        ? 'bg-white/80 hover:bg-sky-100 text-slate-600 hover:text-sky-800 border-sky-200'
                        : 'bg-white/8 hover:bg-indigo-500/40 text-white/70 hover:text-white border-white/10'
                    }`}
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
                  onClick={() => navigateToFolderPage({ categoryId: cat.id })}
                  className={`group cursor-pointer rounded-[32px] backdrop-blur-2xl border p-4 shadow-xl transition-transform hover:scale-[1.02] active:scale-98 flex flex-col items-center ${
                    isLightTheme
                      ? 'bg-white/80 hover:bg-white border-sky-200/90 shadow-sky-900/5'
                      : 'bg-white/12 hover:bg-white/18 border-white/20'
                  }`}
                >
                  {/* มินิไอคอน 3x3 ในโฟลเดอร์ */}
                  <div
                    className={`w-36 h-36 rounded-[26px] border p-3 grid grid-cols-3 grid-rows-3 gap-2 items-center justify-items-center ${
                      isLightTheme
                        ? 'bg-sky-50/80 border-sky-200/80'
                        : 'bg-slate-950/35 border-white/10'
                    }`}
                  >
                    {catLinks.slice(0, 9).map((item) => (
                      <div key={item.id} className="scale-[0.65] origin-center">
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
                    ))}
                  </div>
                  <span
                    className={`mt-3 text-sm font-semibold ${
                      isLightTheme ? 'text-slate-800' : 'text-white'
                    }`}
                  >
                    {cat.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[11px] ${isLightTheme ? 'text-slate-500' : 'text-white/60'}`}>
                      {catLinks.length} แอป
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        isLightTheme
                          ? 'bg-sky-100 border-sky-300 text-sky-800 font-medium'
                          : 'bg-indigo-500/25 border-indigo-400/30 text-indigo-200'
                      }`}
                    >
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
            <div
              className={`grid grid-cols-12 gap-3 px-4 py-2.5 rounded-2xl backdrop-blur-xl border text-xs font-semibold ${
                isLightTheme
                  ? 'bg-sky-100/90 border-sky-200 text-sky-900'
                  : 'bg-slate-950/65 border-white/15 text-indigo-300'
              }`}
            >
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
                className={`group grid grid-cols-12 gap-3 items-center p-3.5 rounded-2xl backdrop-blur-xl border shadow-lg cursor-pointer transition-all ${
                  isLightTheme
                    ? 'bg-white/85 hover:bg-white border-sky-200/90 hover:border-sky-400 shadow-sky-900/5'
                    : 'bg-white/10 hover:bg-white/16 border-white/15 hover:border-indigo-400/50'
                }`}
              >
                {/* คอลัมน์ที่ 1: ไอคอน + ชื่อเว็บ */}
                <div
                  className={`col-span-5 sm:col-span-4 flex items-center gap-3 min-w-0 pr-2 border-r ${
                    isLightTheme ? 'border-slate-200' : 'border-white/15'
                  }`}
                >
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
                    <p
                      className={`text-xs sm:text-sm font-semibold truncate ${
                        isLightTheme
                          ? 'text-slate-900 group-hover:text-sky-700'
                          : 'text-white group-hover:text-indigo-200'
                      }`}
                    >
                      {link.title}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] ${
                        isLightTheme ? 'text-sky-600 font-medium' : 'text-indigo-300'
                      }`}
                    >
                      กดเปิดเว็บ <ExternalLink size={10} />
                    </span>
                  </div>
                </div>

                {/* คอลัมน์ที่ 2: คำอธิบาย */}
                <div className="col-span-7 sm:col-span-8 flex items-center justify-between gap-3 pl-1 min-w-0">
                  <div className="min-w-0">
                    <p
                      className={`text-xs sm:text-sm leading-relaxed line-clamp-2 ${
                        isLightTheme ? 'text-slate-700' : 'text-white/90'
                      }`}
                    >
                      {link.description || 'ไม่มีคำอธิบาย (เข้าโหมดจัดการเพื่อเพิ่มคำอธิบายได้)'}
                    </p>
                    <p
                      className={`text-[10px] font-mono truncate mt-0.5 ${
                        isLightTheme ? 'text-slate-400' : 'text-white/50'
                      }`}
                    >
                      {link.url}
                    </p>
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
                className={`w-full py-3.5 px-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-xs sm:text-sm font-medium transition ${
                  isLightTheme
                    ? 'border-sky-300 hover:border-sky-500 bg-white/70 hover:bg-sky-50 text-sky-800'
                    : 'border-white/25 hover:border-indigo-400 bg-white/8 hover:bg-indigo-500/20 text-white/85 hover:text-white'
                }`}
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
                className={`grid ${gridColsClass} gap-y-7 gap-x-3 sm:gap-x-6 py-2 lg:p-6 lg:rounded-3xl lg:backdrop-blur-2xl lg:border lg:shadow-xl justify-items-center transition-colors ${
                  isLightTheme
                    ? 'lg:bg-white/75 lg:border-sky-200/90 lg:shadow-sky-900/5'
                    : 'lg:bg-slate-950/40 lg:border-white/15'
                }`}
              >
                {mainGridLinks.map((link) => (
                  <AppIconCard
                    key={link.id}
                    link={link}
                    shape={settings.icon_shape}
                    isEditMode={isEditMode}
                    isLightTheme={isLightTheme}
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
                    <div
                      className={`w-[62px] h-[62px] sm:w-[68px] sm:h-[68px] rounded-[18px] sm:rounded-[20px] border-2 border-dashed flex items-center justify-center transition-all duration-200 group-hover:scale-105 shadow-md ${
                        isLightTheme
                          ? 'border-sky-400/70 group-hover:border-sky-600 bg-white/80 group-hover:bg-sky-50 text-sky-600'
                          : 'border-white/30 group-hover:border-indigo-300 bg-white/8 group-hover:bg-indigo-500/25 text-white/75 group-hover:text-white'
                      }`}
                    >
                      <Plus size={28} />
                    </div>
                    <span
                      className={`mt-1.5 text-[12px] sm:text-[13px] font-medium ${
                        isLightTheme
                          ? 'text-slate-700 group-hover:text-sky-800'
                          : 'text-white/80 group-hover:text-white'
                      }`}
                    >
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
              isLightTheme={isLightTheme}
              onEdit={openEditLinkModal}
              onDelete={handleDeleteLink}
              onToggleDock={handleToggleDock}
              onAddDockLink={() => openAddLinkModal(activeCategoryId, true)}
            />
          </DndContext>
        )}
              </>
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
        currentEmployee={currentEmployee}
        onClose={() => {
          setOpenedFolderCategory(null);
          refreshEmployeeWorkspaceState(currentEmployee?.code);
        }}
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
        dataSource={dataSource}
        supabaseError={supabaseError}
        employees={employees}
        isSyncingEmployees={isSyncingEmployees}
        onRefreshEmployees={handleRefreshEmployees}
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
        onReloadFromSupabase={loadHubData}
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

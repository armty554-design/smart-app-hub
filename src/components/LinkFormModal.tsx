import React, { useState, useEffect, useRef } from 'react';
import { AppLink, Category, IconShape, IconType, ImageFit } from '../types/app';
import { BG_COLOR_PRESETS, ICON_CATEGORIES, ICON_LIBRARY } from '../constants/icons';
import { IconRenderer } from './IconRenderer';
import { uploadIconImage } from '../lib/supabase';
import {
  X,
  Search,
  Upload,
  Image as ImageIcon,
  Palette,
  Sparkles,
  Link2,
  Pin,
  Check,
  Loader2,
  Wand2,
} from 'lucide-react';

interface LinkFormModalProps {
  isOpen: boolean;
  editingLink: AppLink | null;
  categories: Category[];
  defaultCategoryId: string;
  defaultIsDock?: boolean;
  iconShape: IconShape;
  nextSortOrder: number;
  onSave: (link: AppLink) => Promise<void>;
  onClose: () => void;
}

export const LinkFormModal: React.FC<LinkFormModalProps> = ({
  isOpen,
  editingLink,
  categories,
  defaultCategoryId,
  defaultIsDock = false,
  iconShape,
  nextSortOrder,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(defaultCategoryId || categories[0]?.id || 'work-script');
  const [iconType, setIconType] = useState<IconType>('library');
  const [iconName, setIconName] = useState('FileSpreadsheet');
  const [iconUrl, setIconUrl] = useState('');
  const [imageFit, setImageFit] = useState<ImageFit>('cover');
  const [bgStyle, setBgStyle] = useState(BG_COLOR_PRESETS[0].value);
  const [customSolidBg, setCustomSolidBg] = useState('#10b981');
  const [iconColor, setIconColor] = useState('#ffffff');
  const [badgeText, setBadgeText] = useState('');
  const [isDock, setIsDock] = useState(defaultIsDock);

  const [iconSearch, setIconSearch] = useState('');
  const [selectedIconTab, setSelectedIconTab] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (editingLink) {
      setTitle(editingLink.title);
      setUrl(editingLink.url);
      setDescription(editingLink.description || '');
      setCategoryId(editingLink.category_id || categories[0]?.id || 'work-script');
      setIconType(editingLink.icon_type || 'library');
      setIconName(editingLink.icon_name || 'FileSpreadsheet');
      setIconUrl(editingLink.icon_url || '');
      setImageFit(editingLink.image_fit || 'cover');
      setBgStyle(editingLink.bg_style || BG_COLOR_PRESETS[0].value);
      setIconColor(editingLink.icon_color || '#ffffff');
      setBadgeText(editingLink.badge_text || '');
      setIsDock(Boolean(editingLink.is_dock));
    } else {
      setTitle('');
      setUrl('');
      setDescription('');
      setCategoryId(
        defaultCategoryId && defaultCategoryId !== 'all'
          ? defaultCategoryId
          : categories[0]?.id || 'work-script'
      );
      setIconType('library');
      setIconName('FileCode2');
      setIconUrl('');
      setImageFit('cover');
      setBgStyle(BG_COLOR_PRESETS[1].value);
      setIconColor('#ffffff');
      setBadgeText('');
      setIsDock(defaultIsDock);
    }

    setIconSearch('');
    setSelectedIconTab('all');
    setUploadNotice('');
    setFormError('');
  }, [isOpen, editingLink, defaultCategoryId, defaultIsDock, categories]);

  if (!isOpen) return null;

  const filteredIcons = ICON_LIBRARY.filter((item) => {
    const matchesTab = selectedIconTab === 'all' || item.category === selectedIconTab;
    const q = iconSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.label.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  // ตรวจจับ URL ของ Google Apps Script หรือ Google Workspace เพื่อแนะนำไอคอนอัตโนมัติ
  const handleAutoDetectFromUrl = (inputUrl: string) => {
    setUrl(inputUrl);
    if (editingLink) return; // ไม่ทับค่าเดิมหากกำลังแก้ไข

    const lower = inputUrl.toLowerCase();
    if (lower.includes('script.google.com')) {
      if (!badgeText) setBadgeText('GAS');
    } else if (lower.includes('docs.google.com/spreadsheets')) {
      setIconName('FileSpreadsheet');
      setBgStyle(BG_COLOR_PRESETS[0].value);
      if (!badgeText) setBadgeText('Sheets');
    } else if (lower.includes('docs.google.com/forms') || lower.includes('forms.gle')) {
      setIconName('ClipboardList');
      setBgStyle(BG_COLOR_PRESETS[2].value);
      if (!badgeText) setBadgeText('Form');
    } else if (lower.includes('drive.google.com')) {
      setIconName('FolderOpen');
      setBgStyle(BG_COLOR_PRESETS[3].value);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadNotice('');
    try {
      const result = await uploadIconImage(file);
      setIconUrl(result.url);
      setIconType('image');
      setUploadNotice('ย่อขนาดและบันทึกรูปไอคอนพร้อมใช้งานเรียบร้อยแล้ว!');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'อัปโหลดรูปไม่สำเร็จ');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanTitle = title.trim();
    let cleanUrl = url.trim();

    if (!cleanTitle) {
      setFormError('กรุณากรอกชื่อแอป / ชื่อลิงก์');
      return;
    }
    if (!cleanUrl) {
      setFormError('กรุณาวางลิงก์ URL (เช่น https://script.google.com/...)');
      return;
    }
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }
    if (iconType === 'image' && !iconUrl.trim()) {
      setFormError('กรุณาอัปโหลดรูปภาพ หรือวางลิงก์รูปภาพ (Image URL) สำหรับไอคอน');
      return;
    }

    setIsSaving(true);
    try {
      const payload: AppLink = {
        id: editingLink ? editingLink.id : `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: cleanTitle,
        url: cleanUrl,
        description: description.trim(),
        category_id: categoryId,
        icon_type: iconType,
        icon_name: iconName,
        icon_url: iconUrl.trim(),
        image_fit: imageFit,
        bg_style: bgStyle,
        icon_color: iconColor,
        badge_text: badgeText.trim(),
        is_dock: isDock,
        sort_order: editingLink ? editingLink.sort_order : nextSortOrder,
      };
      await onSave(payload);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xl overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border border-white/15 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/95">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Wand2 size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white">
                {editingLink ? 'แก้ไขลิงก์และปรับแต่งไอคอน' : 'เพิ่มลิงก์แอปใหม่ (Custom Icon Studio)'}
              </h2>
              <p className="text-xs text-slate-400">
                ออกแบบไอคอนสำหรับลิงก์ Google Apps Script หรือเว็บไซต์ที่ต้องการ
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 font-medium">
              {formError}
            </div>
          )}

          {/* ส่วนบน: ตัวอย่างไอคอน (Live Preview) + ข้อมูลลิงก์ */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Live Preview Card */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-950/70 border border-white/10">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-3">
                ตัวอย่างบนหน้าจอมือถือ
              </span>

              <div className="py-3 flex flex-col items-center">
                <IconRenderer
                  iconType={iconType}
                  iconName={iconName}
                  iconUrl={iconUrl}
                  imageFit={imageFit}
                  bgStyle={bgStyle}
                  iconColor={iconColor}
                  shape={iconShape}
                  size="xl"
                  badgeText={badgeText}
                />
                <span className="mt-2.5 text-sm font-medium text-white text-center line-clamp-2 max-w-[140px]">
                  {title.trim() || 'ชื่อแอปของคุณ'}
                </span>
                <span className="mt-0.5 text-[11px] text-slate-400 text-center line-clamp-1 max-w-[160px]">
                  {description.trim() || 'กดเพื่อเปิดลิงก์ทันที'}
                </span>
              </div>

              {/* ป้ายกำกับมุมไอคอน (Badge) & ปักหมุด Dock */}
              <div className="w-full mt-3 pt-3 border-t border-white/10 space-y-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    ป้ายกำกับมุมไอคอน (เช่น GAS, ใหม่, ด่วน)
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="เว้นว่างได้ เช่น GAS"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={isDock}
                    onChange={(e) => setIsDock(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-500"
                  />
                  <span className="text-xs text-slate-200 flex items-center gap-1.5">
                    <Pin size={13} className="text-amber-400" />
                    แสดงในแถบ Dock ด้านล่าง
                  </span>
                </label>
              </div>
            </div>

            {/* ข้อมูลลิงก์ */}
            <div className="md:col-span-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    ชื่อแอป (แสดงใต้ไอคอน) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="เช่น ระบบเบิกงบ, เช็คสต๊อกคลัง"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    หมวดหมู่ / โฟลเดอร์
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white focus:outline-none focus:border-indigo-400"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-slate-900 text-white">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  ลิงก์ URL (Google Apps Script Web App หรือเว็บทั่วไป) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Link2
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    required
                    value={url}
                    onChange={(e) => handleAutoDetectFromUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  คำอธิบายสั้นๆ (ใช้ค้นหาใน Spotlight Search ได้ด้วย)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="เช่น ฟอร์มบันทึกข้อมูลลง Google Sheets สำหรับฝ่ายบัญชี"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>
          </div>

          {/* ส่วนเลือกโหมดปรับแต่งไอคอน */}
          <div className="border-t border-white/10 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <Palette size={17} className="text-indigo-400" />
                เลือกรูปแบบไอคอนแอป
              </label>

              <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-white/10">
                <button
                  type="button"
                  onClick={() => setIconType('library')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                    iconType === 'library'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles size={14} />
                  คลังไอคอนสำเร็จรูป (100+ แบบ)
                </button>
                <button
                  type="button"
                  onClick={() => setIconType('image')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                    iconType === 'image'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ImageIcon size={14} />
                  อัปโหลดรูปภาพ / ลิงก์รูป (URL)
                </button>
              </div>
            </div>

            {/* โหมด 1: คลังไอคอนสำเร็จรูป */}
            {iconType === 'library' ? (
              <div className="space-y-4">
                {/* แถบค้นหาและหมวดหมู่ไอคอน */}
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={iconSearch}
                      onChange={(e) => setIconSearch(e.target.value)}
                      placeholder="ค้นหาไอคอน เช่น เอกสาร, ตาราง, สต๊อก, บัญชี, ปฏิทิน..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                    {ICON_CATEGORIES.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSelectedIconTab(tab.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition ${
                          selectedIconTab === tab.id
                            ? 'bg-white/15 text-white font-medium border border-white/20'
                            : 'bg-slate-950/60 text-slate-400 hover:text-white border border-white/5'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ตารางเลือกไอคอน */}
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-48 overflow-y-auto p-2.5 rounded-2xl bg-slate-950/80 border border-white/10">
                  {filteredIcons.map((item) => {
                    const IconComp = item.component;
                    const isSelected = iconName === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setIconName(item.name)}
                        title={item.label}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl transition ${
                          isSelected
                            ? 'bg-indigo-600/30 border-2 border-indigo-400 text-white scale-105'
                            : 'bg-white/5 hover:bg-white/10 border border-transparent text-slate-300'
                        }`}
                      >
                        <IconComp size={20} />
                        <span className="mt-1 text-[9px] text-slate-300 truncate w-full text-center">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* โหมด 2: อัปโหลดรูปภาพ หรือ วางลิงก์รูปภาพ */
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* กล่องอัปโหลดไฟล์จากเครื่อง */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      อัปโหลดรูปไอคอนจากเครื่อง (PNG, JPG, SVG, WEBP)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-5 px-4 rounded-2xl border-2 border-dashed border-indigo-400/40 hover:border-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/15 flex flex-col items-center justify-center gap-1.5 text-indigo-200 transition"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 size={22} className="animate-spin text-indigo-400" />
                          <span className="text-xs">กำลังประมวลผลและอัปโหลดรูปภาพ...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={22} className="text-indigo-400" />
                          <span className="text-xs font-medium">คลิกเพื่อเลือกรูปภาพจากเครื่อง</span>
                          <span className="text-[11px] text-slate-400">
                            ระบบจะย่อขนาดรูปให้อัตโนมัติเพื่อความรวดเร็ว
                          </span>
                        </>
                      )}
                    </button>
                    {uploadNotice && (
                      <p className="mt-1.5 text-[11px] text-emerald-400 flex items-center gap-1">
                        <Check size={13} /> {uploadNotice}
                      </p>
                    )}
                  </div>

                  {/* กล่องวาง Image URL และการแสดงผลรูป */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        หรือวางลิงก์รูปภาพโดยตรง (Image URL)
                      </label>
                      <input
                        type="text"
                        value={iconUrl}
                        onChange={(e) => setIconUrl(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        การจัดวางรูปภาพในกรอบไอคอน
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setImageFit('cover')}
                          className={`py-2 px-3 rounded-xl text-xs font-medium border transition ${
                            imageFit === 'cover'
                              ? 'bg-indigo-600/30 border-indigo-400 text-white'
                              : 'bg-slate-900 border-white/10 text-slate-400'
                          }`}
                        >
                          เต็มกรอบ (Cover)
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageFit('contain')}
                          className={`py-2 px-3 rounded-xl text-xs font-medium border transition ${
                            imageFit === 'contain'
                              ? 'bg-indigo-600/30 border-indigo-400 text-white'
                              : 'bg-slate-900 border-white/10 text-slate-400'
                          }`}
                        >
                          พอดีในกรอบ (โชว์พื้นหลัง)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* แถบเลือกสีพื้นหลังไอคอน และสีตัวไอคอน */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-300">
                  สีพื้นหลังไอคอน (ไล่เฉดสี Gradient & สีพื้น)
                </span>

                <div className="flex items-center gap-4">
                  {/* เลือกสีพื้นเองแบบอิสระ */}
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <span>กำหนดสีพื้นเอง:</span>
                    <input
                      type="color"
                      value={customSolidBg}
                      onChange={(e) => {
                        setCustomSolidBg(e.target.value);
                        setBgStyle(e.target.value);
                      }}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                  </label>

                  {/* เลือกสีเส้นไอคอน */}
                  {iconType === 'library' && (
                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                      <span>สีตัวไอคอน:</span>
                      <input
                        type="color"
                        value={iconColor}
                        onChange={(e) => setIconColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {BG_COLOR_PRESETS.map((preset) => {
                  const active = bgStyle === preset.value;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setBgStyle(preset.value)}
                      title={preset.name}
                      style={{ background: preset.value }}
                      className={`w-8 h-8 rounded-xl transition-transform flex items-center justify-center ${
                        active
                          ? 'ring-2 ring-white scale-110 shadow-lg'
                          : 'opacity-85 hover:opacity-100 hover:scale-105 ring-1 ring-white/20'
                      }`}
                    >
                      {active && (
                        <Check
                          size={14}
                          className={preset.id === 'solid-white' ? 'text-slate-900' : 'text-white'}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs sm:text-sm font-medium text-slate-200 transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {editingLink ? 'บันทึกการแก้ไข' : 'เพิ่มลงหน้าจอโฮม'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

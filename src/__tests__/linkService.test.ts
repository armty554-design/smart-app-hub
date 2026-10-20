// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLocalLinks,
  upsertAppLink,
  deleteAppLink,
  reorderAppLinks,
  getLocalCategories,
  upsertCategory,
  deleteCategory,
  getLocalSettings,
  updateHubSettings,
} from '../services/linkService';
import { AppLink, Category } from '../types/app';
import { ICON_LIBRARY, BG_COLOR_PRESETS } from '../constants/icons';

describe('App Hub Launcher - Link & Icon Studio Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads default Google Apps Script links on first visit', () => {
    const links = getLocalLinks();
    expect(links.length).toBeGreaterThanOrEqual(8);
    expect(links.some((l) => l.url.includes('script.google.com'))).toBe(true);
    expect(links.filter((l) => l.is_dock).length).toBe(4);
  });

  it('creates a new Google Apps Script link with custom icon and gradient background', async () => {
    const initial = getLocalLinks();
    const newGasLink: AppLink = {
      id: 'gas-custom-1',
      title: 'ระบบแจ้งลาออนไลน์',
      url: 'https://script.google.com/macros/s/AKfycbx-leave-system/exec',
      description: 'ฟอร์มยื่นใบลาพร้อมอนุมัติผ่าน LINE',
      category_id: 'hr-team',
      icon_type: 'library',
      icon_name: 'CalendarCheck',
      icon_url: '',
      image_fit: 'cover',
      bg_style: BG_COLOR_PRESETS[2].value,
      icon_color: '#ffffff',
      badge_text: 'GAS',
      is_dock: false,
      sort_order: initial.length + 1,
    };

    const afterAdd = await upsertAppLink(newGasLink, initial);
    expect(afterAdd.length).toBe(initial.length + 1);
    const saved = afterAdd.find((l) => l.id === 'gas-custom-1');
    expect(saved?.title).toBe('ระบบแจ้งลาออนไลน์');
    expect(saved?.icon_name).toBe('CalendarCheck');
    expect(saved?.badge_text).toBe('GAS');
  });

  it('supports custom uploaded image / Image URL icons', async () => {
    const initial = getLocalLinks();
    const imgLink: AppLink = {
      id: 'gas-image-icon',
      title: 'ระบบใบเสนอราคา',
      url: 'https://script.google.com/macros/s/AKfycbx-quote/exec',
      description: 'ออกใบเสนอราคา PDF อัตโนมัติ',
      category_id: 'finance-doc',
      icon_type: 'image',
      icon_name: 'FileText',
      icon_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      image_fit: 'contain',
      bg_style: '#ffffff',
      icon_color: '#000000',
      is_dock: true,
      sort_order: initial.length + 1,
    };

    const updated = await upsertAppLink(imgLink, initial);
    const found = updated.find((l) => l.id === 'gas-image-icon');
    expect(found?.icon_type).toBe('image');
    expect(found?.icon_url.startsWith('data:image/png')).toBe(true);
    expect(found?.is_dock).toBe(true);
  });

  it('reorders app links and updates sort_order sequentially (Drag & Drop)', async () => {
    const initial = getLocalLinks();
    const reversed = [...initial].reverse();
    const reordered = await reorderAppLinks(reversed);

    expect(reordered[0].id).toBe(initial[initial.length - 1].id);
    expect(reordered[0].sort_order).toBe(1);
    expect(reordered[reordered.length - 1].sort_order).toBe(initial.length);
  });

  it('deletes an app link and re-indexes sort_order', async () => {
    const initial = getLocalLinks();
    const targetId = initial[0].id;
    const remaining = await deleteAppLink(targetId, initial);

    expect(remaining.length).toBe(initial.length - 1);
    expect(remaining.some((l) => l.id === targetId)).toBe(false);
    expect(remaining[0].sort_order).toBe(1);
  });

  it('manages categories, folder layout modes (2-column detail/cards/icons), and admin PIN settings', async () => {
    const cats = getLocalCategories();
    const newCat: Category = {
      id: 'cat-ai',
      name: 'เครื่องมือ AI',
      icon: 'Sparkles',
      color: '#ec4899',
      layout: 'detail-2col',
      sort_order: cats.length + 1,
    };

    const withAdded = await upsertCategory(newCat, cats);
    const savedCat = withAdded.find((c) => c.id === 'cat-ai');
    expect(savedCat).toBeDefined();
    expect(savedCat?.layout).toBe('detail-2col');

    const withUpdatedLayout = await upsertCategory({ ...newCat, layout: 'icons' }, withAdded);
    expect(withUpdatedLayout.find((c) => c.id === 'cat-ai')?.layout).toBe('icons');

    const afterDelete = await deleteCategory('cat-ai', withUpdatedLayout);
    expect(afterDelete.some((c) => c.id === 'cat-ai')).toBe(false);

    const settings = getLocalSettings();
    const updatedSettings = await updateHubSettings({
      ...settings,
      admin_pin: '9988',
      hub_title: 'My Company GAS Portal',
      default_folder_layout: 'detail-2col',
    });
    expect(updatedSettings.admin_pin).toBe('9988');
    expect(updatedSettings.hub_title).toBe('My Company GAS Portal');
    expect(updatedSettings.default_folder_layout).toBe('detail-2col');
  });

  it('provides a rich icon library and background presets', () => {
    expect(ICON_LIBRARY.length).toBeGreaterThan(80);
    expect(BG_COLOR_PRESETS.length).toBeGreaterThan(15);
  });
});

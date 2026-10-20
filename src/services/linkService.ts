import { AppLink, AppSettings, Category } from '../types/app';
import { DEFAULT_APP_LINKS, DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from '../constants/wallpapers';

const LS_LINKS_KEY = 'app_hub_links_v1';
const LS_CATEGORIES_KEY = 'app_hub_categories_v1';
const LS_SETTINGS_KEY = 'app_hub_settings_v1';

export interface HubDataBundle {
  links: AppLink[];
  categories: Category[];
  settings: AppSettings;
}

export function getLocalLinks(): AppLink[] {
  try {
    const raw = localStorage.getItem(LS_LINKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppLink[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => a.sort_order - b.sort_order);
      }
    }
  } catch {
    // ignore
  }
  localStorage.setItem(LS_LINKS_KEY, JSON.stringify(DEFAULT_APP_LINKS));
  return [...DEFAULT_APP_LINKS];
}

export function setLocalLinks(links: AppLink[]): void {
  localStorage.setItem(LS_LINKS_KEY, JSON.stringify(links));
}

export function getLocalCategories(): Category[] {
  try {
    const raw = localStorage.getItem(LS_CATEGORIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Category[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => a.sort_order - b.sort_order);
      }
    }
  } catch {
    // ignore
  }
  localStorage.setItem(LS_CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
  return [...DEFAULT_CATEGORIES];
}

export function setLocalCategories(categories: Category[]): void {
  localStorage.setItem(LS_CATEGORIES_KEY, JSON.stringify(categories));
}

export function getLocalSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
  return { ...DEFAULT_SETTINGS };
}

export function setLocalSettings(settings: AppSettings): void {
  localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
}

export async function fetchAllHubData(): Promise<HubDataBundle> {
  return {
    links: getLocalLinks(),
    categories: getLocalCategories(),
    settings: getLocalSettings(),
  };
}

export async function upsertAppLink(link: AppLink, currentLinks: AppLink[]): Promise<AppLink[]> {
  const exists = currentLinks.some((item) => item.id === link.id);
  const updatedLinks = exists
    ? currentLinks.map((item) => (item.id === link.id ? link : item))
    : [...currentLinks, link];

  const sorted = [...updatedLinks].sort((a, b) => a.sort_order - b.sort_order);
  setLocalLinks(sorted);
  return sorted;
}

export async function deleteAppLink(linkId: string, currentLinks: AppLink[]): Promise<AppLink[]> {
  const filtered = currentLinks
    .filter((item) => item.id !== linkId)
    .map((item, idx) => ({ ...item, sort_order: idx + 1 }));

  setLocalLinks(filtered);
  return filtered;
}

export async function reorderAppLinks(reorderedLinks: AppLink[]): Promise<AppLink[]> {
  const normalized = reorderedLinks.map((item, index) => ({
    ...item,
    sort_order: index + 1,
  }));

  setLocalLinks(normalized);
  return normalized;
}

export async function upsertCategory(category: Category, currentCategories: Category[]): Promise<Category[]> {
  const exists = currentCategories.some((c) => c.id === category.id);
  const updated = exists
    ? currentCategories.map((c) => (c.id === category.id ? category : c))
    : [...currentCategories, category];

  const sorted = [...updated].sort((a, b) => a.sort_order - b.sort_order);
  setLocalCategories(sorted);
  return sorted;
}

export async function deleteCategory(categoryId: string, currentCategories: Category[]): Promise<Category[]> {
  const filtered = currentCategories.filter((c) => c.id !== categoryId);
  setLocalCategories(filtered);
  return filtered;
}

export async function updateHubSettings(settings: AppSettings): Promise<AppSettings> {
  const normalized = { ...settings, id: 'default' };
  setLocalSettings(normalized);
  return normalized;
}

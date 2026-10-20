import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseCredentials } from '../types/app';

const STORAGE_CREDS_KEY = 'app_hub_supabase_credentials_v1';

let cachedClient: SupabaseClient | null = null;
let cachedConfigHash = '';

export function getSupabaseCredentials(): SupabaseCredentials {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_CREDS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SupabaseCredentials;
        if (parsed.url && parsed.anonKey) {
          return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() };
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  return {
    url: envUrl && !envUrl.includes('your-project-id') ? envUrl : '',
    anonKey: envKey && !envKey.includes('your-supabase-anon') ? envKey : '',
  };
}

export function saveSupabaseCredentials(creds: SupabaseCredentials): void {
  if (typeof window === 'undefined') return;
  if (!creds.url.trim() || !creds.anonKey.trim()) {
    localStorage.removeItem(STORAGE_CREDS_KEY);
  } else {
    localStorage.setItem(
      STORAGE_CREDS_KEY,
      JSON.stringify({
        url: creds.url.trim(),
        anonKey: creds.anonKey.trim(),
      })
    );
  }
  cachedClient = null;
  cachedConfigHash = '';
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith('http'));
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey || !url.startsWith('http')) {
    return null;
  }

  const hash = `${url}::${anonKey}`;
  if (cachedClient && cachedConfigHash === hash) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
      },
    });
    cachedConfigHash = hash;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * ย่อขนาดรูปภาพให้เป็นไอคอนความละเอียดสูง (สูงสุด 256x256 px) เพื่อโหลดเร็วและประหยัดพื้นที่
 */
export async function compressImageToDataUrl(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.onload = () => {
      const result = reader.result as string;
      if (file.type === 'image/svg+xml') {
        resolve(result);
        return;
      }

      const img = new Image();
      img.onerror = () => resolve(result);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png', 0.92));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * อัปโหลดไฟล์ไอคอนขึ้น Supabase Storage Bucket 'app-icons'
 * หากยังไม่ได้เชื่อมต่อ Supabase หรือ Bucket ยังไม่ถูกสร้าง จะคืนค่าเป็น Data URL ที่บีบอัดแล้วโดยอัตโนมัติ
 */
export async function uploadIconImage(file: File): Promise<{ url: string; storageUsed: 'supabase' | 'local' }> {
  const compressedDataUrl = await compressImageToDataUrl(file, 256);
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { url: compressedDataUrl, storageUsed: 'local' };
  }

  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const safeExt = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext) ? ext : 'png';
    const fileName = `icon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

    // แปลง Data URL เป็น Blob เพื่ออัปโหลดไฟล์ที่ย่อขนาดแล้ว
    const res = await fetch(compressedDataUrl);
    const blob = await res.blob();

    const { error: uploadError } = await supabase.storage
      .from('app-icons')
      .upload(fileName, blob, {
        contentType: blob.type || file.type || 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.warn('Supabase storage upload fallback to optimized Data URL:', uploadError.message);
      return { url: compressedDataUrl, storageUsed: 'local' };
    }

    const { data } = supabase.storage.from('app-icons').getPublicUrl(fileName);
    if (data?.publicUrl) {
      return { url: data.publicUrl, storageUsed: 'supabase' };
    }
  } catch (err) {
    console.warn('Error uploading to Supabase Storage, using local compressed icon:', err);
  }

  return { url: compressedDataUrl, storageUsed: 'local' };
}

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
 * แปลงไฟล์รูปภาพที่อัปโหลดให้เป็น Data URL ที่บีบอัดแล้วสำหรับบันทึกเป็นไอคอนแอป
 */
export async function uploadIconImage(file: File): Promise<{ url: string }> {
  const compressedDataUrl = await compressImageToDataUrl(file, 256);
  return { url: compressedDataUrl };
}

/**
 * ตรวจสอบว่าเป็นลิงก์ Google Apps Script หรือไม่ (ซึ่งไม่มีโลโก้เฉพาะของระบบเอง)
 */
export function isGoogleAppsScriptUrl(rawUrl: string): boolean {
  const lower = (rawUrl || '').trim().toLowerCase();
  return lower.includes('script.google.com') || lower.includes('script.googleusercontent.com');
}

/**
 * ดึงไอคอนโลโก้จริงของเว็บไซต์ (High-Res Favicon / Touch Icon 128px) จาก URL ของเว็บนั้นโดยอัตโนมัติ
 */
export function getWebsiteFaviconUrl(rawUrl: string): string {
  try {
    let clean = rawUrl.trim();
    if (!clean) return '';
    if (!/^https?:\/\//i.test(clean)) {
      clean = `https://${clean}`;
    }
    const parsed = new URL(clean);
    const hostname = parsed.hostname;
    if (!hostname || !hostname.includes('.')) return '';

    // ใช้บริการ Google S2 Favicon ความละเอียดสูง (sz=128) ซึ่งรองรับทุกเว็บไซต์มาตรฐาน
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`;
  } catch {
    return '';
  }
}


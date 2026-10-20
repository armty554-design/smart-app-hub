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

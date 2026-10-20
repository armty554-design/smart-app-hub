import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share, PlusSquare, CheckCircle2, MoreVertical } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface AndroidInstallModalProps {
  hubTitle: string;
}

export const AndroidInstallPrompt: React.FC<AndroidInstallModalProps> = ({ hubTitle }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // ตรวจสอบว่าเปิดจากโหมดติดตั้งเป็นแอปแล้วหรือยัง (Standalone PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsGuideOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setIsGuideOpen(true);
    }
  };

  return (
    <>
      {/* ปุ่มไอคอนสำหรับติดตั้งลงหน้าจอ Android / มือถือ */}
      <button
        type="button"
        onClick={handleInstallClick}
        title="ติดตั้งแอปลงหน้าจอมือถือ Android / iOS"
        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 hover:text-white text-[11px] sm:text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
      >
        <Smartphone size={13} className="text-emerald-400 shrink-0" />
        <span className="hidden xs:inline sm:inline">ติดตั้งแอป Android</span>
        <Download size={12} className="text-emerald-300" />
      </button>

      {/* หน้าต่างแนะนำการติดตั้งลงหน้าจอมือถือ Android (กรณีเบราว์เซอร์ต้องกดผ่านเมนู หรือใช้บนเครื่องอื่น) */}
      {isGuideOpen && (
        <div
          onClick={() => setIsGuideOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-white/20 p-6 shadow-2xl space-y-5"
          >
            <button
              type="button"
              onClick={() => setIsGuideOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/75 hover:text-white transition"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3.5">
              <img
                src="/app-icon.svg"
                alt="App Icon"
                className="w-14 h-14 rounded-2xl shadow-lg border border-white/20"
              />
              <div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                  Android & iOS Web App
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                  ติดตั้ง "{hubTitle}" ลงหน้าจอมือถือ
                </h3>
                <p className="text-xs text-slate-400">
                  สร้างไอคอนไว้บนหน้าจอหลัก กดเข้าใช้งานได้เต็มจอเหมือนแอปจริง
                </p>
              </div>
            </div>

            {deferredPrompt && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition"
              >
                <Download size={18} />
                กดที่นี่เพื่อติดตั้งลงหน้าจอ Android ทันที
              </button>
            )}

            <div className="space-y-3 text-xs">
              {/* สำหรับ Android Chrome */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/25 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-emerald-300 text-sm">
                  <Smartphone size={16} />
                  <span>วิธีติดตั้งบนมือถือ Android (Chrome / Edge)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed">
                  <li>
                    แตะที่ปุ่มเมนู <MoreVertical size={13} className="inline text-white mx-0.5" />{' '}
                    <strong>(จุด 3 จุด)</strong> มุมขวาบนของเบราว์เซอร์ Chrome
                  </li>
                  <li>
                    เลือกเมนู <strong>"ติดตั้งแอป" (Install app)</strong> หรือ{' '}
                    <strong>"เพิ่มในหน้าจอหลัก" (Add to Home screen)</strong>
                  </li>
                  <li>
                    กดยืนยัน <strong>ติดตั้ง</strong> ไอคอนแอปจะไปปรากฏบนหน้าจอมือถือทันที!
                  </li>
                </ol>
              </div>

              {/* สำหรับ iOS Safari */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-indigo-300 text-sm">
                  <Share size={15} />
                  <span>สำหรับ iPhone / iPad (Safari)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed">
                  <li>
                    แตะปุ่ม <strong>แชร์ (Share)</strong> ด้านล่างของ Safari
                  </li>
                  <li>
                    เลื่อนลงมาเลือก{' '}
                    <PlusSquare size={13} className="inline text-white mx-0.5" />{' '}
                    <strong>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</strong>
                  </li>
                </ol>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 size={13} /> รองรับเปิดแบบเต็มจอ (Standalone Mode)
              </span>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

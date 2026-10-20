import React, { useState, useEffect } from 'react';
import { Lock, Delete, X, ShieldCheck } from 'lucide-react';

interface PinLockModalProps {
  isOpen: boolean;
  expectedPin: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  expectedPin,
  onSuccess,
  onClose,
}) => {
  const [enteredPin, setEnteredPin] = useState('');
  const [errorShake, setErrorShake] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEnteredPin('');
      setErrorMsg('');
      setErrorShake(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!isOpen) return null;

  const targetLength = Math.max(4, expectedPin.length);

  const handleDigit = (digit: string) => {
    if (enteredPin.length >= targetLength) return;
    const nextPin = enteredPin + digit;
    setEnteredPin(nextPin);
    setErrorMsg('');

    if (nextPin.length === expectedPin.length) {
      if (nextPin === expectedPin) {
        setTimeout(() => {
          onSuccess();
        }, 120);
      } else {
        setErrorShake(true);
        setErrorMsg('รหัส PIN ไม่ถูกต้อง กรุณาลองอีกครั้ง');
        setTimeout(() => {
          setEnteredPin('');
          setErrorShake(false);
        }, 550);
      }
    }
  };

  const handleBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xl animate-fade-in">
      <div
        className={`relative w-full max-w-sm rounded-3xl bg-slate-900/90 border border-white/15 p-6 sm:p-8 shadow-2xl text-center ${
          errorShake ? 'animate-shake' : ''
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition"
        >
          <X size={18} />
        </button>

        <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
          <Lock size={24} />
        </div>

        <h3 className="text-lg font-semibold text-white">ปลดล็อกโหมดจัดการ (Admin)</h3>
        <p className="text-xs text-slate-400 mt-1">
          กรอกรหัส PIN {expectedPin.length} หลัก เพื่อแก้ไขไอคอนหรือเพิ่มลิงก์ใหม่
        </p>

        {/* จุดแสดงรหัส PIN */}
        <div className="flex items-center justify-center gap-3.5 my-6">
          {Array.from({ length: expectedPin.length }).map((_, idx) => {
            const filled = idx < enteredPin.length;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  filled
                    ? 'bg-indigo-400 scale-110 shadow-[0_0_12px_rgba(129,140,248,0.9)]'
                    : 'bg-white/15 border border-white/30'
                }`}
              />
            );
          })}
        </div>

        {errorMsg ? (
          <p className="text-xs text-rose-400 font-medium mb-4">{errorMsg}</p>
        ) : (
          <p className="text-[11px] text-slate-400 mb-4 flex items-center justify-center gap-1">
            <ShieldCheck size={13} className="text-emerald-400" />
            {expectedPin === '1234' ? (
              <>
                ค่าเริ่มต้นคือ <code className="text-indigo-300 font-mono">1234</code> (เปลี่ยนได้ในตั้งค่า)
              </>
            ) : (
              <span>กรอกรหัสผ่านแอดมิน {expectedPin.length} หลักที่ตั้งค่าไว้</span>
            )}
          </p>
        )}

        {/* แป้นตัวเลขสไตล์โทรศัพท์ */}
        <div className="grid grid-cols-3 gap-3 max-w-[250px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 text-xl font-semibold text-white transition flex items-center justify-center shadow-sm"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setEnteredPin('')}
            className="h-14 rounded-2xl bg-white/5 hover:bg-white/15 active:scale-95 text-xs font-medium text-slate-300 transition flex items-center justify-center"
          >
            ล้างค่า
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 text-xl font-semibold text-white transition flex items-center justify-center shadow-sm"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-white/5 hover:bg-white/15 active:scale-95 text-slate-300 transition flex items-center justify-center"
            title="ลบ"
          >
            <Delete size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

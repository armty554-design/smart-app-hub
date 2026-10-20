import React, { useState, useEffect } from 'react';
import { ICON_MAP } from '../constants/icons';
import { IconShape, IconType, ImageFit } from '../types/app';
import { getWebsiteFaviconUrl } from '../lib/supabase';
import { FileCode2 } from 'lucide-react';

interface IconRendererProps {
  iconType: IconType;
  iconName: string;
  iconUrl?: string;
  linkUrl?: string;
  imageFit?: ImageFit;
  bgStyle: string;
  iconColor: string;
  shape?: IconShape;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  badgeText?: string;
  className?: string;
}

const SIZE_CLASSES = {
  sm: {
    box: 'w-11 h-11',
    icon: 22,
    radiusSquircle: 'rounded-[13px]',
    radiusRounded: 'rounded-xl',
  },
  md: {
    box: 'w-[62px] h-[62px] sm:w-[68px] sm:h-[68px]',
    icon: 31,
    radiusSquircle: 'rounded-[18px] sm:rounded-[20px]',
    radiusRounded: 'rounded-2xl',
  },
  lg: {
    box: 'w-20 h-20',
    icon: 38,
    radiusSquircle: 'rounded-[24px]',
    radiusRounded: 'rounded-2xl',
  },
  xl: {
    box: 'w-24 h-24',
    icon: 46,
    radiusSquircle: 'rounded-[28px]',
    radiusRounded: 'rounded-3xl',
  },
};

export const IconRenderer: React.FC<IconRendererProps> = ({
  iconType,
  iconName,
  iconUrl,
  linkUrl,
  imageFit = 'cover',
  bgStyle,
  iconColor,
  shape = 'squircle',
  size = 'md',
  badgeText,
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const resolvedImageUrl =
    iconType === 'favicon'
      ? iconUrl || (linkUrl ? getWebsiteFaviconUrl(linkUrl) : '')
      : iconType === 'image'
      ? iconUrl || ''
      : '';

  useEffect(() => {
    setImgFailed(false);
  }, [resolvedImageUrl, iconType]);

  const sizeConf = SIZE_CLASSES[size];
  const radiusClass =
    shape === 'circle'
      ? 'rounded-full'
      : shape === 'rounded'
      ? sizeConf.radiusRounded
      : sizeConf.radiusSquircle;

  const IconComponent = ICON_MAP[iconName] || FileCode2;

  const showImage = (iconType === 'image' || iconType === 'favicon') && Boolean(resolvedImageUrl) && !imgFailed;
  const effectiveFit = iconType === 'favicon' ? imageFit || 'contain' : imageFit;

  return (
    <div className={`relative select-none ${className}`}>
      <div
        className={`${sizeConf.box} ${radiusClass} relative flex items-center justify-center overflow-hidden shadow-[0_10px_25px_-5px_rgba(0,0,0,0.45),0_2px_6px_-1px_rgba(0,0,0,0.3)] ring-1 ring-white/20 transition-transform duration-200`}
        style={{ background: bgStyle }}
      >
        {/* แสงสะท้อนด้านบนสไตล์ไอคอน iOS */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.05) 45%, rgba(0,0,0,0.12) 100%)',
          }}
        />

        {showImage ? (
          <img
            src={resolvedImageUrl}
            alt={iconName || 'App Icon'}
            className={`relative z-10 w-full h-full ${
              effectiveFit === 'contain' ? 'object-contain p-2.5' : 'object-cover'
            }`}
            draggable={false}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <IconComponent
            size={sizeConf.icon}
            strokeWidth={2.1}
            style={{ color: iconColor }}
            className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
          />
        )}
      </div>

      {badgeText && (
        <span className="absolute -top-1.5 -right-1.5 z-20 px-1.5 py-0.5 text-[10px] font-bold tracking-tight uppercase bg-slate-900/90 text-white border border-white/25 rounded-full shadow-md backdrop-blur-md">
          {badgeText}
        </span>
      )}
    </div>
  );
};

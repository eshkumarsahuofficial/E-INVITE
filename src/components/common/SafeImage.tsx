import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackLabel?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackLabel,
  ...rest
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-stone-100 via-stone-50 to-amber-50/50 text-stone-400 border border-stone-200/70 ${className}`}
        role="img"
        aria-label={alt || fallbackLabel || 'Wedding photograph'}
      >
        <ImageIcon className="w-6 h-6 mb-1.5 opacity-60" strokeWidth={1.5} />
        <span className="text-xs font-medium text-stone-500 px-3 text-center truncate max-w-full">
          {fallbackLabel || alt || 'Capture Studio'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
      {...rest}
    />
  );
};

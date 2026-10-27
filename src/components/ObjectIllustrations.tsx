import React, { useState } from 'react';
import { Gift } from 'lucide-react';

interface PhotoImageProps {
  src?: string;
  alt?: string;
  fallbackColor?: string;
  className?: string;
}

export const PhotoImage: React.FC<PhotoImageProps> = ({
  src,
  alt = 'Gift editorial photograph',
  fallbackColor = '#EBF3FE',
  className = 'w-full h-full object-cover',
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        style={{ backgroundColor: fallbackColor }}
        className={`flex flex-col items-center justify-center p-6 text-center text-[#1B3D5F] ${className}`}
      >
        <Gift className="w-8 h-8 mb-2 opacity-65" />
        <span className="text-[11px] uppercase tracking-wider font-semibold text-[#28537D] mb-1">
          Sample Image Placeholder
        </span>
        <span className="text-xs font-serif italic max-w-[24ch] line-clamp-2 opacity-85">
          {alt}
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
      decoding="async"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};

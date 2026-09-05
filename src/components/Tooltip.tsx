/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'bottom',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onTouchStart={() => setIsOpen(prev => !prev)}
    >
      {children}
      {isOpen && (
        <div
          className={`absolute z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150 ${positionClasses[position]}`}
        >
          <div className="bg-[#18181b]/95 text-[#f4f4f5] border border-white/20 rounded-sm px-2.5 py-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.8)] backdrop-blur-md text-[11px] font-sans leading-relaxed whitespace-nowrap max-w-xs sm:max-w-sm">
            {content}
          </div>
        </div>
      )}
    </div>
  );
};

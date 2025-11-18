'use client';

import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipHeight = 40; // Approximate tooltip height
      const tooltipWidth = 200; // Approximate tooltip width

      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = rect.top - tooltipHeight - 8;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'bottom':
          top = rect.bottom + 8;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - 8;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + 8;
          break;
      }

      // Adjust if tooltip goes off screen
      if (left < 0) left = 8;
      if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth - 8;
      }
      if (top < 0) top = 8;
      if (top + tooltipHeight > window.innerHeight) {
        top = window.innerHeight - tooltipHeight - 8;
      }

      setCoords({ top, left });
      setIsVisible(true);
    }
  };

  const hideTooltip = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    const trigger = triggerRef.current;
    if (trigger) {
      trigger.addEventListener('mouseenter', showTooltip);
      trigger.addEventListener('mouseleave', hideTooltip);
      trigger.addEventListener('focus', showTooltip);
      trigger.addEventListener('blur', hideTooltip);
    }

    return () => {
      if (trigger) {
        trigger.removeEventListener('mouseenter', showTooltip);
        trigger.removeEventListener('mouseleave', hideTooltip);
        trigger.removeEventListener('focus', showTooltip);
        trigger.removeEventListener('blur', hideTooltip);
      }
    };
  }, []);

  return (
    <div className="relative inline-block">
      <div ref={triggerRef} className={className}>
        {children}
      </div>
      
      {isVisible && (
        <div
          className="absolute z-50 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg border border-gray-700 max-w-xs"
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
          }}
          role="tooltip"
        >
          <div className="font-medium mb-1">Information</div>
          <div className="text-gray-300">{content}</div>
          
          {/* Arrow */}
          <div
            className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
              position === 'top' ? 'bottom-1 left-1/2 -translate-x-1/2 translate-y-1/2' :
              position === 'bottom' ? 'top-1 left-1/2 -translate-x-1/2 rotate-45' :
              position === 'left' ? 'top-1/2 right-0 -translate-y-1/2 translate-x-1/2' :
              position === 'right' ? 'top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 rotate-90' :
              ''
            }`}
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
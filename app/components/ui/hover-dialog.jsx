"use client";

import { useState, useRef, useEffect } from 'react';

function HoverDialog({ children, content, isVisible, onMouseEnter, onMouseLeave, position = 'top' }) {
  const dialogRef = useRef(null);
  const [dialogPosition, setDialogPosition] = useState({ top: 0, left: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isVisible && isMounted && dialogRef.current) {
      const rect = dialogRef.current.getBoundingClientRect();
      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = rect.top - 10;
          left = rect.left + (rect.width / 2);
          break;
        case 'bottom':
          top = rect.bottom + 10;
          left = rect.left + (rect.width / 2);
          break;
        case 'left':
          top = rect.top + (rect.height / 2);
          left = rect.left - 10;
          break;
        case 'right':
          top = rect.top + (rect.height / 2);
          left = rect.right + 10;
          break;
        default:
          top = rect.top - 10;
          left = rect.left + (rect.width / 2);
      }

      setDialogPosition({ top, left });
    }
  }, [isVisible, position, isMounted]);

  return (
    <div className="relative inline-block">
      <div
        ref={dialogRef}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </div>

      {isVisible && isMounted && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-in-out transform ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={{
            top: `${dialogPosition.top}px`,
            left: `${dialogPosition.left}px`,
            transform: 'translate(-50%, -100%)'
          }}
          suppressHydrationWarning
        >
          <div className="bg-gradient-to-r from-[#0d1224] to-[#0a0d37] border border-[#1b2c68a0] rounded-lg shadow-2xl p-6 max-w-md w-full">
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-[#0d1224]"></div>
            {content}
          </div>
        </div>
      )}
    </div>
  );
}

export default HoverDialog;

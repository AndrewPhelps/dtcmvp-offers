'use client';

import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  header?: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Drawer({ isOpen, onClose, children, header, headerAction, footer }: DrawerProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Close button - outside drawer on the left */}
      <button
        onClick={onClose}
        className={`fixed top-6 z-50 p-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all duration-300 ${
          isOpen ? 'opacity-100 right-[calc(100vw-48rem+1rem)]' : 'opacity-0 pointer-events-none right-[100vw]'
        }`}
        style={{
          right: isOpen ? 'calc(min(100vw, 48rem) + 1rem)' : '100vw'
        }}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-3xl bg-[var(--bg-card)] border-l border-[var(--border-default)] z-50 flex flex-col transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border-default)] flex-shrink-0">
          <div className="flex-1 min-w-0">
            {header}
          </div>
          {headerAction && (
            <div className="ml-6 flex-shrink-0">
              {headerAction}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 border-t border-[var(--border-default)]">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

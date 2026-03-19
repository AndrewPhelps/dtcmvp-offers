'use client';

import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  progress?: number; // 0-100, replaces header border with progress bar
  minHeight?: string; // e.g., '500px' - minimum modal height
  contentHeight?: string; // e.g., '400px' - locks content area to exact height (scrolls if needed)
  maxWidth?: string; // e.g., 'max-w-lg', 'max-w-md' - defaults to 'max-w-4xl'
}

export default function Modal({ isOpen, onClose, children, header, footer, progress, minHeight, contentHeight, maxWidth = 'max-w-4xl' }: ModalProps) {
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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Modal container - clicking here closes modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleBackdropClick}
      >
        {/* Modal */}
        <div
          className={`relative w-full ${maxWidth} max-h-[95vh] md:max-h-[90vh] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl md:rounded-2xl flex flex-col transform transition-all duration-300 ease-out ${
            isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
          style={minHeight ? { minHeight } : undefined}
        >
          {/* Close button - top right inside modal */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 md:top-4 md:right-4 p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors z-10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          {header && (
            <div className="flex-shrink-0">
              <div className="flex items-center px-4 md:px-8 py-4 md:py-6 pr-12 md:pr-16">
                <div className="flex-1 min-w-0">
                  {header}
                </div>
              </div>
              {/* Progress bar or border */}
              {typeof progress === 'number' ? (
                <div className="h-1 bg-[var(--border-default)]">
                  <div
                    className="h-full bg-[var(--brand-green-primary)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              ) : (
                <div className="border-b border-[var(--border-default)]" />
              )}
            </div>
          )}

          {/* Content */}
          <div
            className="overflow-y-auto"
            style={contentHeight ? { flex: `0 1 ${contentHeight}` } : { flex: '1 1 auto' }}
          >
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex-shrink-0 border-t border-[var(--border-default)]">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

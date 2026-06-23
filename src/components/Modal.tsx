'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ isVisible, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isVisible) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={`modal-overlay ${isVisible ? 'is-visible' : ''}`}
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="modal-card">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal" style={{ color: 'var(--text)' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

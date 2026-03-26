"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  wide?: boolean;
}

export function Modal({ isOpen, onClose, title, children, wide }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className={`bg-white rounded-t-xl md:rounded-lg shadow-xl w-full ${wide ? "max-w-2xl" : "max-w-lg"} mx-0 md:mx-4 p-4 md:p-6 max-h-[85vh] md:max-h-[90vh] overflow-y-auto`}>
        {title && <h2 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

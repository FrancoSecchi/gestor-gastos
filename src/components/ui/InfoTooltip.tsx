import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  title: string;
  content: React.ReactNode;
}

interface TooltipPosition {
  top: number;
  left: number;
  right: number;
  position: 'left' | 'right';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ title, content }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const availableRight = window.innerWidth - rect.right - 16;
      const availableLeft = rect.left;
      const position = availableRight < 300 && availableLeft > 300 ? 'left' : 'right';

      if (position === 'left') {
        setTooltipPos({
          top: rect.top + rect.height / 2,
          left: 0,
          right: window.innerWidth - rect.left + 8,
          position: 'left',
        });
      } else {
        setTooltipPos({
          top: rect.top + rect.height / 2,
          left: rect.right + 8,
          right: 0,
          position: 'right',
        });
      }
    }
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 transition-colors flex-shrink-0"
        title={`Información: ${title}`}
      >
        <Info size={12} />
      </button>

      {isOpen && tooltipPos && createPortal(
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            style={{ zIndex: 40 }}
          />
          <div
            className="fixed z-50 w-80 bg-bg-secondary border border-accent-blue/30 rounded-lg shadow-2xl p-4 text-xs text-text-primary flex flex-col max-h-96"
            style={{
              top: `${tooltipPos.top}px`,
              ...(tooltipPos.position === 'left' 
                ? { right: `${tooltipPos.right}px`, left: 'auto' }
                : { left: `${tooltipPos.left}px`, right: 'auto' }
              ),
              transform: 'translateY(-50%)',
              zIndex: 50,
            }}
          >
            <p className="font-semibold text-accent-blue mb-3 flex-shrink-0">{title}</p>
            <div className="text-text-secondary leading-relaxed overflow-y-auto">{content}</div>
            <div
              className={`absolute top-1/2 w-2 h-2 bg-bg-secondary rotate-45 ${
                tooltipPos.position === 'left'
                  ? '-right-1 border-t border-r border-accent-blue/30'
                  : '-left-1 border-t border-l border-accent-blue/30'
              }`}
              style={{ transform: 'translateY(-50%)' }}
            />
          </div>
        </>,
        document.body
      )}
    </>
  );
};

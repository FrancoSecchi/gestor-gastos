import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  title: string;
  content: React.ReactNode;
}

const TOOLTIP_WIDTH = 320;
const TOOLTIP_MAX_HEIGHT = 400;
const VIEWPORT_PADDING = 8;

interface TooltipPosition {
  top: number;
  side: 'left' | 'right';
  sideOffset: number; // px from the respective edge
  arrowTop: number;   // px from top of tooltip box
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ title, content }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const buttonCenterY = rect.top + rect.height / 2;

    // Horizontal: prefer right, fallback left
    const spaceRight = window.innerWidth - rect.right - VIEWPORT_PADDING;
    const side: 'left' | 'right' = spaceRight >= TOOLTIP_WIDTH ? 'right' : 'left';
    const sideOffset = side === 'right'
      ? rect.right + VIEWPORT_PADDING
      : window.innerWidth - rect.left + VIEWPORT_PADDING;

    // Vertical: center on button, clamped to viewport
    let top = buttonCenterY - TOOLTIP_MAX_HEIGHT / 2;
    top = Math.max(VIEWPORT_PADDING, Math.min(top, window.innerHeight - TOOLTIP_MAX_HEIGHT - VIEWPORT_PADDING));

    // Arrow: tracks the button center within the tooltip box
    const arrowTop = Math.max(12, Math.min(buttonCenterY - top, TOOLTIP_MAX_HEIGHT - 12));

    setTooltipPos({ top, side, sideOffset, arrowTop });
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
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className="fixed z-50 bg-bg-secondary border border-accent-blue/30 rounded-lg shadow-2xl p-4 text-xs text-text-primary flex flex-col"
            style={{
              width: `${TOOLTIP_WIDTH}px`,
              maxHeight: `${TOOLTIP_MAX_HEIGHT}px`,
              top: `${tooltipPos.top}px`,
              ...(tooltipPos.side === 'right'
                ? { left: `${tooltipPos.sideOffset}px` }
                : { right: `${tooltipPos.sideOffset}px` }
              ),
            }}
          >
            <p className="font-semibold text-accent-blue mb-3 flex-shrink-0">{title}</p>
            <div className="text-text-secondary leading-relaxed overflow-y-auto">{content}</div>
            {/* Arrow tracks the button center */}
            <div
              className={`absolute w-2 h-2 bg-bg-secondary rotate-45 ${
                tooltipPos.side === 'left'
                  ? '-right-1 border-t border-r border-accent-blue/30'
                  : '-left-1 border-t border-l border-accent-blue/30'
              }`}
              style={{ top: `${tooltipPos.arrowTop}px`, transform: 'translateY(-50%)' }}
            />
          </div>
        </>,
        document.body
      )}
    </>
  );
};

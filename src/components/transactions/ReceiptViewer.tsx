import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { X, Paperclip, FileWarning } from 'lucide-react';

interface ReceiptViewerProps {
  filename: string;
  onClose: () => void;
}

type ViewerState =
  | { status: 'loading' }
  | { status: 'ready'; dataUrl: string; isPdf: boolean }
  | { status: 'error'; message: string };

export const ReceiptViewer: React.FC<ReceiptViewerProps> = ({ filename, onClose }) => {
  const [state, setState] = useState<ViewerState>({ status: 'loading' });

  const isPdf = filename.toLowerCase().endsWith('.pdf');

  useEffect(() => {
    setState({ status: 'loading' });
    invoke<string>('read_receipt_as_data_url', { filename })
      .then(dataUrl => setState({ status: 'ready', dataUrl, isPdf }))
      .catch(e => setState({ status: 'error', message: String(e) }));
  }, [filename]);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-bg-card border border-border-color rounded-2xl shadow-2xl flex flex-col w-full max-w-3xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border-color flex-shrink-0">
          <Paperclip size={14} className="text-accent-blue flex-shrink-0" />
          <span className="text-sm font-medium text-text-primary flex-1 truncate" title={filename}>
            {filename}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto min-h-0 rounded-b-2xl">
          {state.status === 'loading' && (
            <div className="flex items-center justify-center h-64 gap-3 text-text-secondary">
              <div className="w-5 h-5 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
              <span className="text-sm">Cargando comprobante…</span>
            </div>
          )}

          {state.status === 'error' && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-accent-red px-6">
              <FileWarning size={36} className="opacity-60" />
              <p className="text-sm font-medium">No se pudo cargar el comprobante</p>
              <p className="text-xs text-text-secondary text-center">{state.message}</p>
            </div>
          )}

          {state.status === 'ready' && (
            state.isPdf ? (
              <iframe
                src={state.dataUrl}
                className="w-full rounded-b-2xl"
                style={{ height: '75vh' }}
                title={filename}
              />
            ) : (
              <div className="flex items-center justify-center p-4 bg-bg-secondary rounded-b-2xl min-h-48">
                <img
                  src={state.dataUrl}
                  alt={filename}
                  className="max-w-full max-h-[70vh] rounded-xl object-contain shadow-lg"
                />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

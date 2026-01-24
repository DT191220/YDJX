import { ReactNode, useEffect } from 'react';
import './Modal.css';

interface ModalProps {
  title: string;
  visible: boolean;
  onClose: () => void;
  onConfirm?: (e?: React.FormEvent) => void;
  children: ReactNode;
  width?: string | number;
  confirmText?: string;
  cancelText?: string;
}

export default function Modal({
  title,
  visible,
  onClose,
  onConfirm,
  children,
  width = 600,
  confirmText = '确定',
  cancelText = '取消',
}: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [onClose, visible]);

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ width: typeof width === 'number' ? `${width}px` : width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {onConfirm && (
          <div className="modal-footer">
            <button className="btn-cancel" onClick={onClose}>
              {cancelText}
            </button>
            <button className="btn-confirm" onClick={onConfirm}>
              {confirmText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { X } from 'lucide-react';
import TranslatedText from './TranslatedText';

/**
 * Standardized modal component
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {string} props.title - Modal title
 * @param {React.ReactNode} props.children - Modal content
 * @param {React.ReactNode} props.footer - Optional footer content
 * @param {string} props.size - Modal size ('sm', 'md', 'lg', 'xl')
 * @param {boolean} props.showCloseButton - Whether to show close button
 * @param {string} props.className - Additional CSS classes
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  className = ""
}) => {
  if (!isOpen) return null;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-80 max-w-sm';
      case 'md':
        return 'w-96 max-w-md';
      case 'lg':
        return 'w-full max-w-2xl';
      case 'xl':
        return 'w-full max-w-4xl';
      default:
        return 'w-96 max-w-md';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`${getSizeClasses()} ${className}`}
        style={{
          position: 'relative',
          top: '5rem',
          margin: '0 auto',
          padding: '1.25rem',
          border: '1px solid #e5e7eb',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          borderRadius: '0.375rem',
          backgroundColor: 'white'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && <h3 className="modal-title">{title}</h3>}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
              >
                <X className="icon-md" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="modal-body">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Pre-configured confirmation modal
 */
export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'primary' // primary, error, warning
}) => {
  const getConfirmButtonClass = () => {
    switch (variant) {
      case 'error':
        return 'btn-error';
      case 'warning':
        return 'btn btn-warning';
      default:
        return 'btn-primary';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || <TranslatedText text="Confirm Action" />}
      size="sm"
    >
      <div className="text-body mb-6">
        {message || <TranslatedText text="Are you sure you want to continue?" />}
      </div>
      <div className="flex justify-end space-x-3">
        <button onClick={onClose} className="btn-outline">
          {cancelText || <TranslatedText text="Cancel" />}
        </button>
        <button onClick={onConfirm} className={getConfirmButtonClass()}>
          {confirmText || <TranslatedText text="Confirm" />}
        </button>
      </div>
    </Modal>
  );
};

export default Modal;

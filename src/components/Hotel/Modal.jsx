import { useEffect } from 'react';

const Modal = ({ isOpen, onClose, title, children, className = '' }) => {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="simple-modal-overlay" onClick={onClose}>
      <div className={`simple-modal ${className}`.trim()} onClick={(e) => e.stopPropagation()}>
        <div className="simple-modal-header">
          <span>{title}</span>
          <button className="simple-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="simple-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;

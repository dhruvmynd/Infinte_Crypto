import React from 'react';
import { AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'loading';
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  React.useEffect(() => {
    // Only auto-close success and error toasts
    if (type !== 'loading') {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // Auto close after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [onClose, type]);

  const bgColor = 
    type === 'success' ? 'bg-green-500' : 
    type === 'error' ? 'bg-red-500' : 
    'bg-blue-500';

  const Icon = 
    type === 'success' ? CheckCircle : 
    type === 'error' ? XCircle : 
    type === 'loading' ? Loader2 : 
    AlertCircle;

  return (
    <div 
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-lg text-white ${bgColor} shadow-lg animate-fade-in min-w-[300px]`}
      role="alert"
    >
      <Icon 
        size={20} 
        className={type === 'loading' ? 'animate-spin' : ''} 
      />
      <p className="text-sm font-medium flex-1">{message}</p>
      {type !== 'loading' && (
        <button
          onClick={onClose}
          className="ml-2 hover:opacity-80 transition-opacity"
          aria-label="Close notification"
        >
          <XCircle size={16} />
        </button>
      )}
    </div>
  );
}
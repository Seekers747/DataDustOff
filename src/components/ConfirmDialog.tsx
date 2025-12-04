interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'warning' | 'info';
  }
  
  export default function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    type = 'warning'
  }: ConfirmDialogProps) {
    if (!isOpen) return null;
  
    const colors = {
      danger: 'bg-red-600 hover:bg-red-700',
      warning: 'bg-orange-600 hover:bg-orange-700',
      info: 'bg-blue-600 hover:bg-blue-700'
    };
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
          <h3 className="text-xl font-bold mb-2">{title}</h3>
          <p className="text-gray-300 mb-6">{message}</p>
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 ${colors[type]} rounded-lg transition`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    );
  }
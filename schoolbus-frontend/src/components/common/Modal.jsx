import React, { useEffect } from 'react';
import Button from './Button';

const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md', // 'sm', 'md', 'lg', 'xl'
    showCloseButton = true,
    actions = null, // [{ label, onClick, variant }]
    closeOnOutsideClick = true,
}) => {
    // Yeroo modal banamu, body scrolling ittisu
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    // Bal'ina (Size) modal
    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    const handleOutsideClick = (e) => {
        if (closeOnOutsideClick && e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
            onClick={handleOutsideClick}
        >
            <div
                className={`bg-white rounded-xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] overflow-y-auto transform transition-all animate-scaleIn`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                    {showCloseButton && (
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition text-2xl leading-none"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="px-6 py-4">{children}</div>

                {/* Footer - Yoo actions kennamte */}
                {actions && (
                    <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
                        {actions.map((action, index) => (
                            <Button
                                key={index}
                                onClick={action.onClick}
                                variant={action.variant || 'primary'}
                                size="md"
                            >
                                {action.label}
                            </Button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// CSS dabaluu (Yoo Tailwind keessatti animate hin qabne, global.css keessatti dabaluu)
// Yoo barbaachise, kana global.css keessatti dabali:
/*
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
@keyframes scaleIn {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}
.animate-fadeIn { animation: fadeIn 0.2s ease-out; }
.animate-scaleIn { animation: scaleIn 0.2s ease-out; }
*/

export default Modal;
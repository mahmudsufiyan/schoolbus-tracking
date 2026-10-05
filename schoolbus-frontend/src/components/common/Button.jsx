import React from 'react';

const Button = ({
    children,
    onClick,
    type = 'button',
    variant = 'primary', // 'primary', 'secondary', 'success', 'danger', 'warning'
    size = 'md', // 'sm', 'md', 'lg'
    loading = false,
    disabled = false,
    className = '',
    fullWidth = false,
    ...props
}) => {
    // Gosa (Variant) addaa
    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-700 text-white',
        secondary: 'bg-gray-500 hover:bg-gray-600 text-white',
        success: 'bg-green-600 hover:bg-green-700 text-white',
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
        outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
    };

    // Bal'ina (Size)
    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
    };

    const baseClasses = 'font-semibold rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    const widthClass = fullWidth ? 'w-full' : '';

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
            {...props}
        >
            {loading ? (
                <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                </span>
            ) : (
                children
            )}
        </button>
    );
};

export default Button;
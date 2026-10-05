import React from 'react';

const Input = ({
    label,
    name,
    type = 'text',
    value,
    onChange,
    placeholder = '',
    error = '',
    required = false,
    disabled = false,
    className = '',
    ...props
}) => {
    const baseClasses = 'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition duration-200';
    const errorClasses = error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';
    const disabledClasses = disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white';

    return (
        <div className={`w-full ${className}`}>
            {label && (
                <label htmlFor={name} className="block text-gray-700 text-sm font-semibold mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <input
                id={name}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                required={required}
                className={`${baseClasses} ${errorClasses} ${disabledClasses}`}
                {...props}
            />
            {error && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <span>⚠️</span> {error}
                </p>
            )}
        </div>
    );
};

export default Input;
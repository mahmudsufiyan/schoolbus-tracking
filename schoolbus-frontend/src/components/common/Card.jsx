import React from 'react';

const Card = ({
    children,
    title,
    subtitle,
    className = '',
    headerClassName = '',
    bodyClassName = '',
    hover = false,
    ...props
}) => {
    const baseClasses = 'bg-white rounded-lg shadow-md overflow-hidden';
    const hoverClasses = hover ? 'hover:shadow-xl transition-shadow duration-300' : '';

    return (
        <div className={`${baseClasses} ${hoverClasses} ${className}`} {...props}>
            {/* Header */}
            {(title || subtitle) && (
                <div className={`px-6 py-4 border-b border-gray-200 ${headerClassName}`}>
                    {title && <h3 className="text-xl font-semibold text-gray-800">{title}</h3>}
                    {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                </div>
            )}
            {/* Body */}
            <div className={`px-6 py-4 ${bodyClassName}`}>
                {children}
            </div>
        </div>
    );
};

export default Card;
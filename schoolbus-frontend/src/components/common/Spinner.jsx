import React from 'react';

const Spinner = ({ size = 'md', color = 'blue', fullPage = false }) => {
    const sizes = {
        sm: 'w-5 h-5',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16',
    };

    const colors = {
        blue: 'text-blue-600',
        green: 'text-green-600',
        red: 'text-red-600',
        yellow: 'text-yellow-500',
        white: 'text-white',
        gray: 'text-gray-500',
    };

    const spinner = (
        <div className="flex items-center justify-center">
            <svg
                className={`animate-spin ${sizes[size]} ${colors[color]}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
            >
                <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                ></circle>
                <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
            </svg>
        </div>
    );

    if (fullPage) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
                {spinner}
            </div>
        );
    }

    return spinner;
};

export default Spinner;
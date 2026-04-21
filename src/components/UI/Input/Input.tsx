// =============================================
// INPUT COMPONENT
// =============================================

import React, { useId } from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    helperText,
    className = '',
    id,
    ...props
}) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
        <div className={`input-wrapper ${error ? 'input-wrapper--error' : ''} ${className}`}>
            {label && (
                <label htmlFor={inputId} className="input-label">
                    {label}
                </label>
            )}
            <input
                id={inputId}
                className="input-field"
                {...props}
            />
            {(error || helperText) && (
                <span className={`input-helper ${error ? 'input-helper--error' : ''}`}>
                    {error || helperText}
                </span>
            )}
        </div>
    );
};

export default Input;

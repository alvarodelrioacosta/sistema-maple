// =============================================
// SELECT COMPONENT
// =============================================

import React from 'react';
import './Select.css';

interface SelectOption {
    value: string;
    label: string;
    color?: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
    label?: string;
    options: SelectOption[];
    error?: string;
    onChange?: (value: string) => void;
}

export const Select: React.FC<SelectProps> = ({
    label,
    options,
    error,
    className = '',
    id,
    onChange,
    style,
    ...props
}) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange?.(e.target.value);
    };

    // Find selected option to apply its color to the select input
    const selectedOption = options.find(opt => opt.value === props.value);
    const activeStyle = selectedOption?.color ? { ...style, color: selectedOption.color } : style;

    return (
        <div className={`select-wrapper ${error ? 'select-wrapper--error' : ''}`}>
            {label && (
                <label htmlFor={selectId} className="select-label">
                    {label}
                </label>
            )}
            <div className="select-container">
                <select
                    id={selectId}
                    className={`select-field ${className}`}
                    onChange={handleChange}
                    style={activeStyle}
                    {...props}
                >
                    {options.map((option) => (
                        <option
                            key={option.value}
                            value={option.value}
                            style={option.color ? { color: option.color } : undefined}
                        >
                            {option.label}
                        </option>
                    ))}
                </select>
                <span className="select-arrow">▼</span>
            </div>
            {error && (
                <span className="select-error">{error}</span>
            )}
        </div>
    );
};

export default Select;

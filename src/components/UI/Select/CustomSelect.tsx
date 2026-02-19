import React, { useState, useRef, useEffect } from 'react';
import './Select.css'; // Reusing Select styles where possible, might need custom ones

export interface CustomSelectOption {
    value: string;
    label: string; // Plain text label for accessibility/search (if added later)
    render?: React.ReactNode; // Custom content
}

interface CustomSelectProps {
    label?: string;
    value: string;
    options: CustomSelectOption[];
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    searchable?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
    label,
    value,
    options,
    onChange,
    placeholder = 'Select option',
    className = '',
    disabled = false,
    searchable = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(o => o.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && searchable && searchInputRef.current) {
            searchInputRef.current.focus();
        }
        if (!isOpen) {
            setSearchTerm(''); // Reset search when closed
        }
    }, [isOpen, searchable]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm('');
    };

    const filteredOptions = searchable
        ? options.filter(option =>
            option.label.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : options;

    return (
        <div
            className={`select-wrapper custom-select-wrapper ${className}`}
            ref={containerRef}
            style={{ position: 'relative' }} // Ensure positioning context
        >
            {label && <label className="select-label">{label}</label>}

            <div
                className={`select-field custom-select-trigger ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    // Mimic Select.css styles
                    backgroundColor: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border)',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-primary)'
                }}
            >
                <div className="selected-value">
                    {selectedOption?.render || selectedOption?.label || <span style={{ color: 'var(--color-text-tertiary)' }}>{placeholder}</span>}
                </div>
                <span className={`arrow ${isOpen ? 'open' : ''}`} style={{ marginLeft: '8px', fontSize: '0.8em' }}>▼</span>
            </div>

            {isOpen && (
                <div
                    className="custom-select-options"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'var(--color-bg-secondary)', // Slightly lighter than trigger
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        marginTop: '4px',
                        zIndex: 100,
                        maxHeight: '300px',
                        overflowY: 'auto',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                >
                    {searchable && (
                        <div style={{ padding: '8px', borderBottom: '1px solid var(--color-border-light)' }}>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search..."
                                style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--color-border)',
                                    backgroundColor: 'var(--color-bg-tertiary)',
                                    color: 'var(--color-text-primary)'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    )}

                    {filteredOptions.map((option) => (
                        <div
                            key={option.value}
                            className={`custom-select-option ${option.value === value ? 'selected' : ''}`}
                            onClick={() => handleSelect(option.value)}
                            style={{
                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--color-border-light)',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            {option.render || option.label}
                        </div>
                    ))}
                    {filteredOptions.length === 0 && (
                        <div style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                            {options.length === 0 ? 'No options' : 'No matches found'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

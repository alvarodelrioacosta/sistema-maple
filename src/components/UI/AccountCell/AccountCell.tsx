import React, { useState, useRef } from 'react';
import './AccountCell.css';

const CLASS_ABBR: Record<string, string> = {
    'Night Lord': 'NL',
    'Dawn Warrior': 'DW',
    'Luminous': 'Lumi',
    'Marksman': 'Mrks',
    'Night Walker': 'NW',
};

const abbreviateClass = (cls: string): string => CLASS_ABBR[cls] ?? cls;

interface AccountCellProps {
    number: number;
    email: string | null;
    tag: string | null;
    mesos?: number | null;
    charName?: string | null;
    charLevel?: number | null;
    charExpPercent?: number | null;
    jobIcon?: string | null;
    charClass?: string | null;
    onMesosChange?: (value: number) => void;
}

export const AccountCell: React.FC<AccountCellProps> = ({ number, email, tag, mesos, charName, charLevel, charExpPercent, jobIcon, charClass, onMesosChange }) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const startEdit = (e: React.MouseEvent) => {
        if (!onMesosChange) return;
        e.stopPropagation();
        setDraft(mesos != null ? String(mesos) : '0');
        setEditing(true);
        setTimeout(() => inputRef.current?.select(), 0);
    };

    const commit = () => {
        const val = parseFloat(draft);
        if (!isNaN(val) && onMesosChange) onMesosChange(val);
        setEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setEditing(false);
    };

    const showMesos = mesos != null && (mesos > 0 || !!onMesosChange);

    return (
        <div className="account-cell-unified">
            <div className="account-cell-row1">
                <span className="acell-number">N° {number}</span>
                {tag && <span className="acell-tag">{tag}</span>}
                {showMesos && (
                    editing ? (
                        <input
                            ref={inputRef}
                            className="acell-mesos-input"
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            onBlur={commit}
                            onKeyDown={handleKeyDown}
                            onClick={e => e.stopPropagation()}
                            autoFocus
                        />
                    ) : (
                        <span
                            className={`acell-mesos${onMesosChange ? ' acell-mesos--editable' : ''}`}
                            onClick={startEdit}
                            title={onMesosChange ? 'Click to edit' : undefined}
                        >
                            {(mesos ?? 0).toFixed(2)}B
                        </span>
                    )
                )}
            </div>
            <span className="acell-email" title={email || undefined}>
                {email || '-'}
            </span>
            {charName && (
                <div className="acell-char-row">
                    <span className="acell-char">{charName}</span>
                    {charLevel != null && (
                        <span className="acell-char-info">
                            Lv {charLevel}
                            {charExpPercent != null && <span className="acell-char-exp"> ({Math.round(charExpPercent)}%)</span>}
                            {jobIcon && <img src={jobIcon} alt={charClass || ''} title={charClass || ''} className="acell-job-icon" />}
                            {charClass && <span className="acell-char-class">{abbreviateClass(charClass)}</span>}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

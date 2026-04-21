import React from 'react';
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
    charName?: string | null;
    charLevel?: number | null;
    charExpPercent?: number | null;
    jobIcon?: string | null;
    charClass?: string | null;
}

export const AccountCell: React.FC<AccountCellProps> = ({ number, email, tag, charName, charLevel, charExpPercent, jobIcon, charClass }) => {
    return (
        <div className="account-cell-unified">
            <div className="account-cell-row1">
                <span className="acell-number">N° {number}</span>
                {tag && <span className="acell-tag">{tag}</span>}
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

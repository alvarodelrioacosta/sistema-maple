import React from 'react';
import './AccountCell.css';

interface AccountCellProps {
    number: number;
    email: string | null;
    tag: string | null;
    charName?: string | null;
}

export const AccountCell: React.FC<AccountCellProps> = ({ number, email, tag, charName }) => {
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
                <span className="acell-char">{charName}</span>
            )}
        </div>
    );
};

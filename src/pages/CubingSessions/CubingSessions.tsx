
import React, { useState } from 'react';
import { Header } from '../../components/Layout';
import { Button } from '../../components/UI';
import { NewSession } from './NewSession';
import { ActiveSessions } from './ActiveSessions';
import './CubingSessions.css';

export const CubingSessions: React.FC = () => {
    const [view, setView] = useState<'new' | 'continue' | 'completed'>('new');

    return (
        <div className="cubing-sessions-page">
            <Header
                title="Cubing Sessions"
                subtitle="Manage client cubing requests and sessions"
            />

            <div className="page-content">
                <div className="sessions-tabs">
                    <Button
                        variant={view === 'new' ? 'primary' : 'secondary'}
                        onClick={() => setView('new')}
                    >
                        New Session
                    </Button>
                    <Button
                        variant={view === 'continue' ? 'primary' : 'secondary'}
                        onClick={() => setView('continue')}
                    >
                        Continue Session
                    </Button>
                    {/* Placeholder for Completed - for future implementation if needed */}
                </div>

                <div className="sessions-content">
                    {view === 'new' && <NewSession />}
                    {view === 'continue' && <ActiveSessions />}
                </div>
            </div>
        </div>
    );
};

import React from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
    message?: string;
    fullScreen?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
    message = 'Cargando datos...',
    fullScreen = true
}) => {
    return (
        <div className={`loading-screen ${fullScreen ? 'loading-screen--full' : ''}`}>
            <div className="loading-screen__content">
                <div className="loading-screen__shimmer-container">
                    <div className="loading-screen__spinner">
                        <div className="loading-screen__inner-circle"></div>
                        <div className="loading-screen__orbit-dot"></div>
                    </div>
                </div>
                <h2 className="loading-screen__text">{message}</h2>
                <div className="loading-screen__progress-bar">
                    <div className="loading-screen__progress-fill"></div>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;

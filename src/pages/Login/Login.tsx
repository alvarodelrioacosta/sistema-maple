import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const Login: React.FC = () => {
    const { signInWithGoogle } = useAuth();

    const handleGoogleLogin = async () => {
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error('Error logging in with Google:', error);
            alert('Error al iniciar sesión con Google. Revisa la consola.');
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <img src="/logo.png" alt="Logo" className="login-logo" onError={(e) => e.currentTarget.style.display = 'none'} />
                    <h1>Inventory System</h1>
                    <p>Inicia sesión para gestionar tu inventario</p>
                </div>

                <button className="google-login-btn" onClick={handleGoogleLogin}>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                    <span>Continuar con Google</span>
                </button>

                <div className="login-footer">
                    <p>Desarrollado para la gestión avanzada de MapleStory</p>
                </div>
            </div>

            {/* Elementos decorativos de fondo */}
            <div className="bg-blob blob-1"></div>
            <div className="bg-blob blob-2"></div>
        </div>
    );
};

export default Login;

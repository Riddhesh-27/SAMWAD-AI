import React from 'react';
import { Eye, Volume2, ShieldCheck, Wifi, WifiOff, BookOpen, Sparkles, Moon, Sun, Smartphone } from 'lucide-react';

export default function Header({ 
  backendHealth, 
  onOpenSignsModal, 
  onOpenStudioModal,
  onOpenAndroidModal,
  theme, 
  toggleTheme 
}) {
  const isBackendOnline = backendHealth?.status === "healthy";

  return (
    <header className="glass-card" style={{ padding: '1.25rem 1.75rem', marginBottom: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Branding & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0284c7, #14b8a6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 15px rgba(2, 132, 199, 0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <Eye size={20} />
              <Volume2 size={16} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #38bdf8, #2dd4bf)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                SAMVAD AI
              </h1>
              <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>v1.0 Pro</span>
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                <ShieldCheck size={12} /> Offline Engine Ready
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Smart AI-based Multimodal Vision Assistant for Deaf & Speech-Impaired Communication
            </p>
          </div>
        </div>

        {/* System Indicators & Quick Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          {/* Backend Status Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.85rem',
            borderRadius: '9999px',
            background: isBackendOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${isBackendOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            fontSize: '0.8rem',
            color: isBackendOnline ? '#34d399' : '#f87171'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isBackendOnline ? '#10b981' : '#ef4444',
              display: 'inline-block'
            }} className="animate-pulse-dot" />
            <span>Backend: {isBackendOnline ? 'PyTorch Active' : 'Connecting...'}</span>
          </div>

          {/* Supported Signs Dictionary Button */}
          <button 
            className="btn btn-secondary" 
            onClick={onOpenSignsModal}
            title="View supported conversational sign words"
            style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
          >
            <BookOpen size={15} />
            <span>Vocabulary (16 Words)</span>
          </button>

          {/* Custom Sign Studio Button */}
          <button 
            className="btn btn-secondary" 
            onClick={onOpenStudioModal}
            title="Record custom sign gestures and retrain"
            style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
          >
            <Sparkles size={15} />
            <span>Sign Studio</span>
          </button>

          {/* Android APK Readiness Button */}
          <button 
            className="btn btn-secondary" 
            onClick={onOpenAndroidModal}
            title="Android APK packaging guide and Capacitor readiness"
            style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
          >
            <Smartphone size={15} />
            <span>Android APK</span>
          </button>

          {/* Theme Toggle */}
          <button 
            className="btn btn-secondary" 
            onClick={toggleTheme}
            title="Toggle Light / Dark mode"
            style={{ padding: '0.45rem', borderRadius: '50%', width: '36px', height: '36px' }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

        </div>

      </div>
    </header>
  );
}

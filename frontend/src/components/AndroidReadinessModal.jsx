import React from 'react';
import { X, Smartphone, CheckCircle, Terminal, Cpu, ShieldCheck, Download } from 'lucide-react';

export default function AndroidReadinessModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      zIndex: 1000
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '680px',
        maxHeight: '85vh',
        overflowY: 'auto',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-active)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          background: 'var(--bg-card)',
          backdropFilter: 'blur(16px)',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Smartphone size={20} color="var(--primary)" />
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Android APK Packaging Guide</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Capacitor + Android Studio Architecture (₹0 Budget • Completely Free & Offline)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.4rem', borderRadius: '50%', width: '32px', height: '32px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Architecture Summary */}
          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(2, 132, 199, 0.08)',
            border: '1px solid rgba(2, 132, 199, 0.25)'
          }}>
            <h4 style={{ fontSize: '0.95rem', color: '#38bdf8', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Cpu size={16} /> How SAMVAD AI Runs on Android
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              The frontend is built using <strong>React + Vite</strong> and packaged natively via <strong>Capacitor</strong>. On Android:
              webcam access maps to the native Android Camera via WebView permissions, speech synthesis maps to the built-in Android Text-To-Speech (TTS) engine, and the landmark classifier runs offline locally.
            </p>
          </div>

          {/* Step by Step Commands */}
          <div>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Terminal size={16} color="var(--accent)" /> Step-by-Step PowerShell Build Commands
            </h4>

            <div style={{
              backgroundColor: '#050811',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: '#38bdf8',
              lineHeight: '1.7',
              overflowX: 'auto'
            }}>
              <span style={{ color: 'var(--text-dim)' }}># 1. Install Capacitor CLI & Core in frontend</span><br />
              cd frontend<br />
              npm install @capacitor/core @capacitor/cli @capacitor/android<br /><br />
              <span style={{ color: 'var(--text-dim)' }}># 2. Build production web bundle</span><br />
              npm run build<br /><br />
              <span style={{ color: 'var(--text-dim)' }}># 3. Initialize & Add Android project</span><br />
              npx cap add android<br />
              npx cap sync<br /><br />
              <span style={{ color: 'var(--text-dim)' }}># 4. Open in Android Studio & Generate Debug APK</span><br />
              npx cap open android
            </div>
          </div>

          {/* Android Permissions Required */}
          <div>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <ShieldCheck size={16} color="#10b981" /> Android Permissions (AndroidManifest.xml)
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Add to <code>android/app/src/main/AndroidManifest.xml</code> inside <code>&lt;manifest&gt;</code>:
            </p>
            <div style={{
              backgroundColor: '#050811',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              color: '#34d399',
              lineHeight: '1.6'
            }}>
              &lt;uses-permission android:name="android.permission.CAMERA" /&gt;<br />
              &lt;uses-feature android:name="android.hardware.camera" android:required="false" /&gt;<br />
              &lt;uses-permission android:name="android.permission.INTERNET" /&gt;
            </div>
          </div>

          {/* Zero Budget Guarantee */}
          <div style={{
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            fontSize: '0.8rem',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}>
            <CheckCircle size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>₹0 Cost Guarantee:</strong> Android Studio and ADB are 100% free. You can directly install the Debug APK onto your Android phone via USB debugging or transfer without any Google Play Developer account ($25 fee not needed).
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

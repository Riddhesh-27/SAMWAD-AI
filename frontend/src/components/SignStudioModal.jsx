import React, { useState } from 'react';
import { X, Sparkles, PlusCircle, CheckCircle, Database, Play, AlertCircle } from 'lucide-react';
import { recordCustomSign } from '../services/api';

export default function SignStudioModal({ isOpen, onClose, currentLandmarks }) {
  const [signLabel, setSignLabel] = useState('');
  const [recordedCount, setRecordedCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleRecordSample = async () => {
    if (!signLabel.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a sign label name (e.g. HELLO, WATER, YES).' });
      return;
    }

    if (!currentLandmarks || currentLandmarks.length !== 42) {
      setStatusMessage({ type: 'error', text: 'No hand detected! Please place your hand in the webcam feed.' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await recordCustomSign(signLabel.trim().toUpperCase(), currentLandmarks);
      setRecordedCount(prev => prev + 1);
      setStatusMessage({ type: 'success', text: `Sample #${recordedCount + 1} captured for '${signLabel.toUpperCase()}'!` });
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

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
        maxWidth: '560px',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-active)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Sparkles size={20} color="var(--accent)" />
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Custom Sign Studio</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Record new custom sign gestures directly from your webcam
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
        <div style={{ padding: '1.5rem' }}>
          
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)', display: 'block', marginBottom: '0.4rem' }}>
              Sign Word / Gesture Name:
            </label>
            <input
              type="text"
              value={signLabel}
              onChange={(e) => setSignLabel(e.target.value.toUpperCase())}
              placeholder="e.g. HELLO, THANK_YOU, WATER, YES"
              style={{
                width: '100%',
                padding: '0.65rem 0.95rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.95rem',
                fontFamily: 'var(--font-mono)',
                outline: 'none'
              }}
            />
          </div>

          {/* Hand Landmark Status Check */}
          <div style={{
            padding: '0.85rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: currentLandmarks && currentLandmarks.length === 42 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${currentLandmarks && currentLandmarks.length === 42 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}>
            {currentLandmarks && currentLandmarks.length === 42 ? (
              <>
                <CheckCircle size={18} color="#10b981" />
                <span style={{ fontSize: '0.85rem', color: '#34d399' }}>
                  Hand Detected: 21 landmarks (42 features) ready to capture.
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={18} color="#f59e0b" />
                <span style={{ fontSize: '0.85rem', color: '#fbbf24' }}>
                  No hand currently in view. Start camera and hold gesture in frame.
                </span>
              </>
            )}
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div style={{
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1rem',
              fontSize: '0.82rem',
              backgroundColor: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: statusMessage.type === 'success' ? '#34d399' : '#f87171'
            }}>
              {statusMessage.text}
            </div>
          )}

          {/* Action Button */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={handleRecordSample}
              disabled={isSaving || !currentLandmarks || !signLabel.trim()}
              style={{ flex: 1, padding: '0.75rem' }}
            >
              <PlusCircle size={18} />
              <span>Capture Landmark Frame ({recordedCount} saved)</span>
            </button>
          </div>

          {/* Instructions Box */}
          <div style={{
            marginTop: '1.25rem',
            padding: '0.85rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            fontSize: '0.78rem',
            color: 'var(--text-dim)',
            lineHeight: '1.5'
          }}>
            <strong>How to expand dataset:</strong>
            <ol style={{ paddingLeft: '1.2rem', marginTop: '0.35rem' }}>
              <li>Hold your gesture at slightly varied angles and distances.</li>
              <li>Click "Capture Landmark Frame" 15–30 times per new gesture.</li>
              <li>Samples are saved to <code>dataset/custom_signs.csv</code>.</li>
              <li>Run <code>python train_model.py</code> to retrain the PyTorch model with your new signs.</li>
            </ol>
          </div>

        </div>
      </div>
    </div>
  );
}

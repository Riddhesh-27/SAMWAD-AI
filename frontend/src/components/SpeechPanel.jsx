import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Mic, Settings2 } from 'lucide-react';
import { speechService } from '../services/speech';

export default function SpeechPanel({ textToSpeak }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [rate, setRate] = useState(0.95);
  const [showSettings, setShowSettings] = useState(false);
  const [speechError, setSpeechError] = useState(null);

  useEffect(() => {
    const unsub = speechService.subscribe(speaking => {
      setIsSpeaking(speaking);
    });

    const vList = speechService.getVoices();
    setVoices(vList);
    const preferred = speechService.getPreferredVoice();
    if (preferred) setSelectedVoice(preferred.name);

    return () => unsub();
  }, []);

  const handleSpeak = () => {
    setSpeechError(null);
    if (!textToSpeak || !textToSpeak.trim()) return;

    const chosenVoiceObj = voices.find(v => v.name === selectedVoice) || null;

    speechService.speak(textToSpeak, {
      voice: chosenVoiceObj,
      rate: rate,
      onError: (err) => {
        setSpeechError("Speech output failed: " + (err.message || "Synthesis error"));
      }
    });
  };

  const handleStop = () => {
    speechService.stop();
  };

  return (
    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
      {/* Panel Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Volume2 size={18} color="var(--primary)" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Spoken Voice Output</h2>
          <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
            Offline Speech Synthesis
          </span>
        </div>

        {/* Voice Settings Toggle */}
        <button
          className="btn btn-secondary"
          onClick={() => setShowSettings(!showSettings)}
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
        >
          <Settings2 size={14} />
          <span>Voice Settings</span>
        </button>
      </div>

      {/* Voice Settings Dropdown Tray */}
      {showSettings && (
        <div style={{
          padding: '0.85rem 1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          {/* Voice Picker */}
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
              Synthesizer Voice:
            </label>
            <select
              value={selectedVoice || ''}
              onChange={(e) => setSelectedVoice(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            >
              {voices.map((v, idx) => (
                <option key={idx} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Speed / Rate Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              <span>Speech Speed:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{rate}x</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.4"
              step="0.05"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
          </div>
        </div>
      )}

      {/* Error alert */}
      {speechError && (
        <div style={{
          padding: '0.65rem 0.85rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#f87171',
          fontSize: '0.8rem',
          marginBottom: '0.75rem'
        }}>
          {speechError}
        </div>
      )}

      {/* Primary Speak Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {!isSpeaking ? (
            <button
              className="btn btn-primary"
              onClick={handleSpeak}
              disabled={!textToSpeak || !textToSpeak.trim()}
              style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}
            >
              <Volume2 size={20} />
              <span>Speak Sentence</span>
            </button>
          ) : (
            <button
              className="btn btn-danger"
              onClick={handleStop}
              style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}
            >
              <VolumeX size={20} />
              <span>Stop Speaking</span>
            </button>
          )}

          {/* Animated Sound Wave Bars when active */}
          {isSpeaking && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '24px', padding: '0 0.5rem' }}>
              <div className="sound-wave-bar" />
              <div className="sound-wave-bar" />
              <div className="sound-wave-bar" />
              <div className="sound-wave-bar" />
              <div className="sound-wave-bar" />
            </div>
          )}
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          {isSpeaking ? 'Playing voice audio aloud...' : 'Reads current sentence to hearing conversation partner.'}
        </div>
      </div>
    </div>
  );
}

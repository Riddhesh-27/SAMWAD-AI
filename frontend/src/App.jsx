import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import WebcamView from './components/WebcamView';
import SentenceBuilder from './components/SentenceBuilder';
import GrammarPanel from './components/GrammarPanel';
import SpeechPanel from './components/SpeechPanel';
import SupportedSignsModal from './components/SupportedSignsModal';
import SignStudioModal from './components/SignStudioModal';
import AndroidReadinessModal from './components/AndroidReadinessModal';
import { fetchHealth, fetchSupportedClasses } from './services/api';
import { ArrowRight, CheckCircle2, Shield, Sparkles, Volume2, Camera } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [backendHealth, setBackendHealth] = useState(null);
  const [supportedClassesData, setSupportedClassesData] = useState(null);

  // Core sentence & recognition state
  const [sentence, setSentence] = useState('');
  const [currentLiveSign, setCurrentLiveSign] = useState(null);
  const [currentLandmarks, setCurrentLandmarks] = useState(null);

  // Settings & Toggles
  const [autoAppendEnabled, setAutoAppendEnabled] = useState(true);
  const [autoRefineEnabled, setAutoRefineEnabled] = useState(true);

  // Modals
  const [isSignsModalOpen, setIsSignsModalOpen] = useState(false);
  const [isStudioModalOpen, setIsStudioModalOpen] = useState(false);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);

  // Rapid duplicate append guard
  const lastAppendTimeRef = useRef({ sign: null, time: 0 });

  // Theme toggle
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  // Poll system health & classes on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');

    const checkSystem = async () => {
      const health = await fetchHealth();
      setBackendHealth(health);
      const classesData = await fetchSupportedClasses();
      setSupportedClassesData(classesData);
    };

    checkSystem();
    const interval = setInterval(checkSystem, 8000);
    return () => clearInterval(interval);
  }, []);

  // When a sign is recognized and accepted
  const handleSignRecognized = (sign) => {
    if (!sign) return;
    setCurrentLiveSign(sign);

    const now = Date.now();
    // Guard against rapid duplicate firing for identical sign within 1200ms
    if (lastAppendTimeRef.current.sign === sign && now - lastAppendTimeRef.current.time < 1200) {
      return;
    }
    lastAppendTimeRef.current = { sign, time: now };

    // Append to sentence buffer with duplicate phrase guard
    setSentence(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return sign;
      // Prevent duplicate append if sentence already ends with this multi-word sign (e.g. WELL DONE)
      if (sign.length > 1 && trimmed.toUpperCase().endsWith(sign.toUpperCase())) {
        return trimmed;
      }
      return `${trimmed} ${sign}`;
    });
  };

  // Manual word addition
  const handleAddWord = (word) => {
    if (!word) return;
    setSentence(prev => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${word}` : word;
    });
  };

  // Remove last word
  const handleRemoveLastWord = () => {
    setSentence(prev => {
      const words = prev.trim().split(/\s+/).filter(Boolean);
      if (words.length <= 1) return '';
      words.pop();
      return words.join(' ');
    });
  };

  // Clear sentence
  const handleClearSentence = () => {
    setSentence('');
  };

  // Accept grammar refinement
  const handleAcceptRefinement = (refinedText) => {
    setSentence(refinedText);
  };

  return (
    <div style={{ minHeight: '100vh', padding: '1.25rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <Header
        backendHealth={backendHealth}
        onOpenSignsModal={() => setIsSignsModalOpen(true)}
        onOpenStudioModal={() => setIsStudioModalOpen(true)}
        onOpenAndroidModal={() => setIsAndroidModalOpen(true)}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Dual-Column Layout (Responsive) */}
      <main style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: '1.5rem',
        alignItems: 'start',
        marginBottom: '1.5rem'
      }}>
        
        {/* Left Column: Live Vision Feed & Hand Recognition */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <WebcamView
            onSignRecognized={handleSignRecognized}
            currentSign={currentLiveSign}
            autoAppendEnabled={autoAppendEnabled}
          />

          {/* Architecture Pipeline Banner */}
          <div className="glass-card" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Multimodal Communication Direction
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
              fontSize: '0.78rem',
              color: 'var(--text-main)'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Camera size={14} color="#38bdf8" /> Sign Input
              </span>
              <ArrowRight size={12} color="var(--text-dim)" />
              <span>MediaPipe Hands</span>
              <ArrowRight size={12} color="var(--text-dim)" />
              <span style={{ color: '#38bdf8', fontWeight: '600' }}>PyTorch Keypoint MLP</span>
              <ArrowRight size={12} color="var(--text-dim)" />
              <span>Text Formation</span>
              <ArrowRight size={12} color="var(--text-dim)" />
              <span style={{ color: '#2dd4bf', fontWeight: '600' }}>Grammar Engine</span>
              <ArrowRight size={12} color="var(--text-dim)" />
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                <Volume2 size={14} /> Speech
              </span>
            </div>
          </div>
        </section>

        {/* Right Column: Sentence Formation, Grammar Refinement & Speech Output */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* 1. Sentence Builder */}
          <SentenceBuilder
            sentence={sentence}
            onUpdateSentence={setSentence}
            onAddWord={handleAddWord}
            onRemoveLastWord={handleRemoveLastWord}
            onClear={handleClearSentence}
            currentLiveSign={currentLiveSign}
            autoAppendEnabled={autoAppendEnabled}
            onToggleAutoAppend={() => setAutoAppendEnabled(!autoAppendEnabled)}
          />

          {/* 2. Grammar Refinement */}
          <GrammarPanel
            sentence={sentence}
            onAcceptRefinement={handleAcceptRefinement}
            onUpdateSentence={setSentence}
            autoRefineEnabled={autoRefineEnabled}
            onToggleAutoRefine={() => setAutoRefineEnabled(!autoRefineEnabled)}
          />

          {/* 3. Spoken Voice Output */}
          <SpeechPanel
            textToSpeak={sentence}
          />

        </section>

      </main>

      {/* Accessible Footer */}
      <footer style={{
        marginTop: '2rem',
        padding: '1.25rem',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        fontSize: '0.8rem',
        color: 'var(--text-dim)'
      }}>
        <div>
          <strong>SAMVAD AI</strong> — Assistive Technology for Deaf and Speech-Impaired Communication
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <span>100% Free & Open Source</span>
          <span>Offline Capable</span>
          <span style={{ color: '#38bdf8' }}>Prepared for Android APK</span>
        </div>
      </footer>

      {/* Modals */}
      <SupportedSignsModal
        isOpen={isSignsModalOpen}
        onClose={() => setIsSignsModalOpen(false)}
        supportedClasses={supportedClassesData?.classes}
        modelAccuracy={supportedClassesData?.metadata?.metrics?.test_accuracy}
      />

      <SignStudioModal
        isOpen={isStudioModalOpen}
        onClose={() => setIsStudioModalOpen(false)}
        currentLandmarks={currentLandmarks}
      />

      <AndroidReadinessModal
        isOpen={isAndroidModalOpen}
        onClose={() => setIsAndroidModalOpen(false)}
      />
    </div>
  );
}

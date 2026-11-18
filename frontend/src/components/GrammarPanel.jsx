import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Check, RotateCcw, ShieldCheck, ToggleLeft, ToggleRight, ArrowRight, Volume2, CheckCircle2 } from 'lucide-react';
import { refineGrammar } from '../services/api';
import { speechService } from '../services/speech';

const DEMO_PRESETS = [
  { label: "❓ YOU NAME WHAT", text: "YOU NAME WHAT" },
  { label: "💧 I WATER WANT", text: "I WATER WANT" },
  { label: "🍽️ I FOOD WANT", text: "I FOOD WANT" },
  { label: "🙏 THANK YOU", text: "THANK YOU" },
  { label: "👋 HELLO YOU HOW", text: "HELLO YOU HOW" },
  { label: "👍 WELL DONE", text: "WELL DONE" },
  { label: "🤟 I LOVE YOU", text: "I LOVE YOU" },
  { label: "🆘 YOU HELP ME", text: "YOU HELP ME" }
];

export default function GrammarPanel({
  sentence,
  onAcceptRefinement,
  onUpdateSentence,
  autoRefineEnabled,
  onToggleAutoRefine
}) {
  const [isRefining, setIsRefining] = useState(false);
  const [refinedResult, setRefinedResult] = useState(null);
  const autoTimeoutRef = useRef(null);

  // Manual trigger
  const handleManualRefine = async (textToRefine = sentence) => {
    if (!textToRefine || !textToRefine.trim()) return;
    setIsRefining(true);
    try {
      const result = await refineGrammar(textToRefine, "manual");
      setRefinedResult(result);
    } catch (err) {
      console.error("Grammar refinement error:", err);
    } finally {
      setIsRefining(false);
    }
  };

  // Quick preset click
  const handleSelectPreset = (presetText) => {
    if (onUpdateSentence) {
      onUpdateSentence(presetText);
    }
    handleManualRefine(presetText);
  };

  // Automatic grammar refinement after pause
  useEffect(() => {
    if (!autoRefineEnabled || !sentence || !sentence.trim()) {
      return;
    }

    if (autoTimeoutRef.current) {
      clearTimeout(autoTimeoutRef.current);
    }

    autoTimeoutRef.current = setTimeout(async () => {
      setIsRefining(true);
      try {
        const result = await refineGrammar(sentence, "auto");
        setRefinedResult(result);
      } catch (err) {
        console.warn("Auto grammar refinement error:", err);
      } finally {
        setIsRefining(false);
      }
    }, 1800); // 1.8 second debounce

    return () => {
      if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current);
    };
  }, [sentence, autoRefineEnabled]);

  const handleAccept = () => {
    if (refinedResult?.refined_text) {
      onAcceptRefinement(refinedResult.refined_text);
      setRefinedResult(null);
    }
  };

  const handleReject = () => {
    setRefinedResult(null);
  };

  const handleSpeakRefined = () => {
    if (refinedResult?.refined_text) {
      speechService.speak(refinedResult.refined_text);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
      {/* Panel Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Sparkles size={18} color="var(--accent)" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Grammar Refinement (Offline)</h2>
          <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
            <ShieldCheck size={12} /> Local Rule Engine
          </span>
        </div>

        {/* Controls: Auto-Refine Toggle & Manual Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={onToggleAutoRefine}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: autoRefineEnabled ? '#14b8a6' : 'var(--text-dim)',
              fontSize: '0.85rem',
              fontWeight: '600'
            }}
          >
            {autoRefineEnabled ? <ToggleRight size={22} color="#14b8a6" /> : <ToggleLeft size={22} color="var(--text-dim)" />}
            <span>Auto-Refine</span>
          </button>

          <button
            className="btn btn-accent"
            onClick={() => handleManualRefine(sentence)}
            disabled={!sentence?.trim() || isRefining}
            style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem' }}
          >
            <Sparkles size={15} />
            <span>{isRefining ? 'Polishing...' : 'Refine Grammar'}</span>
          </button>
        </div>
      </div>

      {/* Quick Interactive Sign & Phrase Presets for instant testing */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>Try Sign Phrases (Click to Test):</span>
        </div>
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          {DEMO_PRESETS.map((p, idx) => (
            <button
              key={idx}
              className="btn btn-secondary"
              onClick={() => handleSelectPreset(p.text)}
              style={{
                fontSize: '0.78rem',
                padding: '0.3rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: sentence === p.text ? 'rgba(20, 184, 166, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                border: sentence === p.text ? '1px solid rgba(20, 184, 166, 0.4)' : '1px solid var(--border-subtle)'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison View if refinement available */}
      {refinedResult ? (
        <div style={{
          backgroundColor: 'rgba(20, 184, 166, 0.08)',
          border: '1px solid rgba(20, 184, 166, 0.35)',
          borderRadius: 'var(--radius-md)',
          padding: '1.15rem',
          marginBottom: '0.5rem',
          boxShadow: '0 4px 20px rgba(20, 184, 166, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#2dd4bf', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Suggested English Correction
            </span>

            {/* Rule Badges */}
            {refinedResult.rules_applied && refinedResult.rules_applied.length > 0 && (
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {refinedResult.rules_applied.map((rule, idx) => (
                  <span key={idx} className="badge badge-info" style={{ fontSize: '0.68rem', textTransform: 'none' }}>
                    {rule}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Original vs Refined Side-by-Side or Stack */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
            {/* Original Sign Sequence */}
            <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.2rem' }}>Raw Sign Input</div>
              <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {refinedResult.original_text || sentence}
              </div>
            </div>

            <ArrowRight size={18} color="#2dd4bf" />

            {/* Refined English Sentence */}
            <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(20, 184, 166, 0.15)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(20, 184, 166, 0.35)' }}>
              <div style={{ fontSize: '0.72rem', color: '#2dd4bf', marginBottom: '0.2rem' }}>Natural English</div>
              <div style={{ fontSize: '1.05rem', color: '#f0fdfa', fontWeight: '600' }}>
                {refinedResult.refined_text}
              </div>
            </div>
          </div>

          {/* Accept / Reject / Speak Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleSpeakRefined} style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }} title="Speak this corrected sentence">
              <Volume2 size={15} color="#38bdf8" />
              <span>Speak</span>
            </button>

            <button className="btn btn-secondary" onClick={handleReject} style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>
              <RotateCcw size={15} />
              <span>Dismiss</span>
            </button>

            <button className="btn btn-accent" onClick={handleAccept} style={{ fontSize: '0.85rem', padding: '0.4rem 0.95rem' }}>
              <Check size={16} />
              <span>Accept Correction</span>
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-dim)',
          fontSize: '0.85rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div>
            Converts signs & glosses (e.g. <em>"THUMBS UP"</em> → <em>"Well done! Excellent work."</em>, <em>"HELLO"</em> → <em>"Hello! How are you?"</em>, <em>"YOU NAME WHAT"</em> → <em>"What is your name?"</em>).
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            100% Offline Rule Engine
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Type, Delete, Trash2, Copy, Check, Plus, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';

export default function SentenceBuilder({
  sentence,
  onUpdateSentence,
  onAddWord,
  onRemoveLastWord,
  onClear,
  currentLiveSign,
  autoAppendEnabled,
  onToggleAutoAppend
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!sentence) return;
    navigator.clipboard.writeText(sentence);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeduplicate = () => {
    if (!sentence || !sentence.trim()) return;
    const cleaned = sentence
      .replace(/\b(WELL\s+DONE)(?:\s+(?:WELL\s+DONE))+\b/gi, '$1')
      .replace(/\b(THUMBS\s+UP)(?:\s+(?:THUMBS\s+UP))+\b/gi, '$1')
      .replace(/\b(I\s+LOVE\s+YOU)(?:\s+(?:I\s+LOVE\s+YOU))+\b/gi, '$1')
      .replace(/\b(\w+)(?:\s+\1\b)+/gi, '$1');
    onUpdateSentence(cleaned);
  };

  const words = sentence.trim().split(/\s+/).filter(Boolean);

  return (
    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
      {/* Panel Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Type size={18} color="var(--primary)" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Recognized Sentence Buffer</h2>
          <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
            {words.length} {words.length === 1 ? 'word' : 'words'}
          </span>
        </div>

        {/* Auto-Append Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            onClick={onToggleAutoAppend}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: autoAppendEnabled ? '#34d399' : 'var(--text-dim)',
              fontSize: '0.85rem',
              fontWeight: '600'
            }}
          >
            {autoAppendEnabled ? <ToggleRight size={22} color="#10b981" /> : <ToggleLeft size={22} color="var(--text-dim)" />}
            <span>Auto-Append Signs</span>
          </button>
        </div>
      </div>

      {/* Word Badges Carousel / List */}
      {words.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.45rem',
          marginBottom: '0.85rem',
          maxHeight: '120px',
          overflowY: 'auto',
          padding: '0.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          {words.map((word, index) => (
            <span
              key={index}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.65rem',
                backgroundColor: 'rgba(2, 132, 199, 0.15)',
                border: '1px solid rgba(2, 132, 199, 0.3)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#38bdf8'
              }}
            >
              {word}
            </span>
          ))}
        </div>
      )}

      {/* Editable Sentence Box */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <textarea
          value={sentence}
          onChange={(e) => onUpdateSentence(e.target.value)}
          placeholder="Recognized words will form here automatically, or you can type and edit directly..."
          rows={3}
          style={{
            width: '100%',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-main)',
            fontFamily: 'var(--font-body)',
            fontSize: '1.05rem',
            lineHeight: '1.5',
            resize: 'vertical',
            outline: 'none',
            transition: 'border-color 0.2s ease'
          }}
        />
      </div>

      {/* Action Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
        
        {/* Left Side: Manual Add Current Sign */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => onAddWord(currentLiveSign)}
            disabled={!currentLiveSign}
            title={currentLiveSign ? `Append '${currentLiveSign}' to sentence` : 'No sign currently detected'}
          >
            <Plus size={16} />
            <span>Add Sign {currentLiveSign ? `[ ${currentLiveSign} ]` : ''}</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={onRemoveLastWord}
            disabled={words.length === 0}
            title="Remove last entered word"
          >
            <Delete size={16} />
            <span>Undo Word</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleDeduplicate}
            disabled={words.length < 2}
            title="Delete repeated adjacent words"
            style={{ fontSize: '0.8rem' }}
          >
            <Sparkles size={15} color="#38bdf8" />
            <span>Deduplicate</span>
          </button>
        </div>

        {/* Right Side: Copy & Clear */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={handleCopy}
            disabled={!sentence.trim()}
            title="Copy sentence to clipboard"
          >
            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            className="btn btn-danger"
            onClick={onClear}
            disabled={!sentence.trim()}
            title="Clear entire sentence buffer"
          >
            <Trash2 size={16} />
            <span>Clear</span>
          </button>
        </div>

      </div>
    </div>
  );
}

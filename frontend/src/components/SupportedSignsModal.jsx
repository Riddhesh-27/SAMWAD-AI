import React, { useState } from 'react';
import { X, BookOpen, CheckCircle, Search, Info, Sparkles } from 'lucide-react';

const CONVERSATIONAL_GUIDES = [
  { sign: "YOU", emoji: "👉", title: "YOU (Index Finger Up)", desc: "Extend only your index finger straight up/forward. Keep all other fingers and thumb curled. Point toward the person you are talking to.", example: "YOU NAME WHAT → What is your name?" },
  { sign: "I", emoji: "🙋", title: "I / ME (Pinky Up)", desc: "Raise only your little (pinky) finger straight up. Keep all other fingers and thumb curled down. This is 'me/I' — your pinky pointing to yourself.", example: "I WATER WANT → I would like some water, please." },
  { sign: "WANT", emoji: "🤲", title: "WANT (Cupped Claw Hand)", desc: "Hold hand forward with all 5 fingers curved in a cupped reaching gesture.", example: "I FOOD WANT → I would like some food, please." },
  { sign: "WATER", emoji: "💧", title: "WATER ('W' Three Fingers)", desc: "Extend index, middle, and ring fingers straight up forming a 'W' sign with pinky folded.", example: "I WATER WANT → I would like some water, please." },
  { sign: "FOOD", emoji: "🍽️", title: "FOOD / EAT (Grouped Tips)", desc: "Bunch all 5 fingertips together touching at the thumb tip (feeding mouth pose).", example: "I FOOD WANT → I would like some food, please." },
  { sign: "NAME", emoji: "🏷️", title: "NAME (Parallel Fingers)", desc: "Extend index and middle fingers straight out parallel together, ring & pinky folded.", example: "YOU NAME WHAT → What is your name?" },
  { sign: "THANK YOU", emoji: "🙏", title: "THANK YOU (Flat Hand Forward)", desc: "Hold flat hand with 4 fingers touching together, moving forward from chin.", example: "THANK YOU → Thank you very much." },
  { sign: "HELLO", emoji: "👋", title: "HELLO (Open Wide Palm)", desc: "Extend all 5 fingers open wide facing the camera (open palm wave).", example: "HELLO YOU HOW → Hello! How are you doing today?" },
  { sign: "WELL DONE", emoji: "👍", title: "WELL DONE (Thumbs Up)", desc: "Hold thumb pointing straight up with all 4 fingers clenched into a fist.", example: "WELL DONE → Well done! Excellent work." },
  { sign: "DISAGREE", emoji: "👎", title: "DISAGREE (Thumbs Down)", desc: "Hold thumb pointing straight down with all 4 fingers clenched into a fist.", example: "DISAGREE → I disagree with this." },
  { sign: "STOP", emoji: "✊", title: "STOP (Closed Fist)", desc: "Clench all fingers tightly into a closed fist facing forward.", example: "STOP → Please stop." },
  { sign: "NO", emoji: "❌", title: "NO (Finger Snap)", desc: "Touch thumb tip with index and middle fingertips together with pinky folded.", example: "NO → No, thank you." },
  { sign: "PEACE", emoji: "✌️", title: "PEACE (V Sign)", desc: "Extend index and middle fingers apart in a V, other fingers folded.", example: "PEACE → Peace and warm greetings to you." },
  { sign: "OKAY", emoji: "👌", title: "OKAY (O-Ring)", desc: "Touch thumb and index fingertips in an 'O' with other 3 fingers raised straight.", example: "OKAY → Okay, understood and agreed." },
  { sign: "I LOVE YOU", emoji: "🤟", title: "I LOVE YOU (ILY)", desc: "Extend thumb, index, and pinky fingers while keeping middle and ring fingers curled.", example: "I LOVE YOU → I love you very much." },
  { sign: "CALL ME", emoji: "🤙", title: "CALL ME (Shaka)", desc: "Extend thumb and pinky outward with middle three fingers folded.", example: "CALL ME → Please give me a call." }
];

const SIGN_GUIDES = {
  A: "Closed fist with thumb resting vertically against side of index finger.",
  B: "Open hand with four fingers straight up, thumb folded across palm.",
  C: "Curved hand forming a 'C' arc with all fingers and thumb.",
  D: "Index finger pointing up, thumb touching middle finger to form an 'O'.",
  E: "Fingers curled inward toward palm, thumb tucked underneath.",
  F: "Index finger touches thumb tip forming a circle; other 3 fingers raised.",
  G: "Index finger pointing horizontally forward; thumb parallel.",
  H: "Index and middle fingers extended forward horizontally together.",
  I: "Pinky finger pointing straight up; other fingers folded into fist.",
  J: "Pinky extended, drawing a 'J' curve in the air.",
  K: "Index finger pointing up, middle finger angled forward, thumb between them.",
  L: "Index finger pointing up and thumb extended at 90 degrees forming an 'L'.",
  M: "Thumb tucked under the first three fingers (index, middle, ring).",
  N: "Thumb tucked under the first two fingers (index and middle).",
  O: "All fingers curved and touching thumb to form an 'O' ring.",
  P: "Same as 'K' gesture but tilted downward horizontally.",
  Q: "Same as 'G' gesture with index and thumb pointing downward.",
  R: "Index and middle fingers crossed over each other.",
  S: "Closed fist with thumb folded across the front of fingers.",
  T: "Thumb tucked between index and middle fingers in a fist.",
  U: "Index and middle fingers pointing straight up together.",
  V: "Index and middle fingers extended apart in a 'V' peace sign.",
  W: "Index, middle, and ring fingers extended apart forming a 'W'.",
  X: "Index finger bent like a hook; other fingers folded.",
  Y: "Thumb and pinky fingers extended outward.",
  Z: "Index finger tracing a 'Z' path in the air."
};

export default function SupportedSignsModal({ isOpen, onClose, supportedClasses, modelAccuracy }) {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const alphabetClasses = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const filteredAlphabet = alphabetClasses.filter(c => c.toLowerCase().includes(search.toLowerCase()));
  const filteredConv = CONVERSATIONAL_GUIDES.filter(g => 
    g.sign.toLowerCase().includes(search.toLowerCase()) || 
    g.title.toLowerCase().includes(search.toLowerCase()) ||
    g.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      zIndex: 1000
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '760px',
        maxHeight: '88vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-active)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <BookOpen size={20} color="var(--primary)" />
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Supported Sign Vocabulary (34+ Signs)</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Conversational Hand Gestures + 26 Alphabet Signs (90.3% PyTorch MLP Accuracy)
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

        {/* Search bar */}
        <div style={{ padding: '1rem 1.5rem 0.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sign gesture (e.g. Thumbs Up, Hello, Peace, A-Z)..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Scrollable Container */}
        <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Section 1: Conversational Signs */}
          {filteredConv.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Sparkles size={16} color="var(--accent)" />
                <h4 style={{ fontSize: '0.95rem', color: '#2dd4bf', fontWeight: '700' }}>
                  Conversational Hand Signs (Instant Recognition)
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {filteredConv.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(20, 184, 166, 0.08)',
                      border: '1px solid rgba(20, 184, 166, 0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.4rem' }}>{item.emoji}</span>
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Active</span>
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#f0fdfa' }}>
                      {item.title}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      {item.desc}
                    </p>
                    {item.example && (
                      <div style={{
                        marginTop: '0.25rem',
                        padding: '0.3rem 0.5rem',
                        backgroundColor: 'rgba(56, 189, 248, 0.1)',
                        borderRadius: '4px',
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        fontSize: '0.7rem',
                        color: '#38bdf8',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        💡 {item.example}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Alphabet Fingerspelling (A to Z) */}
          {filteredAlphabet.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.95rem', color: '#38bdf8', fontWeight: '700', marginBottom: '0.75rem' }}>
                Alphabet Fingerspelling Signs (26 Classes)
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.65rem' }}>
                {filteredAlphabet.map((sign) => (
                  <div
                    key={sign}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                        {sign}
                      </span>
                      <span className="badge badge-info" style={{ fontSize: '0.62rem' }}>PyTorch</span>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                      {SIGN_GUIDES[sign]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Note */}
        <div style={{
          padding: '0.85rem 1.5rem',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          fontSize: '0.75rem',
          color: 'var(--text-dim)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Info size={14} color="var(--primary)" />
          <span>Conversational signs append words like 'WELL DONE' or 'HELLO' directly. Grammar Refiner polishes them into natural speech.</span>
        </div>
      </div>
    </div>
  );
}

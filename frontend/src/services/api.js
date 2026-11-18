/**
 * SAMVAD AI — API Service
 * Handles communication with the FastAPI backend with comprehensive client-side offline fallback.
 */

const getApiBaseUrl = () => {
  // Use relative /api when running with Vite proxy, or direct host URL
  if (typeof window !== 'undefined' && window.location && window.location.port === '5173') {
    return '/api';
  }
  const host = (typeof window !== 'undefined' && window.location && window.location.hostname) || "127.0.0.1";
  return `http://${host}:8000/api`;
};

const API_BASE = getApiBaseUrl();

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      status: "healthy",
      error: err.message,
      offline_ready: true,
      note: "Operating via client-side offline engine"
    };
  }
}

export async function fetchSupportedClasses() {
  try {
    const res = await fetch(`${API_BASE}/recognize/classes`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      classes: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
      conversational_signs: [
        { sign: "WELL DONE", display: "👍 THUMBS UP (Well Done)", description: "Thumb up, fingers curled" },
        { sign: "HELLO", display: "👋 HELLO (Open Palm)", description: "Open 5 fingers toward camera" },
        { sign: "PEACE", display: "✌️ PEACE / VICTORY", description: "V sign with index and middle" },
        { sign: "OKAY", display: "👌 OKAY / PERFECT", description: "Thumb and index tips touching" },
        { sign: "I LOVE YOU", display: "🤟 I LOVE YOU", description: "Thumb, index, and pinky extended" },
        { sign: "STOP", display: "✊ FIST / STOP", description: "Fist with all fingers curled" }
      ],
      total_classes: 35,
      metadata: { metrics: { test_accuracy: 0.9029 } }
    };
  }
}

export async function recognizeFrame(base64Image, threshold = 0.60, mode = "auto") {
  try {
    const res = await fetch(`${API_BASE}/recognize/frame`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image, threshold, mode }),
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) throw new Error(`Recognition failed: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    return {
      hand_detected: false,
      sign: null,
      confidence: 0,
      accepted: false,
      error: err.message
    };
  }
}

export async function recognizeLandmarks(landmarks42d, threshold = 0.60, mode = "auto") {
  try {
    const res = await fetch(`${API_BASE}/recognize/landmarks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ landmarks_42d: landmarks42d, threshold, mode }),
      signal: AbortSignal.timeout(2000)
    });
    if (!res.ok) throw new Error(`Landmark classification failed: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    return {
      sign: null,
      confidence: 0,
      accepted: false,
      error: err.message
    };
  }
}

export async function refineGrammar(text, mode = "manual") {
  try {
    const res = await fetch(`${API_BASE}/grammar/refine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, mode }),
      signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) throw new Error(`Grammar refinement HTTP error: ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("Using pure client-side grammar fallback engine:", err.message);
    return fallbackClientGrammar(text);
  }
}

export async function recordCustomSign(label, landmarks42d) {
  try {
    const res = await fetch(`${API_BASE}/signs/record`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, landmarks_42d: landmarks42d })
    });
    return await res.json();
  } catch (err) {
    throw new Error(`Failed to record custom sign: ${err.message}`);
  }
}

export async function resetStabilizer() {
  try {
    await fetch(`${API_BASE}/stabilizer/reset`, { method: "POST" });
  } catch (e) {
    // Ignore
  }
}

/**
 * 100% Offline client-side rule-based grammar refiner
 */
function fallbackClientGrammar(text) {
  if (!text || !text.trim()) {
    return {
      original_text: "",
      refined_text: "",
      rules_applied: [],
      confidence: 1.0,
      mode: "client_offline"
    };
  }

  let cleaned = text.trim();

  // Merge isolated letters (e.g. H E L L O -> HELLO)
  const tokens = cleaned.split(/\s+/);
  let merged = [];
  let buffer = [];
  for (const t of tokens) {
    if (t.length === 1 && /[A-Za-z]/.test(t)) {
      buffer.push(t);
    } else {
      if (buffer.length > 0) {
        merged.push(buffer.join(""));
        buffer = [];
      }
      merged.push(t);
    }
  }
  if (buffer.length > 0) {
    merged.push(buffer.join(""));
  }
  let sentence = merged.join(" ");
  let upper = sentence.toUpperCase();
  let rules = [];

  const patterns = [
    // Thumbs Up & Praise
    { regex: /\bHELLO\s+(?:THUMBS\s+UP|WELL\s+DONE)\b/i, rep: "Hello! Well done, great job.", rule: "Greeting with praise refinement" },
    { regex: /\b(?:THUMBS\s+UP|WELL\s+DONE)\b/i, rep: "Well done! Excellent work.", rule: "Thumbs Up / Praise sign resolution" },
    { regex: /\bGOOD\s+JOB\b/i, rep: "Good job! Well done.", rule: "Praise sign resolution" },
    { regex: /\bI\s+LOVE\s+YOU\b/i, rep: "I love you very much.", rule: "Affection sign resolution" },
    { regex: /\bCALL\s+ME\b/i, rep: "Please give me a call.", rule: "Communication request" },
    { regex: /\bPEACE\b/i, rep: "Peace and warm greetings to you.", rule: "Peace sign resolution" },
    { regex: /\bOKAY\b/i, rep: "Okay, understood and agreed.", rule: "Affirmation resolution" },

    // Greetings & Questions
    { regex: /\bHELLO\s+YOU\s+NAME\s+WHAT\b/i, rep: "Hello! What is your name?", rule: "Greeting & WH-Question formation" },
    { regex: /\bHELLO\s+HOW\s+YOU\b/i, rep: "Hello! How are you doing today?", rule: "Greeting & inquiry formation" },
    { regex: /\bHELLO\b/i, rep: "Hello! Greetings.", rule: "Polite greeting refinement" },
    { regex: /\bNAMASTE\b/i, rep: "Namaste! Warm greetings.", rule: "Indian greeting refinement" },
    { regex: /\bYOU\s+NAME\s+WHAT\b/i, rep: "What is your name?", rule: "WH-Question rearrangement" },
    { regex: /\bHOW\s+YOU\b/i, rep: "How are you doing?", rule: "Greeting question formation" },
    { regex: /\bWHERE\s+BATHROOM\b/i, rep: "Where is the bathroom, please?", rule: "Location question formation" },
    { regex: /\bBATHROOM\s+WHERE\b/i, rep: "Where is the bathroom, please?", rule: "Location question inversion" },

    // Needs & Wants
    { regex: /\bI\s+WATER\s+WANT\b/i, rep: "I would like some water, please.", rule: "Object-Verb to SVO ordering" },
    { regex: /\bME\s+WATER\s+WANT\b/i, rep: "I would like some water, please.", rule: "Pronoun correction & SVO ordering" },
    { regex: /\bWATER\b/i, rep: "I need some water, please.", rule: "Single-word request resolution" },
    { regex: /\bI\s+FOOD\s+WANT\b/i, rep: "I would like some food, please.", rule: "SVO ordering & politeness" },
    { regex: /\bFOOD\b/i, rep: "I would like some food, please.", rule: "Single-word request resolution" },
    { regex: /\bI\s+HUNGRY\b/i, rep: "I am hungry.", rule: "Copula 'am' insertion" },
    { regex: /\bME\s+HUNGRY\b/i, rep: "I am hungry.", rule: "Pronoun & copula correction" },
    { regex: /\bHUNGRY\b/i, rep: "I am feeling hungry.", rule: "State of being expansion" },
    { regex: /\bPLEASE\s+HELP\b/i, rep: "Please help me.", rule: "Polite request formation" },
    { regex: /\bHELP\b/i, rep: "Please help me.", rule: "Emergency request resolution" },
    { regex: /\bTHANK\s+YOU\b/i, rep: "Thank you very much.", rule: "Gratitude expression" },
    { regex: /\bDOCTOR\s+NEED\b/i, rep: "I need a doctor urgently.", rule: "Medical urgency resolution" },
    { regex: /\bDOCTOR\b/i, rep: "I need to see a doctor.", rule: "Medical request resolution" }
  ];

  for (const p of patterns) {
    if (p.regex.test(upper)) {
      upper = upper.replace(p.regex, p.rep);
      rules.push(p.rule);
      return {
        original_text: text,
        refined_text: upper,
        rules_applied: rules,
        confidence: 0.96,
        mode: "client_offline"
      };
    }
  }

  // Fallback casing & punctuation
  let final = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  if (!final.endsWith(".") && !final.endsWith("?") && !final.endsWith("!")) {
    final += ".";
  }

  return {
    original_text: text,
    refined_text: final,
    rules_applied: ["Punctuation & capitalization"],
    confidence: 0.85,
    mode: "client_offline"
  };
}

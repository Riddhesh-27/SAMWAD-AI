/**
 * SAMVAD AI — Speech Synthesis Service
 * Provides offline-capable browser speech synthesis and Android TTS bridge ready.
 */

class SpeechService {
  constructor() {
    this.synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
    this.voices = [];
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.listeners = new Set();

    if (this.synth) {
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  isSupported() {
    return this.synth !== null;
  }

  loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
  }

  getVoices() {
    if (this.voices.length === 0 && this.synth) {
      this.voices = this.synth.getVoices();
    }
    return this.voices;
  }

  getPreferredVoice() {
    const all = this.getVoices();
    if (!all.length) return null;

    // Preference: English (India) -> English (US/UK) -> First available
    const indianVoice = all.find(v => v.lang.includes("en-IN") || v.name.toLowerCase().includes("india"));
    if (indianVoice) return indianVoice;

    const englishVoice = all.find(v => v.lang.startsWith("en-"));
    if (englishVoice) return englishVoice;

    return all[0];
  }

  speak(text, { voice = null, rate = 0.95, pitch = 1.0, onStart = null, onEnd = null, onError = null } = {}) {
    if (!this.isSupported()) {
      if (onError) onError(new Error("Speech synthesis is not supported on this browser or platform."));
      return;
    }

    if (!text || !text.trim()) {
      return;
    }

    // Cancel any ongoing speech
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.voice = voice || this.getPreferredVoice();
    utterance.rate = Math.max(0.5, Math.min(2.0, rate));
    utterance.pitch = Math.max(0.5, Math.min(2.0, pitch));

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.notifyListeners(true);
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.notifyListeners(false);
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.notifyListeners(false);
      console.warn("Speech synthesis event error:", e);
      if (onError) onError(e);
    };

    this.currentUtterance = utterance;
    try {
      this.synth.speak(utterance);
    } catch (err) {
      console.error("Speech synthesis failed:", err);
      if (onError) onError(err);
    }
  }

  stop() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {
        // Ignore
      }
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.notifyListeners(false);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(speaking) {
    for (const cb of this.listeners) {
      try { cb(speaking); } catch (e) {}
    }
  }
}

export const speechService = new SpeechService();

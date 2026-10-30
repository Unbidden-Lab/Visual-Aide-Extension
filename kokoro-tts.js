/**
 * Visual Aide - Kokoro Studio Neural TTS Engine
 * Integrates Kokoro-82M ONNX model client-side via kokoro.js.
 * Provides on-demand download, local cache detection, and audio playback.
 */

const KOKORO_VOICES = {
  'af_heart': { id: 'af_heart', name: 'Heart', gender: 'Female', label: 'af_heart' },
  'af_bella': { id: 'af_bella', name: 'Bella', gender: 'Female', label: 'af_bella' },
  'am_adam': { id: 'am_adam', name: 'Adam', gender: 'Male', label: 'am_adam' },
  'bm_george': { id: 'bm_george', name: 'George', gender: 'Male', label: 'bm_george' }
};

let kokoroTtsInstance = null;
let kokoroModelInitPromise = null;
let currentKokoroAudio = null;
let currentKokoroAudioUrl = null;

/**
 * Check if the given voice ID belongs to the Kokoro Studio engine
 */
function isKokoroVoice(voiceId) {
  return Boolean(voiceId && KOKORO_VOICES[voiceId]);
}

/**
 * Check whether the Kokoro ONNX model weights are already cached locally
 */
async function isKokoroModelCached() {
  try {
    // 1. Check storage flag
    const stored = await new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['kokoro_model_cached'], resolve);
      } else {
        const flag = (typeof localStorage !== 'undefined') ? localStorage.getItem('va_kokoro_model_cached') === 'true' : false;
        resolve({ kokoro_model_cached: flag });
      }
    });

    if (stored && stored.kokoro_model_cached) {
      return true;
    }

    // 2. Check browser Cache Storage for transformers-cache keys
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open('transformers-cache');
        const requests = await cache.keys();
        const hasOnnx = requests.some(r => r.url.includes('Kokoro-82M') || r.url.includes('model_q8.onnx'));
        if (hasOnnx) {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ kokoro_model_cached: true });
          }
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('va_kokoro_model_cached', 'true');
          }
          return true;
        }
      } catch (cacheErr) {
        console.warn('Cache inspection warning:', cacheErr);
      }
    }
  } catch (err) {
    console.warn('isKokoroModelCached error:', err);
  }
  return false;
}

/**
 * Load or initialize the Kokoro TTS engine on-demand with progress tracking
 */
async function loadKokoroModel(progressCallback) {
  if (kokoroTtsInstance) {
    return kokoroTtsInstance;
  }
  if (kokoroModelInitPromise) {
    return kokoroModelInitPromise;
  }

  kokoroModelInitPromise = (async () => {
    // Dynamic import of kokoro.web.js bundle
    const libUrl = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
      ? chrome.runtime.getURL('lib/kokoro.web.js')
      : './lib/kokoro.web.js';

    const { KokoroTTS } = await import(libUrl);

    // Initialize quantized Q8 model as specified
    const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', {
      dtype: 'q8',
      progress_callback: (info) => {
        if (typeof progressCallback === 'function') {
          progressCallback(info);
        }
      }
    });

    kokoroTtsInstance = tts;

    // Mark cached in local storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ kokoro_model_cached: true });
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('va_kokoro_model_cached', 'true');
    }

    return tts;
  })();

  try {
    const result = await kokoroModelInitPromise;
    return result;
  } finally {
    kokoroModelInitPromise = null;
  }
}

/**
 * Return current initialized instance (or null if not loaded yet)
 */
function getKokoroInstance() {
  return kokoroTtsInstance;
}

/**
 * Generate speech audio from text using active Kokoro instance
 */
async function generateKokoroAudio(text, options = {}) {
  const tts = kokoroTtsInstance || (await loadKokoroModel(options.progressCallback));
  const voice = options.voice || 'af_heart';
  const speed = typeof options.speed === 'number' ? options.speed : 1.0;

  const rawAudio = await tts.generate(text, {
    voice,
    speed
  });

  return rawAudio;
}

/**
 * Play text using Kokoro Studio voice with HTML5 Audio element
 */
async function playKokoroAudio(text, options = {}) {
  stopKokoroAudio();

  const rawAudio = await generateKokoroAudio(text, options);
  const blob = rawAudio.toBlob();
  const audioUrl = URL.createObjectURL(blob);

  currentKokoroAudioUrl = audioUrl;
  currentKokoroAudio = new Audio(audioUrl);

  const speed = typeof options.speed === 'number' ? options.speed : 1.0;
  currentKokoroAudio.playbackRate = 1.0; // Speed already baked into Kokoro inference

  currentKokoroAudio.onplay = () => {
    if (typeof options.onStart === 'function') options.onStart();
  };

  currentKokoroAudio.onended = () => {
    cleanupKokoroAudio();
    if (typeof options.onEnd === 'function') options.onEnd();
  };

  currentKokoroAudio.onerror = (e) => {
    cleanupKokoroAudio();
    if (typeof options.onError === 'function') options.onError(e);
  };

  await currentKokoroAudio.play();
  return currentKokoroAudio;
}

/**
 * Pause Kokoro playback
 */
function pauseKokoroAudio() {
  if (currentKokoroAudio && !currentKokoroAudio.paused) {
    currentKokoroAudio.pause();
    return true;
  }
  return false;
}

/**
 * Resume Kokoro playback
 */
function resumeKokoroAudio() {
  if (currentKokoroAudio && currentKokoroAudio.paused) {
    currentKokoroAudio.play();
    return true;
  }
  return false;
}

/**
 * Stop and clean up active Kokoro playback
 */
function stopKokoroAudio() {
  if (currentKokoroAudio) {
    currentKokoroAudio.pause();
    currentKokoroAudio.currentTime = 0;
  }
  cleanupKokoroAudio();
}

function cleanupKokoroAudio() {
  if (currentKokoroAudioUrl) {
    URL.revokeObjectURL(currentKokoroAudioUrl);
    currentKokoroAudioUrl = null;
  }
  currentKokoroAudio = null;
}

function isKokoroAudioPlaying() {
  return Boolean(currentKokoroAudio && !currentKokoroAudio.paused && !currentKokoroAudio.ended);
}

function isKokoroAudioPaused() {
  return Boolean(currentKokoroAudio && currentKokoroAudio.paused && !currentKokoroAudio.ended);
}

// Global exposure for non-module extension scripts
const KokoroEngine = {
  VOICES: KOKORO_VOICES,
  isKokoroVoice,
  isKokoroModelCached,
  loadKokoroModel,
  getKokoroInstance,
  generateKokoroAudio,
  playKokoroAudio,
  pauseKokoroAudio,
  resumeKokoroAudio,
  stopKokoroAudio,
  isKokoroAudioPlaying,
  isKokoroAudioPaused
};

if (typeof window !== 'undefined') {
  window.KokoroEngine = KokoroEngine;
}
if (typeof self !== 'undefined') {
  self.KokoroEngine = KokoroEngine;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KokoroEngine;
}

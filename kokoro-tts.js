/**
 * Visual Aide - Kokoro Studio Neural TTS Engine
 * Integrates Kokoro-82M ONNX model client-side via kokoro.js.
 * Provides on-demand download, local cache detection, background Web Worker generation,
 * and audio playback.
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

let kokoroWorker = null;
let workerMsgId = 0;
const workerCallbacks = new Map();

/**
 * Initialize or retrieve the dedicated Kokoro Web Worker
 */
function getOrCreateWorker() {
  if (kokoroWorker) return kokoroWorker;
  if (typeof Worker === 'undefined') return null;

  try {
    const workerUrl = (typeof chrome !== 'undefined' && chrome.runtime?.getURL)
      ? chrome.runtime.getURL('kokoro-worker.js')
      : './kokoro-worker.js';

    kokoroWorker = new Worker(workerUrl, { type: 'module' });

    kokoroWorker.onmessage = (e) => {
      const { id, type, data, blob, error } = e.data || {};
      const cb = workerCallbacks.get(id);
      if (!cb) return;

      if (type === 'progress') {
        if (typeof cb.onProgress === 'function') {
          cb.onProgress(data);
        }
      } else if (type === 'init_done') {
        workerCallbacks.delete(id);
        cb.resolve(true);
      } else if (type === 'generated') {
        workerCallbacks.delete(id);
        cb.resolve(blob);
      } else if (type === 'error') {
        workerCallbacks.delete(id);
        cb.reject(new Error(error || 'Kokoro worker operation failed'));
      }
    };

    kokoroWorker.onerror = (err) => {
      console.warn('Kokoro Worker error:', err);
    };

    return kokoroWorker;
  } catch (err) {
    console.warn('Could not initialize Kokoro Web Worker, falling back to main thread:', err);
    kokoroWorker = null;
    return null;
  }
}

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

  // 1. Attempt initialization in dedicated worker
  const worker = getOrCreateWorker();
  if (worker) {
    const id = ++workerMsgId;
    await new Promise((resolve, reject) => {
      workerCallbacks.set(id, { resolve, reject, onProgress: progressCallback });
      worker.postMessage({ id, action: 'init' });
    });

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ kokoro_model_cached: true });
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('va_kokoro_model_cached', 'true');
    }
    return { isWorker: true };
  }

  // 2. Fallback to main thread if worker is unavailable
  if (kokoroModelInitPromise) {
    return kokoroModelInitPromise;
  }

  kokoroModelInitPromise = (async () => {
    const libUrl = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
      ? chrome.runtime.getURL('lib/kokoro.web.js')
      : './lib/kokoro.web.js';

    const { KokoroTTS, env } = await import(libUrl);

    const localOrtPath = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
      ? chrome.runtime.getURL('lib/ort/')
      : './lib/ort/';

    if (env) {
      env.wasmPaths = localOrtPath;
      if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
        env.backends.onnx.wasm.wasmPaths = localOrtPath;
        env.backends.onnx.wasm.numThreads = 1;
        env.backends.onnx.wasm.proxy = false;
      }
    }

    const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', {
      dtype: 'q8',
      progress_callback: (info) => {
        if (typeof progressCallback === 'function') {
          progressCallback(info);
        }
      }
    });

    kokoroTtsInstance = tts;

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
 * Generate audio Blob via Web Worker or main-thread fallback
 */
async function generateKokoroAudioBlob(text, options = {}) {
  const worker = getOrCreateWorker();
  if (worker) {
    const id = ++workerMsgId;
    const blob = await new Promise((resolve, reject) => {
      workerCallbacks.set(id, { resolve, reject, onProgress: options.progressCallback });
      worker.postMessage({
        id,
        action: 'generate',
        data: {
          text,
          voice: options.voice || 'af_heart',
          speed: typeof speed === 'number' ? speed : (typeof options.speed === 'number' ? options.speed : 1.0)
        }
      });
    });
    return blob;
  }

  // Fallback to main thread
  const tts = kokoroTtsInstance || (await loadKokoroModel(options.progressCallback));
  const voice = options.voice || 'af_heart';
  const speed = typeof options.speed === 'number' ? options.speed : 1.0;
  const rawAudio = await tts.generate(text, { voice, speed });
  return rawAudio.toBlob();
}

/**
 * Generate speech audio from text
 */
async function generateKokoroAudio(text, options = {}) {
  const blob = await generateKokoroAudioBlob(text, options);
  return {
    toBlob: () => blob,
    blob
  };
}

/**
 * Play text using Kokoro Studio voice with HTML5 Audio element
 */
async function playKokoroAudio(text, options = {}) {
  stopKokoroAudio();

  const blob = await generateKokoroAudioBlob(text, options);
  const audioUrl = URL.createObjectURL(blob);

  currentKokoroAudioUrl = audioUrl;
  currentKokoroAudio = new Audio(audioUrl);
  currentKokoroAudio.playbackRate = 1.0;

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
  generateKokoroAudioBlob,
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

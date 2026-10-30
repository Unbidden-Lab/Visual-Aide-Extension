/**
 * Visual Aide - Kokoro Studio Neural TTS Engine
 * Integrates Kokoro-82M ONNX model client-side via kokoro.js.
 * Provides WebGPU device acceleration with WASM fallback, dedicated Web Worker offloading,
 * sentence chunking streaming queue with proactive background prefetching, and audio playback.
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

let activeStreamingSessionId = 0;
let activeSentenceQueue = [];
let currentSentenceIndex = -1;
let nextSentencePrefetchPromise = null;

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
 * Split text into individual sentences for low-latency streaming
 * Splits by . ! ? and newlines, preserving punctuation and word boundaries
 */
function splitIntoSentences(text) {
  if (!text) return [];

  const clean = text
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'fl')
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, ' ')
    .trim();

  if (!clean) return [];

  const rawSentences = clean.match(/[^.!?\n\r]+[.!?]+|[^.!?\n\r]+/g) || [clean];
  const sentences = [];

  for (let i = 0; i < rawSentences.length; i++) {
    const s = rawSentences[i].replace(/\s+/g, ' ').trim();
    if (s && /[a-zA-Z0-9]/.test(s)) {
      sentences.push(s);
    }
  }

  return sentences;
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
 * Attempts WebGPU device acceleration first, gracefully falling back to WASM CPU runner.
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

    let tts = null;

    // Attempt WebGPU device acceleration
    try {
      tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', {
        dtype: 'q8',
        device: 'webgpu',
        progress_callback: (info) => {
          if (typeof progressCallback === 'function') {
            progressCallback(info);
          }
        }
      });
    } catch (gpuErr) {
      console.warn('Kokoro WebGPU device acceleration unavailable, falling back to WASM:', gpuErr);
      tts = null;
    }

    // Graceful fallback to WASM CPU runner
    if (!tts) {
      tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (info) => {
          if (typeof progressCallback === 'function') {
            progressCallback(info);
          }
        }
      });
    }

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
 * Generate audio Blob for a single text segment via Web Worker or main-thread fallback
 */
async function generateKokoroAudioBlob(text, options = {}) {
  const voice = options.voice || 'af_heart';
  const speed = typeof options.speed === 'number' ? options.speed : 1.0;

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
          voice,
          speed
        }
      });
    });
    return blob;
  }

  // Fallback to main thread
  const tts = kokoroTtsInstance || (await loadKokoroModel(options.progressCallback));
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
 * Play text using streaming sentence queue with proactive background prefetching.
 * 1. Splits input text into individual sentences.
 * 2. Immediately synthesizes sentence 0 and starts audio playback as soon as its buffer resolves (minimizing time-to-first-sound).
 * 3. While sentence N plays, proactively pre-generates sentence N+1 in the worker thread.
 * 4. Transitions seamlessly without audible gaps between sentences.
 */
async function playKokoroAudio(text, options = {}) {
  stopKokoroAudio();

  const sessionId = ++activeStreamingSessionId;
  const sentences = splitIntoSentences(text);

  if (sentences.length === 0) {
    if (typeof options.onEnd === 'function') options.onEnd();
    return null;
  }

  activeSentenceQueue = sentences;
  currentSentenceIndex = 0;

  // 1. Immediately synthesize the first sentence
  let firstBlob;
  try {
    firstBlob = await generateKokoroAudioBlob(sentences[0], options);
  } catch (err) {
    if (sessionId !== activeStreamingSessionId) return null;
    console.error('Failed to synthesize initial sentence:', err);
    if (typeof options.onError === 'function') options.onError(err);
    return null;
  }

  if (sessionId !== activeStreamingSessionId) return null;

  // Helper to proactively launch worker synthesis for sentence index N+1
  function prefetchSentence(index) {
    if (index < activeSentenceQueue.length && sessionId === activeStreamingSessionId) {
      return generateKokoroAudioBlob(activeSentenceQueue[index], options).catch((err) => {
        console.warn(`Prefetch failed for sentence index ${index}:`, err);
        return null;
      });
    }
    return null;
  }

  // 2. While sentence 0 plays, proactively start generating sentence 1 in the background
  nextSentencePrefetchPromise = prefetchSentence(1);

  // 3. Play sentence blob and handle sequential transition
  async function playSentenceBlob(blob, sentenceIndex) {
    if (sessionId !== activeStreamingSessionId || !blob) {
      if (sessionId === activeStreamingSessionId && sentenceIndex < activeSentenceQueue.length - 1) {
        currentSentenceIndex++;
        advanceToNextSentence();
      }
      return;
    }

    cleanupKokoroAudio();

    const audioUrl = URL.createObjectURL(blob);
    currentKokoroAudioUrl = audioUrl;
    currentKokoroAudio = new Audio(audioUrl);
    currentKokoroAudio.playbackRate = 1.0;

    currentKokoroAudio.onplay = () => {
      if (sessionId !== activeStreamingSessionId) return;
      if (sentenceIndex === 0 && typeof options.onStart === 'function') {
        options.onStart();
      }
      if (typeof options.onSentenceStart === 'function') {
        options.onSentenceStart(sentenceIndex, activeSentenceQueue[sentenceIndex]);
      }
    };

    currentKokoroAudio.onended = () => {
      if (sessionId !== activeStreamingSessionId) return;
      currentSentenceIndex++;
      advanceToNextSentence();
    };

    currentKokoroAudio.onerror = (e) => {
      if (sessionId !== activeStreamingSessionId) return;
      console.warn(`Audio error on sentence index ${sentenceIndex}:`, e);
      currentSentenceIndex++;
      advanceToNextSentence();
    };

    try {
      await currentKokoroAudio.play();
    } catch (playErr) {
      if (sessionId !== activeStreamingSessionId) return;
      console.warn('Audio play execution failed:', playErr);
      if (typeof options.onError === 'function') options.onError(playErr);
    }
  }

  async function advanceToNextSentence() {
    if (sessionId !== activeStreamingSessionId) return;

    if (currentSentenceIndex >= activeSentenceQueue.length) {
      cleanupKokoroAudio();
      activeSentenceQueue = [];
      nextSentencePrefetchPromise = null;
      if (typeof options.onEnd === 'function') options.onEnd();
      return;
    }

    const nextIndex = currentSentenceIndex;
    let nextBlob = null;

    if (nextSentencePrefetchPromise) {
      try {
        nextBlob = await nextSentencePrefetchPromise;
      } catch (err) {
        console.warn('Prefetch await failed:', err);
      }
    }

    if (sessionId !== activeStreamingSessionId) return;

    // Fallback if prefetch failed or was null
    if (!nextBlob) {
      try {
        nextBlob = await generateKokoroAudioBlob(activeSentenceQueue[nextIndex], options);
      } catch (genErr) {
        console.warn(`On-demand synthesis failed for sentence ${nextIndex}:`, genErr);
      }
    }

    if (sessionId !== activeStreamingSessionId) return;

    // While sentence N plays, proactively prefetch sentence N+1
    nextSentencePrefetchPromise = prefetchSentence(nextIndex + 1);

    await playSentenceBlob(nextBlob, nextIndex);
  }

  await playSentenceBlob(firstBlob, 0);
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
 * Stop and clean up active Kokoro playback and cancel background streaming queue
 */
function stopKokoroAudio() {
  activeStreamingSessionId++;
  if (currentKokoroAudio) {
    currentKokoroAudio.pause();
    currentKokoroAudio.currentTime = 0;
  }
  cleanupKokoroAudio();
  activeSentenceQueue = [];
  currentSentenceIndex = -1;
  nextSentencePrefetchPromise = null;
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
  splitIntoSentences,
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

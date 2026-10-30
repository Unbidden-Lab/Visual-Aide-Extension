/**
 * Visual Aide - Kokoro TTS Dedicated Web Worker
 * Offloads Kokoro-82M ONNX model loading and audio synthesis from the main UI thread
 * to prevent browser tab freezing during speech generation.
 */

import { KokoroTTS, env } from './lib/kokoro.web.js';

let ttsInstance = null;
let initPromise = null;

// Determine base extension directory for WASM artifacts
const localOrtPath = (typeof chrome !== 'undefined' && chrome.runtime?.getURL)
  ? chrome.runtime.getURL('lib/ort/')
  : ((typeof self !== 'undefined' && self.location?.origin?.startsWith('chrome-extension://'))
      ? self.location.origin + '/lib/ort/'
      : './lib/ort/');

if (env) {
  env.wasmPaths = localOrtPath;
  if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.wasmPaths = localOrtPath;
    env.backends.onnx.wasm.numThreads = 1;
    env.backends.onnx.wasm.proxy = false;
  }
}

/**
 * Initialize Kokoro model instance inside worker thread
 * Attempts WebGPU device acceleration first, gracefully falling back to WASM CPU runner.
 */
async function getOrInitTts(progressCallback) {
  if (ttsInstance) return ttsInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let tts = null;

    // 1. Attempt WebGPU device acceleration
    try {
      console.log('Attempting Kokoro model initialization with WebGPU acceleration...');
      tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', {
        dtype: 'q8',
        device: 'webgpu',
        progress_callback: (info) => {
          if (typeof progressCallback === 'function') {
            progressCallback(info);
          }
        }
      });
      console.log('Kokoro WebGPU device initialized successfully.');
    } catch (gpuErr) {
      console.warn('Kokoro WebGPU device acceleration unavailable, falling back to WASM:', gpuErr);
      tts = null;
    }

    // 2. Graceful fallback to WASM CPU runner
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
      console.log('Kokoro WASM CPU runner initialized successfully.');
    }

    ttsInstance = tts;
    return tts;
  })();

  try {
    return await initPromise;
  } finally {
    initPromise = null;
  }
}

self.onmessage = async (e) => {
  const { id, action, data } = e.data || {};

  if (action === 'init') {
    try {
      await getOrInitTts((info) => {
        self.postMessage({ id, type: 'progress', data: info });
      });
      self.postMessage({ id, type: 'init_done' });
    } catch (err) {
      self.postMessage({ id, type: 'error', error: err.message || String(err) });
    }
    return;
  }

  if (action === 'generate') {
    try {
      const { text, voice, speed } = data || {};
      const tts = await getOrInitTts();
      const rawAudio = await tts.generate(text, {
        voice: voice || 'af_heart',
        speed: typeof speed === 'number' ? speed : 1.0
      });

      const blob = rawAudio.toBlob();
      self.postMessage({
        id,
        type: 'generated',
        blob
      });
    } catch (err) {
      self.postMessage({ id, type: 'error', error: err.message || String(err) });
    }
    return;
  }
};

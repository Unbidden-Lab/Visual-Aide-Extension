/**
 * Visual Aide - Kokoro TTS Dedicated Web Worker
 * Offloads Kokoro-82M ONNX model loading and audio synthesis from the main UI thread.
 * Supports a two-tier acceleration architecture:
 * - Universal / Lightweight Mode: Strictly CPU WebAssembly (wasm) with 8-bit quantized weights (q8, ~85 MB)
 * - Turbo Mode: WebGPU with full 32-bit floating-point precision (fp32, ~330 MB)
 */

import { KokoroTTS, env } from './lib/kokoro.web.js';

let currentTtsInstance = null;
let currentTier = null; // 'wasm' or 'webgpu'
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
 * Initialize or switch the Kokoro model instance based on requested engine tier
 */
async function getOrInitTts(tier = 'wasm', progressCallback) {
  const targetTier = tier === 'webgpu' ? 'webgpu' : 'wasm';

  if (currentTtsInstance && currentTier === targetTier) {
    return currentTtsInstance;
  }
  if (initPromise && currentTier === targetTier) {
    return initPromise;
  }

  initPromise = (async () => {
    let tts = null;

    // 1. Turbo Mode: WebGPU with full 32-bit floating point precision
    if (targetTier === 'webgpu') {
      try {
        console.log('Initializing Kokoro Turbo Mode (WebGPU / fp32)...');
        tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', {
          dtype: 'fp32',
          device: 'webgpu',
          progress_callback: (info) => {
            if (typeof progressCallback === 'function') progressCallback(info);
          }
        });
        console.log('Kokoro Turbo Mode (WebGPU / fp32) initialized successfully.');
        currentTier = 'webgpu';
      } catch (gpuErr) {
        console.warn('WebGPU Turbo Mode unavailable or failed, falling back to Lightweight WASM:', gpuErr);
        tts = null;
      }
    }

    // 2. Universal / Lightweight Mode: CPU WebAssembly with 8-bit quantized weights
    if (!tts) {
      console.log('Initializing Kokoro Lightweight Mode (WASM / q8)...');
      tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (info) => {
          if (typeof progressCallback === 'function') progressCallback(info);
        }
      });
      console.log('Kokoro Lightweight Mode (WASM / q8) initialized successfully.');
      currentTier = 'wasm';
    }

    currentTtsInstance = tts;
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
    const { tier } = data || {};
    try {
      await getOrInitTts(tier, (info) => {
        self.postMessage({ id, type: 'progress', data: info });
      });
      self.postMessage({ id, type: 'init_done', tier: currentTier });
    } catch (err) {
      self.postMessage({ id, type: 'error', error: err.message || String(err) });
    }
    return;
  }

  if (action === 'generate') {
    try {
      const { text, voice, speed, tier } = data || {};
      const tts = await getOrInitTts(tier);
      const rawAudio = await tts.generate(text, {
        voice: voice || 'af_heart',
        speed: typeof speed === 'number' ? speed : 1.0
      });

      const blob = rawAudio.toBlob();
      self.postMessage({
        id,
        type: 'generated',
        blob,
        tier: currentTier
      });
    } catch (err) {
      self.postMessage({ id, type: 'error', error: err.message || String(err) });
    }
    return;
  }
};

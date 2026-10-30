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

        let adapter = null;
        if (typeof navigator !== 'undefined' && navigator.gpu) {
          try {
            adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
            if (adapter && env?.backends?.onnx) {
              if (!env.backends.onnx.webgpu) env.backends.onnx.webgpu = {};
              env.backends.onnx.webgpu.adapter = adapter;
              env.backends.onnx.webgpu.powerPreference = 'high-performance';
            }
          } catch (adapterErr) {
            console.warn('Could not query high-performance GPU adapter:', adapterErr);
          }
        }

        tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', {
          dtype: 'fp32',
          device: 'webgpu',
          progress_callback: (info) => {
            if (typeof progressCallback === 'function') progressCallback(info);
          }
        });

        // Obtain active WebGPU device (allocated with forwarded limits)
        const activeDevice = env?.backends?.onnx?.webgpu?.device;
        if (activeDevice) {
          if (!globalThis.ort) globalThis.ort = {};
          if (!globalThis.ort.env) globalThis.ort.env = {};
          if (!globalThis.ort.env.webgpu) globalThis.ort.env.webgpu = {};
          globalThis.ort.env.webgpu.device = activeDevice;
          if (adapter) globalThis.ort.env.webgpu.adapter = adapter;

          // Runtime driver crash recovery (device.lost listener)
          activeDevice.lost.then(async (info) => {
            console.warn('WebGPU device lost (driver reset/TDR):', info.message, 'Reason:', info.reason);
            if (info.reason !== 'destroyed') {
              currentTtsInstance = null;
              initPromise = null;
              currentTier = 'wasm';

              try {
                console.log('Recovering from GPU crash: switching Kokoro to Lightweight WASM mode...');
                await getOrInitTts('wasm');
              } catch (recErr) {
                console.error('WASM recovery failed:', recErr);
              }

              self.postMessage({
                type: 'device_lost',
                reason: info.reason,
                message: info.message || 'GPU driver reset / TDR crash',
                fallbackTier: 'wasm'
              });
            }
          });
        }

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
      let tts = null;
      try {
        tts = await getOrInitTts(tier);
      } catch (initErr) {
        if (tier === 'webgpu') {
          console.warn('WebGPU init failed during generate, recovering to WASM:', initErr);
          tts = await getOrInitTts('wasm');
        } else {
          throw initErr;
        }
      }

      let rawAudio;
      try {
        rawAudio = await tts.generate(text, {
          voice: voice || 'af_heart',
          speed: typeof speed === 'number' ? speed : 1.0
        });
      } catch (genErr) {
        if (currentTier === 'webgpu') {
          console.warn('WebGPU generation crashed (driver reset/TDR), falling back to WASM:', genErr);
          currentTtsInstance = null;
          initPromise = null;
          tts = await getOrInitTts('wasm');
          rawAudio = await tts.generate(text, {
            voice: voice || 'af_heart',
            speed: typeof speed === 'number' ? speed : 1.0
          });
        } else {
          throw genErr;
        }
      }

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

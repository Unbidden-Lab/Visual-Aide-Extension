/**
 * Visual Aide - Kokoro Studio Neural TTS Engine
 * Integrates Kokoro-82M ONNX model client-side via kokoro.js.
 * Implements a two-tier acceleration architecture:
 * - Universal / Lightweight Mode (CPU / ~85 MB): WebAssembly runner with 8-bit quantized weights (q8).
 * - Turbo Mode (GPU / ~330 MB): WebGPU acceleration with full 32-bit floating-point weights (fp32).
 * Includes sentence chunking streaming queue with proactive background prefetching.
 */

const KOKORO_VOICES = {
  'af_heart': { id: 'af_heart', name: 'Heart', gender: 'Female', label: 'af_heart' },
  'af_bella': { id: 'af_bella', name: 'Bella', gender: 'Female', label: 'af_bella' },
  'am_adam': { id: 'am_adam', name: 'Adam', gender: 'Male', label: 'am_adam' },
  'bm_george': { id: 'bm_george', name: 'George', gender: 'Male', label: 'bm_george' }
};

let kokoroTtsInstance = null;
let currentLoadedTier = null;
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
      const { id, type, data, blob, error, tier } = e.data || {};

      if (type === 'device_lost') {
        console.warn('Received WebGPU device_lost notification from worker, falling back to WASM:', data || '');
        currentLoadedTier = 'wasm';
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
          chrome.storage.sync.set({ ttsEngineTier: 'wasm' });
        }
        return;
      }

      const cb = workerCallbacks.get(id);
      if (!cb) return;

      if (type === 'progress') {
        if (typeof cb.onProgress === 'function') {
          cb.onProgress(data);
        }
      } else if (type === 'init_done') {
        workerCallbacks.delete(id);
        cb.resolve({ ok: true, tier });
      } else if (type === 'generated') {
        workerCallbacks.delete(id);
        cb.resolve(blob);
      } else if (type === 'error') {
        workerCallbacks.delete(id);
        cb.reject(new Error(error || 'Kokoro worker operation failed'));
      }
    };

    kokoroWorker.onerror = (err) => {
      const errMsg = err?.message || err?.error?.message || 'Worker initialization or runtime error';
      const file = err?.filename || '';
      const line = err?.lineno || '';
      console.warn('Kokoro Worker error:', errMsg, file ? `at ${file}:${line}` : err);

      for (const [id, cb] of workerCallbacks.entries()) {
        workerCallbacks.delete(id);
        cb.reject(new Error(`Kokoro worker failure: ${errMsg}`));
      }
    };

    return kokoroWorker;
  } catch (err) {
    console.warn('Could not initialize Kokoro Web Worker, falling back to main thread:', err);
    kokoroWorker = null;
    return null;
  }
}

/**
 * Query active WebGL renderer string for deep GPU hardware identification
 */
function getWebGLRendererString() {
  try {
    const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (!canvas) return '';
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return '';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return '';
    return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
  } catch (_) {
    return '';
  }
}

/**
 * Classify GPU hardware as discrete (dGPU), integrated (iGPU), software, or unknown.
 * Accurately differentiates AMD RDNA 2/3 discrete cards from RDNA 2/3 integrated APUs,
 * as well as Intel Arc discrete cards from Intel Iris/UHD/Core Ultra integrated GPUs.
 *
 * @param {string} rawText - Combined WebGPU info and WebGL renderer string
 * @param {GPUAdapter|null} adapter - WebGPU adapter object
 * @returns {{ isIntegrated: boolean, isDiscrete: boolean, isSoftware: boolean, type: string }}
 */
function classifyGpuHardware(rawText, adapter = null) {
  if (adapter?.isFallbackAdapter) {
    return { isIntegrated: true, isDiscrete: false, isSoftware: true, type: 'Software Renderer' };
  }

  const str = String(rawText || '')
    .toLowerCase()
    .replace(/\((?:r|tm)\)/gi, ' ')
    .replace(/\s+/g, ' ');

  // 1. Software / Fallback renderers
  if (/\b(swiftshader|llvmpipe|lavapipe|basic\s*render\s*driver|software\s*rasterizer|warp)\b/i.test(str)) {
    return { isIntegrated: true, isDiscrete: false, isSoftware: true, type: 'Software Renderer' };
  }

  // 2. Qualcomm / ARM Adreno (Integrated mobile/SoC)
  if (/\b(adreno|snapdragon|qualcomm)\b/i.test(str)) {
    return { isIntegrated: true, isDiscrete: false, isSoftware: false, type: 'Integrated GPU' };
  }

  // 3. Apple Silicon (Integrated SoC)
  if (/\b(apple\s*m\d+|apple\s*gpu)\b/i.test(str)) {
    return { isIntegrated: true, isDiscrete: false, isSoftware: false, type: 'Integrated SoC' };
  }

  // 4. NVIDIA: Desktop and laptop NVIDIA GeForce/RTX/Quadro/Titan cards are discrete dGPUs
  if (/\b(geforce|rtx|gtx|quadro|titan|tesla|nvidia)\b/i.test(str)) {
    return { isIntegrated: false, isDiscrete: true, isSoftware: false, type: 'Dedicated GPU' };
  }

  // 5. AMD GPUs: Distinguish discrete Radeon cards from integrated RDNA 2/3/3.5 APUs
  const isAmd = /\b(amd|radeon|ati|advanced\s+micro\s+devices)\b/i.test(str);
  if (isAmd) {
    // Dedicated AMD identifiers:
    // - RX series: RX 7900, RX 7800 XT, RX 6700 XT, RX 6800M, RX 7600S, RX 580, RX 5500, etc.
    // - Radeon Pro W / WX / VII: Pro W7900, Pro W6800, Pro WX 8200
    // - Radeon VII, Vega 56, Vega 64, Fury
    // - R9 / R7 discrete desktop cards
    const isDedicatedAmd = (
      /\brx\s*\d{3,4}[a-z]*\b/i.test(str) ||
      /\bpro\s+(w\d{4}|wx\s*\d{4}|vii)\b/i.test(str) ||
      /\b(radeon\s+vii|vega\s*56|vega\s*64|fury)\b/i.test(str) ||
      /\br9\s+[a-z]?\d{3}[a-z]*\b/i.test(str)
    );

    if (isDedicatedAmd) {
      return { isIntegrated: false, isDiscrete: true, isSoftware: false, type: 'Dedicated GPU' };
    }

    // Integrated AMD APU identifiers:
    // - RDNA 2/3/3.5 mobile APU models: 890m, 880m, 780m, 760m, 740m, 680m, 660m, 610m
    // - Vega APU: Vega 3, Vega 6, Vega 7, Vega 8, Vega 9, Vega 10, Vega 11
    // - Generic Windows / DirectX string: "AMD Radeon Graphics" / "AMD Radeon(TM) Graphics"
    // - APU codenames or "APU" designation
    const isIntegratedAmd = (
      /\b(890m|880m|780m|760m|740m|680m|660m|610m)\b/i.test(str) ||
      /\bvega\s*(?:[1-9]|10|11)\b/i.test(str) ||
      /\bradeon\s*(?:graphics)?\b/i.test(str) ||
      /\b(apu|picasso|renoir|lucienne|cezanne|barcelo|rembrandt|phoenix|hawk\s*point|strix\s*point|mendocino)\b/i.test(str)
    );

    if (isIntegratedAmd) {
      return { isIntegrated: true, isDiscrete: false, isSoftware: false, type: 'Integrated GPU' };
    }

    // If architecture is rdna-2/rdna-3/gfx10/gfx11 without RX branding, classify as Integrated GPU
    if (/\b(rdna|gfx\d+)\b/i.test(str)) {
      return { isIntegrated: true, isDiscrete: false, isSoftware: false, type: 'Integrated GPU' };
    }

    // Fallback for AMD without dedicated indicators
    return { isIntegrated: true, isDiscrete: false, isSoftware: false, type: 'Integrated GPU' };
  }

  // 6. Intel GPUs: Distinguish discrete Arc cards from integrated UHD/Iris/Meteor Lake Arc
  const isIntel = /\b(intel)\b/i.test(str);
  if (isIntel) {
    // Dedicated Intel Arc A-series / B-series / Pro / Iris Xe MAX / DG1
    const isDedicatedIntel = (
      /\barc\s+(a[3-7]\d{2}[a-z]*|b[5-7]\d{2}[a-z]*|pro\s+a\d{2}[a-z]*)\b/i.test(str) ||
      /\b(iris\s*xe\s*max|dg1)\b/i.test(str)
    );

    if (isDedicatedIntel) {
      return { isIntegrated: false, isDiscrete: true, isSoftware: false, type: 'Dedicated GPU' };
    }

    // Integrated Intel:
    // - UHD Graphics / HD Graphics
    // - Iris / Iris Plus / Iris Xe (without MAX)
    // - Meteor Lake / Core Ultra integrated Arc: "Intel Arc Graphics" (without A/B/Pro model number)
    const isIntegratedIntel = (
      /\b(uhd|hd)\s+graphics\b/i.test(str) ||
      /\biris\s*(?:plus)?(?:\s*xe)?\s*graphics\b/i.test(str) ||
      /\biris\b/i.test(str) ||
      /\barc\s*graphics\b/i.test(str) ||
      /\b(core\s+ultra|alder\s*lake|raptor\s*lake|meteor\s*lake|lunar\s*lake|arrow\s*lake)\b/i.test(str)
    );

    if (isIntegratedIntel) {
      return { isIntegrated: true, isDiscrete: false, isSoftware: false, type: 'Integrated GPU' };
    }

    // Fallback for Intel without dedicated indicators
    return { isIntegrated: true, isDiscrete: false, isSoftware: false, type: 'Integrated GPU' };
  }

  // Fallback if unidentified
  return { isIntegrated: false, isDiscrete: false, isSoftware: false, type: 'Unknown GPU' };
}

/**
 * Extract clean display name from WebGPU description or WebGL ANGLE string
 */
function extractCleanGpuName(rawDescription, webGlString) {
  if (rawDescription && rawDescription !== 'Generic GPU' && rawDescription.length > 3) {
    return rawDescription;
  }
  if (webGlString) {
    const angleMatch = webGlString.match(/ANGLE\s*\([^,]+,\s*(.+?)(?:\s+(?:Direct3D\d*|Vulkan\d*|OpenGL\d*|vs_\d|ps_\d)|\s*,\s*(?:D3D|driver|\d))/i);
    if (angleMatch && angleMatch[1]) {
      return angleMatch[1].trim();
    }
    return webGlString;
  }
  return 'Active GPU';
}

/**
 * Check if WebGPU is supported and available on this device/browser
 * @param {number} minStorageBufferSize - Minimum required buffer binding size (e.g. 268435456 for 256MB)
 * @param {boolean} requireDedicated - Require discrete GPU (gate out integrated graphics)
 */
async function isWebGpuSupported(minStorageBufferSize = 0, requireDedicated = true) {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    return false;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) return false;
    if (adapter.isFallbackAdapter) return false;
    if (minStorageBufferSize > 0) {
      const size = adapter.limits?.maxStorageBufferBindingSize || 0;
      if (size < minStorageBufferSize) return false;
    }
    if (requireDedicated) {
      let adapterDesc = '';
      if (adapter.info) {
        adapterDesc = `${adapter.info.vendor || ''} ${adapter.info.architecture || ''} ${adapter.info.device || ''} ${adapter.info.description || ''}`;
      } else if (typeof adapter.requestAdapterInfo === 'function') {
        const info = await adapter.requestAdapterInfo();
        adapterDesc = `${info.vendor || ''} ${info.architecture || ''} ${info.device || ''} ${info.description || ''}`;
      }
      const webGlStr = getWebGLRendererString();
      const classification = classifyGpuHardware(`${adapterDesc} ${webGlStr}`, adapter);
      if (classification.isIntegrated || classification.isSoftware) {
        return false;
      }
    }
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Query active GPU adapter information and memory limits
 */
async function getGpuDeviceInfo() {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    return {
      supported: false,
      chipName: 'None (WebGPU unsupported)',
      cleanName: 'None',
      maxStorageBuffer: 0,
      meetsRequirements: false,
      isIntegrated: false,
      isDiscrete: false,
      isSoftware: false,
      gpuType: 'Unsupported'
    };
  }
  try {
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) {
      return {
        supported: false,
        chipName: 'None (No GPU adapter)',
        cleanName: 'None',
        maxStorageBuffer: 0,
        meetsRequirements: false,
        isIntegrated: false,
        isDiscrete: false,
        isSoftware: false,
        gpuType: 'None'
      };
    }

    let rawAdapterInfo = '';
    let adapterDescription = '';
    if (adapter.info) {
      adapterDescription = adapter.info.description || adapter.info.device || adapter.info.architecture || adapter.info.vendor || '';
      rawAdapterInfo = `${adapter.info.vendor || ''} ${adapter.info.architecture || ''} ${adapter.info.device || ''} ${adapter.info.description || ''}`;
    } else if (typeof adapter.requestAdapterInfo === 'function') {
      const info = await adapter.requestAdapterInfo();
      adapterDescription = info.description || info.device || info.architecture || info.vendor || '';
      rawAdapterInfo = `${info.vendor || ''} ${info.architecture || ''} ${info.device || ''} ${info.description || ''}`;
    }

    const webGlRenderer = getWebGLRendererString();
    const combinedGpuString = `${rawAdapterInfo} ${webGlRenderer}`.trim();
    const classification = classifyGpuHardware(combinedGpuString, adapter);
    const cleanName = extractCleanGpuName(adapterDescription, webGlRenderer);

    let formattedChipName = cleanName;
    if (classification.type && classification.type !== 'Unknown GPU') {
      formattedChipName = `${cleanName} (${classification.type})`;
    }

    const maxStorageBuffer = adapter.limits?.maxStorageBufferBindingSize || 0;
    const meetsRequirements = Boolean(maxStorageBuffer >= 268435456 && !classification.isIntegrated && !classification.isSoftware);

    return {
      supported: true,
      chipName: formattedChipName,
      cleanName,
      rawString: combinedGpuString,
      maxStorageBuffer,
      meetsRequirements,
      isIntegrated: classification.isIntegrated,
      isDiscrete: classification.isDiscrete,
      isSoftware: classification.isSoftware,
      gpuType: classification.type,
      adapter
    };
  } catch (e) {
    return {
      supported: false,
      chipName: 'Error detecting GPU',
      cleanName: 'Error',
      maxStorageBuffer: 0,
      meetsRequirements: false,
      isIntegrated: false,
      isDiscrete: false,
      isSoftware: false,
      gpuType: 'Error'
    };
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
 * Check whether the Kokoro ONNX model weights for the requested tier are already cached locally
 * @param {string} tier - 'wasm' (Lightweight / q8) or 'webgpu' (Turbo / fp32)
 */
async function isKokoroModelCached(tier = 'wasm') {
  const isWebGpu = tier === 'webgpu';
  const storageKey = isWebGpu ? 'kokoro_model_cached_webgpu' : 'kokoro_model_cached_wasm';

  try {
    // 1. Check storage flag
    const stored = await new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([storageKey, 'kokoro_model_cached'], resolve);
      } else {
        const flag = (typeof localStorage !== 'undefined') ? localStorage.getItem('va_' + storageKey) === 'true' : false;
        resolve({ [storageKey]: flag });
      }
    });

    if (stored && (stored[storageKey] || (!isWebGpu && stored.kokoro_model_cached))) {
      return true;
    }

    // 2. Check browser Cache Storage for transformers-cache keys
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open('transformers-cache');
        const requests = await cache.keys();
        const hasMatch = requests.some(r => {
          if (!r.url.includes('Kokoro-82M')) return false;
          if (isWebGpu) {
            return r.url.includes('model.onnx') && !r.url.includes('model_q8.onnx');
          } else {
            return r.url.includes('model_q8.onnx');
          }
        });

        if (hasMatch) {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ [storageKey]: true });
          }
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('va_' + storageKey, 'true');
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
 * Load or initialize the Kokoro TTS engine on-demand for the requested tier
 * @param {Function} progressCallback - Download progress tracker
 * @param {string} tier - 'wasm' (Lightweight / q8) or 'webgpu' (Turbo / fp32)
 */
async function loadKokoroModel(progressCallback, tier = 'wasm') {
  const targetTier = tier === 'webgpu' ? 'webgpu' : 'wasm';
  const storageKey = targetTier === 'webgpu' ? 'kokoro_model_cached_webgpu' : 'kokoro_model_cached_wasm';

  if (kokoroTtsInstance && currentLoadedTier === targetTier) {
    return kokoroTtsInstance;
  }

  // 1. Attempt initialization in dedicated worker
  const worker = getOrCreateWorker();
  if (worker) {
    const id = ++workerMsgId;
    await new Promise((resolve, reject) => {
      workerCallbacks.set(id, { resolve, reject, onProgress: progressCallback });
      worker.postMessage({ id, action: 'init', data: { tier: targetTier } });
    });

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [storageKey]: true, kokoro_model_cached: true });
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('va_' + storageKey, 'true');
      localStorage.setItem('va_kokoro_model_cached', 'true');
    }
    currentLoadedTier = targetTier;
    return { isWorker: true, tier: targetTier };
  }

  // 2. Fallback to main thread if worker is unavailable
  if (kokoroModelInitPromise && currentLoadedTier === targetTier) {
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

    // Turbo Mode: WebGPU with full 32-bit floating-point weights
    if (targetTier === 'webgpu') {
      try {
        console.log('Loading Kokoro Turbo Mode (WebGPU / fp32)...');

        let adapter = null;
        if (typeof navigator !== 'undefined' && navigator.gpu) {
          try {
            if (env?.backends?.onnx) {
              if (!env.backends.onnx.webgpu) env.backends.onnx.webgpu = {};
              try {
                env.backends.onnx.webgpu.powerPreference = 'high-performance';
              } catch (_) {}

              const existingAdapter = env.backends.onnx.webgpu.adapter;
              if (existingAdapter && typeof existingAdapter.requestDevice === 'function') {
                adapter = existingAdapter;
              }
            }

            if (!adapter) {
              adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
              if (adapter && env?.backends?.onnx?.webgpu) {
                try {
                  const desc = Object.getOwnPropertyDescriptor(env.backends.onnx.webgpu, 'adapter');
                  if (!desc || desc.writable) {
                    env.backends.onnx.webgpu.adapter = adapter;
                  }
                } catch (_) {}
              }
            }
          } catch (adapterErr) {
            console.warn('Failed to query high-performance GPU adapter:', adapterErr);
          }
        }

        tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', {
          dtype: 'fp32',
          device: 'webgpu',
          progress_callback: (info) => {
            if (typeof progressCallback === 'function') progressCallback(info);
          }
        });

        const activeDevice = env?.backends?.onnx?.webgpu?.device;
        if (activeDevice) {
          if (!globalThis.ort) globalThis.ort = {};
          if (!globalThis.ort.env) globalThis.ort.env = {};
          if (!globalThis.ort.env.webgpu) globalThis.ort.env.webgpu = {};
          try {
            const devDesc = Object.getOwnPropertyDescriptor(globalThis.ort.env.webgpu, 'device');
            if (!devDesc || devDesc.writable) {
              globalThis.ort.env.webgpu.device = activeDevice;
            }
          } catch (_) {}

          try {
            const adDesc = Object.getOwnPropertyDescriptor(globalThis.ort.env.webgpu, 'adapter');
            if (adapter && (!adDesc || adDesc.writable)) {
              globalThis.ort.env.webgpu.adapter = adapter;
            }
          } catch (_) {}

          activeDevice.lost.then(async (info) => {
            console.warn('Main thread WebGPU device lost (driver reset/TDR):', info.message, 'Reason:', info.reason);
            if (info.reason !== 'destroyed') {
              kokoroTtsInstance = null;
              kokoroModelInitPromise = null;
              currentLoadedTier = 'wasm';
              if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                chrome.storage.sync.set({ ttsEngineTier: 'wasm' });
              }
            }
          });
        }

        currentLoadedTier = 'webgpu';
      } catch (gpuErr) {
        console.warn('WebGPU Turbo Mode failed, falling back to Lightweight WASM:', gpuErr);
        tts = null;
      }
    }

    // Universal / Lightweight Mode: CPU WebAssembly with 8-bit quantized weights
    if (!tts) {
      console.log('Loading Kokoro Lightweight Mode (WASM / q8)...');
      tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (info) => {
          if (typeof progressCallback === 'function') progressCallback(info);
        }
      });
      currentLoadedTier = 'wasm';
    }

    kokoroTtsInstance = tts;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [storageKey]: true, kokoro_model_cached: true });
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('va_' + storageKey, 'true');
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
  const tier = options.tier === 'webgpu' ? 'webgpu' : 'wasm';

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
          speed,
          tier
        }
      });
    });
    return blob;
  }

  // Fallback to main thread
  const tts = (kokoroTtsInstance && currentLoadedTier === tier)
    ? kokoroTtsInstance
    : (await loadKokoroModel(options.progressCallback, tier));
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
  isWebGpuSupported,
  getGpuDeviceInfo,
  classifyGpuHardware,
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

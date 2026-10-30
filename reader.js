/**
 * Visual Aide - Accessible PDF Reader Controller
 * Complete offline & online support for reading downloaded documents and PDFs.
 */

// Configure PDF.js Worker to local bundled worker with bulletproof main-thread fallback
if (typeof pdfjsLib !== 'undefined') {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js');
    } catch (e) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
    }
  } else {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
  }

  // Pre-wire main thread fallback to eliminate worker IPC hang/CSP failure
  if (typeof window !== 'undefined' && window.pdfjsWorker && pdfjsLib.PDFWorker) {
    pdfjsLib.PDFWorker._mainThreadWorkerMessageHandler = window.pdfjsWorker.WorkerMessageHandler;
  }
}

const SAMPLE_TEXT = `
# Understanding Dyslexia & Neurodivergent Reading

Dyslexia is a neurobiological learning difference that primarily affects the skills involved in accurate and fluent word reading and spelling. It is estimated that 10% to 20% of the global population exhibits symptoms of dyslexia.

## The Role of Visual Interventions

When reading conventional print, individuals with dyslexia or Meares-Irlen syndrome often experience visual distortions. Words may appear to vibrate, blur, bunch together, or swim across the page. This pattern glare creates cognitive fatigue and diminishes reading comprehension.

### Key Accommodations
1. Specialized Typefaces: Heavy-bottomed letterforms, such as OpenDyslexic, provide visual gravity that helps anchor letters in place and prevent rotations like b, d, p, and q.
2. Custom Letter & Word Tracking: Widening the distance between letters and words eliminates visual crowding and maintains clear word boundaries.
3. Expanded Leading (Line Height): Increasing vertical distance between lines prevents ascenders and descenders from overlapping.
4. Glare Tint & Irlen Overlays: Neutralizing stark black-on-white contrast with soothing cream, peach, or mint tones reduces visual stress and headaches.
5. Saccadic Bionic Anchoring: Bolding the leading characters of words guides eye fixations smoothly across sentences.

Double-click on any word (such as *aberration*, *alleviate*, *ambiguous*, *comprehensive*, *pervasive*, *meticulous*, *ubiquitous*) to test the instant Simplified Dictionary!
`;

const DEFAULT_READER_SETTINGS = {
  font: 'Lexend',
  fontSize: 18,
  tracking: 0,
  spacing: 0,
  leading: 1.6,
  fontColor: 'default',
  customFontColor: '#111111',
  contrast: 'default',
  customBgColor: '#fbf0d9',
  bionic: false,
  ruler: false,
  ttsVoice: 'female',
  ttsSpeed: 1.0,
  ttsEngineTier: 'wasm',
  paperSize: 'letter',
  customPaperWidth: 8.5,
  customPaperHeight: 11
};

let currentReaderSettings = { ...DEFAULT_READER_SETTINGS };
let previousReaderVoice = 'female';
let previousReaderTier = 'wasm';

// -------------------------------------------------------------
// Natural Neural Voice Matcher (Aria for Female, Guy for Male)
// -------------------------------------------------------------
function getResolvedVoice(voices, gender = 'female') {
  if (!voices || voices.length === 0) return null;
  const isFemale = (gender || 'female').toLowerCase() === 'female';

  const femalePriority = [
    // 1. Aria neural natural (Edge / Windows / Azure)
    v => /\baria\b/i.test(v.name),
    // 2. Jenny or other natural female voices
    v => /\b(jenny|michelle|ana|sonia|libby)\b/i.test(v.name),
    // 3. Online/Natural female
    v => /(natural|online)/i.test(v.name) && /(female|woman)/i.test(v.name),
    // 4. Known female system voices
    v => /(zira|samantha|victoria|karen|susan|hazel|heera|moira|tessa)/i.test(v.name),
    // 5. Explicit female label
    v => /female/i.test(v.name),
    // 6. English voice that is not explicitly male
    v => v.lang.startsWith('en') && !/(guy|david|mark|george|christopher|alex|daniel|fred|richard|james|eric|roger|ryan|steffan|oliver|ravi|\bmale\b|\bman\b)/i.test(v.name),
    // 7. Any English voice
    v => v.lang.startsWith('en'),
    // 8. Any voice
    () => true
  ];

  const malePriority = [
    // 1. Guy neural natural (Edge / Windows / Azure)
    v => /\bguy\b/i.test(v.name),
    // 2. Christopher, Eric, Roger or other natural male voices
    v => /\b(christopher|eric|roger|ryan|steffan)\b/i.test(v.name),
    // 3. Online/Natural male
    v => /(natural|online)/i.test(v.name) && /(?<!fe)male|\bman\b/i.test(v.name),
    // 4. Known male system voices
    v => /(david|mark|george|alex|daniel|fred|richard|james|oliver|ravi)/i.test(v.name),
    // 5. Explicit male label (not female)
    v => /(?<!fe)male|\bman\b/i.test(v.name),
    // 6. English voice that is not explicitly female
    v => v.lang.startsWith('en') && !/(aria|jenny|michelle|ana|sonia|libby|zira|samantha|victoria|karen|susan|hazel|heera|moira|tessa|female|woman)/i.test(v.name),
    // 7. Any English voice
    v => v.lang.startsWith('en'),
    // 8. Any voice
    () => true
  ];

  const matchers = isFemale ? femalePriority : malePriority;
  for (const matcher of matchers) {
    const found = voices.find(matcher);
    if (found) return found;
  }
  return voices[0];
}

// -------------------------------------------------------------
// Asynchronous Voice Resolver & Neural Pre-warming
// Fixes Chromium first-read robotic voice bug by ensuring voices
// (specifically online natural neural voices) are fully loaded
// before the initial SpeechSynthesisUtterance is spoken.
// -------------------------------------------------------------
let cachedVoices = [];
let voicesInitialized = false;

function getVoicesAsync(maxWaitMs = 800) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([]);
      return;
    }

    const immediate = window.speechSynthesis.getVoices();
    if (immediate && immediate.length > 0) {
      cachedVoices = immediate;
      const hasNatural = immediate.some(v => /(natural|online|neural)/i.test(v.name));
      if (hasNatural || voicesInitialized) {
        voicesInitialized = true;
        resolve(immediate);
        return;
      }
    }

    let settled = false;
    let timer = null;
    let pollInterval = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (pollInterval) clearInterval(pollInterval);
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
    };

    const finish = (result) => {
      if (settled) return;
      settled = true;
      voicesInitialized = true;
      cleanup();
      if (result && result.length > 0) cachedVoices = result;
      resolve(cachedVoices.length > 0 ? cachedVoices : (window.speechSynthesis.getVoices() || []));
    };

    const onVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        const nowHasNatural = v.some(voice => /(natural|online|neural)/i.test(voice.name));
        if (nowHasNatural || !immediate || immediate.length === 0) {
          finish(v);
        }
      }
    };

    window.speechSynthesis.addEventListener('voiceschanged', onVoices);

    let elapsed = 0;
    pollInterval = setInterval(() => {
      elapsed += 40;
      const v = window.speechSynthesis.getVoices();
      if (v && v.some(voice => /(natural|online|neural)/i.test(voice.name))) {
        finish(v);
      } else if (elapsed >= maxWaitMs) {
        finish(v && v.length > 0 ? v : immediate);
      }
    }, 40);

    timer = setTimeout(() => {
      const v = window.speechSynthesis.getVoices();
      finish(v && v.length > 0 ? v : immediate);
    }, maxWaitMs);

    window.speechSynthesis.getVoices();
  });
}

// Proactive background warm-up
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    const v = window.speechSynthesis.getVoices();
    if (v && v.length > 0) {
      cachedVoices = v;
      if (v.some(voice => /(natural|online|neural)/i.test(voice.name))) {
        voicesInitialized = true;
      }
    }
  });
  const initVoices = window.speechSynthesis.getVoices();
  if (initVoices && initVoices.length > 0) {
    cachedVoices = initVoices;
    if (initVoices.some(voice => /(natural|online|neural)/i.test(voice.name))) {
      voicesInitialized = true;
    }
  }
}

let currentPdfDocument = null;
let currentLoadedPages = [];
let currentReaderPageIndex = 1;
let currentTotalPages = 1;
let currentDocumentTitle = 'Document';
let ttsUtterance = null;
let readerLastFocusedEl = null;

function showReaderLoading(message) {
  const overlay = document.getElementById('reader-loading-overlay');
  const msgEl = document.getElementById('reader-loading-msg');
  if (msgEl && message) msgEl.textContent = message;
  if (overlay) overlay.classList.remove('hidden');
}

function hideReaderLoading() {
  const overlay = document.getElementById('reader-loading-overlay');
  if (overlay) overlay.classList.add('hidden');
}

// Throttled mouse tracking state
let readerRulerRafId = null;
let readerLastMouseY = 0;

// Chunked TTS playback state
let readerTtsQueue = [];
let readerTtsIndex = 0;
let readerTtsTimer = null;
let readerChunkStartTime = 0;
const activeReaderUtterances = new Set();

document.addEventListener('DOMContentLoaded', () => {
  getVoicesAsync();
  initNetworkStatus();
  initSettingsSync();
  initToolbarControls();
  initDropZone();
  initReaderInteractions();
  initDictionarySearch();
  initReaderTooltips();
});

// -------------------------------------------------------------
// Network Status (Online / Offline Mode)
// -------------------------------------------------------------
function initNetworkStatus() {
  const badge = document.getElementById('network-status');
  const text = document.getElementById('network-text');

  function update() {
    if (navigator.onLine) {
      badge.className = 'status-badge online';
      text.textContent = 'Online Mode';
      badge.title = 'Online: Full web services & extended online dictionary active.';
    } else {
      badge.className = 'status-badge offline';
      text.textContent = 'Offline Mode';
      badge.title = 'Offline: Using local offline fonts, PDF parser & dictionary cache.';
    }
  }

  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

// -------------------------------------------------------------
// Settings Initialization & Isolated Reader Persistence
// -------------------------------------------------------------
function initSettingsSync() {
  const applyStoredSettings = (s) => {
    if (!s) return;
    if (s.font) currentReaderSettings.font = s.font;
    if (s.readerFontSize !== undefined || s.fontSize !== undefined) {
      const parsedSize = parseInt(s.readerFontSize || s.fontSize, 10);
      if (!isNaN(parsedSize) && parsedSize >= 12 && parsedSize <= 48) {
        currentReaderSettings.fontSize = parsedSize;
      }
    }
    if (s.tracking !== undefined) currentReaderSettings.tracking = s.tracking;
    if (s.spacing !== undefined) currentReaderSettings.spacing = s.spacing;
    if (s.leading !== undefined) currentReaderSettings.leading = s.leading;
    if (s.fontColor) currentReaderSettings.fontColor = s.fontColor;
    if (s.customFontColor) currentReaderSettings.customFontColor = s.customFontColor;
    if (s.contrastMode) currentReaderSettings.contrast = s.contrastMode;
    if (s.contrast) currentReaderSettings.contrast = s.contrast;
    if (s.customBgColor) currentReaderSettings.customBgColor = s.customBgColor;
    if (s.bionic !== undefined) currentReaderSettings.bionic = s.bionic;
    if (s.ruler !== undefined) currentReaderSettings.ruler = s.ruler;
    if (s.ttsVoice) currentReaderSettings.ttsVoice = s.ttsVoice;
    if (s.ttsSpeed !== undefined && s.ttsSpeed !== null) currentReaderSettings.ttsSpeed = parseFloat(s.ttsSpeed);
    if (s.ttsEngineTier) currentReaderSettings.ttsEngineTier = s.ttsEngineTier;
    if (s.paperSize) currentReaderSettings.paperSize = s.paperSize;
    if (s.customPaperWidth !== undefined) currentReaderSettings.customPaperWidth = parseFloat(s.customPaperWidth) || 8.5;
    if (s.customPaperHeight !== undefined) currentReaderSettings.customPaperHeight = parseFloat(s.customPaperHeight) || 11;

    previousReaderTier = currentReaderSettings.ttsEngineTier || 'wasm';
    previousReaderVoice = currentReaderSettings.ttsVoice || 'female';
    updateReaderNeuralTierVisibility(currentReaderSettings.ttsVoice);
    checkReaderGpuAdmission();
    applyAllReaderStyles();
    updateToolbarUI();
  };

  // Immediate local cache retrieval (persists across sessions locally via localStorage)
  try {
    const localReader = localStorage.getItem('va_reader_settings');
    if (localReader) {
      applyStoredSettings(JSON.parse(localReader));
    }
  } catch (e) {}

  // Asynchronous chrome.storage.local retrieval (strictly isolated from va_settings)
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['va_reader_settings'], (result) => {
      if (result.va_reader_settings) {
        applyStoredSettings(result.va_reader_settings);
      }
    });

    if (chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.va_reader_settings && changes.va_reader_settings.newValue) {
          applyStoredSettings(changes.va_reader_settings.newValue);
        }
      });
    }
  } else {
    applyAllReaderStyles();
    updateToolbarUI();
  }
}

function saveReaderSettings() {
  // Persist locally across sessions via localStorage
  try {
    localStorage.setItem('va_reader_settings', JSON.stringify(currentReaderSettings));
  } catch (e) {}

  // Persist locally across sessions via chrome.storage.local (isolated key)
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({
      va_reader_settings: currentReaderSettings
    });
  }
}

// -------------------------------------------------------------
// Toolbar Controls Wiring
// -------------------------------------------------------------
function initToolbarControls() {
  const fontSelect = document.getElementById('reader-font');
  const fontSizeVal = document.getElementById('font-size-val');
  const fontDecBtn = document.getElementById('font-decrease-btn');
  const fontIncBtn = document.getElementById('font-increase-btn');
  const trackingSlider = document.getElementById('reader-tracking');
  const trackingVal = document.getElementById('reader-tracking-val');
  const spacingSlider = document.getElementById('reader-spacing');
  const spacingVal = document.getElementById('reader-spacing-val');
  const leadingSlider = document.getElementById('reader-leading');
  const leadingVal = document.getElementById('reader-leading-val');
  const fontColorSelect = document.getElementById('reader-font-color');
  const contrastSelect = document.getElementById('reader-contrast');
  const bionicToggle = document.getElementById('reader-bionic-toggle');
  const rulerToggle = document.getElementById('reader-ruler-toggle');

  // Font
  fontSelect.addEventListener('change', (e) => {
    currentReaderSettings.font = e.target.value;
    applyAllReaderStyles();
    saveReaderSettings();
  });

  // Font Size
  fontDecBtn.addEventListener('click', () => {
    currentReaderSettings.fontSize = Math.max(12, currentReaderSettings.fontSize - 2);
    fontSizeVal.textContent = `${currentReaderSettings.fontSize}px`;
    applyAllReaderStyles();
    saveReaderSettings();
  });
  fontIncBtn.addEventListener('click', () => {
    currentReaderSettings.fontSize = Math.min(36, currentReaderSettings.fontSize + 2);
    fontSizeVal.textContent = `${currentReaderSettings.fontSize}px`;
    applyAllReaderStyles();
    saveReaderSettings();
  });

  // Tracking
  trackingSlider.addEventListener('input', (e) => {
    currentReaderSettings.tracking = parseFloat(e.target.value);
    trackingVal.textContent = `${currentReaderSettings.tracking}px`;
    applyAllReaderStyles();
  });
  trackingSlider.addEventListener('change', () => {
    saveReaderSettings();
  });

  // Spacing
  spacingSlider.addEventListener('input', (e) => {
    currentReaderSettings.spacing = parseFloat(e.target.value);
    spacingVal.textContent = `${currentReaderSettings.spacing}px`;
    applyAllReaderStyles();
  });
  spacingSlider.addEventListener('change', () => {
    saveReaderSettings();
  });

  // Leading
  leadingSlider.addEventListener('input', (e) => {
    currentReaderSettings.leading = parseFloat(e.target.value);
    leadingVal.textContent = `${currentReaderSettings.leading}x`;
    applyAllReaderStyles();
  });
  leadingSlider.addEventListener('change', () => {
    saveReaderSettings();
  });

  // Font Color
  fontColorSelect.addEventListener('change', (e) => {
    currentReaderSettings.fontColor = e.target.value;
    applyAllReaderStyles();
    saveReaderSettings();
  });

  // Irlen Contrast Mode
  contrastSelect.addEventListener('change', (e) => {
    currentReaderSettings.contrast = e.target.value;
    applyAllReaderStyles();
    saveReaderSettings();
  });

  // Bionic
  bionicToggle.addEventListener('change', (e) => {
    currentReaderSettings.bionic = e.target.checked;
    reRenderActiveDocument();
    saveReaderSettings();
  });

  // Ruler
  rulerToggle.addEventListener('change', (e) => {
    currentReaderSettings.ruler = e.target.checked;
    updateReaderRuler(currentReaderSettings.ruler);
    saveReaderSettings();
  });

  // Paper Size & Print Dimensions Setup
  const paperSizeSelect = document.getElementById('reader-paper-size');
  const customPaperGroupEl = document.getElementById('reader-custom-paper-group');
  const customWidthInput = document.getElementById('reader-custom-paper-width');
  const customHeightInput = document.getElementById('reader-custom-paper-height');

  if (paperSizeSelect) {
    paperSizeSelect.addEventListener('change', (e) => {
      const chosen = e.target.value;
      currentReaderSettings.paperSize = chosen;
      if (customPaperGroupEl) {
        const isCustom = chosen === 'custom';
        customPaperGroupEl.style.display = isCustom ? 'flex' : 'none';
        customPaperGroupEl.classList.toggle('hidden', !isCustom);
      }
      preparePrintStylesheet();
      saveReaderSettings();
    });
  }

  if (customWidthInput) {
    customWidthInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val > 0) {
        currentReaderSettings.customPaperWidth = val;
        preparePrintStylesheet();
        saveReaderSettings();
      }
    });
  }

  if (customHeightInput) {
    customHeightInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val > 0) {
        currentReaderSettings.customPaperHeight = val;
        preparePrintStylesheet();
        saveReaderSettings();
      }
    });
  }

  // Print Document Handler with Dynamic Paper Size & Multi-Page Support
  const printBtn = document.getElementById('print-btn');
  if (printBtn) {
    printBtn.addEventListener('click', async () => {
      preparePrintStylesheet();
      const isMultiPage = currentPdfDocument && currentTotalPages > 1;
      if (isMultiPage) {
        showReaderLoading('Preparing document pages for printing...');
        await ensureAllPagesLoaded();
        hideReaderLoading();
        renderAllPagesForPrint();
      }
      window.print();
      if (isMultiPage) {
        restoreAfterPrint();
      }
    });
  }

  window.addEventListener('beforeprint', async () => {
    preparePrintStylesheet();
    if (currentPdfDocument && currentTotalPages > 1) {
      await ensureAllPagesLoaded();
      renderAllPagesForPrint();
    }
  });

  window.addEventListener('afterprint', () => {
    restoreAfterPrint();
  });

  // Open file button in header
  document.getElementById('upload-nav-btn').addEventListener('click', () => {
    document.getElementById('file-input').click();
  });

  // TTS buttons
  document.getElementById('reader-tts-play').addEventListener('click', handleTtsPlay);
  document.getElementById('reader-tts-stop').addEventListener('click', handleTtsStop);

  // TTS Voice selector & Kokoro Studio Modal
  const voiceSelect = document.getElementById('reader-tts-voice');
  previousReaderVoice = currentReaderSettings.ttsVoice || 'female';
  previousReaderTier = currentReaderSettings.ttsEngineTier || 'wasm';

  const readerKokoroModal = document.getElementById('reader-kokoro-modal');
  const readerKokoroDesc = document.getElementById('reader-kokoro-desc');
  const readerKokoroProgressContainer = document.getElementById('reader-kokoro-progress-container');
  const readerKokoroProgressFill = document.getElementById('reader-kokoro-progress-fill');
  const readerKokoroProgressText = document.getElementById('reader-kokoro-progress-text');
  const readerKokoroActions = document.getElementById('reader-kokoro-actions');
  const readerKokoroConfirmBtn = document.getElementById('reader-kokoro-confirm-btn');
  const readerKokoroCancelBtn = document.getElementById('reader-kokoro-cancel-btn');
  const readerKokoroBackdrop = document.getElementById('reader-kokoro-backdrop');

  let pendingReaderKokoroVoice = null;
  let pendingReaderKokoroTier = null;

  function showReaderKokoroModal(targetVoice) {
    pendingReaderKokoroVoice = targetVoice;
    pendingReaderKokoroTier = null;
    const isTurbo = (currentReaderSettings.ttsEngineTier === 'webgpu');
    const modalTitle = document.getElementById('reader-kokoro-title');
    if (modalTitle) {
      modalTitle.textContent = isTurbo
        ? 'Kokoro Studio Turbo Mode (GPU / ~330 MB)'
        : 'Kokoro Studio Neural Voice';
    }
    if (readerKokoroDesc) {
      readerKokoroDesc.textContent = isTurbo
        ? 'Download Kokoro Studio Voice Turbo Mode (~330 MB)? Uses full 32-bit precision on your GPU for instant generation.'
        : 'Download Kokoro Studio Voice (~85 MB)? Runs 100% locally and offline on your device.';
    }
    if (readerKokoroModal) readerKokoroModal.classList.remove('hidden');
    if (readerKokoroActions) readerKokoroActions.classList.remove('hidden');
    if (readerKokoroProgressContainer) readerKokoroProgressContainer.classList.add('hidden');
    if (readerKokoroProgressFill) readerKokoroProgressFill.style.width = '0%';
  }

  function showReaderKokoroModalForTier(targetTier) {
    pendingReaderKokoroTier = targetTier;
    pendingReaderKokoroVoice = null;
    const isTurbo = (targetTier === 'webgpu');
    const modalTitle = document.getElementById('reader-kokoro-title');
    if (modalTitle) {
      modalTitle.textContent = isTurbo
        ? 'Kokoro Studio Turbo Mode (GPU / ~330 MB)'
        : 'Kokoro Studio Lightweight Mode (CPU / ~85 MB)';
    }
    if (readerKokoroDesc) {
      readerKokoroDesc.textContent = isTurbo
        ? 'Download Kokoro Studio Voice Turbo Mode (~330 MB)? Uses full 32-bit floating-point weights on your GPU for near-instant generation.'
        : 'Download Kokoro Studio Voice Lightweight Mode (~85 MB)? Runs 100% locally on your CPU with 8-bit quantized weights.';
    }
    if (readerKokoroModal) readerKokoroModal.classList.remove('hidden');
    if (readerKokoroActions) readerKokoroActions.classList.remove('hidden');
    if (readerKokoroProgressContainer) readerKokoroProgressContainer.classList.add('hidden');
    if (readerKokoroProgressFill) readerKokoroProgressFill.style.width = '0%';
  }

  function hideReaderKokoroModal() {
    if (readerKokoroModal) readerKokoroModal.classList.add('hidden');
    pendingReaderKokoroVoice = null;
    pendingReaderKokoroTier = null;
  }

  if (readerKokoroCancelBtn) {
    readerKokoroCancelBtn.addEventListener('click', () => {
      if (pendingReaderKokoroTier && readerTierSelect) {
        readerTierSelect.value = previousReaderTier;
      }
      if (pendingReaderKokoroVoice && voiceSelect) {
        voiceSelect.value = previousReaderVoice;
      }
      hideReaderKokoroModal();
    });
  }

  if (readerKokoroBackdrop) {
    readerKokoroBackdrop.addEventListener('click', () => {
      if (pendingReaderKokoroTier && readerTierSelect) {
        readerTierSelect.value = previousReaderTier;
      }
      if (pendingReaderKokoroVoice && voiceSelect) {
        voiceSelect.value = previousReaderVoice;
      }
      hideReaderKokoroModal();
    });
  }

  if (readerKokoroConfirmBtn) {
    readerKokoroConfirmBtn.addEventListener('click', async () => {
      if (readerKokoroActions) readerKokoroActions.classList.add('hidden');
      if (readerKokoroProgressContainer) readerKokoroProgressContainer.classList.remove('hidden');
      if (readerKokoroProgressText) readerKokoroProgressText.textContent = 'Connecting to model repository...';

      const tierToDownload = pendingReaderKokoroTier || currentReaderSettings.ttsEngineTier || 'wasm';

      try {
        await loadKokoroModel((info) => {
          if (!info) return;
          let pct = 0;
          if (typeof info.progress === 'number') {
            pct = Math.min(100, Math.max(0, Math.round(info.progress)));
          } else if (info.loaded && info.total) {
            pct = Math.min(100, Math.max(0, Math.round((info.loaded / info.total) * 100)));
          }

          if (readerKokoroProgressFill) {
            readerKokoroProgressFill.style.width = `${pct}%`;
          }

          if (readerKokoroProgressText) {
            if (info.status === 'initiate') {
              readerKokoroProgressText.textContent = 'Connecting to model repository...';
            } else if (info.status === 'progress' || info.status === 'download') {
              readerKokoroProgressText.textContent = `Downloading Kokoro Studio Model... ${pct}%`;
            } else if (info.status === 'done') {
              readerKokoroProgressText.textContent = 'Model download complete. Initializing engine...';
            } else if (info.status === 'ready') {
              readerKokoroProgressText.textContent = 'Kokoro Studio Ready!';
            }
          }
        }, tierToDownload);

        if (readerKokoroProgressFill) readerKokoroProgressFill.style.width = '100%';
        if (readerKokoroProgressText) readerKokoroProgressText.textContent = 'Kokoro Studio Ready! Engine reinitialized.';

        if (pendingReaderKokoroTier) {
          currentReaderSettings.ttsEngineTier = pendingReaderKokoroTier;
          previousReaderTier = pendingReaderKokoroTier;
          if (readerTierSelect) readerTierSelect.value = pendingReaderKokoroTier;
          saveReaderSettings();
        }

        if (pendingReaderKokoroVoice) {
          const chosenVoice = pendingReaderKokoroVoice || 'af_heart';
          currentReaderSettings.ttsVoice = chosenVoice;
          previousReaderVoice = chosenVoice;
          if (voiceSelect) voiceSelect.value = chosenVoice;
          saveReaderSettings();
        }

        try {
          await loadKokoroModel(null, currentReaderSettings.ttsEngineTier || 'wasm');
        } catch (_) {}

        setTimeout(() => {
          hideReaderKokoroModal();
        }, 1200);
      } catch (err) {
        console.error('Reader Kokoro download error:', err);
        if (readerKokoroProgressText) {
          readerKokoroProgressText.textContent = 'Download failed. Please check internet connection.';
        }
        setTimeout(() => {
          if (pendingReaderKokoroTier && readerTierSelect) {
            readerTierSelect.value = previousReaderTier;
          }
          if (pendingReaderKokoroVoice && voiceSelect) {
            voiceSelect.value = previousReaderVoice;
          }
          hideReaderKokoroModal();
        }, 2200);
      }
    });
  }

  if (voiceSelect) {
    voiceSelect.addEventListener('change', async (e) => {
      const chosen = e.target.value;
      updateReaderNeuralTierVisibility(chosen);

      if (isKokoroVoice(chosen)) {
        const cached = await isKokoroModelCached(currentReaderSettings.ttsEngineTier || 'wasm');
        if (!cached) {
          showReaderKokoroModal(chosen);
          return;
        }
      }

      currentReaderSettings.ttsVoice = chosen;
      previousReaderVoice = chosen;
      saveReaderSettings();
    });
  }

  // TTS Speed selector
  const speedSelect = document.getElementById('reader-tts-speed');
  if (speedSelect) {
    speedSelect.addEventListener('change', (e) => {
      currentReaderSettings.ttsSpeed = parseFloat(e.target.value) || 1.0;
      saveReaderSettings();
    });
  }

  // TTS Engine Tier selector (Universal WASM vs Turbo WebGPU)
  const readerTierSelect = document.getElementById('reader-tts-engine-tier');
  if (readerTierSelect) {
    readerTierSelect.addEventListener('change', async (e) => {
      const chosenTier = e.target.value;
      if (chosenTier === 'webgpu') {
        const supported = await isWebGpuSupported(268435456);
        if (!supported) {
          alert('WebGPU Turbo Mode requires at least 256 MB buffer binding support on your graphics hardware. Reverting to Lightweight Mode (CPU).');
          readerTierSelect.value = 'wasm';
          currentReaderSettings.ttsEngineTier = 'wasm';
          previousReaderTier = 'wasm';
          saveReaderSettings();
          return;
        }

        const cached = await isKokoroModelCached('webgpu');
        if (!cached) {
          showReaderKokoroModalForTier('webgpu');
          return;
        }

        currentReaderSettings.ttsEngineTier = 'webgpu';
        previousReaderTier = 'webgpu';
        saveReaderSettings();
        try { await loadKokoroModel(null, 'webgpu'); } catch (_) {}
        return;
      }

      if (chosenTier === 'wasm') {
        const cached = await isKokoroModelCached('wasm');
        if (!cached) {
          showReaderKokoroModalForTier('wasm');
          return;
        }

        currentReaderSettings.ttsEngineTier = 'wasm';
        previousReaderTier = 'wasm';
        saveReaderSettings();
        try { await loadKokoroModel(null, 'wasm'); } catch (_) {}
        return;
      }
    });
  }

  // Multi-page navigation (Improvement 2)
  const prevBtn = document.getElementById('reader-page-prev');
  if (prevBtn) prevBtn.addEventListener('click', goToPreviousPage);
  const nextBtn = document.getElementById('reader-page-next');
  if (nextBtn) nextBtn.addEventListener('click', goToNextPage);
}

function updateReaderNeuralTierVisibility(voiceId) {
  const isKokoro = typeof isKokoroVoice === 'function'
    ? isKokoroVoice(voiceId || currentReaderSettings.ttsVoice)
    : false;
  const tierGroup = document.getElementById('reader-tts-engine-tier-group');
  const tierSelect = document.getElementById('reader-tts-engine-tier');
  if (!tierGroup || !tierSelect) return;

  if (isKokoro) {
    tierGroup.classList.remove('tier-disabled');
    tierSelect.disabled = false;
    tierSelect.removeAttribute('aria-disabled');
  } else {
    tierGroup.classList.add('tier-disabled');
    tierSelect.disabled = true;
    tierSelect.setAttribute('aria-disabled', 'true');
  }
}

async function checkReaderGpuAdmission() {
  let isSupported = false;
  let meetsRequirements = false;
  try {
    if (typeof KokoroEngine !== 'undefined' && typeof KokoroEngine.getGpuDeviceInfo === 'function') {
      const info = await KokoroEngine.getGpuDeviceInfo();
      isSupported = info.supported;
      meetsRequirements = info.meetsRequirements;
    } else if (typeof navigator !== 'undefined' && navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (adapter) {
        isSupported = true;
        const maxStorage = adapter.limits?.maxStorageBufferBindingSize || 0;
        meetsRequirements = (maxStorage >= 268435456);
      }
    }
  } catch (_) {}

  const tierSelect = document.getElementById('reader-tts-engine-tier');
  const turboOption = tierSelect?.querySelector('option[value="webgpu"]');
  if (turboOption) {
    if (!isSupported || !meetsRequirements) {
      turboOption.disabled = true;
      turboOption.textContent = 'Turbo (GPU / ~330 MB) (Unsupported Hardware)';
      if (currentReaderSettings.ttsEngineTier === 'webgpu') {
        currentReaderSettings.ttsEngineTier = 'wasm';
        previousReaderTier = 'wasm';
        if (tierSelect) tierSelect.value = 'wasm';
        saveReaderSettings();
      }
    } else {
      turboOption.disabled = false;
      turboOption.textContent = 'Turbo (GPU / ~330 MB)';
    }
  }
}

// -------------------------------------------------------------
// Dynamic Paper Dimensions & Print Formatting Helpers
// -------------------------------------------------------------
const PAPER_PRESETS = {
  letter: { name: 'Standard Letter', size: '8.5in 11in', widthIn: 8.5, heightIn: 11 },
  a4: { name: 'A4', size: '210mm 297mm', widthIn: 8.27, heightIn: 11.69 },
  folio: { name: 'Philippine Long / Folio', size: '8.5in 13in', widthIn: 8.5, heightIn: 13 },
  legal: { name: 'US Legal', size: '8.5in 14in', widthIn: 8.5, heightIn: 14 }
};

function getPrintPageSize() {
  const presetKey = currentReaderSettings.paperSize || 'letter';
  if (presetKey === 'custom') {
    const w = parseFloat(currentReaderSettings.customPaperWidth) || 8.5;
    const h = parseFloat(currentReaderSettings.customPaperHeight) || 11;
    return `${w}in ${h}in`;
  }
  return PAPER_PRESETS[presetKey]?.size || '8.5in 11in';
}

function preparePrintStylesheet() {
  let styleEl = document.getElementById('va-reader-print-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'va-reader-print-style';
    styleEl.setAttribute('media', 'print');
    document.head.appendChild(styleEl);
  }

  const pageSize = getPrintPageSize();

  styleEl.textContent = `
    @page {
      size: ${pageSize};
      margin: 0.5in;
    }

    /* Hide all UI chrome, toolbars, settings drawers, and audio playback widgets */
    header,
    .reader-header,
    .header-top,
    .toolbar-scroll,
    .accommodation-bar,
    .tool-group,
    .tool-item,
    .reader-ruler-el,
    .dict-modal,
    .reader-tooltip,
    .reader-kokoro-modal,
    .reader-loading-overlay,
    .upload-hero,
    .reader-pagination-bar,
    .tts-player,
    .page-nav,
    .dict-search-box,
    #va-action-badge,
    #va-dict-modal,
    #reader-page-nav,
    #dict-modal,
    #reader-ruler,
    #reader-tooltip,
    #reader-kokoro-modal,
    #upload-hero,
    #print-btn,
    #upload-nav-btn {
      display: none !important;
      visibility: hidden !important;
    }

    /* Force document text container and page canvas to 100% visible overflow with clean white background and black text */
    html,
    body,
    body.va-reader-body {
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: auto !important;
      min-height: 100% !important;
      overflow: visible !important;
    }

    .reader-container {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      overflow: visible !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
    }

    .reader-document {
      display: block !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      overflow: visible !important;
    }

    .reader-document * {
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
      background: transparent !important;
      background-color: transparent !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }

    .reader-page {
      display: block !important;
      background: #ffffff !important;
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
      width: 100% !important;
      max-width: 100% !important;
      overflow: visible !important;
      page-break-after: always;
      break-after: page;
      margin: 0 0 24px 0 !important;
      padding: 0 !important;
    }

    .reader-page:last-child {
      page-break-after: auto;
      break-after: auto;
      margin-bottom: 0 !important;
    }

    .page-header-tag {
      display: block !important;
      color: #555555 !important;
      -webkit-text-fill-color: #555555 !important;
      font-size: 0.75rem !important;
      border-bottom: 1px solid #cccccc !important;
      margin-bottom: 16px !important;
      padding-bottom: 4px !important;
    }

    .reader-document p {
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
      line-height: var(--leading, 1.5) !important;
      letter-spacing: var(--tracking, 0px) !important;
      word-spacing: var(--spacing, 0px) !important;
      font-size: calc(var(--font-size, 18px) * 0.85) !important;
      orphans: 3;
      widows: 3;
    }

    .reader-document h1,
    .reader-document h2,
    .reader-document h3,
    .reader-document h4,
    .reader-document h5,
    .reader-document h6 {
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
      page-break-after: avoid;
      break-after: avoid;
    }

    .va-bionic-fix {
      font-weight: 700 !important;
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
    }
  `;
}

let isPrintingMultiPage = false;

async function ensureAllPagesLoaded() {
  if (!currentPdfDocument || currentTotalPages <= 1) return;
  for (let i = 1; i <= currentTotalPages; i++) {
    if (!currentLoadedPages[i - 1]) {
      await extractPageData(i);
    }
  }
}

function renderAllPagesForPrint() {
  if (!currentLoadedPages || currentLoadedPages.length <= 1) return;
  const docContainer = document.getElementById('reader-document');
  if (!docContainer) return;

  isPrintingMultiPage = true;
  docContainer.innerHTML = '';

  const titleEl = document.createElement('h1');
  titleEl.textContent = currentDocumentTitle;
  docContainer.appendChild(titleEl);

  const totalPages = currentTotalPages || currentLoadedPages.length;
  currentLoadedPages.forEach((page) => {
    if (!page) return;
    const pageEl = document.createElement('section');
    pageEl.className = 'reader-page';

    const pageTag = document.createElement('span');
    pageTag.className = 'page-header-tag';
    pageTag.textContent = totalPages > 1 ? `Page ${page.pageNumber} of ${totalPages}` : `Page ${page.pageNumber}`;
    pageEl.appendChild(pageTag);

    page.paragraphs.forEach((paraText) => {
      const p = document.createElement('p');
      if (currentReaderSettings.bionic) {
        p.innerHTML = applyBionicToParagraph(paraText);
      } else {
        p.textContent = paraText;
      }
      pageEl.appendChild(p);
    });

    docContainer.appendChild(pageEl);
  });
}

function restoreAfterPrint() {
  if (isPrintingMultiPage) {
    isPrintingMultiPage = false;
    displayExtractedPages(currentDocumentTitle);
  }
}

function updateToolbarUI() {
  const fontEl = document.getElementById('reader-font');
  if (fontEl) fontEl.value = currentReaderSettings.font || 'Lexend';

  const fontSizeVal = document.getElementById('font-size-val');
  if (fontSizeVal) fontSizeVal.textContent = `${currentReaderSettings.fontSize}px`;

  const trackingEl = document.getElementById('reader-tracking');
  if (trackingEl) trackingEl.value = currentReaderSettings.tracking;
  const trackingVal = document.getElementById('reader-tracking-val');
  if (trackingVal) trackingVal.textContent = `${currentReaderSettings.tracking}px`;

  const spacingEl = document.getElementById('reader-spacing');
  if (spacingEl) spacingEl.value = currentReaderSettings.spacing;
  const spacingVal = document.getElementById('reader-spacing-val');
  if (spacingVal) spacingVal.textContent = `${currentReaderSettings.spacing}px`;

  const leadingEl = document.getElementById('reader-leading');
  if (leadingEl) leadingEl.value = currentReaderSettings.leading;
  const leadingVal = document.getElementById('reader-leading-val');
  if (leadingVal) leadingVal.textContent = `${currentReaderSettings.leading}x`;

  const fontColorEl = document.getElementById('reader-font-color');
  if (fontColorEl) {
    const targetVal = currentReaderSettings.fontColor || 'default';
    const match = Array.from(fontColorEl.options).find(
      (opt) => opt.value.toLowerCase() === targetVal.toLowerCase()
    );
    if (match) {
      fontColorEl.value = match.value;
    } else if (targetVal !== 'default') {
      const opt = document.createElement('option');
      opt.value = targetVal;
      opt.textContent = `Custom (${targetVal})`;
      fontColorEl.appendChild(opt);
      fontColorEl.value = targetVal;
    } else {
      fontColorEl.value = 'default';
    }
  }

  const contrastEl = document.getElementById('reader-contrast');
  if (contrastEl) contrastEl.value = currentReaderSettings.contrast || 'default';

  const bionicEl = document.getElementById('reader-bionic-toggle');
  if (bionicEl) bionicEl.checked = Boolean(currentReaderSettings.bionic);

  const rulerEl = document.getElementById('reader-ruler-toggle');
  if (rulerEl) rulerEl.checked = Boolean(currentReaderSettings.ruler);

  const voiceEl = document.getElementById('reader-tts-voice');
  if (voiceEl) voiceEl.value = currentReaderSettings.ttsVoice || 'female';

  const speedEl = document.getElementById('reader-tts-speed');
  if (speedEl) speedEl.value = (currentReaderSettings.ttsSpeed || 1.0).toString();

  const tierEl = document.getElementById('reader-tts-engine-tier');
  if (tierEl) tierEl.value = currentReaderSettings.ttsEngineTier || 'wasm';
  previousReaderTier = currentReaderSettings.ttsEngineTier || 'wasm';
  updateReaderNeuralTierVisibility(currentReaderSettings.ttsVoice || 'female');
  checkReaderGpuAdmission();

  const paperSizeEl = document.getElementById('reader-paper-size');
  if (paperSizeEl) {
    paperSizeEl.value = currentReaderSettings.paperSize || 'letter';
  }
  const customPaperGroup = document.getElementById('reader-custom-paper-group');
  if (customPaperGroup) {
    const isCustom = currentReaderSettings.paperSize === 'custom';
    customPaperGroup.style.display = isCustom ? 'flex' : 'none';
    customPaperGroup.classList.toggle('hidden', !isCustom);
  }
  const customWidthEl = document.getElementById('reader-custom-paper-width');
  if (customWidthEl) {
    customWidthEl.value = currentReaderSettings.customPaperWidth || 8.5;
  }
  const customHeightEl = document.getElementById('reader-custom-paper-height');
  if (customHeightEl) {
    customHeightEl.value = currentReaderSettings.customPaperHeight || 11;
  }
  preparePrintStylesheet();
}

function applyAllReaderStyles() {
  const root = document.documentElement;
  root.style.setProperty('--font-family', currentReaderSettings.font);
  root.style.setProperty('--font-size', `${currentReaderSettings.fontSize}px`);
  root.style.setProperty('--tracking', `${currentReaderSettings.tracking}px`);
  root.style.setProperty('--spacing', `${currentReaderSettings.spacing}px`);
  root.style.setProperty('--leading', currentReaderSettings.leading);

  const body = document.body;
  body.className = 'va-reader-body';
  if (currentReaderSettings.contrast && currentReaderSettings.contrast !== 'default') {
    body.classList.add(`contrast-${currentReaderSettings.contrast}`);
  }

  const docContainer = document.getElementById('reader-document');
  const hasCustomFontColor = Boolean(
    currentReaderSettings.fontColor && currentReaderSettings.fontColor !== 'default'
  );

  if (currentReaderSettings.contrast === 'custom') {
    const customBg = currentReaderSettings.customBgColor || '#fbf0d9';
    const customFg = currentReaderSettings.customFontColor || '#111111';
    root.style.setProperty('--reader-bg', customBg);
    root.style.setProperty('--reader-surface', customBg);
    root.style.setProperty('--reader-text', customFg);
    body.style.setProperty('--reader-text', customFg, 'important');
    if (docContainer) {
      docContainer.style.setProperty('--reader-text', customFg, 'important');
      docContainer.style.setProperty('color', customFg, 'important');
      docContainer.style.setProperty('-webkit-text-fill-color', customFg, 'important');
      const textEls = docContainer.querySelectorAll(
        'p, h1, h2, h3, h4, h5, h6, span:not(.page-header-tag), b, strong, em, i, a, section'
      );
      textEls.forEach((el) => {
        el.style.setProperty('color', customFg, 'important');
        el.style.setProperty('-webkit-text-fill-color', customFg, 'important');
      });
    }
  } else if (hasCustomFontColor) {
    const chosenColor = currentReaderSettings.fontColor;
    root.style.setProperty('--reader-text', chosenColor);
    body.style.setProperty('--reader-text', chosenColor, 'important');
    if (docContainer) {
      docContainer.style.setProperty('--reader-text', chosenColor, 'important');
      docContainer.style.setProperty('color', chosenColor, 'important');
      docContainer.style.setProperty('-webkit-text-fill-color', chosenColor, 'important');
      const textEls = docContainer.querySelectorAll(
        'p, h1, h2, h3, h4, h5, h6, span:not(.page-header-tag), b, strong, em, i, a, section'
      );
      textEls.forEach((el) => {
        el.style.setProperty('color', chosenColor, 'important');
        el.style.setProperty('-webkit-text-fill-color', chosenColor, 'important');
      });
    }
  } else {
    root.style.removeProperty('--reader-text');
    body.style.removeProperty('--reader-text');
    if (docContainer) {
      docContainer.style.removeProperty('--reader-text');
      docContainer.style.removeProperty('color');
      docContainer.style.removeProperty('-webkit-text-fill-color');
      const textEls = docContainer.querySelectorAll(
        'p, h1, h2, h3, h4, h5, h6, span:not(.page-header-tag), b, strong, em, i, a, section'
      );
      textEls.forEach((el) => {
        el.style.removeProperty('color');
        el.style.removeProperty('-webkit-text-fill-color');
      });
    }
  }
}

// -------------------------------------------------------------
// Dropzone & File Handling
// -------------------------------------------------------------
function initDropZone() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const loadSampleBtn = document.getElementById('load-sample-btn');

  // Support drag-and-drop on drop zone as well as whole window
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (dropZone) dropZone.classList.add('dragover');
  });

  window.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null && dropZone) {
      dropZone.classList.remove('dragover');
    }
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (dropZone) dropZone.classList.remove('dragover');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleIncomingFile(e.dataTransfer.files[0]);
    }
  });

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleIncomingFile(e.target.files[0]);
      }
    });
  }

  if (loadSampleBtn) {
    loadSampleBtn.addEventListener('click', () => {
      loadSampleDocument();
    });
  }
}

function handleIncomingFile(file) {
  if (!file) return;

  const fileName = file.name ? file.name.toLowerCase() : '';
  const isPdf = fileName.endsWith('.pdf') ||
                (file.type && file.type.includes('pdf')) ||
                (!file.type && file.size > 0);

  if (!isPdf) {
    alert('Please choose a valid PDF document (.pdf).');
    const input = document.getElementById('file-input');
    if (input) input.value = '';
    return;
  }

  showReaderLoading(`Reading ${file.name || 'document'}...`);

  const fileReader = new FileReader();
  fileReader.onload = function () {
    try {
      const typedArray = new Uint8Array(this.result);
      processPdfData(typedArray, file.name || 'Document.pdf');
    } catch (err) {
      console.error('Error preparing PDF data:', err);
      hideReaderLoading();
      alert('Failed to read the PDF file. Please try again.');
    } finally {
      const input = document.getElementById('file-input');
      if (input) input.value = '';
    }
  };

  fileReader.onerror = function (err) {
    console.error('FileReader error:', err);
    hideReaderLoading();
    alert('Error reading file from disk. Please check file permissions and try again.');
    const input = document.getElementById('file-input');
    if (input) input.value = '';
  };

  fileReader.readAsArrayBuffer(file);
}

// -------------------------------------------------------------
// PDF Text Extraction & Progressive Rendering
// -------------------------------------------------------------
async function extractPageData(pageNum) {
  if (currentLoadedPages[pageNum - 1]) {
    return currentLoadedPages[pageNum - 1];
  }

  if (!currentPdfDocument) {
    return {
      pageNumber: pageNum,
      paragraphs: ['[Document not loaded]']
    };
  }

  try {
    const page = await currentPdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    const paragraphs = formatPdfTextToParagraphs(textContent.items);

    const pageData = {
      pageNumber: pageNum,
      paragraphs: paragraphs.length > 0 ? paragraphs : ['[No extractable text found on this page]']
    };

    currentLoadedPages[pageNum - 1] = pageData;
    return pageData;
  } catch (err) {
    console.warn(`Error extracting text for page ${pageNum}:`, err);
    return {
      pageNumber: pageNum,
      paragraphs: ['[Could not extract text from this page]']
    };
  }
}

async function processPdfData(typedArray, fileName) {
  showReaderLoading('Parsing PDF structure...');

  try {
    // 12-second safety timeout so it never hangs indefinitely
    const loadingTask = pdfjsLib.getDocument({
      data: typedArray,
      isEvalSupported: false
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('PDF loading timed out.')), 12000);
    });

    currentPdfDocument = await Promise.race([loadingTask.promise, timeoutPromise]);
    currentTotalPages = currentPdfDocument.numPages || 1;
    currentLoadedPages = new Array(currentTotalPages);
    currentReaderPageIndex = 1;

    showReaderLoading(`Loading Page 1 of ${currentTotalPages}...`);

    // Extract Page 1 immediately for instant display
    await extractPageData(1);

    hideReaderLoading();
    displayExtractedPages(fileName || 'Document.pdf');

    // Preload Page 2 in background if multi-page
    if (currentTotalPages > 1) {
      setTimeout(() => {
        extractPageData(2).catch(() => {});
      }, 80);
    }
  } catch (err) {
    console.error('PDF parsing error:', err);
    hideReaderLoading();
    alert('Could not open or parse this PDF document. Please make sure it is a valid, uncorrupted PDF file.');
  }
}

function formatPdfTextToParagraphs(items) {
  if (!items || items.length === 0) return [];

  // 1. Filter out empty items and extract geometrical layout
  const textItems = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    const str = item.str;
    if (str === undefined || str === null) continue;

    const tx = (item.transform && item.transform[4] !== undefined) ? item.transform[4] : 0;
    const ty = (item.transform && item.transform[5] !== undefined) ? item.transform[5] : 0;
    const height = item.height || (item.transform ? Math.abs(item.transform[3] || item.transform[0] || 12) : 12);
    const width = item.width || 0;

    textItems.push({
      str,
      x: tx,
      y: ty,
      width,
      height,
      hasEOL: Boolean(item.hasEOL)
    });
  }

  if (textItems.length === 0) return [];

  // 2. Group items into physical horizontal lines based on y-coordinate
  const lines = [];
  let currentLine = [];
  let currentY = null;
  let currentLineHeight = 12;

  for (let i = 0; i < textItems.length; i++) {
    const it = textItems[i];
    if (currentY === null) {
      currentY = it.y;
      currentLineHeight = it.height;
      currentLine.push(it);
    } else {
      const yDiff = Math.abs(it.y - currentY);
      // Belonging to the same line: vertical distance within 35% of font height or 3px
      const threshold = Math.max(3, currentLineHeight * 0.35);
      if (yDiff <= threshold) {
        currentLine.push(it);
      } else {
        lines.push({ items: currentLine, y: currentY, height: currentLineHeight });
        currentLine = [it];
        currentY = it.y;
        currentLineHeight = it.height;
      }
    }
  }
  if (currentLine.length > 0) {
    lines.push({ items: currentLine, y: currentY, height: currentLineHeight });
  }

  // 3. Assemble each line horizontally, inserting single spaces between word gaps
  const processedLines = [];
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
    let lineText = '';
    let minX = Infinity;
    let maxX = -Infinity;

    for (let j = 0; j < line.items.length; j++) {
      const it = line.items[j];
      const s = it.str;
      if (!s) continue;
      if (it.x < minX) minX = it.x;
      const endX = it.x + (it.width || 0);
      if (endX > maxX) maxX = endX;

      if (lineText.length > 0) {
        const prevItem = line.items[j - 1];
        const gap = prevItem ? (it.x - (prevItem.x + prevItem.width)) : 0;
        const needsSpace = !lineText.endsWith(' ') && !s.startsWith(' ') && gap > 1.5;
        if (needsSpace) {
          lineText += ' ';
        }
      }
      lineText += s;
    }

    const trimmed = lineText.trim();
    if (trimmed.length > 0) {
      processedLines.push({
        text: trimmed,
        y: line.y,
        height: line.height,
        x: minX === Infinity ? 0 : minX,
        width: (maxX > minX && minX !== Infinity) ? (maxX - minX) : 0
      });
    }
  }

  if (processedLines.length === 0) return [];

  // Calculate typical vertical line spacing (delta Y)
  const yDeltas = [];
  for (let i = 0; i < processedLines.length - 1; i++) {
    const dy = processedLines[i].y - processedLines[i + 1].y;
    if (dy > 0 && dy < 100) yDeltas.push(dy);
  }
  yDeltas.sort((a, b) => a - b);
  const medianDy = yDeltas.length > 0 ? yDeltas[Math.floor(yDeltas.length / 2)] : 16;
  const paraGapThreshold = Math.max(medianDy * 1.5, medianDy + 5);

  // 4. Stitch lines into paragraphs (connecting soft wraps, resolving hyphens)
  const paragraphs = [];
  let currentParaText = '';

  for (let i = 0; i < processedLines.length; i++) {
    const cur = processedLines[i];
    const prev = i > 0 ? processedLines[i - 1] : null;

    let isNewParagraph = false;

    if (!prev) {
      isNewParagraph = true;
    } else {
      const dy = prev.y - cur.y;
      const isBullet = /^([•\-\*]|\d+\.|\([a-zA-Z0-9]+\))\s/.test(cur.text);
      const prevEndsWithTerm = /[.!?:"'”]$/.test(prev.text);
      const isExtraVerticalGap = dy >= paraGapThreshold || dy < -10;
      const isIndented = cur.x > (prev.x + 14);

      if (isBullet) {
        isNewParagraph = true;
      } else if (isExtraVerticalGap) {
        isNewParagraph = true;
      } else if (prevEndsWithTerm && (isIndented || dy > medianDy * 1.25)) {
        isNewParagraph = true;
      }
    }

    if (isNewParagraph) {
      if (currentParaText.trim().length > 0) {
        paragraphs.push(currentParaText.trim());
      }
      currentParaText = cur.text;
    } else {
      // Soft line wrap: join with previous line
      // Check for hyphenation break: e.g. 'read-' + 'ing' -> 'reading'
      if (/[a-zA-Z]-$/.test(currentParaText) && /^[a-zA-Z]/.test(cur.text)) {
        currentParaText = currentParaText.slice(0, -1) + cur.text;
      } else if (currentParaText.endsWith(' ') || cur.text.startsWith(' ')) {
        currentParaText += cur.text;
      } else {
        currentParaText += ' ' + cur.text;
      }
    }
  }

  if (currentParaText.trim().length > 0) {
    paragraphs.push(currentParaText.trim());
  }

  return paragraphs;
}

// -------------------------------------------------------------
// Document Rendering & Pagination
// -------------------------------------------------------------
function displayExtractedPages(docTitle) {
  if (docTitle) currentDocumentTitle = docTitle;
  const uploadHero = document.getElementById('upload-hero');
  if (uploadHero) {
    uploadHero.classList.add('hidden');
    uploadHero.style.display = 'none';
  }
  hideReaderLoading();

  const docContainer = document.getElementById('reader-document');
  docContainer.innerHTML = '';
  docContainer.classList.remove('hidden');
  docContainer.style.display = 'block';

  const totalPages = currentTotalPages || (currentLoadedPages && currentLoadedPages.length) || 1;
  if (currentReaderPageIndex > totalPages) currentReaderPageIndex = totalPages;
  if (currentReaderPageIndex < 1) currentReaderPageIndex = 1;

  // Update header toolbar page navigation
  const pageNav = document.getElementById('reader-page-nav');
  const pageIndicator = document.getElementById('reader-page-indicator');
  const prevBtn = document.getElementById('reader-page-prev');
  const nextBtn = document.getElementById('reader-page-next');

  if (totalPages > 1) {
    if (pageNav) pageNav.style.display = 'flex';
    if (pageIndicator) pageIndicator.textContent = `${currentReaderPageIndex} / ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentReaderPageIndex <= 1;
    if (nextBtn) nextBtn.disabled = currentReaderPageIndex >= totalPages;
  } else {
    if (pageNav) pageNav.style.display = 'none';
  }

  const titleEl = document.createElement('h1');
  titleEl.textContent = currentDocumentTitle;
  docContainer.appendChild(titleEl);

  // Render current active page
  const page = currentLoadedPages[currentReaderPageIndex - 1];
  if (page) {
    const pageEl = document.createElement('section');
    pageEl.className = 'reader-page';

    const pageTag = document.createElement('span');
    pageTag.className = 'page-header-tag';
    pageTag.textContent = totalPages > 1 ? `Page ${page.pageNumber} of ${totalPages}` : `Page ${page.pageNumber}`;
    pageEl.appendChild(pageTag);

    page.paragraphs.forEach(paraText => {
      const p = document.createElement('p');
      if (currentReaderSettings.bionic) {
        p.innerHTML = applyBionicToParagraph(paraText);
      } else {
        p.textContent = paraText;
      }
      pageEl.appendChild(p);
    });

    docContainer.appendChild(pageEl);
  }

  // Bottom pagination controls for multi-page documents
  if (totalPages > 1) {
    const bottomNav = document.createElement('div');
    bottomNav.className = 'reader-pagination-bar';
    bottomNav.innerHTML = `
      <button class="reader-page-btn" id="bottom-page-prev" ${currentReaderPageIndex <= 1 ? 'disabled' : ''} aria-label="Go to previous page" data-tooltip-title="Previous Page" data-tooltip-desc="Return to the previous page">Previous Page</button>
      <span class="reader-page-counter">Page ${currentReaderPageIndex} of ${totalPages}</span>
      <button class="reader-page-btn" id="bottom-page-next" ${currentReaderPageIndex >= totalPages ? 'disabled' : ''} aria-label="Go to next page" data-tooltip-title="Next Page" data-tooltip-desc="Advance to the next page">Next Page</button>
    `;
    docContainer.appendChild(bottomNav);

    document.getElementById('bottom-page-prev')?.addEventListener('click', goToPreviousPage);
    document.getElementById('bottom-page-next')?.addEventListener('click', goToNextPage);
  }

  applyAllReaderStyles();
}

async function goToPreviousPage() {
  if (currentReaderPageIndex > 1) {
    handleTtsStop();
    currentReaderPageIndex--;
    if (!currentLoadedPages[currentReaderPageIndex - 1]) {
      showReaderLoading(`Loading Page ${currentReaderPageIndex} of ${currentTotalPages}...`);
      await extractPageData(currentReaderPageIndex);
      hideReaderLoading();
    }
    displayExtractedPages(currentDocumentTitle);
    const docContainer = document.getElementById('reader-document');
    if (docContainer) {
      docContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}

async function goToNextPage() {
  if (currentReaderPageIndex < currentTotalPages) {
    handleTtsStop();
    currentReaderPageIndex++;
    if (!currentLoadedPages[currentReaderPageIndex - 1]) {
      showReaderLoading(`Loading Page ${currentReaderPageIndex} of ${currentTotalPages}...`);
      await extractPageData(currentReaderPageIndex);
      hideReaderLoading();
    }
    displayExtractedPages(currentDocumentTitle);
    const docContainer = document.getElementById('reader-document');
    if (docContainer) {
      docContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}

function reRenderActiveDocument() {
  if (currentLoadedPages && currentLoadedPages.length > 0) {
    displayExtractedPages(currentDocumentTitle);
  }
}

function loadSampleDocument() {
  currentPdfDocument = null;
  currentReaderPageIndex = 1;
  currentTotalPages = 1;
  currentLoadedPages = [
    {
      pageNumber: 1,
      paragraphs: SAMPLE_TEXT.trim().split(/\n\s*\n/)
    }
  ];
  displayExtractedPages('Dyslexia Accessibility Guide');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function applyBionicToParagraph(text) {
  if (!text) return '';
  return text.replace(/([a-zA-Z0-9]+(?:['’][a-zA-Z0-9]+)?)|([^a-zA-Z0-9'’]+)/g, (fullMatch, word, nonWord) => {
    if (word) {
      const half = Math.ceil(word.length * 0.45) || 1;
      const boldPart = word.slice(0, half);
      const restPart = word.slice(half);
      return `<b class="va-bionic-fix">${escapeHtml(boldPart)}</b>${escapeHtml(restPart)}`;
    }
    return escapeHtml(nonWord || '');
  });
}

// -------------------------------------------------------------
// Reader Ruler Guide
// -------------------------------------------------------------
let rulerEl = null;

function updateReaderRuler(enabled) {
  if (!rulerEl) rulerEl = document.getElementById('reader-ruler');
  if (enabled) {
    rulerEl.classList.remove('hidden');
    window.addEventListener('mousemove', handleReaderMouseMove, { passive: true });
  } else {
    rulerEl.classList.add('hidden');
    window.removeEventListener('mousemove', handleReaderMouseMove);
  }
}

function handleReaderMouseMove(e) {
  readerLastMouseY = e.clientY;
  if (readerRulerRafId === null) {
    readerRulerRafId = requestAnimationFrame(() => {
      readerRulerRafId = null;
      if (rulerEl && currentReaderSettings.ruler) {
        rulerEl.style.top = (readerLastMouseY - 20) + 'px';
      }
    });
  }
}

// -------------------------------------------------------------
// Text to Speech (TTS)
// -------------------------------------------------------------
let isReaderTtsGenerating = false;

function setReaderTtsGenerating(isGenerating) {
  isReaderTtsGenerating = isGenerating;
  const playBtn = document.getElementById('reader-tts-play');
  if (!playBtn) return;
  if (isGenerating) {
    playBtn.textContent = 'Generating audio...';
    playBtn.setAttribute('aria-label', 'Generating audio...');
    playBtn.disabled = true;
    playBtn.classList.add('loading');
    playBtn.classList.remove('active');
  } else {
    playBtn.disabled = false;
    playBtn.classList.remove('loading');
  }
}

function updateReaderTtsUi(isPlaying) {
  const playBtn = document.getElementById('reader-tts-play');
  if (!playBtn) return;
  if (isPlaying) {
    setReaderTtsGenerating(false);
    playBtn.textContent = 'Pause';
    playBtn.setAttribute('aria-label', 'Pause reading aloud');
    playBtn.classList.add('active');
  } else {
    setReaderTtsGenerating(false);
    playBtn.textContent = 'Play';
    playBtn.setAttribute('aria-label', 'Read page aloud');
    playBtn.classList.remove('active');
  }
}

function chunkReaderTtsText(text) {
  if (!text) return [];

  // Normalize Unicode ligatures and clean non-printable control characters
  const clean = text
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    .replace(/\(cid:\d+\)/g, ' ')
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, ' ')
    .replace(/[-_.~*]{3,}/g, ' ')
    .trim();

  if (!clean) return [];

  const sentences = clean.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [clean];
  const chunks = [];
  let current = '';

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i].replace(/\s+/g, ' ').trim();
    if (!s || !/[a-zA-Z0-9]/.test(s)) continue;

    if ((current + ' ' + s).length > 180 && current) {
      if (/[a-zA-Z0-9]/.test(current)) chunks.push(current.trim());
      current = s;
    } else {
      current += (current ? ' ' : '') + s;
    }
  }

  if (current.trim() && /[a-zA-Z0-9]/.test(current)) {
    chunks.push(current.trim());
  }

  return chunks;
}

function startReaderTtsHeartbeat() {
  stopReaderTtsHeartbeat();
  readerTtsTimer = setInterval(() => {
    if (window.speechSynthesis && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      // Chrome watchdog: only kick stalled chunks that exceed 12 seconds continuously
      if (readerChunkStartTime && Date.now() - readerChunkStartTime > 12000) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
        readerChunkStartTime = Date.now();
      }
    } else if (!window.speechSynthesis || (!window.speechSynthesis.speaking && !window.speechSynthesis.paused)) {
      stopReaderTtsHeartbeat();
    }
  }, 3000);
}

function stopReaderTtsHeartbeat() {
  if (readerTtsTimer) {
    clearInterval(readerTtsTimer);
    readerTtsTimer = null;
  }
}

async function playNextReaderTtsChunk() {
  if (readerTtsIndex >= readerTtsQueue.length) {
    handleTtsStop();
    return;
  }

  const chunk = readerTtsQueue[readerTtsIndex];
  if (!chunk || !/[a-zA-Z0-9]/.test(chunk)) {
    readerTtsIndex++;
    playNextReaderTtsChunk();
    return;
  }

  const activeVoice = currentReaderSettings.ttsVoice || 'female';
  const speedVal = parseFloat(currentReaderSettings.ttsSpeed || 1.0);

  // 1. Route to Kokoro Studio Neural Engine
  if (isKokoroVoice(activeVoice)) {
    setReaderTtsGenerating(true);
    try {
      await playKokoroAudio(chunk, {
        voice: activeVoice,
        speed: speedVal,
        tier: currentReaderSettings.ttsEngineTier || 'wasm',
        onStart: () => {
          setReaderTtsGenerating(false);
          updateReaderTtsUi(true);
        },
        onEnd: () => {
          if (readerTtsQueue.length === 0) return;
          readerTtsIndex++;
          playNextReaderTtsChunk();
        },
        onError: (err) => {
          console.warn('Reader Kokoro chunk error:', err);
          setReaderTtsGenerating(false);
          if (readerTtsQueue.length === 0) return;
          readerTtsIndex++;
          playNextReaderTtsChunk();
        }
      });
    } catch (err) {
      console.error('Kokoro synthesis error:', err);
      setReaderTtsGenerating(false);
      handleTtsStop();
    }
    return;
  }

  // 2. Route to Standard Web SpeechSynthesis
  if (!window.speechSynthesis) {
    handleTtsStop();
    return;
  }

  const voices = await getVoicesAsync();
  if (readerTtsQueue.length === 0 || readerTtsIndex >= readerTtsQueue.length) {
    return;
  }

  ttsUtterance = new SpeechSynthesisUtterance(chunk);
  ttsUtterance.rate = speedVal;

  const preferredVoice = getResolvedVoice(voices, activeVoice);
  if (preferredVoice) {
    ttsUtterance.voice = preferredVoice;
    ttsUtterance.lang = preferredVoice.lang || 'en-US';
  } else {
    ttsUtterance.lang = navigator.language || 'en-US';
  }

  activeReaderUtterances.add(ttsUtterance);
  readerChunkStartTime = Date.now();

  ttsUtterance.onend = () => {
    activeReaderUtterances.delete(ttsUtterance);
    readerTtsIndex++;
    playNextReaderTtsChunk();
  };

  ttsUtterance.onerror = (err) => {
    activeReaderUtterances.delete(ttsUtterance);
    if (err.error === 'canceled' || err.error === 'interrupted') {
      return;
    }
    console.warn('Reader TTS chunk skipped due to synthesis issue:', err.error || err);
    readerTtsIndex++;
    playNextReaderTtsChunk();
  };

  updateReaderTtsUi(true);
  window.speechSynthesis.speak(ttsUtterance);
}

function handleTtsPlay() {
  // Prevent double clicks while audio is actively being generated
  if (isReaderTtsGenerating) {
    return;
  }

  const activeVoice = currentReaderSettings.ttsVoice || 'female';
  const speedVal = parseFloat(currentReaderSettings.ttsSpeed || 1.0);
  const tierVal = currentReaderSettings.ttsEngineTier || 'wasm';

  // Kokoro playback controls (Play / Pause / Resume)
  if (isKokoroVoice(activeVoice)) {
    if (isKokoroAudioPaused()) {
      resumeKokoroAudio();
      updateReaderTtsUi(true);
      return;
    }

    const selection = window.getSelection().toString().trim();
    if (isKokoroAudioPlaying() && !selection) {
      pauseKokoroAudio();
      updateReaderTtsUi(false);
      return;
    }

    let textToRead = selection;
    if (!textToRead) {
      const pageEl = document.querySelector('.reader-document .reader-page');
      if (pageEl) {
        const paragraphs = Array.from(pageEl.querySelectorAll('p')).map(p => p.innerText.trim()).filter(Boolean);
        textToRead = paragraphs.join('\n\n') || pageEl.innerText;
      }
    }

    if (!textToRead) return;

    handleTtsStop();

    // Immediately update Play button to active generation state and disable double-clicks
    setReaderTtsGenerating(true);

    playKokoroAudio(textToRead, {
      voice: activeVoice,
      speed: speedVal,
      tier: tierVal,
      onStart: () => {
        setReaderTtsGenerating(false);
        updateReaderTtsUi(true);
      },
      onEnd: () => {
        handleTtsStop();
      },
      onError: (err) => {
        console.error('Reader Kokoro synthesis error:', err);
        handleTtsStop();
      }
    });
    return;
  }

  // Standard Web SpeechSynthesis playback controls
  if (!window.speechSynthesis) return;

  if (window.speechSynthesis.paused && readerTtsQueue.length > 0) {
    window.speechSynthesis.resume();
    updateReaderTtsUi(true);
    return;
  }

  const selection = window.getSelection().toString().trim();
  if (window.speechSynthesis.speaking && readerTtsQueue.length > 0 && !selection) {
    window.speechSynthesis.pause();
    updateReaderTtsUi(false);
    return;
  }

  let textToRead = selection;
  if (!textToRead) {
    const pageEl = document.querySelector('.reader-document .reader-page');
    if (pageEl) {
      const paragraphs = Array.from(pageEl.querySelectorAll('p')).map(p => p.innerText.trim()).filter(Boolean);
      textToRead = paragraphs.join('\n\n') || pageEl.innerText;
    }
  }

  if (!textToRead) return;

  const chunks = chunkReaderTtsText(textToRead);
  if (chunks.length === 0) return;

  handleTtsStop();
  readerTtsQueue = chunks;
  readerTtsIndex = 0;

  setTimeout(() => {
    startReaderTtsHeartbeat();
    playNextReaderTtsChunk();
  }, 50);
}

function handleTtsStop() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (typeof stopKokoroAudio === 'function') {
    stopKokoroAudio();
  }
  activeReaderUtterances.clear();
  stopReaderTtsHeartbeat();
  readerTtsQueue = [];
  readerTtsIndex = 0;
  updateReaderTtsUi(false);
}

// -------------------------------------------------------------
// Simplified Dictionary Interactions
// -------------------------------------------------------------
function initReaderInteractions() {
  const doc = document.getElementById('reader-document');
  doc.addEventListener('dblclick', async () => {
    const selection = window.getSelection().toString().trim();
    if (selection && selection.length > 1) {
      openDictionaryModal(selection);
    }
  });

  document.getElementById('dict-close-btn').addEventListener('click', closeDictionaryModal);
  document.getElementById('dict-modal-close-backdrop').addEventListener('click', closeDictionaryModal);
}

function initDictionarySearch() {
  const input = document.getElementById('dict-search-input');
  const btn = document.getElementById('dict-search-btn');

  const doSearch = () => {
    const val = input.value.trim();
    if (val) openDictionaryModal(val);
  };

  btn.addEventListener('click', doSearch);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });
}

async function openDictionaryModal(word) {
  const modal = document.getElementById('dict-modal');
  const wordEl = document.getElementById('dict-word');
  const phoneticEl = document.getElementById('dict-phonetic');
  const posEl = document.getElementById('dict-pos');
  const sourceEl = document.getElementById('dict-source');
  const defEl = document.getElementById('dict-definition');
  const contextBlock = document.getElementById('dict-context-block');
  const contextEl = document.getElementById('dict-context');
  const synBlock = document.getElementById('dict-synonyms-block');
  const synList = document.getElementById('dict-synonyms');
  const antBlock = document.getElementById('dict-antonyms-block');
  const antList = document.getElementById('dict-antonyms');
  const exBlock = document.getElementById('dict-example-block');
  const exEl = document.getElementById('dict-example');
  const ttsBtn = document.getElementById('dict-tts-btn');

  wordEl.textContent = word;
  phoneticEl.textContent = '';
  defEl.textContent = 'Searching simplified definition...';
  modal.classList.remove('hidden');

  let entry = null;

  // Check local dictionary
  if (typeof lookupSimplifiedWord === 'function') {
    try {
      entry = await lookupSimplifiedWord(word);
    } catch (e) {
      entry = null;
    }
  }

  // Fallback via background message if needed
  if (!entry && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    try {
      entry = await new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), 2500);
        chrome.runtime.sendMessage({ action: 'lookup_word', word }, (resp) => {
          clearTimeout(timer);
          resolve(resp || null);
        });
      });
    } catch (e) {
      entry = null;
    }
  }

  if (entry) {
    wordEl.textContent = entry.word;
    phoneticEl.textContent = entry.phonetic || '';
    posEl.textContent = entry.pos || 'term';
    sourceEl.textContent = entry.source || 'dictionary';
    defEl.textContent = entry.definition;

    if (entry.contextualDef) {
      if (contextBlock) contextBlock.style.display = 'block';
      if (contextEl) contextEl.textContent = entry.contextualDef;
    } else {
      if (contextBlock) contextBlock.style.display = 'none';
    }

        if (entry.synonyms && entry.synonyms.length > 0) {
      synBlock.style.display = 'block';
      synList.innerHTML = entry.synonyms.map(s => `<span class="synonym-chip" title="Look up '${s}'">${s}</span>`).join('');
      synList.querySelectorAll('.synonym-chip').forEach(chip => {
        chip.addEventListener('click', () => openDictionaryModal(chip.textContent.trim()));
      });
    } else {
      synBlock.style.display = 'none';
    }

    if (entry.antonyms && entry.antonyms.length > 0) {
      if (antBlock) antBlock.style.display = 'block';
      if (antList) {
        antList.innerHTML = entry.antonyms.map(a => `<span class="antonym-chip" title="Look up '${a}'">${a}</span>`).join('');
        antList.querySelectorAll('.antonym-chip').forEach(chip => {
          chip.addEventListener('click', () => openDictionaryModal(chip.textContent.trim()));
        });
      }
    } else {
      if (antBlock) antBlock.style.display = 'none';
    }

    if (entry.example) {
      exBlock.style.display = 'block';
      exEl.textContent = `"${entry.example}"`;
    } else {
      exBlock.style.display = 'none';
    }

    ttsBtn.onclick = async () => {
      const activeVoice = currentReaderSettings.ttsVoice || 'female';
      const speedVal = parseFloat(currentReaderSettings.ttsSpeed || 1.0);

      if (isKokoroVoice(activeVoice)) {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        stopKokoroAudio();
        updateReaderTtsUi(false);
        try {
          ttsBtn.textContent = '...';
          await playKokoroAudio(entry.word, {
            voice: activeVoice,
            speed: speedVal,
            tier: currentReaderSettings.ttsEngineTier || 'wasm',
            onEnd: () => { ttsBtn.textContent = 'Listen'; },
            onError: () => { ttsBtn.textContent = 'Listen'; }
          });
          ttsBtn.textContent = 'Listen';
        } catch (e) {
          ttsBtn.textContent = 'Listen';
          console.warn('Kokoro dictionary speech error:', e);
        }
        return;
      }

      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        activeReaderUtterances.clear();
        updateReaderTtsUi(false);
        setTimeout(() => {
          const u = new SpeechSynthesisUtterance(entry.word);
          u.rate = speedVal;
          u.lang = navigator.language || 'en-US';
          const voices = window.speechSynthesis.getVoices();
          const preferredVoice = getResolvedVoice(voices, activeVoice);
          if (preferredVoice) {
            u.voice = preferredVoice;
            if (preferredVoice.lang) u.lang = preferredVoice.lang;
          }
          activeReaderUtterances.add(u);
          u.onend = () => activeReaderUtterances.delete(u);
          u.onerror = (e) => {
            activeReaderUtterances.delete(u);
            if (e.error !== 'canceled' && e.error !== 'interrupted') {
              console.warn('Dictionary TTS error:', e.error || e);
            }
          };
          window.speechSynthesis.speak(u);
        }, 50);
      }
    };
  } else {
    defEl.textContent = `A simple definition for "${word}" could not be found.`;
    if (contextBlock) contextBlock.style.display = 'none';
    synBlock.style.display = 'none';
    if (antBlock) antBlock.style.display = 'none';
    exBlock.style.display = 'none';
  }
}

function closeDictionaryModal() {
  document.getElementById('dict-modal').classList.add('hidden');
}

// Dismiss dictionary modal on Escape key (Improvement 5)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('dict-modal');
    if (modal && !modal.classList.contains('hidden')) {
      closeDictionaryModal();
    }
  }
});

// -------------------------------------------------------------
// Interactive Tooltips Engine
// -------------------------------------------------------------
function initReaderTooltips() {
  let tooltipEl = document.getElementById('reader-tooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'reader-tooltip';
    tooltipEl.className = 'reader-tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    tooltipEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tooltipEl);
  }

  let activeTarget = null;
  let showTimer = null;

  function showTooltip(target) {
    if (!target) return;
    const title = target.getAttribute('data-tooltip-title') || '';
    const desc = target.getAttribute('data-tooltip-desc') || target.getAttribute('data-tooltip') || '';
    if (!desc && !title) return;

    activeTarget = target;
    tooltipEl.innerHTML = `
      ${title ? `<span class="reader-tooltip-title">${title}</span>` : ''}
      ${desc ? `<span class="reader-tooltip-desc">${desc}</span>` : ''}
    `;

    // Position tooltip relative to target element
    const rect = target.getBoundingClientRect();
    const tooltipWidth = 220;
    let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
    let top = rect.bottom + 8;

    // Viewport edge containment
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }

    // If bottom edge overflow, flip tooltip above target
    if (top + 65 > window.innerHeight) {
      top = Math.max(10, rect.top - 60);
    }

    tooltipEl.style.left = `${Math.round(left)}px`;
    tooltipEl.style.top = `${Math.round(top)}px`;
    tooltipEl.classList.add('visible');
    tooltipEl.setAttribute('aria-hidden', 'false');
  }

  function hideTooltip() {
    activeTarget = null;
    clearTimeout(showTimer);
    tooltipEl.classList.remove('visible');
    tooltipEl.setAttribute('aria-hidden', 'true');
  }

  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-tooltip-desc], [data-tooltip], [data-tooltip-title]');
    if (target && target !== activeTarget) {
      clearTimeout(showTimer);
      showTimer = setTimeout(() => showTooltip(target), 120);
    }
  });

  document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('[data-tooltip-desc], [data-tooltip], [data-tooltip-title]');
    if (target) {
      const related = e.relatedTarget ? e.relatedTarget.closest('[data-tooltip-desc], [data-tooltip], [data-tooltip-title]') : null;
      if (related !== target) {
        hideTooltip();
      }
    }
  });

  // Accessible keyboard focus support
  document.addEventListener('focusin', (e) => {
    const target = e.target.closest('[data-tooltip-desc], [data-tooltip], [data-tooltip-title]');
    if (target) {
      clearTimeout(showTimer);
      showTooltip(target);
    }
  });

  document.addEventListener('focusout', (e) => {
    const target = e.target.closest('[data-tooltip-desc], [data-tooltip], [data-tooltip-title]');
    if (target) {
      hideTooltip();
    }
  });

  // Hide on scroll to prevent detached floating tooltips
  window.addEventListener('scroll', hideTooltip, { passive: true });
}

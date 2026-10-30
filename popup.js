const DEFAULT_SETTINGS = {
  isActive: true,
  level: 0,
  font: 'Lexend',
  fontSize: 100,
  tracking: 0,
  spacing: 0,
  leading: 1.5,
  paragraphSpacing: 0,
  forceLeftAlign: false,
  fontColor: 'default',
  customFontColor: '#111111',
  contrastMode: 'default',
  customBgColor: '#fbf0d9',
  overlay: 0,
  tintColor: 'amber',
  ruler: false,
  rulerMode: 'bar',
  rulerHeight: 40,
  bionic: false,
  tts: true,
  dictionary: true,
  ttsVoice: 'female',
  ttsVoiceGender: 'female',
  ttsSpeed: 1.0,
  ttsRate: 1.0,
  ttsEngineTier: 'wasm'
};

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

const PRESETS = {
  1: {
    font: 'OpenDyslexic',
    fontSize: 105,
    tracking: 1.0,
    spacing: 2.5,
    leading: 1.6,
    paragraphSpacing: 8,
    forceLeftAlign: false,
    fontColor: 'default',
    contrastMode: 'default',
    overlay: 0.15,
    tintColor: 'amber'
  },
  2: {
    font: 'OpenDyslexic',
    fontSize: 115,
    tracking: 2.0,
    spacing: 5.0,
    leading: 1.8,
    paragraphSpacing: 14,
    forceLeftAlign: true,
    fontColor: '#222222',
    contrastMode: 'cream',
    overlay: 0.25,
    tintColor: 'amber'
  },
  3: {
    font: 'OpenDyslexic',
    fontSize: 125,
    tracking: 3.5,
    spacing: 8.0,
    leading: 2.1,
    paragraphSpacing: 20,
    forceLeftAlign: true,
    fontColor: '#111111',
    contrastMode: 'peach',
    overlay: 0.35,
    tintColor: 'amber'
  }
};

document.addEventListener('DOMContentLoaded', () => {
  getVoicesAsync();
  const masterToggle = document.getElementById('master-toggle');
  const statusText = document.getElementById('status-text');
  const controlsContainer = document.getElementById('controls-container');
  const resetBtn = document.getElementById('reset-btn');
  const openReaderBtn = document.getElementById('open-reader-btn');
  const ttsVoiceSelect = document.getElementById('tts-voice');
  const ttsVoiceTestBtn = document.getElementById('tts-voice-test-btn');
  const ttsSpeedSelect = document.getElementById('tts-speed');
  const ttsEngineTierSelect = document.getElementById('tts-engine-tier');

  const levelBtns = document.querySelectorAll('.level-btn');
  const fontSelect = document.getElementById('font-family');
  const fontColorSelect = document.getElementById('font-color');
  const contrastModeSelect = document.getElementById('contrast-mode');
  const customContrastCard = document.getElementById('custom-contrast-card');
  const customFontColorInput = document.getElementById('customTextColor') || document.getElementById('custom-font-color');
  const customFontHexInput = document.getElementById('customTextHex') || document.getElementById('custom-font-hex');
  const customBgColorInput = document.getElementById('customBgColor') || document.getElementById('custom-bg-color');
  const customBgHexInput = document.getElementById('customBgHex') || document.getElementById('custom-bg-hex');
  const wcagRatioVal = document.getElementById('wcag-ratio-val');
  const wcagGradeBadge = document.getElementById('wcag-grade-badge');
  const contrastSamplePreview = document.getElementById('contrast-sample-preview');
  const fontSizeSlider = document.getElementById('font-size');
  const fontSizeVal = document.getElementById('font-size-val');
  const trackingSlider = document.getElementById('tracking');
  const spacingSlider = document.getElementById('spacing');
  const leadingSlider = document.getElementById('leading');
  const paragraphSpacingSlider = document.getElementById('paragraph-spacing');
  const leftAlignToggle = document.getElementById('left-align-toggle');

  const bionicToggle = document.getElementById('bionic-toggle');
  const overlaySlider = document.getElementById('overlay');
  const tintChips = document.querySelectorAll('#tint-palette .color-chip');
  const rulerToggle = document.getElementById('ruler-toggle');
  const rulerOptions = document.getElementById('ruler-options');
  const rulerModeBtns = document.querySelectorAll('.segment-btn');
  const rulerHeightSlider = document.getElementById('ruler-height');

  const trackingVal = document.getElementById('tracking-val');
  const spacingVal = document.getElementById('spacing-val');
  const leadingVal = document.getElementById('leading-val');
  const paragraphSpacingVal = document.getElementById('paragraph-spacing-val');
  const overlayVal = document.getElementById('overlay-val');
  const rulerHeightVal = document.getElementById('ruler-height-val');

  let currentSettings = { ...DEFAULT_SETTINGS };

  // Load saved settings (persists locally across sessions with storage.local & localStorage)
  chrome.storage.local.get(['va_settings'], (result) => {
    let raw = result.va_settings;
    if (!raw || Object.keys(raw).length === 0) {
      try {
        const localRaw = localStorage.getItem('va_settings');
        if (localRaw) raw = JSON.parse(localRaw);
      } catch (e) {}
    }
    raw = raw || {};
    if (raw.kerning !== undefined && raw.tracking === undefined) {
      raw.tracking = raw.kerning;
      raw.spacing = raw.kerning * 2.5;
    }
    // Clean up any leaked reader settings or invalid font sizes (< 50% or > 250%)
    if (raw.readerFontSize !== undefined) {
      delete raw.readerFontSize;
    }
    if (raw.fontSize !== undefined) {
      const parsedSize = parseInt(raw.fontSize, 10);
      if (isNaN(parsedSize) || parsedSize < 50 || parsedSize > 250) {
        raw.fontSize = DEFAULT_SETTINGS.fontSize; // 100%
      }
    }
    currentSettings = { ...DEFAULT_SETTINGS, ...raw, tts: true, dictionary: true };

    // Load persisted voice and speed multiplier from sync storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['ttsVoice', 'ttsVoiceGender', 'ttsSpeed', 'ttsRate', 'ttsEngineTier'], (syncRes) => {
        const syncVoice = syncRes?.ttsVoice || syncRes?.ttsVoiceGender;
        if (syncVoice) {
          currentSettings.ttsVoice = syncVoice;
          currentSettings.ttsVoiceGender = syncVoice;
          if (ttsVoiceSelect) ttsVoiceSelect.value = syncVoice;
        }
        const syncSpeed = syncRes?.ttsSpeed ?? syncRes?.ttsRate;
        if (syncSpeed !== undefined && syncSpeed !== null) {
          const s = parseFloat(syncSpeed);
          currentSettings.ttsSpeed = s;
          currentSettings.ttsRate = s;
          if (ttsSpeedSelect) ttsSpeedSelect.value = s.toString();
        }
        const syncTier = syncRes?.ttsEngineTier || 'wasm';
        currentSettings.ttsEngineTier = syncTier;
        if (ttsEngineTierSelect) ttsEngineTierSelect.value = syncTier;
        previousTier = syncTier;
        previousVoice = currentSettings.ttsVoice || 'female';
        lastSyncedVoice = currentSettings.ttsVoice || 'female';
        lastSyncedSpeed = currentSettings.ttsSpeed || 1.0;
        lastSyncedTier = currentSettings.ttsEngineTier || 'wasm';
        updateNeuralTierVisibility(currentSettings.ttsVoice);
        checkGpuAdmissionAndInfo();
      });
    }

    masterToggle.checked = currentSettings.isActive !== false;
    updateToggleUI(masterToggle.checked);
    updateUI(currentSettings);
  });

  // Launch Accessible PDF Reader
  if (openReaderBtn) {
    openReaderBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('reader.html') });
    });
  }

  function updateLevelButtons(activeLevel = 0) {
    levelBtns.forEach((btn) => {
      const isActive = parseInt(btn.dataset.level, 10) === activeLevel;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function saveSettings() {
    saveAndApply(currentSettings);
  }

  function syncFontSizeUI(size) {
    const val = parseInt(size, 10) || 100;
    if (fontSizeSlider) fontSizeSlider.value = val;
    if (fontSizeVal) fontSizeVal.textContent = `${val}%`;
  }

  if (fontSizeSlider) {
    fontSizeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      currentSettings.fontSize = val;
      syncFontSizeUI(val);
      currentSettings.level = 0;
      updateLevelButtons(0);
      saveAndApply(currentSettings);
    });
  }

  // TTS Speed Multiplier & Sync Storage
  if (ttsSpeedSelect) {
    ttsSpeedSelect.addEventListener('change', (e) => {
      const chosen = parseFloat(e.target.value) || 1.0;
      currentSettings.ttsSpeed = chosen;
      currentSettings.ttsRate = chosen;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ ttsSpeed: chosen, ttsRate: chosen }, () => {
          if (chrome.runtime && chrome.runtime.lastError) {
            console.warn('Sync storage warning:', chrome.runtime.lastError.message);
          }
        });
      }
      saveAndApply(currentSettings);
    });
  }

  // Master switch
  masterToggle.addEventListener('change', (e) => {
    currentSettings.isActive = e.target.checked;
    updateToggleUI(currentSettings.isActive);
    saveAndApply(currentSettings);
  });

  // Reset to default settings
  resetBtn.addEventListener('click', () => {
    currentSettings = { ...DEFAULT_SETTINGS, isActive: masterToggle.checked };
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ ttsVoice: 'female', ttsVoiceGender: 'female', ttsSpeed: 1.0, ttsRate: 1.0 });
    }
    saveAndApply(currentSettings);
    updateUI(currentSettings);
  });

  // Severity Presets
  levelBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const level = parseInt(e.target.dataset.level, 10);
      currentSettings = {
        ...currentSettings,
        isActive: true,
        level,
        ...PRESETS[level]
      };
      saveAndApply(currentSettings);
      updateUI(currentSettings);
    });
  });

  // Granular inputs: Font, Font Color, Contrast, Tracking, Spacing, Leading, Paragraph Spacing, Overlay
  [fontSelect, fontColorSelect, contrastModeSelect, trackingSlider, spacingSlider, leadingSlider, paragraphSpacingSlider, overlaySlider].forEach((input) => {
    input.addEventListener('input', () => {
      currentSettings = {
        ...currentSettings,
        isActive: true,
        level: 0,
        font: fontSelect.value,
        fontColor: fontColorSelect.value,
        contrastMode: contrastModeSelect.value,
        tracking: parseFloat(trackingSlider.value),
        spacing: parseFloat(spacingSlider.value),
        leading: parseFloat(leadingSlider.value),
        paragraphSpacing: parseFloat(paragraphSpacingSlider.value),
        overlay: parseFloat(overlaySlider.value)
      };
      saveAndApply(currentSettings);
      updateBadges(currentSettings);
      updateLevelButtons(0);
      updateCustomContrastUI(currentSettings);
    });
  });

  if (contrastModeSelect) {
    contrastModeSelect.addEventListener('change', () => {
      currentSettings.contrastMode = contrastModeSelect.value;
      currentSettings.isActive = true;
      currentSettings.level = 0;
      updateLevelButtons(0);
      saveAndApply(currentSettings);
      updateCustomContrastUI(currentSettings);
    });
  }

  // Live Visual Preview & Debounced Storage Helpers
  function sendLivePreviewStyles(settings) {
    const toPreview = { ...settings, tts: true, dictionary: true };
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'update_styles', settings: toPreview }).catch(() => {});
      }
    });
  }

  let colorSaveDebounceTimer = null;
  function debouncedSaveCustomColors(delay = 400) {
    if (colorSaveDebounceTimer) clearTimeout(colorSaveDebounceTimer);
    colorSaveDebounceTimer = setTimeout(() => {
      saveAndApply(currentSettings);
    }, delay);
  }

  // Custom Color Contrast Chooser Listeners (Decoupled Live Preview & Storage Writes)
  if (customFontColorInput) {
    // 1. Live visual updates on input: update WCAG ratio, preview box, and active tab without storage writes
    customFontColorInput.addEventListener('input', (e) => {
      const val = e.target.value;
      currentSettings.customFontColor = val;
      currentSettings.contrastMode = 'custom';
      currentSettings.isActive = true;
      currentSettings.level = 0;
      if (contrastModeSelect) contrastModeSelect.value = 'custom';
      if (customFontHexInput) customFontHexInput.value = val.toUpperCase();
      updateCustomContrastUI(currentSettings);
      updateLevelButtons(0);
      sendLivePreviewStyles(currentSettings);
      debouncedSaveCustomColors(400);
    });

    // 2. Commit settings to chrome.storage.local on change (dialog release/close)
    customFontColorInput.addEventListener('change', () => {
      if (colorSaveDebounceTimer) clearTimeout(colorSaveDebounceTimer);
      saveAndApply(currentSettings);
    });
  }

  if (customFontHexInput) {
    customFontHexInput.addEventListener('input', (e) => {
      const validHex = normalizeHex(e.target.value);
      if (validHex) {
        currentSettings.customFontColor = validHex;
        currentSettings.contrastMode = 'custom';
        currentSettings.isActive = true;
        currentSettings.level = 0;
        if (contrastModeSelect) contrastModeSelect.value = 'custom';
        if (customFontColorInput) customFontColorInput.value = validHex;
        updateCustomContrastUI(currentSettings);
        updateLevelButtons(0);
        sendLivePreviewStyles(currentSettings);
        debouncedSaveCustomColors(400);
      }
    });

    customFontHexInput.addEventListener('change', () => {
      const validHex = normalizeHex(customFontHexInput.value);
      if (validHex) {
        currentSettings.customFontColor = validHex;
        if (colorSaveDebounceTimer) clearTimeout(colorSaveDebounceTimer);
        saveAndApply(currentSettings);
      }
    });

    customFontHexInput.addEventListener('blur', () => {
      if (customFontHexInput) {
        customFontHexInput.value = (currentSettings.customFontColor || '#111111').toUpperCase();
      }
    });
  }

  if (customBgColorInput) {
    // 1. Live visual updates on input: update WCAG ratio, preview box, and active tab without storage writes
    customBgColorInput.addEventListener('input', (e) => {
      const val = e.target.value;
      currentSettings.customBgColor = val;
      currentSettings.contrastMode = 'custom';
      currentSettings.isActive = true;
      currentSettings.level = 0;
      if (contrastModeSelect) contrastModeSelect.value = 'custom';
      if (customBgHexInput) customBgHexInput.value = val.toUpperCase();
      updateCustomContrastUI(currentSettings);
      updateLevelButtons(0);
      sendLivePreviewStyles(currentSettings);
      debouncedSaveCustomColors(400);
    });

    // 2. Commit settings to chrome.storage.local on change (dialog release/close)
    customBgColorInput.addEventListener('change', () => {
      if (colorSaveDebounceTimer) clearTimeout(colorSaveDebounceTimer);
      saveAndApply(currentSettings);
    });
  }

  if (customBgHexInput) {
    customBgHexInput.addEventListener('input', (e) => {
      const validHex = normalizeHex(e.target.value);
      if (validHex) {
        currentSettings.customBgColor = validHex;
        currentSettings.contrastMode = 'custom';
        currentSettings.isActive = true;
        currentSettings.level = 0;
        if (contrastModeSelect) contrastModeSelect.value = 'custom';
        if (customBgColorInput) customBgColorInput.value = validHex;
        updateCustomContrastUI(currentSettings);
        updateLevelButtons(0);
        sendLivePreviewStyles(currentSettings);
        debouncedSaveCustomColors(400);
      }
    });

    customBgHexInput.addEventListener('change', () => {
      const validHex = normalizeHex(customBgHexInput.value);
      if (validHex) {
        currentSettings.customBgColor = validHex;
        if (colorSaveDebounceTimer) clearTimeout(colorSaveDebounceTimer);
        saveAndApply(currentSettings);
      }
    });

    customBgHexInput.addEventListener('blur', () => {
      if (customBgHexInput) {
        customBgHexInput.value = (currentSettings.customBgColor || '#fbf0d9').toUpperCase();
      }
    });
  }

  // Force Left Align toggle
  leftAlignToggle.addEventListener('change', (e) => {
    currentSettings.forceLeftAlign = e.target.checked;
    currentSettings.level = 0;
    updateLevelButtons(0);
    saveAndApply(currentSettings);
  });

  // Bionic Reading toggle
  bionicToggle.addEventListener('change', (e) => {
    currentSettings.bionic = e.target.checked;
    saveAndApply(currentSettings);
  });

  // Glare Tint Color Chips
  tintChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const color = chip.dataset.color;
      currentSettings.tintColor = color;
      if (!currentSettings.overlay || currentSettings.overlay === 0) {
        currentSettings.overlay = 0.2;
        overlaySlider.value = 0.2;
      }
      currentSettings.level = 0;
      updateLevelButtons(0);
      tintChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      saveAndApply(currentSettings);
      updateBadges(currentSettings);
    });
  });

  // Reading Guide toggle
  rulerToggle.addEventListener('change', (e) => {
    currentSettings.ruler = e.target.checked;
    rulerOptions.classList.toggle('hidden', !currentSettings.ruler);
    saveAndApply(currentSettings);
  });

  // Ruler Mode buttons
  rulerModeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.rulerMode;
      currentSettings.rulerMode = mode;
      rulerModeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      saveAndApply(currentSettings);
    });
  });

  // Ruler Height slider
  rulerHeightSlider.addEventListener('input', () => {
    currentSettings.rulerHeight = parseInt(rulerHeightSlider.value, 10);
    rulerHeightVal.textContent = `${currentSettings.rulerHeight}px`;
    saveAndApply(currentSettings);
  });

  // Kokoro Studio Model Download & Confirmation Elements
  let previousVoice = currentSettings.ttsVoice || 'female';
  let previousTier = currentSettings.ttsEngineTier || 'wasm';
  const kokoroBanner = document.getElementById('kokoro-confirm-banner');
  const kokoroDesc = document.getElementById('kokoro-confirm-desc');
  const kokoroProgressContainer = document.getElementById('kokoro-progress-container');
  const kokoroProgressFill = document.getElementById('kokoro-progress-fill');
  const kokoroProgressText = document.getElementById('kokoro-progress-text');
  const kokoroActions = document.getElementById('kokoro-banner-actions');
  const kokoroConfirmBtn = document.getElementById('kokoro-confirm-btn');
  const kokoroCancelBtn = document.getElementById('kokoro-cancel-btn');

  let pendingKokoroVoice = null;
  let pendingKokoroTier = null;

  // Grey out Neural Engine Tier if current voice is not Kokoro AI
  function updateNeuralTierVisibility(voiceId) {
    const isKokoro = isKokoroVoice(voiceId || currentSettings.ttsVoice);
    const tierGroup = document.getElementById('tts-engine-tier-group');
    if (!tierGroup) return;

    if (isKokoro) {
      tierGroup.classList.remove('tier-disabled');
      if (ttsEngineTierSelect) {
        ttsEngineTierSelect.disabled = false;
        ttsEngineTierSelect.removeAttribute('aria-disabled');
      }
    } else {
      tierGroup.classList.add('tier-disabled');
      if (ttsEngineTierSelect) {
        ttsEngineTierSelect.disabled = true;
        ttsEngineTierSelect.setAttribute('aria-disabled', 'true');
      }
    }
  }

  // Reinitialize the extension neural engine and background offscreen worker
  async function reinitializeExtensionEngine(targetTier) {
    try {
      await loadKokoroModel(null, targetTier);
    } catch (e) {
      console.warn('Kokoro engine reinitialization notice:', e);
    }
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'BG_KOKORO_REINIT',
        tier: targetTier
      }).catch(() => {});
    }
  }

  function showKokoroBanner(targetVoice) {
    pendingKokoroVoice = targetVoice;
    pendingKokoroTier = null;
    const isTurbo = (currentSettings.ttsEngineTier === 'webgpu');
    const bannerTitle = document.getElementById('kokoro-confirm-title');
    if (bannerTitle) {
      bannerTitle.textContent = isTurbo
        ? 'Kokoro Studio Turbo Mode (GPU / ~330 MB)'
        : 'Kokoro Studio Neural Voice';
    }
    if (kokoroDesc) {
      kokoroDesc.textContent = isTurbo
        ? 'Download Kokoro Studio Voice Turbo Mode (~330 MB)? Uses full 32-bit precision on your GPU for instant generation.'
        : 'Download Kokoro Studio Voice (~85 MB)? Runs 100% locally and offline on your device.';
    }
    if (kokoroBanner) kokoroBanner.classList.remove('hidden');
    if (kokoroActions) kokoroActions.classList.remove('hidden');
    if (kokoroProgressContainer) kokoroProgressContainer.classList.add('hidden');
    if (kokoroProgressFill) kokoroProgressFill.style.width = '0%';
  }

  function showKokoroBannerForTier(targetTier) {
    pendingKokoroTier = targetTier;
    pendingKokoroVoice = null;
    const isTurbo = (targetTier === 'webgpu');
    const bannerTitle = document.getElementById('kokoro-confirm-title');
    if (bannerTitle) {
      bannerTitle.textContent = isTurbo
        ? 'Kokoro Studio Turbo Mode (GPU / ~330 MB)'
        : 'Kokoro Studio Lightweight Mode (CPU / ~85 MB)';
    }
    if (kokoroDesc) {
      kokoroDesc.textContent = isTurbo
        ? 'Download Kokoro Studio Voice Turbo Mode (~330 MB)? Uses full 32-bit floating-point weights on your GPU for near-instant generation.'
        : 'Download Kokoro Studio Voice Lightweight Mode (~85 MB)? Runs 100% locally on your CPU with 8-bit quantized weights.';
    }
    if (kokoroBanner) kokoroBanner.classList.remove('hidden');
    if (kokoroActions) kokoroActions.classList.remove('hidden');
    if (kokoroProgressContainer) kokoroProgressContainer.classList.add('hidden');
    if (kokoroProgressFill) kokoroProgressFill.style.width = '0%';
  }

  function hideKokoroBanner() {
    if (kokoroBanner) kokoroBanner.classList.add('hidden');
    pendingKokoroVoice = null;
    pendingKokoroTier = null;
  }

  function applyVoiceSetting(voiceId) {
    currentSettings.ttsVoice = voiceId;
    currentSettings.ttsVoiceGender = (voiceId === 'male' || voiceId === 'am_adam' || voiceId === 'bm_george') ? 'male' : 'female';
    previousVoice = voiceId;
    if (ttsVoiceSelect) {
      ttsVoiceSelect.value = voiceId;
    }
    updateNeuralTierVisibility(voiceId);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ ttsVoice: voiceId, ttsVoiceGender: currentSettings.ttsVoiceGender }, () => {
        if (chrome.runtime && chrome.runtime.lastError) {
          console.warn('Sync storage warning:', chrome.runtime.lastError.message);
        }
      });
    }
    saveAndApply(currentSettings);
  }

  if (kokoroCancelBtn) {
    kokoroCancelBtn.addEventListener('click', () => {
      if (pendingKokoroTier && ttsEngineTierSelect) {
        ttsEngineTierSelect.value = previousTier;
      }
      if (pendingKokoroVoice && ttsVoiceSelect) {
        ttsVoiceSelect.value = previousVoice;
      }
      hideKokoroBanner();
    });
  }

  if (kokoroConfirmBtn) {
    kokoroConfirmBtn.addEventListener('click', async () => {
      if (kokoroActions) kokoroActions.classList.add('hidden');
      if (kokoroProgressContainer) kokoroProgressContainer.classList.remove('hidden');
      if (kokoroProgressText) kokoroProgressText.textContent = 'Connecting to model repository...';

      const tierToDownload = pendingKokoroTier || currentSettings.ttsEngineTier || 'wasm';

      try {
        await loadKokoroModel((info) => {
          if (!info) return;
          let pct = 0;
          if (typeof info.progress === 'number') {
            pct = Math.min(100, Math.max(0, Math.round(info.progress)));
          } else if (info.loaded && info.total) {
            pct = Math.min(100, Math.max(0, Math.round((info.loaded / info.total) * 100)));
          }

          if (kokoroProgressFill) {
            kokoroProgressFill.style.width = `${pct}%`;
          }

          if (kokoroProgressText) {
            if (info.status === 'initiate') {
              kokoroProgressText.textContent = 'Connecting to model repository...';
            } else if (info.status === 'progress' || info.status === 'download') {
              kokoroProgressText.textContent = `Downloading Kokoro Studio Model... ${pct}%`;
            } else if (info.status === 'done') {
              kokoroProgressText.textContent = 'Model download complete. Initializing engine...';
            } else if (info.status === 'ready') {
              kokoroProgressText.textContent = 'Kokoro Studio Ready!';
            }
          }
        }, tierToDownload);

        if (kokoroProgressFill) kokoroProgressFill.style.width = '100%';
        if (kokoroProgressText) kokoroProgressText.textContent = 'Kokoro Studio Ready! Engine reinitialized.';

        if (pendingKokoroTier) {
          currentSettings.ttsEngineTier = pendingKokoroTier;
          previousTier = pendingKokoroTier;
          if (ttsEngineTierSelect) ttsEngineTierSelect.value = pendingKokoroTier;
          saveSettings({ ttsEngineTier: pendingKokoroTier });
        }

        if (pendingKokoroVoice) {
          applyVoiceSetting(pendingKokoroVoice);
        }

        // Reinitialize the extension neural engine
        await reinitializeExtensionEngine(tierToDownload);

        setTimeout(() => {
          hideKokoroBanner();
        }, 1200);
      } catch (err) {
        console.error('Kokoro download error:', err);
        if (kokoroProgressText) {
          kokoroProgressText.textContent = 'Download failed. Please check internet connection.';
        }
        setTimeout(() => {
          if (pendingKokoroTier && ttsEngineTierSelect) {
            ttsEngineTierSelect.value = previousTier;
          }
          if (pendingKokoroVoice && ttsVoiceSelect) {
            ttsVoiceSelect.value = previousVoice;
          }
          hideKokoroBanner();
        }, 2200);
      }
    });
  }

  // TTS Voice Selector & Sync Storage
  if (ttsVoiceSelect) {
    ttsVoiceSelect.addEventListener('change', async (e) => {
      const chosen = e.target.value;
      updateNeuralTierVisibility(chosen);

      if (isKokoroVoice(chosen)) {
        const cached = await isKokoroModelCached(currentSettings.ttsEngineTier || 'wasm');
        if (!cached) {
          showKokoroBanner(chosen);
          return;
        }
      }

      applyVoiceSetting(chosen);
    });
  }

  // Hardware admission lock and GPU transparency guidance
  async function checkGpuAdmissionAndInfo() {
    let isSupported = false;
    let meetsRequirements = false;
    let chipName = 'Detecting...';

    try {
      if (typeof KokoroEngine !== 'undefined' && typeof KokoroEngine.getGpuDeviceInfo === 'function') {
        const info = await KokoroEngine.getGpuDeviceInfo();
        isSupported = info.supported;
        meetsRequirements = info.meetsRequirements;
        chipName = info.chipName;
      } else if (typeof navigator !== 'undefined' && navigator.gpu) {
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        if (adapter) {
          isSupported = true;
          if (adapter.info) {
            chipName = adapter.info.description || adapter.info.device || adapter.info.architecture || adapter.info.vendor || 'Generic GPU';
          } else if (typeof adapter.requestAdapterInfo === 'function') {
            const info = await adapter.requestAdapterInfo();
            chipName = info.description || info.device || info.architecture || info.vendor || 'Generic GPU';
          }
          const maxStorage = adapter.limits?.maxStorageBufferBindingSize || 0;
          meetsRequirements = (maxStorage >= 268435456); // 256 MB
        } else {
          chipName = 'None (WebGPU unavailable)';
        }
      } else {
        chipName = 'None (WebGPU unsupported)';
      }
    } catch (e) {
      console.warn('GPU admission detection notice:', e);
      chipName = 'Unknown GPU';
    }

    const gpuChipNameEl = document.getElementById('gpu-chip-name');
    if (gpuChipNameEl) {
      gpuChipNameEl.textContent = chipName;
    }

    // Hardware admission lock for Turbo Mode option (Requirement 2)
    const turboOption = ttsEngineTierSelect?.querySelector('option[value="webgpu"]');
    if (turboOption) {
      if (!isSupported || !meetsRequirements) {
        turboOption.disabled = true;
        turboOption.textContent = 'Turbo Mode (GPU / ~330 MB) (Unsupported Hardware)';
        if (currentSettings.ttsEngineTier === 'webgpu') {
          currentSettings.ttsEngineTier = 'wasm';
          previousTier = 'wasm';
          if (ttsEngineTierSelect) ttsEngineTierSelect.value = 'wasm';
          saveSettings({ ttsEngineTier: 'wasm' });
        }
      } else {
        turboOption.disabled = false;
        turboOption.textContent = 'Turbo Mode (GPU / ~330 MB)';
      }
    }

    return { isSupported, meetsRequirements, chipName };
  }

  // TTS Engine Tier Selector (Universal WASM vs Turbo WebGPU)
  if (ttsEngineTierSelect) {
    ttsEngineTierSelect.addEventListener('change', async (e) => {
      const chosenTier = e.target.value;

      if (chosenTier === 'webgpu') {
        // 1. Hardware admission check (WebGPU & 256 MB buffer limit)
        const gpuStatus = await checkGpuAdmissionAndInfo();
        if (!gpuStatus.isSupported || !gpuStatus.meetsRequirements) {
          alert('WebGPU Turbo Mode requires at least 256 MB buffer binding support on your graphics hardware. Reverting to Lightweight Mode (CPU).');
          ttsEngineTierSelect.value = 'wasm';
          currentSettings.ttsEngineTier = 'wasm';
          previousTier = 'wasm';
          saveSettings({ ttsEngineTier: 'wasm' });
          return;
        }

        // 2. Hardware admission checks passed! Check if FP32 model is cached
        const cached = await isKokoroModelCached('webgpu');
        if (!cached) {
          // Automatically prompt user to download the FP32 model (~330 MB)
          showKokoroBannerForTier('webgpu');
          return;
        }

        // Already cached: switch tier and reinitialize extension
        currentSettings.ttsEngineTier = 'webgpu';
        previousTier = 'webgpu';
        saveSettings({ ttsEngineTier: 'webgpu' });
        await reinitializeExtensionEngine('webgpu');
        return;
      }

      if (chosenTier === 'wasm') {
        // Check if q8 model is cached
        const cached = await isKokoroModelCached('wasm');
        if (!cached) {
          // Automatically prompt user to download the lightweight q8 model (~85 MB)
          showKokoroBannerForTier('wasm');
          return;
        }

        // Already cached: switch tier and reinitialize extension
        currentSettings.ttsEngineTier = 'wasm';
        previousTier = 'wasm';
        saveSettings({ ttsEngineTier: 'wasm' });
        await reinitializeExtensionEngine('wasm');
        return;
      }
    });
  }

  // TTS Voice Preview Test Button
  if (ttsVoiceTestBtn) {
    ttsVoiceTestBtn.addEventListener('click', async () => {
      const chosenVoice = currentSettings.ttsVoice || 'female';
      const speedVal = parseFloat(currentSettings.ttsSpeed || currentSettings.ttsRate || 1.0);

      // 1. Kokoro Studio voice active
      if (isKokoroVoice(chosenVoice)) {
        if (isKokoroAudioPlaying()) {
          stopKokoroAudio();
          ttsVoiceTestBtn.textContent = 'Test Voice';
          return;
        }

        ttsVoiceTestBtn.textContent = 'Generating...';
        try {
          const text = (chosenVoice === 'am_adam' || chosenVoice === 'bm_george')
            ? 'Hello, this is Adam reading aloud with Visual Aide.'
            : 'Hello, this is Heart reading aloud with Visual Aide.';

          await playKokoroAudio(text, {
            voice: chosenVoice,
            speed: speedVal,
            tier: currentSettings.ttsEngineTier || 'wasm',
            onStart: () => {
              ttsVoiceTestBtn.textContent = 'Stop';
            },
            onEnd: () => {
              ttsVoiceTestBtn.textContent = 'Test Voice';
            },
            onError: (err) => {
              console.warn('Kokoro test audio error:', err);
              ttsVoiceTestBtn.textContent = 'Test Voice';
            }
          });
        } catch (err) {
          console.warn('Kokoro test voice failure:', err);
          ttsVoiceTestBtn.textContent = 'Test Voice';
        }
        return;
      }

      // 2. Standard Web SpeechSynthesis voice active
      if (!window.speechSynthesis) return;
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        ttsVoiceTestBtn.textContent = 'Test Voice';
        return;
      }
      const gender = ttsVoiceSelect ? ttsVoiceSelect.value : (currentSettings.ttsVoice || 'female');
      const text = gender === 'male' ? 'Hello, this is Guy reading aloud with Visual Aide.' : 'Hello, this is Aria reading aloud with Visual Aide.';

      const voices = await getVoicesAsync();
      const preferred = getResolvedVoice(voices, gender);

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = speedVal;
      if (preferred) {
        utter.voice = preferred;
        utter.lang = preferred.lang || 'en-US';
      } else {
        utter.lang = navigator.language || 'en-US';
      }
      ttsVoiceTestBtn.textContent = 'Stop';
      utter.onend = () => {
        ttsVoiceTestBtn.textContent = 'Test Voice';
      };
      utter.onerror = () => {
        ttsVoiceTestBtn.textContent = 'Test Voice';
      };
      window.speechSynthesis.speak(utter);
    });
  }

  function updateToggleUI(isActive) {
    if (isActive) {
      statusText.textContent = 'System active.';
      statusText.style.color = 'var(--accent-color)';
      controlsContainer.classList.remove('controls-disabled');
    } else {
      statusText.textContent = 'System paused.';
      statusText.style.color = 'var(--text-secondary)';
      controlsContainer.classList.add('controls-disabled');
    }
  }

  function updateBadges(settings) {
    trackingVal.textContent = `${settings.tracking}px`;
    spacingVal.textContent = `${settings.spacing}px`;
    leadingVal.textContent = `${settings.leading}x`;
    paragraphSpacingVal.textContent = `${settings.paragraphSpacing || 0}px`;
    overlayVal.textContent = `${Math.round((settings.overlay || 0) * 100)}%`;
    rulerHeightVal.textContent = `${settings.rulerHeight || 40}px`;
  }

  // -------------------------------------------------------------
  // WCAG 2.1 Color Luminance & Contrast Calculation
  // -------------------------------------------------------------
  function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return null;
    let clean = hex.trim().replace(/^#/, '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    if (clean.length !== 6) return null;
    const num = parseInt(clean, 16);
    if (isNaN(num)) return null;
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function getRelativeLuminance(rgb) {
    const srgb = [rgb.r, rgb.g, rgb.b].map((val) => {
      const s = val / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  }

  function getWcagContrast(fgHex, bgHex) {
    const fgRgb = hexToRgb(fgHex);
    const bgRgb = hexToRgb(bgHex);
    if (!fgRgb || !bgRgb) {
      return { ratio: 1, ratioFormatted: '1.0:1', grade: 'Fail', gradeClass: 'grade-fail' };
    }
    const l1 = getRelativeLuminance(fgRgb);
    const l2 = getRelativeLuminance(bgRgb);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    const ratio = (lighter + 0.05) / (darker + 0.05);

    let grade = 'Fail';
    let gradeClass = 'grade-fail';
    if (ratio >= 7.0) {
      grade = 'AAA Pass';
      gradeClass = 'grade-aaa';
    } else if (ratio >= 4.5) {
      grade = 'AA Pass';
      gradeClass = 'grade-aa';
    } else if (ratio >= 3.0) {
      grade = 'AA Large';
      gradeClass = 'grade-aa-large';
    }

    return {
      ratio,
      ratioFormatted: `${ratio.toFixed(1)}:1`,
      grade,
      gradeClass
    };
  }

  function normalizeHex(val) {
    if (!val) return null;
    let str = val.trim();
    if (!str.startsWith('#')) str = '#' + str;
    if (/^#[0-9A-Fa-f]{6}$/.test(str)) {
      return str.toLowerCase();
    }
    if (/^#[0-9A-Fa-f]{3}$/.test(str)) {
      return ('#' + str[1] + str[1] + str[2] + str[2] + str[3] + str[3]).toLowerCase();
    }
    return null;
  }

  function updateCustomContrastUI(settings) {
    if (!customContrastCard) return;

    const fontColor = settings.customFontColor || '#111111';
    const bgColor = settings.customBgColor || '#fbf0d9';

    if (customFontColorInput && customFontColorInput.value !== fontColor) {
      customFontColorInput.value = fontColor;
    }
    if (customFontHexInput && document.activeElement !== customFontHexInput) {
      customFontHexInput.value = fontColor.toUpperCase();
    }
    if (customBgColorInput && customBgColorInput.value !== bgColor) {
      customBgColorInput.value = bgColor;
    }
    if (customBgHexInput && document.activeElement !== customBgHexInput) {
      customBgHexInput.value = bgColor.toUpperCase();
    }

    const contrast = getWcagContrast(fontColor, bgColor);
    if (wcagRatioVal) {
      wcagRatioVal.textContent = contrast.ratioFormatted;
    }
    if (wcagGradeBadge) {
      wcagGradeBadge.textContent = contrast.grade;
      wcagGradeBadge.className = `wcag-grade-badge ${contrast.gradeClass}`;
    }
    if (contrastSamplePreview) {
      contrastSamplePreview.style.color = fontColor;
      contrastSamplePreview.style.backgroundColor = bgColor;
    }

    const isCustom = settings.contrastMode === 'custom';
    customContrastCard.classList.toggle('custom-active', isCustom);
  }

  function updateUI(settings) {
    updateLevelButtons(settings.level || 0);

    fontSelect.value = settings.font || 'Lexend';
    syncFontSizeUI(settings.fontSize || 100);
    fontColorSelect.value = settings.fontColor || 'default';
    contrastModeSelect.value = settings.contrastMode || 'default';
    trackingSlider.value = settings.tracking || 0;
    spacingSlider.value = settings.spacing || 0;
    leadingSlider.value = settings.leading || 1.5;
    paragraphSpacingSlider.value = settings.paragraphSpacing || 0;
    leftAlignToggle.checked = Boolean(settings.forceLeftAlign);

    bionicToggle.checked = Boolean(settings.bionic);
    overlaySlider.value = settings.overlay || 0;
    tintChips.forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.color === (settings.tintColor || 'amber'));
    });

    rulerToggle.checked = Boolean(settings.ruler);
    rulerOptions.classList.toggle('hidden', !settings.ruler);
    rulerModeBtns.forEach((btn) => {
      const isModeActive = btn.dataset.rulerMode === (settings.rulerMode || 'bar');
      btn.classList.toggle('active', isModeActive);
      btn.setAttribute('aria-checked', isModeActive ? 'true' : 'false');
    });
    rulerHeightSlider.value = settings.rulerHeight || 40;
    if (ttsVoiceSelect) {
      ttsVoiceSelect.value = settings.ttsVoice || settings.ttsVoiceGender || 'female';
    }
    if (ttsEngineTierSelect) {
      ttsEngineTierSelect.value = settings.ttsEngineTier || 'wasm';
    }
    previousTier = settings.ttsEngineTier || 'wasm';
    updateNeuralTierVisibility(settings.ttsVoice || settings.ttsVoiceGender || 'female');
    checkGpuAdmissionAndInfo();
    if (ttsSpeedSelect) {
      ttsSpeedSelect.value = (settings.ttsSpeed || settings.ttsRate || 1.0).toString();
    }

    updateBadges(settings);
    updateCustomContrastUI(settings);
  }

  let lastSyncedVoice = null;
  let lastSyncedSpeed = null;
  let lastSyncedTier = null;

  function saveAndApply(settings) {
    const toSave = { ...settings, tts: true, dictionary: true };
    if (toSave.readerFontSize !== undefined) {
      delete toSave.readerFontSize;
    }
    if (toSave.fontSize !== undefined) {
      const parsedSize = parseInt(toSave.fontSize, 10);
      if (isNaN(parsedSize) || parsedSize < 50 || parsedSize > 250) {
        toSave.fontSize = DEFAULT_SETTINGS.fontSize;
      }
    }
    try {
      localStorage.setItem('va_settings', JSON.stringify(toSave));
    } catch (e) {}

    // Persist user custom colors and all settings in chrome.storage.local (no quota rate limits)
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ va_settings: toSave }, () => {
        if (chrome.runtime && chrome.runtime.lastError) {
          console.warn('Local storage warning:', chrome.runtime.lastError.message);
        }
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'update_styles', settings: toSave }).catch(() => {});
          }
        });
      });
    }

    // Persist voice, speed, and tier to chrome.storage.sync ONLY when they actually change
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      const syncObj = {};
      let hasSyncChanges = false;
      if (toSave.ttsVoice && toSave.ttsVoice !== lastSyncedVoice) {
        syncObj.ttsVoice = toSave.ttsVoice;
        syncObj.ttsVoiceGender = toSave.ttsVoice;
        lastSyncedVoice = toSave.ttsVoice;
        hasSyncChanges = true;
      }
      if (toSave.ttsSpeed !== undefined && toSave.ttsSpeed !== lastSyncedSpeed) {
        syncObj.ttsSpeed = toSave.ttsSpeed;
        syncObj.ttsRate = toSave.ttsSpeed;
        lastSyncedSpeed = toSave.ttsSpeed;
        hasSyncChanges = true;
      }
      if (toSave.ttsEngineTier && toSave.ttsEngineTier !== lastSyncedTier) {
        syncObj.ttsEngineTier = toSave.ttsEngineTier;
        lastSyncedTier = toSave.ttsEngineTier;
        hasSyncChanges = true;
      }
      if (hasSyncChanges) {
        chrome.storage.sync.set(syncObj, () => {
          if (chrome.runtime && chrome.runtime.lastError) {
            console.warn('Sync storage warning:', chrome.runtime.lastError.message);
          }
        });
      }
    }
  }

  // Real-time synchronization when settings change from shortcuts or other tabs (Improvement 7)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      if (changes.ttsVoice || changes.ttsVoiceGender) {
        const v = changes.ttsVoice?.newValue || changes.ttsVoiceGender?.newValue;
        if (v) {
          currentSettings.ttsVoice = v;
          currentSettings.ttsVoiceGender = v;
          previousVoice = v;
          if (ttsVoiceSelect) ttsVoiceSelect.value = v;
          updateNeuralTierVisibility(v);
        }
      }
      if (changes.ttsSpeed || changes.ttsRate) {
        const s = parseFloat(changes.ttsSpeed?.newValue ?? changes.ttsRate?.newValue ?? 1.0);
        currentSettings.ttsSpeed = s;
        currentSettings.ttsRate = s;
        if (ttsSpeedSelect) ttsSpeedSelect.value = s.toString();
      }
      if (changes.ttsEngineTier) {
        const t = changes.ttsEngineTier.newValue || 'wasm';
        currentSettings.ttsEngineTier = t;
        if (ttsEngineTierSelect) ttsEngineTierSelect.value = t;
      }
    }
    if (area === 'local' && changes.va_settings && changes.va_settings.newValue) {
      const fresh = { ...DEFAULT_SETTINGS, ...changes.va_settings.newValue, tts: true, dictionary: true };
      if (fresh.readerFontSize !== undefined) {
        delete fresh.readerFontSize;
      }
      if (fresh.fontSize !== undefined) {
        const parsedSize = parseInt(fresh.fontSize, 10);
        if (isNaN(parsedSize) || parsedSize < 50 || parsedSize > 250) {
          fresh.fontSize = DEFAULT_SETTINGS.fontSize;
        }
      }
      currentSettings = fresh;
      masterToggle.checked = fresh.isActive !== false;
      updateToggleUI(masterToggle.checked);
      updateUI(fresh);
    }
  });


  // -------------------------------------------------------------
  // On-Demand Hover Info Tooltips
  // -------------------------------------------------------------
  function initPopupTooltips() {
    const tooltipEl = document.getElementById('popup-tooltip');
    if (!tooltipEl) return;

    let activeTarget = null;
    let showTimer = null;

    function showTooltip(target) {
      if (!target) return;
      const title = target.getAttribute('data-tooltip-title') || '';
      const desc = target.getAttribute('data-tooltip-desc') || '';
      if (!desc && !title) return;

      activeTarget = target;
      tooltipEl.innerHTML = `
        ${title ? `<span class="popup-tooltip-title">${title}</span>` : ''}
        ${desc ? `<span class="popup-tooltip-desc">${desc}</span>` : ''}
      `;

      const rect = target.getBoundingClientRect();
      const tooltipWidth = 195;
      let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
      let top = rect.bottom + 6;

      // Clamp within popup window bounds
      if (left < 10) left = 10;
      if (left + tooltipWidth > window.innerWidth - 10) {
        left = window.innerWidth - tooltipWidth - 10;
      }

      // Flip above if near bottom edge
      if (top + 60 > window.innerHeight) {
        top = Math.max(10, rect.top - 55);
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
      const target = e.target.closest('.info-help-btn');
      if (target && target !== activeTarget) {
        clearTimeout(showTimer);
        showTimer = setTimeout(() => showTooltip(target), 80);
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('.info-help-btn');
      if (target) {
        const related = e.relatedTarget ? e.relatedTarget.closest('.info-help-btn') : null;
        if (related !== target) {
          hideTooltip();
        }
      }
    });

    document.addEventListener('focusin', (e) => {
      const target = e.target.closest('.info-help-btn');
      if (target) {
        clearTimeout(showTimer);
        showTooltip(target);
      }
    });

    document.addEventListener('focusout', (e) => {
      const target = e.target.closest('.info-help-btn');
      if (target) {
        hideTooltip();
      }
    });

    // Prevent button click from toggling parent label or causing side effects
    document.addEventListener('click', (e) => {
      if (e.target.closest('.info-help-btn')) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    window.addEventListener('scroll', hideTooltip, { passive: true });
  }

  initPopupTooltips();

  // -----------------------------------------------------------
  // Simplified Dictionary in Extension Popup
  // -----------------------------------------------------------
  function initPopupDictionary() {
    const input = document.getElementById('popup-dict-input');
    const searchBtn = document.getElementById('popup-dict-btn');
    const resultBox = document.getElementById('popup-dict-result');
    const wordEl = document.getElementById('popup-dict-word');
    const posEl = document.getElementById('popup-dict-pos');
    const sourceEl = document.getElementById('popup-dict-source');
    const speakBtn = document.getElementById('popup-dict-speak-btn');
    const defEl = document.getElementById('popup-dict-def');
    const contextBox = document.getElementById('popup-dict-context-box');
    const contextText = document.getElementById('popup-dict-context-text');
    const synBox = document.getElementById('popup-dict-syn-box');
    const synList = document.getElementById('popup-dict-syn-list');
    const antBox = document.getElementById('popup-dict-ant-box');
    const antList = document.getElementById('popup-dict-ant-list');

    if (!input || !searchBtn || !resultBox) return;

    let activeWord = '';

    const executeLookup = async (targetWord) => {
      const query = (targetWord || input.value || '').trim();
      if (!query) return;

      activeWord = query;
      input.value = query;

      resultBox.classList.remove('hidden');
      wordEl.textContent = query;
      posEl.textContent = '...';
      sourceEl.textContent = 'searching';
      defEl.textContent = 'Searching simplified definition...';
      contextBox.style.display = 'none';
      synBox.style.display = 'none';
      antBox.style.display = 'none';

      let entry = null;

      // 1. Direct synchronous/async call to dictionary.js
      if (typeof lookupSimplifiedWord === 'function') {
        try {
          entry = await lookupSimplifiedWord(query);
        } catch (e) {
          entry = null;
        }
      }

      // 2. Fallback to background worker lookup
      if (!entry && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        try {
          entry = await new Promise((resolve) => {
            const timer = setTimeout(() => resolve(null), 2500);
            chrome.runtime.sendMessage({ action: 'lookup_word', word: query }, (resp) => {
              clearTimeout(timer);
              resolve(resp || null);
            });
          });
        } catch (e) {
          entry = null;
        }
      }

      if (entry) {
        activeWord = entry.word || query;
        wordEl.textContent = entry.word || query;
        posEl.textContent = entry.pos || 'term';
        sourceEl.textContent = entry.source || 'dictionary';
        defEl.textContent = entry.definition || 'No definition available.';

        // Contextual definition
        if (entry.contextualDef) {
          contextBox.style.display = 'block';
          contextText.textContent = entry.contextualDef;
        } else {
          contextBox.style.display = 'none';
        }

        // Simpler words (Synonyms)
        if (entry.synonyms && entry.synonyms.length > 0) {
          synBox.style.display = 'block';
          synList.innerHTML = entry.synonyms.map(s => `<span class="dict-chip-syn" title="Look up '${s}'">${s}</span>`).join('');
          synList.querySelectorAll('.dict-chip-syn').forEach(chip => {
            chip.addEventListener('click', () => {
              executeLookup(chip.textContent.trim());
            });
          });
        } else {
          synBox.style.display = 'none';
        }

        // Opposite words (Antonyms) - Shown whenever possible or available
        if (entry.antonyms && entry.antonyms.length > 0) {
          antBox.style.display = 'block';
          antList.innerHTML = entry.antonyms.map(a => `<span class="dict-chip-ant" title="Look up '${a}'">${a}</span>`).join('');
          antList.querySelectorAll('.dict-chip-ant').forEach(chip => {
            chip.addEventListener('click', () => {
              executeLookup(chip.textContent.trim());
            });
          });
        } else {
          antBox.style.display = 'none';
        }
      } else {
        wordEl.textContent = query;
        posEl.textContent = 'term';
        sourceEl.textContent = 'not found';
        defEl.textContent = `A simple definition for "${query}" could not be found.`;
        contextBox.style.display = 'none';
        synBox.style.display = 'none';
        antBox.style.display = 'none';
      }
    };

    searchBtn.addEventListener('click', () => executeLookup());

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeLookup();
      }
    });

    if (speakBtn) {
      speakBtn.addEventListener('click', async () => {
        if (!activeWord) return;
        const currentVoice = currentSettings.ttsVoice || 'female';
        const speedVal = parseFloat(currentSettings.ttsSpeed || currentSettings.ttsRate || 1.0);

        if (isKokoroVoice(currentVoice)) {
          try {
            speakBtn.textContent = '...';
            await playKokoroAudio(activeWord, {
              voice: currentVoice,
              speed: speedVal,
              tier: currentSettings.ttsEngineTier || 'wasm',
              onEnd: () => {
                speakBtn.textContent = 'Listen';
              },
              onError: () => {
                speakBtn.textContent = 'Listen';
              }
            });
            speakBtn.textContent = 'Listen';
          } catch (e) {
            speakBtn.textContent = 'Listen';
            console.warn('Kokoro pronunciation error:', e);
          }
          return;
        }

        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        window.speechSynthesis.cancel();
        const voices = await getVoicesAsync();
        const preferredVoice = getResolvedVoice(voices, currentVoice);

        const u = new SpeechSynthesisUtterance(activeWord);
        u.rate = speedVal;
        u.lang = preferredVoice && preferredVoice.lang ? preferredVoice.lang : (navigator.language || 'en-US');
        if (preferredVoice) {
          u.voice = preferredVoice;
        }

        window.speechSynthesis.speak(u);
      });
    }
  }

  initPopupDictionary();

});
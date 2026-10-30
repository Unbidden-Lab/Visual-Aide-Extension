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
  ttsRate: 1.0
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

  const levelBtns = document.querySelectorAll('.level-btn');
  const fontSelect = document.getElementById('font-family');
  const fontColorSelect = document.getElementById('font-color');
  const contrastModeSelect = document.getElementById('contrast-mode');
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
    currentSettings = { ...DEFAULT_SETTINGS, ...raw, tts: true, dictionary: true };

    // Load persisted voice and speed multiplier from sync storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['ttsVoice', 'ttsVoiceGender', 'ttsSpeed', 'ttsRate'], (syncRes) => {
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
    });
  });

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

  // TTS Voice Selector & Sync Storage
  if (ttsVoiceSelect) {
    ttsVoiceSelect.addEventListener('change', (e) => {
      const chosen = e.target.value === 'male' ? 'male' : 'female';
      currentSettings.ttsVoice = chosen;
      currentSettings.ttsVoiceGender = chosen;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ ttsVoice: chosen, ttsVoiceGender: chosen }, () => {
          if (chrome.runtime && chrome.runtime.lastError) {
            console.warn('Sync storage warning:', chrome.runtime.lastError.message);
          }
        });
      }
      saveAndApply(currentSettings);
    });
  }

  // TTS Voice Preview Test Button
  if (ttsVoiceTestBtn) {
    ttsVoiceTestBtn.addEventListener('click', async () => {
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
      utter.rate = parseFloat(currentSettings.ttsSpeed || 1.0);
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
    if (ttsSpeedSelect) {
      ttsSpeedSelect.value = (settings.ttsSpeed || settings.ttsRate || 1.0).toString();
    }

    updateBadges(settings);
  }

  function saveAndApply(settings) {
    const toSave = { ...settings, tts: true, dictionary: true };
    try {
      localStorage.setItem('va_settings', JSON.stringify(toSave));
    } catch (e) {}
    chrome.storage.local.set({ va_settings: toSave }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'update_styles', settings: toSave }).catch(() => {});
        }
      });
    });
    // Persist voice and speed selection to sync storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      const syncObj = {};
      if (toSave.ttsVoice) {
        syncObj.ttsVoice = toSave.ttsVoice;
        syncObj.ttsVoiceGender = toSave.ttsVoice;
      }
      if (toSave.ttsSpeed !== undefined) {
        syncObj.ttsSpeed = toSave.ttsSpeed;
        syncObj.ttsRate = toSave.ttsSpeed;
      }
      chrome.storage.sync.set(syncObj);
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
          if (ttsVoiceSelect) ttsVoiceSelect.value = v;
        }
      }
      if (changes.ttsSpeed || changes.ttsRate) {
        const s = parseFloat(changes.ttsSpeed?.newValue ?? changes.ttsRate?.newValue ?? 1.0);
        currentSettings.ttsSpeed = s;
        currentSettings.ttsRate = s;
        if (ttsSpeedSelect) ttsSpeedSelect.value = s.toString();
      }
    }
    if (area === 'local' && changes.va_settings && changes.va_settings.newValue) {
      const fresh = { ...DEFAULT_SETTINGS, ...changes.va_settings.newValue, tts: true, dictionary: true };
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
        if (!activeWord || typeof window === 'undefined' || !window.speechSynthesis) return;

        window.speechSynthesis.cancel();
        const voices = await getVoicesAsync();
        const selectedGender = (currentSettings.ttsVoice || currentSettings.ttsVoiceGender || 'female').toLowerCase();
        const preferredVoice = getResolvedVoice(voices, selectedGender);

        const u = new SpeechSynthesisUtterance(activeWord);
        u.rate = parseFloat(currentSettings.ttsSpeed || currentSettings.ttsRate || 1.0);
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
const DEFAULT_SETTINGS = {
  isActive: true,
  level: 0,
  font: 'OpenDyslexic',
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
  dictionary: true
};

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
  const masterToggle = document.getElementById('master-toggle');
  const statusText = document.getElementById('status-text');
  const controlsContainer = document.getElementById('controls-container');
  const resetBtn = document.getElementById('reset-btn');
  const openReaderBtn = document.getElementById('open-reader-btn');

  const levelBtns = document.querySelectorAll('.level-btn');
  const fontSelect = document.getElementById('font-family');
  const fontColorSelect = document.getElementById('font-color');
  const contrastModeSelect = document.getElementById('contrast-mode');
  const fontSizeSlider = document.getElementById('font-size');
  const fontSizeSelect = document.getElementById('font-size-select');
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

  // Load saved settings
  chrome.storage.local.get(['va_settings'], (result) => {
    const raw = result.va_settings || {};
    if (raw.kerning !== undefined && raw.tracking === undefined) {
      raw.tracking = raw.kerning;
      raw.spacing = raw.kerning * 2.5;
    }
    currentSettings = { ...DEFAULT_SETTINGS, ...raw, tts: true, dictionary: true };
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

  function syncFontSizeUI(size) {
    const val = parseInt(size, 10) || 100;
    if (fontSizeSlider) fontSizeSlider.value = val;
    if (fontSizeVal) fontSizeVal.textContent = `${val}%`;
    if (fontSizeSelect) {
      const match = Array.from(fontSizeSelect.options).find(opt => parseInt(opt.value, 10) === val);
      if (match) {
        fontSizeSelect.value = String(val);
      } else {
        let customOpt = fontSizeSelect.querySelector('option[data-custom="true"]');
        if (!customOpt) {
          customOpt = document.createElement('option');
          customOpt.dataset.custom = "true";
          fontSizeSelect.appendChild(customOpt);
        }
        customOpt.value = String(val);
        customOpt.textContent = `${val}% (Custom)`;
        fontSizeSelect.value = String(val);
      }
    }
  }

  if (fontSizeSlider) {
    fontSizeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      currentSettings.fontSize = val;
      syncFontSizeUI(val);
      currentSettings.level = 0;
      levelBtns.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      });
      saveAndApply(currentSettings);
    });
  }

  if (fontSizeSelect) {
    fontSizeSelect.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10);
      currentSettings.fontSize = val;
      syncFontSizeUI(val);
      currentSettings.level = 0;
      levelBtns.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      });
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
      levelBtns.forEach(btn => btn.classList.remove('active'));
    });
  });

  // Force Left Align toggle
  leftAlignToggle.addEventListener('change', (e) => {
    currentSettings.forceLeftAlign = e.target.checked;
    currentSettings.level = 0;
    levelBtns.forEach(btn => btn.classList.remove('active'));
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
      levelBtns.forEach(btn => btn.classList.remove('active'));
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
    levelBtns.forEach(btn => {
      const isActive = parseInt(btn.dataset.level, 10) === settings.level;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    fontSelect.value = settings.font || 'OpenDyslexic';
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

    updateBadges(settings);
  }

  function saveAndApply(settings) {
    const toSave = { ...settings, tts: true, dictionary: true };
    chrome.storage.local.set({ va_settings: toSave }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'update_styles', settings: toSave }).catch(() => {});
        }
      });
    });
  }

  // Real-time synchronization when settings change from shortcuts or other tabs (Improvement 7)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.va_settings && changes.va_settings.newValue) {
      const fresh = { ...DEFAULT_SETTINGS, ...changes.va_settings.newValue, tts: true, dictionary: true };
      currentSettings = fresh;
      masterToggle.checked = fresh.isActive !== false;
      updateToggleUI(masterToggle.checked);
      updateUI(fresh);
    }
  });

});
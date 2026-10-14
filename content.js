/**
 * Visual Aide - Content Script
 * Client-side typographic and sensory interventions, color contrast, bionic reading, TTS, and simplified dictionary.
 */

const FONT_FACES = `
  @font-face {
    font-family: 'OpenDyslexic';
    src: url('${chrome.runtime.getURL('fonts/OpenDyslexic-Regular.woff')}') format('woff');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'OpenDyslexic';
    src: url('${chrome.runtime.getURL('fonts/OpenDyslexic-Bold.woff')}') format('woff');
    font-weight: 700;
    font-style: normal;
  }
  @font-face {
    font-family: 'Lexend';
    src: url('${chrome.runtime.getURL('fonts/Lexend-Regular.woff2')}') format('woff2');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'Atkinson Hyperlegible';
    src: url('${chrome.runtime.getURL('fonts/AtkinsonHyperlegible-Regular.woff2')}') format('woff2');
    font-weight: 400;
    font-style: normal;
  }
`;

const TINT_COLORS = {
  amber: { r: 255, g: 215, b: 150, hex: '#ffd796', name: 'Warm Amber' },
  peach: { r: 255, g: 205, b: 180, hex: '#ffcdb4', name: 'Warm Peach' },
  rose: { r: 255, g: 195, b: 205, hex: '#ffc3cd', name: 'Soft Rose' },
  mint: { r: 190, g: 240, b: 210, hex: '#bef0d2', name: 'Mint Green' },
  blue: { r: 190, g: 225, b: 255, hex: '#bee1ff', name: 'Sky Blue' },
  lavender: { r: 225, g: 210, b: 255, hex: '#e1d2ff', name: 'Lavender' },
  cream: { r: 255, g: 250, b: 205, hex: '#fffacd', name: 'Soft Cream' }
};

const CONTRAST_THEMES = {
  cream: { bg: '#fbf0d9', text: '#222222' },
  peach: { bg: '#fff0e5', text: '#252525' },
  mint: { bg: '#eaf5ea', text: '#1b2a1b' },
  navy: { bg: '#0d1b2a', text: '#ffd796' },
  dark: { bg: '#1e1e1e', text: '#e6e6e6' },
  inverted: { bg: '#000000', text: '#ffff00' }
};

let currentSettings = {
  isActive: true,
  level: 0,
  font: 'OpenDyslexic',
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
  tts: false,
  dictionary: true
};

let rulerEl = null;
let overlayEl = null;
let actionBadge = null;
let dictModal = null;
let currentUtterance = null;
let bionicObserver = null;

function setupStyleBlock() {
  let styleEl = document.getElementById('visual-aide-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'visual-aide-styles';
    (document.head || document.documentElement).appendChild(styleEl);
  }

  if (!currentSettings.isActive) {
    styleEl.textContent = '';
    document.documentElement.classList.remove('va-active', 'va-contrast-active', 'va-font-color-active');
    updateRuler(false);
    updateOverlay(0);
    removeBionicReading();
    removeActionBadge();
    removeDictModal();
    return;
  }

  document.documentElement.classList.add('va-active');

  const fontRule = (currentSettings.font && currentSettings.font !== 'inherit')
    ? `font-family: ${currentSettings.font} !important;`
    : '';

  const trackingRule = currentSettings.tracking > 0
    ? `letter-spacing: ${currentSettings.tracking}px !important;`
    : '';

  const spacingRule = currentSettings.spacing > 0
    ? `word-spacing: ${currentSettings.spacing}px !important;`
    : '';

  const paragraphSpacingRule = currentSettings.paragraphSpacing > 0
    ? `margin-bottom: ${currentSettings.paragraphSpacing}px !important;`
    : '';

  const leftAlignRule = currentSettings.forceLeftAlign
    ? `text-align: left !important;`
    : '';

  const leadingRule = currentSettings.leading
    ? `line-height: ${currentSettings.leading} !important;`
    : '';

  // Irlen Color Contrast & Background Handling
  let contrastRules = '';
  if (currentSettings.contrastMode && currentSettings.contrastMode !== 'default') {
    document.documentElement.classList.add('va-contrast-active');
    const resolvedBg = currentSettings.contrastMode === 'custom'
      ? (currentSettings.customBgColor || '#fbf0d9')
      : (CONTRAST_THEMES[currentSettings.contrastMode]?.bg || '#fbf0d9');

    contrastRules = `
      html.va-contrast-active,
      html.va-contrast-active body {
        background-color: ${resolvedBg} !important;
        background-image: none !important;
      }
      html.va-contrast-active :is(article, section, main, div:not([class*="icon"]):not(#visual-aide-overlay):not(#visual-aide-ruler):not(#va-action-badge):not(#va-dict-modal)) {
        background-color: transparent !important;
      }
    `;
  } else {
    document.documentElement.classList.remove('va-contrast-active');
  }

  // Font Color Handling
  let fontColorRules = '';
  let resolvedFontColor = null;
  if (currentSettings.fontColor && currentSettings.fontColor !== 'default') {
    resolvedFontColor = currentSettings.fontColor === 'custom'
      ? (currentSettings.customFontColor || '#111111')
      : currentSettings.fontColor;
  } else if (currentSettings.contrastMode && currentSettings.contrastMode !== 'default') {
    resolvedFontColor = currentSettings.contrastMode === 'custom'
      ? (currentSettings.customFontColor || '#111111')
      : (CONTRAST_THEMES[currentSettings.contrastMode]?.text || '#222222');
  }

  if (resolvedFontColor) {
    document.documentElement.classList.add('va-font-color-active');
    fontColorRules = `
      html.va-font-color-active body,
      html.va-font-color-active :is(p, h1, h2, h3, h4, h5, h6, span, a, li, td, th, dt, dd, blockquote, label, button, input:not([type="checkbox"]):not([type="radio"]), textarea):not([class*="icon"]):not([class*="fa"]):not([class*="material"]):not(svg *) {
        color: ${resolvedFontColor} !important;
        -webkit-text-fill-color: ${resolvedFontColor} !important;
      }
    `;
  } else {
    document.documentElement.classList.remove('va-font-color-active');
  }

  styleEl.textContent = `
    /* Font Face Definitions */
    ${FONT_FACES}

    /* Primary text styling applied across standard textual elements */
    html.va-active body,
    html.va-active p,
    html.va-active li,
    html.va-active dt,
    html.va-active dd,
    html.va-active blockquote,
    html.va-active q,
    html.va-active figcaption,
    html.va-active article,
    html.va-active section,
    html.va-active label,
    html.va-active td,
    html.va-active th,
    html.va-active summary,
    html.va-active span,
    html.va-active a,
    html.va-active h1,
    html.va-active h2,
    html.va-active h3,
    html.va-active h4,
    html.va-active h5,
    html.va-active h6,
    html.va-active button,
    html.va-active input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]),
    html.va-active textarea {
      ${fontRule}
      ${trackingRule}
      ${spacingRule}
    }

    /* Block text flow: line-height (leading), paragraph margins, and alignment */
    html.va-active p,
    html.va-active li,
    html.va-active dt,
    html.va-active dd,
    html.va-active blockquote,
    html.va-active figcaption,
    html.va-active article,
    html.va-active section,
    html.va-active td,
    html.va-active th,
    html.va-active label {
      ${leadingRule}
      ${paragraphSpacingRule}
      ${leftAlignRule}
    }

    /* Headings line height and alignment */
    html.va-active h1,
    html.va-active h2,
    html.va-active h3,
    html.va-active h4,
    html.va-active h5,
    html.va-active h6 {
      ${leadingRule}
      ${leftAlignRule}
    }

    /* Color Contrast & Font Color Injections */
    ${contrastRules}
    ${fontColorRules}

    /* Protect Code & Monospace blocks */
    html.va-active pre,
    html.va-active pre *,
    html.va-active code,
    html.va-active code *,
    html.va-active kbd,
    html.va-active samp,
    html.va-active .hljs,
    html.va-active [class*="highlight"],
    html.va-active [class*="mono"],
    html.va-active [class*="code"] {
      font-family: inherit !important;
      letter-spacing: normal !important;
      word-spacing: normal !important;
    }

    /* Protect Icon fonts, SVG icons, and icon elements */
    html.va-active [class*="icon"],
    html.va-active [class*="fa-"],
    html.va-active [class*="fa"],
    html.va-active [class*="material-symbols"],
    html.va-active [class*="material-icons"],
    html.va-active [class*="glyphicon"],
    html.va-active [class*="ri-"],
    html.va-active [class*="bi-"],
    html.va-active [data-icon],
    html.va-active i[class],
    html.va-active svg,
    html.va-active svg * {
      font-family: inherit !important;
      letter-spacing: normal !important;
      word-spacing: normal !important;
    }

    /* Bionic Reading Fixation Styling */
    .va-bionic-fix {
      font-weight: 700 !important;
      opacity: 1 !important;
    }

    /* Floating Action Badge (TTS & Define) */
    #va-action-badge {
      position: absolute;
      z-index: 2147483647;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background: #111;
      color: #00ffcc;
      border: 1px solid rgba(0, 255, 204, 0.4);
      border-radius: 20px;
      font-family: system-ui, sans-serif !important;
      font-size: 12px !important;
      font-weight: 600;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
      user-select: none;
      letter-spacing: normal !important;
      word-spacing: normal !important;
      line-height: 1 !important;
    }
    .va-action-chip {
      background: transparent;
      border: none;
      color: #00ffcc;
      padding: 4px 8px;
      border-radius: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      transition: background 0.15s ease;
    }
    .va-action-chip:hover {
      background: rgba(0, 255, 204, 0.2);
    }
    .va-chip-divider {
      width: 1px;
      height: 14px;
      background: #444;
    }

    /* In-Page Dictionary Popover Modal */
    #va-dict-modal {
      position: fixed;
      z-index: 2147483647;
      background: #181818;
      color: #f0f0f0;
      width: 340px;
      max-width: 90vw;
      border-radius: 12px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
      border: 1px solid #333;
      padding: 18px;
      font-family: system-ui, sans-serif !important;
      font-size: 14px !important;
      letter-spacing: normal !important;
      word-spacing: normal !important;
      line-height: normal !important;
    }
    .va-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .va-modal-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #00ffcc;
      margin: 0;
      text-transform: capitalize;
    }
    .va-modal-close {
      background: transparent;
      border: none;
      color: #888;
      font-size: 1.4rem;
      cursor: pointer;
      line-height: 1;
    }
    .va-modal-close:hover { color: #fff; }
    .va-modal-badges {
      display: flex;
      gap: 6px;
      margin-bottom: 10px;
    }
    .va-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      text-transform: uppercase;
      background: #333;
      color: #bbb;
    }
    .va-badge.source {
      background: rgba(0, 255, 204, 0.15);
      color: #00ffcc;
    }
    .va-def-text {
      font-size: 13.5px;
      line-height: 1.45;
      color: #fff;
      margin: 0 0 10px 0;
    }
    .va-syn-box {
      margin-top: 8px;
      font-size: 12px;
    }
    .va-syn-label {
      color: #888;
      display: block;
      margin-bottom: 4px;
    }
    .va-syn-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .va-syn-chip {
      background: #252525;
      color: #00ffcc;
      padding: 2px 7px;
      border-radius: 10px;
      font-size: 11px;
    }
  `;

  updateOverlay(currentSettings.overlay || 0, currentSettings.tintColor || 'amber');
  updateRuler(Boolean(currentSettings.ruler), currentSettings.rulerMode || 'bar', currentSettings.rulerHeight || 40);

  if (currentSettings.bionic) {
    applyBionicReading();
  } else {
    removeBionicReading();
  }
}

// -------------------------------------------------------------
// Warm Glare Tint (Overlay)
// -------------------------------------------------------------
function updateOverlay(opacity, colorKey) {
  if (opacity <= 0 || !currentSettings.isActive) {
    if (overlayEl) overlayEl.style.display = 'none';
    return;
  }

  if (!overlayEl) {
    overlayEl = document.createElement('div');
    overlayEl.id = 'visual-aide-overlay';
    (document.body || document.documentElement).appendChild(overlayEl);
  }

  const tint = TINT_COLORS[colorKey] || TINT_COLORS.amber;

  Object.assign(overlayEl.style, {
    display: 'block',
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: '2147483645',
    backgroundColor: `rgba(${tint.r}, ${tint.g}, ${tint.b}, ${opacity})`,
    mixBlendMode: 'normal',
    transition: 'background-color 0.2s ease, opacity 0.2s ease'
  });
}

// -------------------------------------------------------------
// Reading Focus Guide (Ruler & Mask)
// -------------------------------------------------------------
function handleMouseMove(e) {
  if (rulerEl && currentSettings.isActive && currentSettings.ruler) {
    const height = currentSettings.rulerHeight || 40;
    rulerEl.style.top = `${e.clientY - Math.floor(height / 2)}px`;
  }
}

function updateRuler(enabled, mode = 'bar', height = 40) {
  if (!enabled || !currentSettings.isActive) {
    if (rulerEl) rulerEl.style.display = 'none';
    window.removeEventListener('mousemove', handleMouseMove);
    return;
  }

  if (!rulerEl) {
    rulerEl = document.createElement('div');
    rulerEl.id = 'visual-aide-ruler';
    (document.body || document.documentElement).appendChild(rulerEl);
  }

  if (mode === 'mask') {
    Object.assign(rulerEl.style, {
      display: 'block',
      position: 'fixed',
      left: '0',
      width: '100vw',
      height: `${height}px`,
      pointerEvents: 'none',
      zIndex: '2147483646',
      background: 'transparent',
      borderTop: '1px solid rgba(0, 255, 204, 0.65)',
      borderBottom: '1px solid rgba(0, 255, 204, 0.65)',
      boxShadow: '0 0 0 99999px rgba(0, 0, 0, 0.52)'
    });
  } else {
    Object.assign(rulerEl.style, {
      display: 'block',
      position: 'fixed',
      left: '0',
      width: '100vw',
      height: `${height}px`,
      pointerEvents: 'none',
      zIndex: '2147483646',
      background: 'rgba(0, 255, 204, 0.12)',
      borderTop: '2px solid rgba(0, 255, 204, 0.6)',
      borderBottom: '2px solid rgba(0, 255, 204, 0.6)',
      boxShadow: '0 0 16px rgba(0, 0, 0, 0.25)'
    });
  }

  window.addEventListener('mousemove', handleMouseMove, { passive: true });
}

// -------------------------------------------------------------
// Bionic Reading (Saccadic Reading Anchor)
// -------------------------------------------------------------
function processTextForBionic(text) {
  const tokens = text.split(/(\s+)/);
  let html = '';
  for (const token of tokens) {
    if (!token) continue;
    if (/^\s+$/.test(token)) {
      html += token;
    } else {
      const match = token.match(/^([^\w\d]*)([\w\d]+)(.*)$/i);
      if (match) {
        const prefix = match[1];
        const word = match[2];
        const suffix = match[3];
        const half = Math.ceil(word.length * 0.45) || 1;
        const boldPart = word.slice(0, half);
        const restPart = word.slice(half);
        html += `${prefix}<b class="va-bionic-fix">${boldPart}</b>${restPart}${suffix}`;
      } else {
        html += token;
      }
    }
  }
  return html;
}

function bionifyElement(el) {
  if (!el || el.dataset.vaBionified) return;
  el.dataset.vaBionified = 'true';

  const childNodes = Array.from(el.childNodes);
  for (const node of childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue && node.nodeValue.trim().length > 0) {
      const span = document.createElement('span');
      span.className = 'va-bionic-applied';
      span.dataset.origText = node.nodeValue;
      span.innerHTML = processTextForBionic(node.nodeValue);
      node.replaceWith(span);
    }
  }
}

function applyBionicReading() {
  if (!document.body) return;
  const elements = document.querySelectorAll(
    'p, article p, section p, li, blockquote, dd, dt, h1, h2, h3, h4, h5, h6'
  );
  elements.forEach(bionifyElement);

  if (!bionicObserver) {
    bionicObserver = new MutationObserver((mutations) => {
      if (!currentSettings.isActive || !currentSettings.bionic) return;
      for (const mutation of mutations) {
        for (const added of mutation.addedNodes) {
          if (added.nodeType === Node.ELEMENT_NODE) {
            if (added.matches && added.matches('p, li, blockquote, h1, h2, h3, h4, h5, h6')) {
              bionifyElement(added);
            }
            if (added.querySelectorAll) {
              added.querySelectorAll('p, li, blockquote, h1, h2, h3, h4, h5, h6').forEach(bionifyElement);
            }
          }
        }
      }
    });
    bionicObserver.observe(document.body, { childList: true, subtree: true });
  }
}

function removeBionicReading() {
  if (bionicObserver) {
    bionicObserver.disconnect();
    bionicObserver = null;
  }

  document.querySelectorAll('.va-bionic-applied').forEach((span) => {
    const text = span.dataset.origText || span.textContent;
    const textNode = document.createTextNode(text);
    const parent = span.parentNode;
    if (parent) {
      span.replaceWith(textNode);
      parent.normalize();
    }
  });

  document.querySelectorAll('[data-va-bionified]').forEach((el) => {
    delete el.dataset.vaBionified;
  });
}

// -------------------------------------------------------------
// Interactive Action Badge (TTS & Simplified Dictionary)
// -------------------------------------------------------------
function handleTextSelection(e) {
  if (!currentSettings.isActive) {
    removeActionBadge();
    return;
  }

  // Avoid dismissing if clicked on the badge or modal
  if (actionBadge && actionBadge.contains(e.target)) return;
  if (dictModal && dictModal.contains(e.target)) return;

  const selection = window.getSelection();
  const text = selection ? selection.toString().trim() : '';

  if (!text || text.length < 2) {
    removeActionBadge();
    return;
  }

  try {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    showActionBadge(rect.left + window.scrollX, rect.bottom + window.scrollY + 8, text);
  } catch (err) {}
}

function showActionBadge(x, y, text) {
  if (!actionBadge) {
    actionBadge = document.createElement('div');
    actionBadge.id = 'va-action-badge';
    document.body.appendChild(actionBadge);
  }

  const isSingleWord = !/\s/.test(text) && text.length < 30;

  let html = `
    <button class="va-action-chip" id="va-tts-btn">🔊 Read</button>
  `;

  if (currentSettings.dictionary && isSingleWord) {
    html += `
      <span class="va-chip-divider"></span>
      <button class="va-action-chip" id="va-dict-btn">📖 Define</button>
    `;
  }

  actionBadge.innerHTML = html;
  actionBadge.style.left = `${Math.max(10, Math.min(window.innerWidth - 180, x))}px`;
  actionBadge.style.top = `${y}px`;
  actionBadge.style.display = 'inline-flex';

  // Wire TTS button
  const ttsBtn = document.getElementById('va-tts-btn');
  if (ttsBtn) {
    ttsBtn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      speakText(text, ttsBtn);
    };
  }

  // Wire Define button
  const dictBtn = document.getElementById('va-dict-btn');
  if (dictBtn) {
    dictBtn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      openInPageDictionary(text, x, y);
      removeActionBadge();
    };
  }
}

function speakText(text, btnEl) {
  if (!window.speechSynthesis) return;

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    if (btnEl) btnEl.innerHTML = '🔊 Read';
    return;
  }

  if (btnEl) btnEl.innerHTML = '⏹ Stop';
  currentUtterance = new SpeechSynthesisUtterance(text);
  currentUtterance.rate = 0.95;
  currentUtterance.onend = () => { if (btnEl) btnEl.innerHTML = '🔊 Read'; };
  currentUtterance.onerror = () => { if (btnEl) btnEl.innerHTML = '🔊 Read'; };
  window.speechSynthesis.speak(currentUtterance);
}

function removeActionBadge() {
  if (actionBadge) {
    actionBadge.style.display = 'none';
  }
}

// -------------------------------------------------------------
// In-Page Simplified Dictionary Modal
// -------------------------------------------------------------
async function openInPageDictionary(word, x, y) {
  if (!dictModal) {
    dictModal = document.createElement('div');
    dictModal.id = 'va-dict-modal';
    document.body.appendChild(dictModal);
  }

  // Position nicely near the clicked point
  const posX = Math.max(16, Math.min(window.innerWidth - 360, x));
  const posY = Math.min(window.innerHeight - 240, y - window.scrollY);

  dictModal.style.left = `${posX}px`;
  dictModal.style.top = `${posY}px`;
  dictModal.style.display = 'block';

  dictModal.innerHTML = `
    <div class="va-modal-header">
      <h4 class="va-modal-title">${word}</h4>
      <button class="va-modal-close" id="va-dict-close">&times;</button>
    </div>
    <div class="va-def-text">Searching simplified definition...</div>
  `;

  document.getElementById('va-dict-close').onclick = removeDictModal;

  let entry = null;

  // 1. Instant check against local offline database with stems
  const clean = word.toLowerCase().replace(/[^a-z0-9'-]/g, '').trim();
  const stems = (typeof getStemCandidates === 'function') ? getStemCandidates(clean) : [clean];
  for (const stem of stems) {
    if (typeof SIMPLIFIED_OFFLINE_DB !== 'undefined' && SIMPLIFIED_OFFLINE_DB[stem]) {
      const item = SIMPLIFIED_OFFLINE_DB[stem];
      entry = {
        word: clean,
        rootWord: stem !== clean ? stem : '',
        pos: item.pos,
        definition: item.def,
        synonyms: item.synonyms || [],
        example: item.example || '',
        source: 'offline'
      };
      break;
    }
  }

  // 2. If not offline, query background service worker (bypasses page CSP and has strict 2.5s timeout)
  if (!entry) {
    try {
      entry = await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(null), 3000);
        chrome.runtime.sendMessage({ action: 'lookup_word', word: clean }, (resp) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError || !resp) {
            resolve(null);
          } else {
            resolve(resp);
          }
        });
      });
    } catch (e) {
      entry = null;
    }
  }

  // 3. Fallback to direct lookup if background didn't return
  if (!entry && typeof lookupSimplifiedWord === 'function') {
    try {
      entry = await lookupSimplifiedWord(clean);
    } catch (e) {
      entry = null;
    }
  }

  if (entry) {
    let synHtml = '';
    if (entry.synonyms && entry.synonyms.length > 0) {
      synHtml = `
        <div class="va-syn-box">
          <span class="va-syn-label">Simpler Words:</span>
          <div class="va-syn-chips">
            ${entry.synonyms.map(s => `<span class="va-syn-chip">${s}</span>`).join('')}
          </div>
        </div>
      `;
    }

    dictModal.innerHTML = `
      <div class="va-modal-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <h4 class="va-modal-title">${entry.word}</h4>
          <button class="va-action-chip" id="va-word-speak" style="padding: 2px 6px;">🔊</button>
        </div>
        <button class="va-modal-close" id="va-dict-close">&times;</button>
      </div>
      <div class="va-modal-badges">
        <span class="va-badge">${entry.pos || 'term'}</span>
        <span class="va-badge source">${entry.source || 'dictionary'}</span>
      </div>
      <div class="va-def-text">${entry.definition}</div>
      ${synHtml}
    `;

    document.getElementById('va-dict-close').onclick = removeDictModal;
    document.getElementById('va-word-speak').onclick = () => {
      if (window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(entry.word);
        u.rate = 0.85;
        window.speechSynthesis.speak(u);
      }
    };
  } else {
    dictModal.innerHTML = `
      <div class="va-modal-header">
        <h4 class="va-modal-title">${word}</h4>
        <button class="va-modal-close" id="va-dict-close">&times;</button>
      </div>
      <div class="va-def-text">A simple definition for "${word}" could not be found.</div>
    `;
    document.getElementById('va-dict-close').onclick = removeDictModal;
  }
}

function removeDictModal() {
  if (dictModal) {
    dictModal.style.display = 'none';
  }
}

// -------------------------------------------------------------
// Event Listeners & State Sync
// -------------------------------------------------------------
document.addEventListener('mouseup', handleTextSelection);

function applyAll(settings) {
  if (settings.kerning !== undefined && settings.tracking === undefined) {
    settings.tracking = settings.kerning;
    settings.spacing = settings.kerning * 2.5;
  }

  currentSettings = { ...currentSettings, ...settings };
  setupStyleBlock();
}

function boot() {
  chrome.storage.local.get(['va_settings'], (result) => {
    if (result.va_settings) {
      applyAll(result.va_settings);
    } else {
      applyAll(currentSettings);
    }
  });
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'update_styles' && request.settings) {
    applyAll(request.settings);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.va_settings?.newValue) {
    applyAll(changes.va_settings.newValue);
  }
});

boot();
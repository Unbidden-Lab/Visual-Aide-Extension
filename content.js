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
  tts: true,
  dictionary: true
};

let rulerEl = null;
let rulerRafId = null;
let lastMouseY = 0;
let lastFocusedElement = null;

// SpeechSynthesis chunk queue and heartbeat state
let ttsQueue = [];
let ttsActiveIndex = 0;
let ttsHeartbeatTimer = null;
let activeTtsBtn = null;
let overlayEl = null;
let actionBadge = null;
let dictModal = null;
let currentUtterance = null;
let bionicObserver = null;
let bionicBatchRafId = null;
const bionicDirtyRoots = new Set();

function applyCssVariables() {
  const root = document.documentElement;
  if (!currentSettings.isActive) return;

  if (currentSettings.font && currentSettings.font !== 'inherit') {
    root.style.setProperty('--va-font-family', currentSettings.font);
  } else {
    root.style.removeProperty('--va-font-family');
  }

  root.style.setProperty('--va-tracking', String(currentSettings.tracking || 0) + 'px');
  root.style.setProperty('--va-spacing', String(currentSettings.spacing || 0) + 'px');
  root.style.setProperty('--va-leading', String(currentSettings.leading || 1.5));
  root.style.setProperty('--va-paragraph-spacing', String(currentSettings.paragraphSpacing || 0) + 'px');
  root.style.setProperty('--va-text-align', currentSettings.forceLeftAlign ? 'left' : 'inherit');
}

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
  applyCssVariables();

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
      html.va-contrast-active :is(main, [role="main"], article, section) {
        background-color: ${resolvedBg} !important;
      }
      /* Clean text background without breaking opaque cards or modals */
      html.va-contrast-active :is(p, h1, h2, h3, h4, h5, h6, li, blockquote, dt, dd, span):not([class*="badge"]):not([class*="chip"]):not([class*="tag"]):not([class*="btn"]):not(button) {
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
      html.va-font-color-active :is(p, h1, h2, h3, h4, h5, h6, span, a, li, td, th, dt, dd, blockquote, label, button, b, strong, .va-bionic-fix, input:not([type="checkbox"]):not([type="radio"]), textarea):not([class*="icon"]):not([class*="fa"]):not([class*="material"]):not(svg *) {
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
      font-family: var(--va-font-family, inherit) !important;
      letter-spacing: var(--va-tracking, normal) !important;
      word-spacing: var(--va-spacing, normal) !important;
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
      line-height: var(--va-leading, inherit) !important;
      margin-bottom: var(--va-paragraph-spacing, 0px) !important;
      text-align: var(--va-text-align, inherit) !important;
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
      color: inherit !important;
      -webkit-text-fill-color: inherit !important;
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
  lastMouseY = e.clientY;
  if (rulerRafId === null) {
    rulerRafId = requestAnimationFrame(() => {
      rulerRafId = null;
      if (rulerEl && currentSettings.isActive && currentSettings.ruler) {
        const height = currentSettings.rulerHeight || 40;
        rulerEl.style.top = (lastMouseY - Math.floor(height / 2)) + 'px';
      }
    });
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
// Bionic Reading (Saccadic Reading Anchor for Static & Dynamic SPAs)
// -------------------------------------------------------------
const BIONIC_EXCLUDED_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'IFRAME', 'OBJECT',
  'EMBED', 'CANVAS', 'SVG', 'AUDIO', 'VIDEO', 'CODE', 'PRE',
  'KBD', 'SAMP', 'VAR', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'MATH'
]);

const BIONIC_EXCLUDED_SELECTOR = [
  '[contenteditable="true"]',
  '[contenteditable=""]',
  '[role="textbox"]',
  '[role="combobox"]',
  '[data-lexical-editor="true"]',
  'code',
  'pre',
  'kbd',
  'samp',
  '#visual-aide-overlay',
  '#visual-aide-ruler',
  '#va-action-badge',
  '#va-dict-modal',
  '#visual-aide-styles'
].join(', ');

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function processTextForBionic(text) {
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

function isElementExcludedFromBionic(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return true;

  if (BIONIC_EXCLUDED_TAGS.has(el.tagName)) return true;

  if (el.classList.contains('va-bionic-applied') || el.classList.contains('va-bionic-fix')) {
    return true;
  }

  if (el.isContentEditable) return true;
  if (el.getAttribute('contenteditable') === 'true' || el.getAttribute('contenteditable') === '') return true;
  if (el.getAttribute('role') === 'textbox' || el.getAttribute('role') === 'combobox') return true;

  if (el.closest(BIONIC_EXCLUDED_SELECTOR)) {
    return true;
  }

  // Protect icon fonts and icon elements
  const cls = (typeof el.className === 'string') ? el.className : '';
  if (
    cls.includes('icon') ||
    cls.includes('material-') ||
    cls.includes('fa-') ||
    cls.includes('glyphicon') ||
    cls.includes('bi-') ||
    cls.includes('ri-') ||
    el.hasAttribute('data-icon')
  ) {
    return true;
  }

  return false;
}

function bionifySubtree(root) {
  if (!root || !root.isConnected) return;

  if (root.nodeType === Node.ELEMENT_NODE && isElementExcludedFromBionic(root)) {
    return;
  }

  const candidateTextNodes = [];
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue || !/[a-zA-Z0-9]{2,}/.test(node.nodeValue)) {
          return NodeFilter.FILTER_REJECT;
        }

        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        if (isElementExcludedFromBionic(parent)) {
          return NodeFilter.FILTER_REJECT;
        }

        if (parent.closest('.va-bionic-applied, .va-bionic-fix')) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let currentNode;
  while ((currentNode = walker.nextNode())) {
    candidateTextNodes.push(currentNode);
  }

  for (const textNode of candidateTextNodes) {
    if (!textNode.isConnected) continue;
    const parent = textNode.parentElement;
    if (!parent || parent.closest('.va-bionic-applied, .va-bionic-fix')) continue;
    if (isElementExcludedFromBionic(parent)) continue;

    const origText = textNode.nodeValue;
    if (!origText || !/[a-zA-Z0-9]{2,}/.test(origText)) continue;

    const span = document.createElement('span');
    span.className = 'va-bionic-applied';
    span.dataset.origText = origText;
    span.innerHTML = processTextForBionic(origText);
    textNode.replaceWith(span);
  }
}

function consolidateBionicRoots(nodeSet) {
  const nodes = Array.from(nodeSet).filter(node => node && node.isConnected);
  if (nodes.length <= 1) return nodes;

  if (nodes.some(n => n === document.body || n === document.documentElement)) {
    return [document.body];
  }

  const result = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    let isContained = false;
    for (let j = 0; j < nodes.length; j++) {
      if (i !== j && nodes[j].contains(node)) {
        isContained = true;
        break;
      }
    }
    if (!isContained) {
      result.push(node);
    }
  }
  return result;
}

function processBionicBatch() {
  bionicBatchRafId = null;
  if (!currentSettings.isActive || !currentSettings.bionic || !document.body) {
    bionicDirtyRoots.clear();
    return;
  }

  // Temporarily disconnect observer to prevent self-triggering
  if (bionicObserver) {
    bionicObserver.disconnect();
  }

  try {
    const roots = consolidateBionicRoots(bionicDirtyRoots);
    bionicDirtyRoots.clear();

    for (const root of roots) {
      bionifySubtree(root);
    }
  } finally {
    // Re-attach observer to resume monitoring client-side mutations
    if (bionicObserver && currentSettings.isActive && currentSettings.bionic && document.body) {
      bionicObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  }
}

function scheduleBionicBatch(targetNode) {
  if (targetNode) {
    bionicDirtyRoots.add(targetNode);
  }

  if (bionicBatchRafId !== null) return;

  bionicBatchRafId = requestAnimationFrame(processBionicBatch);
}

function handleBionicMutations(mutations) {
  if (!currentSettings.isActive || !currentSettings.bionic) return;

  let hasRelevantMutations = false;

  for (let i = 0; i < mutations.length; i++) {
    const mutation = mutations[i];
    const target = mutation.target;
    if (!target) continue;

    if (target.nodeType === Node.ELEMENT_NODE && isElementExcludedFromBionic(target)) {
      continue;
    }

    if (mutation.type === 'childList') {
      const added = mutation.addedNodes;
      for (let j = 0; j < added.length; j++) {
        const node = added[j];
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (!isElementExcludedFromBionic(node)) {
            bionicDirtyRoots.add(node);
            hasRelevantMutations = true;
          }
        } else if (node.nodeType === Node.TEXT_NODE) {
          const parent = node.parentElement;
          if (parent && !isElementExcludedFromBionic(parent)) {
            bionicDirtyRoots.add(parent);
            hasRelevantMutations = true;
          }
        }
      }

      if (mutation.removedNodes.length > 0 && target.nodeType === Node.ELEMENT_NODE) {
        if (!isElementExcludedFromBionic(target)) {
          bionicDirtyRoots.add(target);
          hasRelevantMutations = true;
        }
      }
    } else if (mutation.type === 'characterData') {
      const parent = target.parentElement;
      if (parent) {
        const bionicWrapper = parent.closest('.va-bionic-applied');
        if (bionicWrapper && bionicWrapper.parentElement) {
          bionicDirtyRoots.add(bionicWrapper.parentElement);
          hasRelevantMutations = true;
        } else if (!isElementExcludedFromBionic(parent)) {
          bionicDirtyRoots.add(parent);
          hasRelevantMutations = true;
        }
      }
    }
  }

  if (hasRelevantMutations) {
    scheduleBionicBatch();
  }
}

function applyBionicReading() {
  if (!document.body) return;

  if (!bionicObserver) {
    bionicObserver = new MutationObserver(handleBionicMutations);
  }

  scheduleBionicBatch(document.body);
  initSpaNavigation();
}

function removeBionicReading() {
  if (bionicObserver) {
    bionicObserver.disconnect();
    bionicObserver = null;
  }

  if (bionicBatchRafId !== null) {
    cancelAnimationFrame(bionicBatchRafId);
    bionicBatchRafId = null;
  }
  bionicDirtyRoots.clear();

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

function initSpaNavigation() {
  if (window.__vaSpaInitialized) return;
  window.__vaSpaInitialized = true;

  const handleSpaTransition = () => {
    if (currentSettings.isActive && currentSettings.bionic && document.body) {
      scheduleBionicBatch(document.body);
    }
  };

  window.addEventListener('popstate', handleSpaTransition);
  window.addEventListener('hashchange', handleSpaTransition);
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
    <button class="va-action-chip" id="va-tts-btn" aria-label="Read selected text aloud">Read</button>
  `;

  if (currentSettings.dictionary && isSingleWord) {
    html += `
      <span class="va-chip-divider"></span>
      <button class="va-action-chip" id="va-dict-btn" aria-label="Look up word in simplified dictionary">Define</button>
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

function chunkTextForTts(text) {
  if (!text) return [];
  const sentences = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [text];
  const chunks = [];
  let current = '';
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i].trim();
    if (!s) continue;
    if ((current + ' ' + s).length > 180 && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += (current ? ' ' : '') + s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function startTtsHeartbeat() {
  stopTtsHeartbeat();
  ttsHeartbeatTimer = setInterval(() => {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    } else {
      stopTtsHeartbeat();
    }
  }, 10000);
}

function stopTtsHeartbeat() {
  if (ttsHeartbeatTimer) {
    clearInterval(ttsHeartbeatTimer);
    ttsHeartbeatTimer = null;
  }
}

function stopTtsPlayback() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  stopTtsHeartbeat();
  ttsQueue = [];
  ttsActiveIndex = 0;
  if (activeTtsBtn) {
    activeTtsBtn.innerHTML = 'Read';
    activeTtsBtn.setAttribute('aria-label', 'Read selected text aloud');
    activeTtsBtn = null;
  }
}

function playNextTtsChunk() {
  if (!window.speechSynthesis || ttsActiveIndex >= ttsQueue.length) {
    stopTtsPlayback();
    return;
  }

  const chunk = ttsQueue[ttsActiveIndex];
  currentUtterance = new SpeechSynthesisUtterance(chunk);
  currentUtterance.rate = 0.95;

  currentUtterance.onend = () => {
    ttsActiveIndex++;
    playNextTtsChunk();
  };

  currentUtterance.onerror = (err) => {
    console.warn('TTS chunk error:', err);
    stopTtsPlayback();
  };

  window.speechSynthesis.speak(currentUtterance);
}

function speakText(text, btnEl) {
  if (!window.speechSynthesis) return;

  if (window.speechSynthesis.speaking || ttsQueue.length > 0) {
    stopTtsPlayback();
    return;
  }

  const chunks = chunkTextForTts(text);
  if (chunks.length === 0) return;

  activeTtsBtn = btnEl;
  if (btnEl) {
    btnEl.innerHTML = 'Stop';
    btnEl.setAttribute('aria-label', 'Stop read aloud playback');
  }

  ttsQueue = chunks;
  ttsActiveIndex = 0;
  startTtsHeartbeat();
  playNextTtsChunk();
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
    dictModal.setAttribute('role', 'dialog');
    dictModal.setAttribute('aria-modal', 'true');
    dictModal.setAttribute('aria-labelledby', 'va-modal-title');
    document.body.appendChild(dictModal);
  }

  lastFocusedElement = document.activeElement;

  // Viewport-relative clamping to prevent clipping off screen edges
  const modalWidth = 340;
  const modalHeight = 250;
  const clientX = x - window.scrollX;
  const clientY = y - window.scrollY;

  let posX = Math.max(16, Math.min(window.innerWidth - modalWidth - 16, clientX));
  let posY = clientY + 12;

  // If opening below would overflow bottom of viewport, position above
  if (posY + modalHeight > window.innerHeight - 16) {
    posY = Math.max(16, clientY - modalHeight - 12);
  }

  dictModal.style.left = posX + 'px';
  dictModal.style.top = posY + 'px';
  dictModal.style.display = 'block';

  dictModal.innerHTML = `
    <div class="va-modal-header">
      <h4 class="va-modal-title" id="va-modal-title">${word}</h4>
      <button class="va-modal-close" id="va-dict-close" aria-label="Close dictionary definition">&times;</button>
    </div>
    <div class="va-def-text">Searching simplified definition...</div>
  `;

  document.getElementById('va-dict-close').onclick = removeDictModal;

  let entry = null;
  const clean = word.toLowerCase().replace(/[^a-z0-9'-]/g, '').trim();

  // Route query through background service worker (CSP-safe, uses shared offline cache)
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
          <h4 class="va-modal-title" id="va-modal-title">${entry.word}</h4>
          <button class="va-action-chip" id="va-word-speak" style="padding: 2px 6px;" aria-label="Pronounce ${entry.word}">Pronounce</button>
        </div>
        <button class="va-modal-close" id="va-dict-close" aria-label="Close dictionary definition">&times;</button>
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
        <h4 class="va-modal-title" id="va-modal-title">${word}</h4>
        <button class="va-modal-close" id="va-dict-close" aria-label="Close dictionary definition">&times;</button>
      </div>
      <div class="va-def-text">A simple definition for "${word}" could not be found.</div>
    `;
    document.getElementById('va-dict-close').onclick = removeDictModal;
  }

  // Focus close button for keyboard accessibility
  setTimeout(() => {
    document.getElementById('va-dict-close')?.focus();
  }, 50);
}

function removeDictModal() {
  if (dictModal) {
    dictModal.style.display = 'none';
  }
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    try {
      lastFocusedElement.focus();
    } catch (e) {}
    lastFocusedElement = null;
  }
}

// -------------------------------------------------------------
// Event Listeners & State Sync
// -------------------------------------------------------------
document.addEventListener('mouseup', handleTextSelection);

document.addEventListener('dblclick', (e) => {
  if (!currentSettings.isActive) return;
  if (actionBadge && actionBadge.contains(e.target)) return;
  if (dictModal && dictModal.contains(e.target)) return;

  const selection = window.getSelection();
  const text = selection ? selection.toString().trim() : '';
  if (text && text.length >= 2 && !/\s/.test(text) && text.length < 30) {
    removeActionBadge();
    openInPageDictionary(text, e.pageX || e.clientX, (e.pageY || e.clientY) + 10);
  }
});

function applyAll(settings) {
  if (settings.kerning !== undefined && settings.tracking === undefined) {
    settings.tracking = settings.kerning;
    settings.spacing = settings.kerning * 2.5;
  }

  currentSettings = { ...currentSettings, ...settings, tts: true, dictionary: true };
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
// Dismiss modals, popovers, and badges on Escape (Improvement 5)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (dictModal && dictModal.style.display !== 'none') {
      removeDictModal();
    } else if (actionBadge && actionBadge.style.display !== 'none') {
      removeActionBadge();
    }
  }
});

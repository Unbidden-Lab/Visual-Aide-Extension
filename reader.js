/**
 * Visual Aide - Accessible PDF Reader Controller
 * Complete offline & online support for reading downloaded documents and PDFs.
 */

// Configure PDF.js Worker to local bundled worker
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
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

let currentReaderSettings = {
  font: 'OpenDyslexic',
  fontSize: 18,
  tracking: 0,
  spacing: 0,
  leading: 1.6,
  fontColor: 'default',
  contrast: 'default',
  bionic: false,
  ruler: false
};

let currentPdfDocument = null;
let currentLoadedPages = [];
let ttsUtterance = null;

document.addEventListener('DOMContentLoaded', () => {
  initNetworkStatus();
  initSettingsSync();
  initToolbarControls();
  initDropZone();
  initReaderInteractions();
  initDictionarySearch();
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
// Settings Initialization & Sync with Extension
// -------------------------------------------------------------
function initSettingsSync() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['va_settings'], (result) => {
      if (result.va_settings) {
        const s = result.va_settings;
        if (s.font) currentReaderSettings.font = s.font;
        if (s.tracking !== undefined) currentReaderSettings.tracking = s.tracking;
        if (s.spacing !== undefined) currentReaderSettings.spacing = s.spacing;
        if (s.leading !== undefined) currentReaderSettings.leading = s.leading;
        if (s.fontColor) currentReaderSettings.fontColor = s.fontColor;
        if (s.contrastMode) currentReaderSettings.contrast = s.contrastMode;
        if (s.bionic !== undefined) currentReaderSettings.bionic = s.bionic;
        if (s.ruler !== undefined) currentReaderSettings.ruler = s.ruler;
        applyAllReaderStyles();
        updateToolbarUI();
      }
    });

    if (chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.va_settings && changes.va_settings.newValue) {
          const s = changes.va_settings.newValue;
          if (s.font) currentReaderSettings.font = s.font;
          if (s.tracking !== undefined) currentReaderSettings.tracking = s.tracking;
          if (s.spacing !== undefined) currentReaderSettings.spacing = s.spacing;
          if (s.leading !== undefined) currentReaderSettings.leading = s.leading;
          if (s.fontColor) currentReaderSettings.fontColor = s.fontColor;
          if (s.contrastMode) currentReaderSettings.contrast = s.contrastMode;
          if (s.bionic !== undefined) currentReaderSettings.bionic = s.bionic;
          if (s.ruler !== undefined) currentReaderSettings.ruler = s.ruler;
          applyAllReaderStyles();
          updateToolbarUI();
        }
      });
    }
  } else {
    applyAllReaderStyles();
    updateToolbarUI();
  }
}

function saveReaderSettings() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['va_settings'], (result) => {
      const existing = result.va_settings || {};
      existing.font = currentReaderSettings.font;
      existing.tracking = currentReaderSettings.tracking;
      existing.spacing = currentReaderSettings.spacing;
      existing.leading = currentReaderSettings.leading;
      existing.fontColor = currentReaderSettings.fontColor;
      existing.contrastMode = currentReaderSettings.contrast;
      existing.bionic = currentReaderSettings.bionic;
      existing.ruler = currentReaderSettings.ruler;
      chrome.storage.local.set({ va_settings: existing });
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

  // Print
  document.getElementById('print-btn').addEventListener('click', () => {
    window.print();
  });

  // Open file button in header
  document.getElementById('upload-nav-btn').addEventListener('click', () => {
    document.getElementById('file-input').click();
  });

  // TTS buttons
  document.getElementById('reader-tts-play').addEventListener('click', handleTtsPlay);
  document.getElementById('reader-tts-stop').addEventListener('click', handleTtsStop);
}

function updateToolbarUI() {
  const fontEl = document.getElementById('reader-font');
  if (fontEl) fontEl.value = currentReaderSettings.font || 'OpenDyslexic';

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

  if (hasCustomFontColor) {
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

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleIncomingFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleIncomingFile(e.target.files[0]);
    }
  });

  loadSampleBtn.addEventListener('click', () => {
    loadSampleDocument();
  });
}

function handleIncomingFile(file) {
  if (!file) return;

  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    const reader = new FileReader();
    reader.onload = function () {
      processPdfData(new Uint8Array(this.result), file.name);
    };
    reader.readAsArrayBuffer(file);
  } else {
    alert('Please choose a PDF document (.pdf).');
  }
}

// -------------------------------------------------------------
// PDF Text Extraction (via PDF.js)
// -------------------------------------------------------------
async function processPdfData(typedArray, fileName) {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: typedArray });
    currentPdfDocument = await loadingTask.promise;

    currentLoadedPages = [];

    for (let pageNum = 1; pageNum <= currentPdfDocument.numPages; pageNum++) {
      const page = await currentPdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const paragraphs = formatPdfTextToParagraphs(textContent.items);

      currentLoadedPages.push({
        pageNumber: pageNum,
        paragraphs: paragraphs.length > 0 ? paragraphs : ['[No extractable text on this page]']
      });
    }

    displayExtractedPages(fileName || 'Document.pdf');
  } catch (err) {
    console.error('PDF parsing error:', err);
    alert('Could not parse PDF. Ensure it is a valid PDF document.');
  }
}

function formatPdfTextToParagraphs(items) {
  if (!items || items.length === 0) return [];
  const paragraphs = [];
  let currentPara = '';

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const str = item.str;

    if (!str || str.trim() === '') {
      if (currentPara.trim().length > 0) {
        paragraphs.push(currentPara.trim());
        currentPara = '';
      }
    } else {
      currentPara += (currentPara ? ' ' : '') + str;
      if (item.hasEOL) {
        if (currentPara.length > 120 || /[.!?]$/.test(currentPara.trim())) {
          paragraphs.push(currentPara.trim());
          currentPara = '';
        }
      }
    }
  }

  if (currentPara.trim()) {
    paragraphs.push(currentPara.trim());
  }

  return paragraphs;
}

// -------------------------------------------------------------
// Document Rendering & Bionic Transform
// -------------------------------------------------------------
function displayExtractedPages(docTitle) {
  document.getElementById('upload-hero').classList.add('hidden');
  const docContainer = document.getElementById('reader-document');
  docContainer.innerHTML = '';
  docContainer.classList.remove('hidden');

  const titleEl = document.createElement('h1');
  titleEl.textContent = docTitle;
  docContainer.appendChild(titleEl);

  currentLoadedPages.forEach(page => {
    const pageEl = document.createElement('section');
    pageEl.className = 'reader-page';

    const pageTag = document.createElement('span');
    pageTag.className = 'page-header-tag';
    pageTag.textContent = `Page ${page.pageNumber}`;
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
  });

  applyAllReaderStyles();
}

function reRenderActiveDocument() {
  if (currentLoadedPages && currentLoadedPages.length > 0) {
    const titleEl = document.querySelector('.reader-document h1');
    const title = titleEl ? titleEl.textContent : 'Document';
    displayExtractedPages(title);
  }
}

function loadSampleDocument() {
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
  if (rulerEl && currentReaderSettings.ruler) {
    rulerEl.style.top = `${e.clientY - 20}px`;
  }
}

// -------------------------------------------------------------
// Text to Speech (TTS)
// -------------------------------------------------------------
function handleTtsPlay() {
  if (window.speechSynthesis) {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.resume();
      return;
    }

    const selection = window.getSelection().toString().trim();
    let textToRead = selection;

    if (!textToRead) {
      const doc = document.getElementById('reader-document');
      textToRead = doc ? doc.innerText : '';
    }

    if (!textToRead) return;

    ttsUtterance = new SpeechSynthesisUtterance(textToRead);
    ttsUtterance.rate = 0.95;
    window.speechSynthesis.speak(ttsUtterance);
  }
}

function handleTtsStop() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
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
  const synBlock = document.getElementById('dict-synonyms-block');
  const synList = document.getElementById('dict-synonyms');
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

    if (entry.synonyms && entry.synonyms.length > 0) {
      synBlock.style.display = 'block';
      synList.innerHTML = entry.synonyms.map(s => `<span class="synonym-chip">${s}</span>`).join('');
    } else {
      synBlock.style.display = 'none';
    }

    if (entry.example) {
      exBlock.style.display = 'block';
      exEl.textContent = `"${entry.example}"`;
    } else {
      exBlock.style.display = 'none';
    }

    ttsBtn.onclick = () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(entry.word);
        u.rate = 0.85;
        window.speechSynthesis.speak(u);
      }
    };
  } else {
    defEl.textContent = `A simple definition for "${word}" could not be found.`;
    synBlock.style.display = 'none';
    exBlock.style.display = 'none';
  }
}

function closeDictionaryModal() {
  document.getElementById('dict-modal').classList.add('hidden');
}

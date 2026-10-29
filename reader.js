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
  if (typeof window.speechSynthesis !== 'undefined' && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
    window.speechSynthesis.getVoices();
  }
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

  // Multi-page navigation (Improvement 2)
  const prevBtn = document.getElementById('reader-page-prev');
  if (prevBtn) prevBtn.addEventListener('click', goToPreviousPage);
  const nextBtn = document.getElementById('reader-page-next');
  if (nextBtn) nextBtn.addEventListener('click', goToNextPage);
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
      const cleanStr = str.trim();
      if (cleanStr) {
        if (currentPara.length > 0) {
          if (!/\s$/.test(currentPara) && !/^\s/.test(str)) {
            currentPara += ' ';
          }
        }
        currentPara += cleanStr;
      }

      if (item.hasEOL) {
        if (currentPara.length > 140 || /[.!?]$/.test(currentPara.trim())) {
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
function updateReaderTtsUi(isPlaying) {
  const playBtn = document.getElementById('reader-tts-play');
  if (!playBtn) return;
  if (isPlaying) {
    playBtn.textContent = 'Pause';
    playBtn.setAttribute('aria-label', 'Pause reading aloud');
    playBtn.classList.add('active');
  } else {
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

function playNextReaderTtsChunk() {
  if (!window.speechSynthesis || readerTtsIndex >= readerTtsQueue.length) {
    handleTtsStop();
    return;
  }

  const chunk = readerTtsQueue[readerTtsIndex];
  if (!chunk || !/[a-zA-Z0-9]/.test(chunk)) {
    readerTtsIndex++;
    playNextReaderTtsChunk();
    return;
  }

  ttsUtterance = new SpeechSynthesisUtterance(chunk);
  ttsUtterance.rate = 0.95;
  ttsUtterance.lang = navigator.language || 'en-US';

  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    const preferred = voices.find(v => v.lang.startsWith(navigator.language.slice(0, 2)) && !v.localService) ||
                      voices.find(v => v.lang.startsWith('en')) ||
                      voices[0];
    if (preferred) ttsUtterance.voice = preferred;
  }

  // Prevent Chromium garbage-collection bug while utterance is speaking
  activeReaderUtterances.add(ttsUtterance);
  readerChunkStartTime = Date.now();

  ttsUtterance.onend = () => {
    activeReaderUtterances.delete(ttsUtterance);
    readerTtsIndex++;
    playNextReaderTtsChunk();
  };

  ttsUtterance.onerror = (err) => {
    activeReaderUtterances.delete(ttsUtterance);

    // Canceled or interrupted events are normal lifecycle results of user actions (Stop, Prev/Next page)
    if (err.error === 'canceled' || err.error === 'interrupted') {
      return;
    }

    console.warn('Reader TTS chunk skipped due to synthesis issue:', err.error || err);
    // Move to next chunk rather than terminating entire playback
    readerTtsIndex++;
    playNextReaderTtsChunk();
  };

  updateReaderTtsUi(true);
  window.speechSynthesis.speak(ttsUtterance);
}

function handleTtsPlay() {
  if (!window.speechSynthesis) return;

  // If currently paused, resume playback
  if (window.speechSynthesis.paused && readerTtsQueue.length > 0) {
    window.speechSynthesis.resume();
    updateReaderTtsUi(true);
    return;
  }

  // If already speaking and user clicks play without a new selection, toggle pause
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

  // Reset any active speech cleanly and wait for Chrome IPC to clear before speaking
  window.speechSynthesis.cancel();
  activeReaderUtterances.clear();
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
        activeReaderUtterances.clear();
        updateReaderTtsUi(false);
        setTimeout(() => {
          const u = new SpeechSynthesisUtterance(entry.word);
          u.rate = 0.85;
          u.lang = navigator.language || 'en-US';
          const voices = window.speechSynthesis.getVoices();
          if (voices && voices.length > 0) {
            const preferred = voices.find(v => v.lang.startsWith(navigator.language.slice(0, 2)) && !v.localService) ||
                              voices.find(v => v.lang.startsWith('en')) ||
                              voices[0];
            if (preferred) u.voice = preferred;
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
    synBlock.style.display = 'none';
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

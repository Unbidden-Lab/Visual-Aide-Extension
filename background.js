importScripts('dictionary.js');

const DEFAULT_SETTINGS = {
  isActive: true,
  level: 0,
  font: 'Lexend',
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

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['va_settings'], (result) => {
    const existing = result.va_settings || {};
    // Backward compatibility: migrate legacy 'kerning' if present
    if (existing.kerning !== undefined && existing.tracking === undefined) {
      existing.tracking = existing.kerning;
      existing.spacing = existing.kerning * 2.5;
    }
    const merged = { ...DEFAULT_SETTINGS, ...existing, tts: true, dictionary: true };
    chrome.storage.local.set({ va_settings: merged });
  });
});

// Global keyboard shortcut listener (Alt+Shift+V)
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-active' || command === 'toggle_active') {
    chrome.storage.local.get(['va_settings'], (result) => {
      const settings = { ...DEFAULT_SETTINGS, ...(result.va_settings || {}) };
      settings.isActive = !settings.isActive;
      chrome.storage.local.set({ va_settings: settings });
    });
  }
});

let creatingOffscreenPromise = null;

async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL('offscreen.html');

  if ('getContexts' in chrome.runtime) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [offscreenUrl]
    });
    if (contexts.length > 0) return;
  } else if (self.clients && typeof self.clients.matchAll === 'function') {
    const clients = await self.clients.matchAll();
    if (clients.some(c => c.url === offscreenUrl)) return;
  }

  if (creatingOffscreenPromise) {
    await creatingOffscreenPromise;
    return;
  }

  creatingOffscreenPromise = chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Synthesize and play Kokoro neural TTS speech'
  });

  try {
    await creatingOffscreenPromise;
  } finally {
    creatingOffscreenPromise = null;
  }
}

// CSP-safe dictionary lookup proxy and Kokoro audio routing for content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'lookup_word' && request.word) {
    lookupSimplifiedWord(request.word)
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({
        word: request.word,
        pos: 'term',
        definition: `Could not load definition for "${request.word}".`,
        contextualDef: '',
        synonyms: [],
        antonyms: [],
        example: '',
        source: 'error'
      }));
    return true; // Keep message channel open for async response
  }

  if (request.action && request.action.startsWith('BG_KOKORO_')) {
    const offscreenAction = request.action.replace('BG_KOKORO_', 'OFFSCREEN_KOKORO_');
    ensureOffscreenDocument()
      .then(() => {
        chrome.runtime.sendMessage({ ...request, action: offscreenAction }, (response) => {
          if (chrome.runtime.lastError) {
            // Ignore channel close warnings
          }
          sendResponse(response || { ok: true });
        });
      })
      .catch((err) => {
        console.warn('Failed to ensure offscreen document:', err);
        sendResponse({ ok: false, error: err.message });
      });
    return true; // Keep channel open
  }
});
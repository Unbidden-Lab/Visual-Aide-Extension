/**
 * Visual Aide - Offscreen Audio Pipeline
 * Handles background synthesis and audio playback for content scripts on normal web pages.
 */

let offscreenQueue = [];
let offscreenIndex = 0;
let offscreenVoice = 'af_heart';
let offscreenSpeed = 1.0;

function broadcastStatus(status, extra = {}) {
  try {
    chrome.runtime.sendMessage({
      action: 'KOKORO_STATUS_UPDATE',
      status,
      ...extra
    }).catch(() => {
      // Ignore when no listener is connected
    });
  } catch (_) {}
}

function chunkOffscreenText(text) {
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
      current = current ? current + ' ' + s : s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function playNextOffscreenChunk() {
  if (offscreenIndex >= offscreenQueue.length) {
    if (typeof KokoroEngine !== 'undefined') {
      KokoroEngine.stopKokoroAudio();
    }
    broadcastStatus('ended');
    return;
  }

  const chunk = offscreenQueue[offscreenIndex];
  if (!chunk || !/[a-zA-Z0-9]/.test(chunk)) {
    offscreenIndex++;
    playNextOffscreenChunk();
    return;
  }

  try {
    await KokoroEngine.playKokoroAudio(chunk, {
      voice: offscreenVoice,
      speed: offscreenSpeed,
      onStart: () => {
        broadcastStatus('playing');
      },
      onEnd: () => {
        offscreenIndex++;
        playNextOffscreenChunk();
      },
      onError: (err) => {
        console.warn('Offscreen Kokoro chunk error:', err);
        offscreenIndex++;
        playNextOffscreenChunk();
      }
    });
  } catch (err) {
    console.error('Offscreen Kokoro synthesis error:', err);
    if (typeof KokoroEngine !== 'undefined') {
      KokoroEngine.stopKokoroAudio();
    }
    broadcastStatus('error', { error: err.message || String(err) });
  }
}

async function handleKokoroPlay(text, voice, speed, sendResponse) {
  try {
    if (typeof KokoroEngine !== 'undefined') {
      KokoroEngine.stopKokoroAudio();
    }

    const isCached = await KokoroEngine.isKokoroModelCached();
    if (!isCached) {
      sendResponse({ ok: false, error: 'model_not_cached' });
      broadcastStatus('error', { error: 'model_not_cached' });
      return;
    }

    offscreenVoice = voice || 'af_heart';
    offscreenSpeed = typeof speed === 'number' ? speed : 1.0;
    offscreenQueue = chunkOffscreenText(text);
    offscreenIndex = 0;

    if (offscreenQueue.length === 0) {
      sendResponse({ ok: false, error: 'empty_text' });
      return;
    }

    sendResponse({ ok: true, status: 'generating' });
    broadcastStatus('generating');

    playNextOffscreenChunk();
  } catch (err) {
    console.error('handleKokoroPlay error:', err);
    sendResponse({ ok: false, error: err.message || String(err) });
    broadcastStatus('error', { error: err.message || String(err) });
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || !request.action) return false;

  if (request.action === 'OFFSCREEN_KOKORO_PLAY') {
    handleKokoroPlay(request.text, request.voice, request.speed, sendResponse);
    return true; // Keep message channel open for async response
  }

  if (request.action === 'OFFSCREEN_KOKORO_PAUSE') {
    if (typeof KokoroEngine !== 'undefined') {
      KokoroEngine.pauseKokoroAudio();
    }
    broadcastStatus('paused');
    sendResponse({ ok: true });
    return false;
  }

  if (request.action === 'OFFSCREEN_KOKORO_RESUME') {
    if (typeof KokoroEngine !== 'undefined') {
      KokoroEngine.resumeKokoroAudio();
    }
    broadcastStatus('playing');
    sendResponse({ ok: true });
    return false;
  }

  if (request.action === 'OFFSCREEN_KOKORO_STOP') {
    if (typeof KokoroEngine !== 'undefined') {
      KokoroEngine.stopKokoroAudio();
    }
    offscreenQueue = [];
    offscreenIndex = 0;
    broadcastStatus('stopped');
    sendResponse({ ok: true });
    return false;
  }

  if (request.action === 'OFFSCREEN_KOKORO_GET_STATE') {
    sendResponse({
      isPlaying: (typeof KokoroEngine !== 'undefined') ? KokoroEngine.isKokoroAudioPlaying() : false,
      isPaused: (typeof KokoroEngine !== 'undefined') ? KokoroEngine.isKokoroAudioPaused() : false
    });
    return false;
  }

  return false;
});

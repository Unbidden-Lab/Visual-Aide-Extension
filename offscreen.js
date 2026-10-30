/**
 * Visual Aide - Offscreen Audio Pipeline
 * Handles background synthesis and streaming audio playback for content scripts on normal web pages.
 */

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

async function handleKokoroPlay(text, voice, speed, tier, sendResponse) {
  try {
    if (typeof KokoroEngine !== 'undefined') {
      KokoroEngine.stopKokoroAudio();
    }

    const currentTier = tier || 'wasm';
    const isCached = await KokoroEngine.isKokoroModelCached(currentTier);
    if (!isCached) {
      sendResponse({ ok: false, error: 'model_not_cached' });
      broadcastStatus('error', { error: 'model_not_cached' });
      return;
    }

    sendResponse({ ok: true, status: 'generating' });
    broadcastStatus('generating');

    await KokoroEngine.playKokoroAudio(text, {
      voice: voice || 'af_heart',
      speed: typeof speed === 'number' ? speed : 1.0,
      tier: currentTier,
      onStart: () => {
        broadcastStatus('playing');
      },
      onEnd: () => {
        broadcastStatus('ended');
      },
      onError: (err) => {
        console.error('Offscreen Kokoro streaming error:', err);
        broadcastStatus('error', { error: err.message || String(err) });
      }
    });
  } catch (err) {
    console.error('handleKokoroPlay error:', err);
    sendResponse({ ok: false, error: err.message || String(err) });
    broadcastStatus('error', { error: err.message || String(err) });
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || !request.action) return false;

  if (request.action === 'OFFSCREEN_KOKORO_PLAY') {
    handleKokoroPlay(request.text, request.voice, request.speed, request.tier, sendResponse);
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

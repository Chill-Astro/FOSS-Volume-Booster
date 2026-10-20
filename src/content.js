let audioCtx = null;
let gainNode = null;
let compressor = null;
let currentGainValue = 1.0;
let connectedElements = new WeakSet();

// Listen for messages from the popup
browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SET_GAIN') {
    currentGainValue = msg.gain;
    applyAudioBoost();
  }
});

// Also check storage on load so it remembers state on page navigation
const api = (typeof browser !== 'undefined') ? browser : chrome;
api.storage.local.get(['boostVolume']).then((stored) => {
  if (stored.boostVolume) {
    currentGainValue = stored.boostVolume / 100;
    // Apply after a brief delay to let the page load its video player
    setTimeout(applyAudioBoost, 1500);
  }
});

function applyAudioBoost() {
  const mediaElements = document.querySelectorAll('video, audio');
  let targetMedia = null;

  for (const media of mediaElements) {
    if (!media.paused && media.readyState > 0) {
      targetMedia = media;
      break;
    }
  }

  if (!targetMedia && mediaElements.length > 0) {
    targetMedia = mediaElements[0];
  }

  if (!targetMedia) return;

  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (!connectedElements.has(targetMedia)) {
      if (!targetMedia.crossOrigin) {
        targetMedia.crossOrigin = "anonymous";
      }

      const sourceNode = audioCtx.createMediaElementSource(targetMedia);
      
      gainNode = audioCtx.createGain();
      gainNode.gain.value = currentGainValue; 

      compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;

      sourceNode.connect(gainNode);
      gainNode.connect(compressor);
      compressor.connect(audioCtx.destination);

      connectedElements.add(targetMedia);
      console.log("Chill-Astro Booster: Successfully hooked dynamic media element.");
    }

    if (gainNode) {
      gainNode.gain.setValueAtTime(currentGainValue, audioCtx.currentTime);
    }

  } catch (err) {
    console.error("Chill-Astro Booster Error:", err);
  }
}

const observer = new MutationObserver(() => {
  const mediaElements = document.querySelectorAll('video, audio');
  for (const media of mediaElements) {
    if (!connectedElements.has(media) && !media.paused) {
      applyAudioBoost();
      break;
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Periodic safety check to ensure audio hook stays active during lecture transitions
setInterval(applyAudioBoost, 3000);
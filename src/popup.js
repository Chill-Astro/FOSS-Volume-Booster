const api = (typeof browser !== 'undefined') ? browser : chrome;

document.addEventListener('DOMContentLoaded', async () => {
  const slider = document.getElementById('volume-slider');
  const display = document.getElementById('vol-display');

  slider.max = "600";

  // Load saved volume state on open
  const stored = await api.storage.local.get(['boostVolume']);
  if (stored.boostVolume) {
    const safeVal = Math.min(parseInt(stored.boostVolume, 10), 600);
    slider.value = safeVal;
    display.textContent = `${safeVal}%`;
  }

  slider.addEventListener('input', async (e) => {
    let value = parseInt(e.target.value, 10);
    if (value > 600) value = 600;

    display.textContent = `${value}%`;
    
    // Save locally so it persists when popup closes
    await api.storage.local.set({ boostVolume: value });

    const gainMultiplier = value / 100;
    sendVolumeToTab(gainMultiplier);
  });

  async function sendVolumeToTab(gainValue) {
    try {
      const tabs = await api.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id) return;

      api.tabs.sendMessage(tabs[0].id, { type: 'SET_GAIN', gain: gainValue }).catch(() => {
        api.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content.js']
        }).then(() => {
          api.tabs.sendMessage(tabs[0].id, { type: 'SET_GAIN', gain: gainValue });
        });
      });
    } catch (err) {
      console.error("Chill-Astro Popup Error:", err);
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const slider = document.getElementById('volume-slider');
  const display = document.getElementById('vol-display');
  const resetBtn = document.getElementById('reset-btn');

  // Load saved volume state or default to 100
  chrome.storage.local.get(['volume'], (result) => {
    const savedVolume = result.volume || 100;
    updateUI(savedVolume);
  });

  // Automatically focus slider so Arrow Keys work immediately upon popup open
  slider.focus();

  // Function to update display, slider, storage, and audio gain
  function setVolume(value) {
    const vol = parseInt(value, 10);
    updateUI(vol);

    // Save to local storage
    chrome.storage.local.set({ volume: vol });

    // Send updated volume to active tab script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'setVolume', volume: vol });
      }
    });
  }

  function updateUI(value) {
    slider.value = value;
    display.textContent = `${value}%`;
  }

  // Handle slider drag/input
  slider.addEventListener('input', (e) => {
    setVolume(e.target.value);
  });

  // Reset button click
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      setVolume(100);
      slider.focus();
    });
  }

  // Global Arrow Key Support (Allows adjusting volume even if focus shifts)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      const current = parseInt(slider.value, 10);
      const nextVal = Math.min(600, current + parseInt(slider.step || 25, 10));
      setVolume(nextVal);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const current = parseInt(slider.value, 10);
      const prevVal = Math.max(100, current - parseInt(slider.step || 25, 10));
      setVolume(prevVal);
    }
  });
});
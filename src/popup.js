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
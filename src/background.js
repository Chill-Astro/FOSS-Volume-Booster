// Cross-browser compatibility wrapper
const extApi = (typeof browser !== 'undefined') ? browser : chrome;

// Initialize default volume state on installation
extApi.runtime.onInstalled.addListener(() => {
  extApi.storage.local.get(['boostVolume'], (result) => {
    if (result.boostVolume === undefined) {
      extApi.storage.local.set({ boostVolume: 100 });
    }
  });
});

// Listen for messages from the popup or content scripts
extApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_VOLUME') {
    // Broadcast the volume update to all active tabs containing your content script
    extApi.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        extApi.tabs.sendMessage(tab.id, message).catch(() => {
          // Ignore tabs where the content script isn't injected (e.g., browser internal pages)
        });
      });
    });
    sendResponse({ status: 'success' });
  }
  
  return true; // Keep the message channel open for asynchronous responses if needed
});
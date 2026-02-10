// Background Service Worker for AI Chat Extractor

// Keep service worker alive
let keepAliveInterval;

function keepServiceWorkerAlive() {
  if (keepAliveInterval) return;
  keepAliveInterval = setInterval(() => {
    chrome.tabs.get(1, () => {
      if (chrome.runtime.lastError) {
        // Tab doesn't exist, but that's fine
      }
    });
  }, 20000); // Every 20 seconds
}

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Chat Extractor installed');

  // Set default configuration
  chrome.storage.local.set({
    apiUrl: 'http://localhost:3000',
    extractionHistory: [],
  });

  keepServiceWorkerAlive();
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  if (request.action === 'ping') {
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'saveToHistory') {
    saveExtractionHistory(request.data);
    sendResponse({ success: true });
    return true;
  }

  return true;
});

// Save extraction history
async function saveExtractionHistory(data) {
  const result = await chrome.storage.local.get(['extractionHistory']);
  const history = result.extractionHistory || [];

  // Add new item at the beginning
  history.unshift({
    ...data,
    timestamp: Date.now(),
  });

  // Keep only last 50 items
  if (history.length > 50) {
    history.pop();
  }

  await chrome.storage.local.set({ extractionHistory: history });
}

// Keep service worker alive when extension starts
keepServiceWorkerAlive();

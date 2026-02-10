// Content Script for Gemini (gemini.google.com)

console.log('AI Chat Extractor loaded for Gemini');

// Function to extract conversation from Gemini
function extractGeminiConversation() {
  try {
    const messages = [];

    // Gemini's DOM structure may vary, try multiple selectors
    const messageContainers = document.querySelectorAll(
      '[data-test-id="conversation-turn-1"], .conversation-turn, model-response, user-query'
    );

    if (messageContainers.length === 0) {
      // Fallback: Try to find messages by text content patterns
      const allDivs = document.querySelectorAll('div');
      allDivs.forEach((div) => {
        const text = div.textContent?.trim();
        if (text && text.length > 20) {
          // Try to identify if this is a user or assistant message
          const isUser = div.querySelector('[data-test-id*="user"]') ||
                       div.textContent.toLowerCase().startsWith('you:');
          const isAssistant = div.querySelector('[data-test-id*="assistant"]') ||
                           div.textContent.toLowerCase().startsWith('model:');

          if (isUser || isAssistant) {
            messages.push({
              role: isUser ? 'user' : 'assistant',
              content: text,
            });
          }
        }
      });
    } else {
      messageContainers.forEach((container) => {
        const isUser = container.querySelector('[data-test-id*="user"]') !== null;
        const textContent = container.textContent?.trim();

        if (textContent) {
          messages.push({
            role: isUser ? 'user' : 'assistant',
            content: textContent,
          });
        }
      });
    }

    // Extract images
    const images = [];
    const imageElements = document.querySelectorAll('img[src*="http"]');
    imageElements.forEach((img) => {
      const src = img.getAttribute('src');
      if (src && !images.includes(src)) {
        images.push(src);
      }
    });

    // Get model version from page
    const modelVersion = extractModelVersion();

    return {
      success: messages.length > 0,
      data: {
        platform: 'Gemini',
        model_version: modelVersion,
        captured_at: new Date().toISOString(),
        messages: messages,
        image_urls: images.length > 0 ? images : undefined,
      },
    };
  } catch (error) {
    console.error('Error extracting Gemini conversation:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Function to extract model version
function extractModelVersion() {
  // Try to find model info in the page
  const modelInfo = document.querySelector('[data-test-id="model-selector"]')?.textContent?.trim();
  if (modelInfo) {
    return modelInfo;
  }

  // Check URL for model hints
  const urlParams = new URLSearchParams(window.location.search);
  const model = urlParams.get('model');
  if (model) {
    return model;
  }

  // Default
  return 'unknown';
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract') {
    const result = extractGeminiConversation();
    sendResponse(result);

    // Save to history
    if (result.success) {
      chrome.runtime.sendMessage({
        action: 'saveToHistory',
        data: {
          platform: 'Gemini',
          success: true,
        },
      });
    }
  }
  return true;
});

// Notify that content script is loaded
chrome.runtime.sendMessage({ action: 'ping' });

// Content Script for Doubao (www.doubao.com)

console.log('AI Chat Extractor loaded for Doubao');

// Function to extract conversation from Doubao
function extractDoubaoConversation() {
  try {
    const messages = [];

    // Doubao's DOM structure - adjust selectors based on actual implementation
    const messageContainers = document.querySelectorAll('.message, .chat-item, [class*="message"]');

    if (messageContainers.length === 0) {
      // Fallback: Try to find messages by looking for common patterns
      const allDivs = document.querySelectorAll('div');
      allDivs.forEach((div) => {
        const text = div.textContent?.trim();
        if (text && text.length > 20 && text.length < 10000) {
          // Try to identify role based on class names or attributes
          const className = div.className || '';
          const isUser = className.includes('user') || className.includes('question');
          const isAssistant = className.includes('assistant') || className.includes('answer') || className.includes('bot');

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
        const className = container.className || '';
        const isUser = className.includes('user') || className.includes('question');
        const textContent = container.textContent?.trim();

        if (textContent && textContent.length > 0) {
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
        platform: 'Doubao',
        model_version: modelVersion,
        captured_at: new Date().toISOString(),
        messages: messages,
        image_urls: images.length > 0 ? images : undefined,
      },
    };
  } catch (error) {
    console.error('Error extracting Doubao conversation:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Function to extract model version
function extractModelVersion() {
  // Try to find model info in the page
  const modelSelectors = [
    '.model-name',
    '.model-info',
    '[class*="model"]',
    '.version-info',
  ];

  for (const selector of modelSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.textContent?.trim();
      if (text) {
        return text;
      }
    }
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
    const result = extractDoubaoConversation();
    sendResponse(result);

    // Save to history
    if (result.success) {
      chrome.runtime.sendMessage({
        action: 'saveToHistory',
        data: {
          platform: 'Doubao',
          success: true,
        },
      });
    }
  }
  return true;
});

// Notify that content script is loaded
chrome.runtime.sendMessage({ action: 'ping' });

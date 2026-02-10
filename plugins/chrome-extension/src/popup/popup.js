// Popup JavaScript for AI Chat Extractor

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const apiUrlInput = document.getElementById('apiUrl');
  const saveConfigBtn = document.getElementById('saveConfig');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const platformInfo = document.getElementById('platformInfo');
  const extractBtn = document.getElementById('extractBtn');
  const progressInfo = document.getElementById('progressInfo');
  const progressText = document.getElementById('progressText');
  const historyList = document.getElementById('historyList');

  // Load saved configuration
  const config = await loadConfig();
  apiUrlInput.value = config.apiUrl || 'http://localhost:3000';

  // Check current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  updatePageStatus(tab);

  // Load recent history
  loadHistory();

  // Event Listeners
  saveConfigBtn.addEventListener('click', async () => {
    const apiUrl = apiUrlInput.value.trim();
    if (!apiUrl) {
      showError('请输入有效的 API 地址');
      return;
    }

    await saveConfig({ apiUrl });
    showSuccess('配置已保存');
  });

  extractBtn.addEventListener('click', async () => {
    try {
      extractBtn.disabled = true;
      progressInfo.classList.remove('hidden');
      progressText.textContent = '正在采集对话...';

      // Send message to content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extract' });

      if (response.success) {
        progressText.textContent = '正在上传到后端...';

        // Send to backend API
        const result = await sendToBackend(response.data);

        if (result.success) {
          showSuccess(`采集成功！对话 ID: ${result.id}`);
          progressInfo.classList.add('hidden');
          loadHistory(); // Reload history
        } else {
          showError(`上传失败: ${result.error}`);
          progressInfo.classList.add('hidden');
        }
      } else {
        showError(`采集失败: ${response.error}`);
        progressInfo.classList.add('hidden');
      }
    } catch (error) {
      showError(`错误: ${error.message}`);
      progressInfo.classList.add('hidden');
    } finally {
      extractBtn.disabled = false;
    }
  });

  // Functions
  async function loadConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['apiUrl'], (result) => {
        resolve(result);
      });
    });
  }

  async function saveConfig(config) {
    return new Promise((resolve) => {
      chrome.storage.local.set(config, () => {
        resolve();
      });
    });
  }

  function updatePageStatus(tab) {
    if (!tab || !tab.url) {
      statusDot.className = 'status-dot error';
      statusText.textContent = '无法访问此页面';
      platformInfo.textContent = '';
      extractBtn.disabled = true;
      return;
    }

    const url = new URL(tab.url);

    if (url.hostname === 'gemini.google.com') {
      statusDot.className = 'status-dot active';
      statusText.textContent = '支持的平台';
      platformInfo.textContent = '✓ Gemini';
      extractBtn.disabled = false;
    } else if (url.hostname === 'www.doubao.com') {
      statusDot.className = 'status-dot active';
      statusText.textContent = '支持的平台';
      platformInfo.textContent = '✓ 豆包';
      extractBtn.disabled = false;
    } else {
      statusDot.className = 'status-dot';
      statusText.textContent = '不支持的平台';
      platformInfo.textContent = '请在 Gemini 或豆包页面使用';
      extractBtn.disabled = true;
    }
  }

  async function sendToBackend(data) {
    try {
      const config = await loadConfig();
      const apiUrl = config.apiUrl || 'http://localhost:3000';

      const response = await fetch(`${apiUrl}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '上传失败');
      }

      const result = await response.json();
      return { success: true, id: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async function loadHistory() {
    const history = await getExtractionHistory();
    if (history.length === 0) {
      historyList.innerHTML = '<p class="empty-text">暂无采集记录</p>';
      return;
    }

    historyList.innerHTML = history
      .slice(0, 5)
      .map((item) => `
        <div class="history-item">
          <div>${item.platform}</div>
          <div class="time">${new Date(item.timestamp).toLocaleString()}</div>
          <span class="status ${item.success ? 'success' : 'error'}">
            ${item.success ? '成功' : '失败'}
          </span>
        </div>
      `)
      .join('');
  }

  async function getExtractionHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['extractionHistory'], (result) => {
        resolve(result.extractionHistory || []);
      });
    });
  }

  function showSuccess(message) {
    // Could use a toast notification
    console.log('Success:', message);
  }

  function showError(message) {
    // Could use a toast notification
    console.error('Error:', message);
  }
});

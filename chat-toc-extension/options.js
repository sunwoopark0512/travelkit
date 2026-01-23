const DEFAULT_OPTIONS = {
  panelSide: 'right',
  autoOpenThreshold: 12,
  highlightColor: '#ffec8b'
};

const form = document.getElementById('settings-form');
const statusEl = document.getElementById('status');
const exportButton = document.getElementById('export-toc');

function setStatus(message) {
  if (!statusEl) {
    return;
  }
  statusEl.textContent = message;
  if (!message) {
    return;
  }
  window.setTimeout(() => {
    statusEl.textContent = '';
  }, 2200);
}

function populateForm(options) {
  form.elements.panelSide.value = options.panelSide || DEFAULT_OPTIONS.panelSide;
  form.elements.autoOpenThreshold.value = options.autoOpenThreshold || DEFAULT_OPTIONS.autoOpenThreshold;
  form.elements.highlightColor.value = options.highlightColor || DEFAULT_OPTIONS.highlightColor;
}

function broadcastOptions(options) {
  chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => {
      if (!tab.id) {
        return;
      }
      chrome.tabs.sendMessage(tab.id, { type: 'optionsUpdate', options }, () => {
        if (chrome.runtime.lastError) {
          return;
        }
      });
    });
  });
}

function handleSubmit(event) {
  event.preventDefault();
  const newOptions = {
    panelSide: form.elements.panelSide.value,
    autoOpenThreshold: parseInt(form.elements.autoOpenThreshold.value, 10) || DEFAULT_OPTIONS.autoOpenThreshold,
    highlightColor: form.elements.highlightColor.value || DEFAULT_OPTIONS.highlightColor
  };
  chrome.storage.sync.set(newOptions, () => {
    broadcastOptions(newOptions);
    setStatus('저장되었습니다.');
  });
}

function handleExport() {
  chrome.runtime.sendMessage({ type: 'requestTocExport' }, response => {
    const payload = response?.text || '';
    if (!payload) {
      setStatus('목차가 아직 없습니다.');
      return;
    }
    if (!navigator.clipboard) {
      setStatus('클립보드 API를 사용할 수 없습니다.');
      return;
    }
    navigator.clipboard.writeText(payload).then(
      () => setStatus('목차를 클립보드에 복사했습니다.'),
      () => setStatus('복사에 실패했습니다.')
    );
  });
}

function init() {
  chrome.storage.sync.get(DEFAULT_OPTIONS, items => {
    populateForm(items);
  });
  form.addEventListener('submit', handleSubmit);
  exportButton.addEventListener('click', handleExport);
}

init();

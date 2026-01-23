let cachedToc = [];

chrome.commands.onCommand.addListener(command => {
  if (command !== 'toggle-panel') {
    return;
  }
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    if (!tab || !tab.id) {
      return;
    }
    chrome.tabs.sendMessage(tab.id, { type: 'togglePanel' });
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'updateToc') {
    cachedToc = message.sections || [];
  } else if (message.type === 'requestTocExport') {
    const clipboardPayload = cachedToc
      .map(section => `${section.position} ${section.badge} ${section.title}`)
      .join('\n');
    sendResponse({ text: clipboardPayload });
  }
  return message.type === 'requestTocExport';
});

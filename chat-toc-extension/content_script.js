(function () {
  const DEFAULT_OPTIONS = {
    panelSide: 'right',
    autoOpenThreshold: 12,
    highlightColor: '#ffec8b'
  };

  const selectors = [
    '[data-role="message"]',
    '[data-test^="message"]',
    '[role="listitem"]',
    '.message',
    '.chat-message',
    '.chat-line',
    '.chat-entry',
    '.message-group'
  ];

  let currentOptions = { ...DEFAULT_OPTIONS };
  let sections = [];
  let observer = null;
  let mutationObserver = null;
  let anchorCounter = 0;
  let panel;
  let toggleButton;
  let listEl;
  let searchInput;
  let activeEntryId = '';
  let resizeTimeout;

  const debounce = (fn, wait = 250) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = window.setTimeout(() => fn(...args), wait);
    };
  };

  const orderNodes = nodes => {
    return nodes.sort((a, b) => {
      if (a === b) {
        return 0;
      }
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
  };

  const normalizeTitle = text => text.trim().toLowerCase().replace(/\s+/g, ' ');

  function ensureAnchor(node) {
    if (node.dataset.chatTocAnchor) {
      return node.dataset.chatTocAnchor;
    }
    anchorCounter += 1;
    const id = `chat-toc-${anchorCounter}`;
    node.dataset.chatTocAnchor = id;
    if (!node.id) {
      node.id = id;
    }
    return id;
  }

  function extractTitle(node) {
    const text = node.innerText.trim();
    if (!text) {
      return null;
    }
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    if (!lines.length) {
      return null;
    }
    const firstLine = lines[0];
    const headingMatch = firstLine.match(/^#{1,4}\s*(.*)$/);
    if (headingMatch && headingMatch[1]) {
      return headingMatch[1].trim();
    }
    const boldMatch = firstLine.match(/^\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch[1]) {
      return boldMatch[1].trim();
    }
    const separatorIndex = lines.findIndex(line => /^[-_=]{3,}$/.test(line));
    const candidateLine = separatorIndex > 0 ? lines[separatorIndex - 1] : firstLine;
    if (candidateLine && candidateLine.length > 0 && !/^[-_=]{3,}$/.test(candidateLine)) {
      return formatFallback(candidateLine);
    }
    const sentenceMatch = text.match(/([^.?!]+[.?!]?)/);
    if (sentenceMatch) {
      return formatFallback(sentenceMatch[0].trim());
    }
    return formatFallback(firstLine);
  }

  function formatFallback(value) {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    if (trimmed.length <= 60) {
      return trimmed;
    }
    return `${trimmed.slice(0, 60)}…`;
  }

  function detectSpeaker(node) {
    const attr = node.getAttribute('data-role') || node.getAttribute('data-author');
    if (attr) {
      if (attr.toLowerCase().includes('assistant')) {
        return 'Assistant';
      }
      if (attr.toLowerCase().includes('user')) {
        return 'User';
      }
    }
    const roleText = node.innerText.toLowerCase();
    if (roleText.includes('assistant:') || roleText.includes('assistant')) {
      return 'Assistant';
    }
    if (roleText.includes('user:') || roleText.includes('user')) {
      return 'User';
    }
    const last = sections[sections.length - 1];
    if (last) {
      return last.badge === 'Assistant' ? 'User' : 'Assistant';
    }
    return 'User';
  }

  function collectMessageNodes() {
    const found = new Set();
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(node => {
        if (
          panel?.contains(node) ||
          toggleButton?.contains(node) ||
          node.closest('#chat-toc-panel')
        ) {
          return;
        }
        if (!node.innerText.trim()) {
          return;
        }
        found.add(node);
      });
    });
    if (found.size === 0) {
      document.querySelectorAll('article, section').forEach(node => {
        if (node.innerText.trim().length > 20) {
          found.add(node);
        }
      });
    }
    const ordered = orderNodes(Array.from(found));
    return ordered;
  }

  function buildSections() {
    const nodes = collectMessageNodes();
    const dest = [];
    const seen = new Set();
    nodes.forEach((node, index) => {
      const title = extractTitle(node);
      if (!title) {
        return;
      }
      const anchorId = ensureAnchor(node);
      const normalized = normalizeTitle(title);
      const key = `${normalized}::${anchorId}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      const badge = detectSpeaker(node);
      dest.push({
        title,
        badge,
        position: `#${index + 1}`,
        anchorId,
        element: node
      });
    });
    return dest;
  }

  function renderSections(data) {
    if (!listEl) {
      return;
    }
    listEl.innerHTML = '';
    if (!data.length) {
      const empty = document.createElement('div');
      empty.className = 'toc-empty';
      empty.textContent = '섹션을 찾을 수 없습니다.';
      listEl.appendChild(empty);
      return;
    }
    data.forEach(section => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'toc-entry';
      item.dataset.anchor = section.anchorId;
      item.innerHTML = `
        <span class="toc-meta">
          <span class="toc-badge">${section.badge}</span>
          <span class="toc-position">${section.position}</span>
        </span>
        <span class="toc-title">${section.title}</span>
      `;
      item.addEventListener('click', () => {
        const anchor = document.getElementById(section.anchorId);
        if (!anchor) {
          return;
        }
        anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightSection(anchor);
      });
      listEl.appendChild(item);
    });
  }

  function highlightSection(element) {
    element.classList.add('chat-toc-highlight-target');
    window.setTimeout(() => {
      element.classList.remove('chat-toc-highlight-target');
    }, 1600);
  }

  function updateActiveEntry(entries) {
    let active = null;
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (!active || entry.intersectionRatio > active.intersectionRatio) {
          active = entry;
        }
      }
    });
    if (!active) {
      return;
    }
    const entryId = active.target.dataset.chatTocAnchor;
    if (!entryId || entryId === activeEntryId) {
      return;
    }
    const prevActive = panel.querySelector('.toc-entry-active');
    if (prevActive) {
      prevActive.classList.remove('toc-entry-active');
    }
    const newActive = panel.querySelector(`[data-anchor="${entryId}"]`);
    if (newActive) {
      newActive.classList.add('toc-entry-active');
      activeEntryId = entryId;
    }
  }

  function observeSections(data) {
    observer?.disconnect();
    if (!data.length) {
      return;
    }
    observer = new IntersectionObserver(entries => {
      updateActiveEntry(entries);
    }, {
      rootMargin: '0px 0px -40% 0px',
      threshold: [0.1, 0.5, 0.75]
    });
    data.forEach(section => {
      const element = document.getElementById(section.anchorId);
      if (element) {
        observer.observe(element);
      }
    });
  }

  function togglePanel(forceState) {
    if (!panel || !toggleButton) {
      return;
    }
    const isOpen = panel.classList.contains('toc-open');
    const appliedState = typeof forceState === 'boolean' ? forceState : !isOpen;
    if (appliedState) {
      panel.classList.add('toc-open');
      toggleButton.setAttribute('aria-pressed', 'true');
    } else {
      panel.classList.remove('toc-open');
      toggleButton.setAttribute('aria-pressed', 'false');
    }
  }

  function applyOptions(options) {
    currentOptions = { ...DEFAULT_OPTIONS, ...options };
    if (panel) {
      panel.dataset.position = currentOptions.panelSide === 'left' ? 'left' : 'right';
      panel.style.setProperty('--chat-toc-highlight', currentOptions.highlightColor);
    }
  }

  function sendSectionsToBackground(data) {
    const payload = data.map(section => ({
      title: section.title,
      badge: section.badge,
      position: section.position
    }));
    chrome.runtime.sendMessage({ type: 'updateToc', sections: payload });
  }

  function refreshSections() {
    sections = buildSections();
    renderSections(sections);
    observeSections(sections);
    sendSectionsToBackground(sections);
    if (sections.length >= currentOptions.autoOpenThreshold) {
      togglePanel(true);
    }
  }

  const debouncedRefresh = debounce(refreshSections, 300);

  function attachMutationObserver() {
    if (mutationObserver) {
      mutationObserver.disconnect();
    }
    mutationObserver = new MutationObserver(debouncedRefresh);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function createPanel() {
    panel = document.createElement('aside');
    panel.id = 'chat-toc-panel';
    panel.dataset.position = currentOptions.panelSide === 'left' ? 'left' : 'right';
    panel.className = 'chat-toc-panel';
    panel.innerHTML = `
      <header class="toc-header">
        <div>
          <strong>긴 대화 자동 목차</strong>
          <div class="toc-header-sub">빠르게 찾아보기</div>
        </div>
        <button type="button" class="toc-back-top">맨 위로</button>
      </header>
      <div class="toc-controls">
        <input type="search" placeholder="섹션 검색" aria-label="섹션 검색" />
      </div>
      <div class="toc-list-wrapper">
        <div class="toc-list"></div>
      </div>
    `;
    document.body.appendChild(panel);
    searchInput = panel.querySelector('input[type="search"]');
    listEl = panel.querySelector('.toc-list');
    const backTop = panel.querySelector('.toc-back-top');
    backTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    searchInput.addEventListener('input', () => {
      const term = searchInput.value.trim().toLowerCase();
      panel.querySelectorAll('.toc-entry').forEach(entry => {
        const title = entry.querySelector('.toc-title')?.textContent.toLowerCase() || '';
        entry.style.display = title.includes(term) ? '' : 'none';
      });
    });
  }

  function createToggle() {
    toggleButton = document.createElement('button');
    toggleButton.id = 'chat-toc-toggle';
    toggleButton.type = 'button';
    toggleButton.className = 'chat-toc-toggle';
    toggleButton.setAttribute('aria-label', '목차 열기');
    toggleButton.setAttribute('aria-pressed', 'false');
    toggleButton.innerHTML = '<span>목차</span>';
    toggleButton.addEventListener('click', () => togglePanel());
    document.body.appendChild(toggleButton);
  }

  function bindMessages() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'togglePanel') {
        togglePanel();
      } else if (message.type === 'optionsUpdate') {
        applyOptions(message.options);
        refreshSections();
      }
    });
  }

  function init() {
    chrome.storage.sync.get(DEFAULT_OPTIONS, options => {
      applyOptions(options);
    createPanel();
    createToggle();
    togglePanel(true);
      bindMessages();
      refreshSections();
      attachMutationObserver();
    });
  }

  init();
})();

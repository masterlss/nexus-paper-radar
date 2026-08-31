const app = document.querySelector('#app');
const state = {
  data: null,
  topic: '全部',
  query: '',
  saved: readStorage('nexus-saved', []),
  ratings: readStorage('nexus-ratings', {}),
  selectedId: null,
};

function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback));
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function issueParts(isoDate) {
  const date = new Date(isoDate);
  const dateLabel = date.toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai',
  }).replaceAll('/', '.');
  const timeLabel = date.toLocaleTimeString('zh-CN', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Shanghai',
  });
  return { dateLabel, timeLabel };
}

function paperById(id) {
  return state.data.papers.find((paper) => paper.id === id);
}

function filteredPapers() {
  const query = state.query.trim().toLowerCase();
  return state.data.papers.filter((paper) => {
    const topicMatch = state.topic === '全部' || paper.topic === state.topic;
    const text = `${paper.title} ${paper.tags.join(' ')} ${paper.verdict}`.toLowerCase();
    return topicMatch && text.includes(query);
  });
}

function toggleSaved(id) {
  state.saved = state.saved.includes(id)
    ? state.saved.filter((paperId) => paperId !== id)
    : [...state.saved, id];
  localStorage.setItem('nexus-saved', JSON.stringify(state.saved));
  render();
}

function setRating(id, value) {
  state.ratings = { ...state.ratings, [id]: value };
  localStorage.setItem('nexus-ratings', JSON.stringify(state.ratings));
  render();
}

function paperCard(paper) {
  const index = state.data.papers.findIndex((item) => item.id === paper.id) + 1;
  const saved = state.saved.includes(paper.id);
  return `
    <article class="paper-card">
      <div class="card-index">${String(index).padStart(2, '0')}</div>
      <div class="paper-body">
        <div class="paper-meta">
          <span class="level ${paper.level === '精读' ? 'deep' : ''}">${escapeHtml(paper.level)}</span>
          <span>${escapeHtml(paper.topic)}</span><span>·</span><span>${escapeHtml(paper.placement)}</span>
          <time>${escapeHtml(paper.date)}</time>
        </div>
        <h3><button class="title-button" data-action="detail" data-id="${escapeHtml(paper.id)}">${escapeHtml(paper.title)}</button></h3>
        <p>${escapeHtml(paper.verdict)}</p>
        <div class="evidence"><span>证据</span>${escapeHtml(paper.evidence)}</div>
        <div class="card-footer">
          <div>${paper.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
          <div class="card-actions">
            <button data-action="detail" data-id="${escapeHtml(paper.id)}">查看初读</button>
            <button class="${saved ? 'saved' : ''}" data-action="save" data-id="${escapeHtml(paper.id)}">${saved ? '✓ 已加入阅读' : '+ 加入阅读'}</button>
          </div>
        </div>
      </div>
      <div class="score"><strong>${escapeHtml(paper.score)}</strong><span>RADAR SCORE</span></div>
    </article>`;
}

function drawer() {
  if (!state.selectedId) return '';
  const paper = paperById(state.selectedId);
  if (!paper) return '';
  const index = state.data.papers.findIndex((item) => item.id === paper.id) + 1;
  const saved = state.saved.includes(paper.id);
  const rating = state.ratings[paper.id] ?? 0;
  return `
    <div class="drawer-backdrop" data-action="close">
      <section class="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <button class="drawer-close" data-action="close" aria-label="关闭详情">×</button>
        <p class="eyebrow">PAPER BRIEF / ${String(index).padStart(2, '0')}</p>
        <div class="drawer-meta"><span class="level ${paper.level === '精读' ? 'deep' : ''}">${escapeHtml(paper.level)}</span><span>${escapeHtml(paper.topic)}</span><span>${escapeHtml(paper.placement)}</span></div>
        <h2 id="detail-title">${escapeHtml(paper.title)}</h2>
        <p class="drawer-verdict">${escapeHtml(paper.verdict)}</p>
        <div class="drawer-grid">
          <div><b>工程启发</b><p>${escapeHtml(paper.insight)}</p></div>
          <div><b>证据强度</b><p>${escapeHtml(paper.evidence)}</p></div>
          <div><b>风险点</b><p>${escapeHtml(paper.risk)}</p></div>
          <div><b>精读问题</b><p>${escapeHtml(paper.question)}</p></div>
        </div>
        <div class="feedback-panel">
          <div><b>这篇对你有用吗？</b><small>反馈保存在当前设备，帮助后续调整选题。</small></div>
          <div class="rating" aria-label="论文评分">
            ${[1, 2, 3, 4, 5].map((value) => `<button class="${rating >= value ? 'active' : ''}" data-action="rate" data-id="${escapeHtml(paper.id)}" data-rating="${value}" aria-label="${value} 分">★</button>`).join('')}
          </div>
        </div>
        <div class="drawer-actions">
          <button class="${saved ? 'primary' : ''}" data-action="save" data-id="${escapeHtml(paper.id)}">${saved ? '✓ 已在阅读队列' : '+ 加入阅读队列'}</button>
          <a href="${escapeHtml(paper.url)}" target="_blank" rel="noreferrer">打开 arXiv ↗</a>
        </div>
      </section>
    </div>`;
}

function render() {
  const radar = state.data;
  const papers = filteredPapers();
  const topics = ['全部', ...new Set(radar.papers.map((paper) => paper.topic))];
  const { dateLabel, timeLabel } = issueParts(radar.generatedAt);
  const focusPaper = paperById(radar.focus.paperId) ?? radar.papers[0];
  const nextReading = radar.papers.find((paper) => state.saved.includes(paper.id)) ?? focusPaper;
  const queue = radar.papers.filter((paper) => state.saved.includes(paper.id));

  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#top" aria-label="Paper Radar 首页"><span class="brand-mark">N</span><span><b>NEXUS</b><small>PAPER INTELLIGENCE</small></span></a>
      <label class="search-box"><span aria-hidden="true">⌕</span><input id="paper-search" value="${escapeHtml(state.query)}" placeholder="搜索论文、方法或标签" /><kbd>⌘ K</kbd></label>
      <div class="status-pill"><span></span>更新于 ${escapeHtml(timeLabel)}</div>
    </header>
    <div class="workspace" id="top">
      <aside class="sidebar"><p class="eyebrow">研究频道</p><nav aria-label="论文主题">
        ${topics.map((topic, index) => `<button data-action="topic" data-topic="${escapeHtml(topic)}" class="${state.topic === topic ? 'active' : ''}"><span>${String(index + 1).padStart(2, '0')}</span>${escapeHtml(topic)}</button>`).join('')}
      </nav><div class="sidebar-note"><span>自动同步</span><b>工作日 09:00</b><small>采集 · 总结 · 发布</small></div></aside>
      <section class="feed">
        <div class="hero-row"><div><p class="eyebrow">${escapeHtml(dateLabel)} / ${escapeHtml(radar.volume)}</p><h1>今天值得你<br /><em>Follow</em> 的论文</h1></div><div class="scan-stat"><strong>${radar.stats.fetched}</strong><span>本期扫描</span><small>${radar.stats.candidates} 篇入围 · ${radar.stats.recommended} 篇推荐</small></div></div>
        <div class="signal-banner"><span>本期信号</span><p>${escapeHtml(radar.signal)}</p></div>
        <div class="section-head"><h2>优先阅读</h2><span>${papers.length} / ${radar.papers.length}</span></div>
        <div class="paper-list">${papers.length ? papers.map(paperCard).join('') : '<div class="empty-state">没有命中当前筛选，换个关键词试试。</div>'}</div>
      </section>
      <aside class="reading-rail"><div class="rail-title"><span>阅读队列</span><b>${state.saved.length}</b></div><div class="focus-card"><p>本周只读一篇</p><strong>${escapeHtml(radar.focus.shortTitle)}</strong><span>${escapeHtml(radar.focus.readingQuestion)}</span><div><i></i>预计 ${radar.focus.minutes} MIN</div></div><div class="queue-list">
        ${queue.map((paper) => `<div><span>${String(radar.papers.findIndex((item) => item.id === paper.id) + 1).padStart(2, '0')}</span><p>${escapeHtml(paper.title.split(':')[0])}<small>${escapeHtml(paper.placement)}</small></p></div>`).join('')}
      </div><button class="start-reading" data-action="detail" data-id="${escapeHtml(nextReading.id)}">开始阅读 <span>↗</span></button></aside>
    </div>${drawer()}`;

  document.body.style.overflow = state.selectedId ? 'hidden' : '';
}

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action === 'topic') state.topic = target.dataset.topic;
  if (action === 'detail') state.selectedId = target.dataset.id;
  if (action === 'save') toggleSaved(target.dataset.id);
  if (action === 'rate') setRating(target.dataset.id, Number(target.dataset.rating));
  if (action === 'close' && (target === event.target || target.classList.contains('drawer-close'))) state.selectedId = null;
  if (!['save', 'rate'].includes(action)) render();
});

app.addEventListener('input', (event) => {
  if (event.target.id !== 'paper-search') return;
  state.query = event.target.value;
  render();
  const search = document.querySelector('#paper-search');
  search.focus();
  search.setSelectionRange(state.query.length, state.query.length);
});

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    document.querySelector('#paper-search')?.focus();
  }
  if (event.key === 'Escape' && state.selectedId) {
    state.selectedId = null;
    render();
  }
});

fetch('./data/latest.json', { cache: 'no-store' })
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then((data) => {
    state.data = data;
    state.saved = Array.isArray(state.saved) ? state.saved.filter((id) => typeof id === 'string' && paperById(id)) : [];
    render();
  })
  .catch((error) => {
    app.innerHTML = `<section class="load-error"><h1>论文数据加载失败</h1><p>${escapeHtml(error.message)}</p><button onclick="location.reload()">重新加载</button></section>`;
  });

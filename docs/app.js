const app = document.querySelector('#app');
const state = {
  latest: null,
  issues: [],
  catalog: null,
  scope: 'latest',
  issueDate: null,
  topic: '全部',
  query: '',
  sort: 'date',
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

function formatDate(value, short = false) {
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00+08:00`);
  const options = short
    ? { month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai' }
    : { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai' };
  return date.toLocaleDateString('zh-CN', options).replaceAll('/', '.');
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString('zh-CN', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Shanghai',
  });
}

function latestDate() {
  return state.issues[0]?.date ?? state.latest.generatedAt.slice(0, 10);
}

function issueMeta(date) {
  return state.issues.find((issue) => issue.date === date) ?? state.issues[0];
}

function paperById(id) {
  return state.catalog.papers.find((paper) => paper.id === id);
}

function topicCounts() {
  return state.catalog.papers.reduce((counts, paper) => {
    counts[paper.topic] = (counts[paper.topic] ?? 0) + 1;
    return counts;
  }, {});
}

function visiblePapers() {
  const query = state.query.trim().toLowerCase();
  let papers = state.catalog.papers;

  if (!query && state.scope === 'latest') {
    papers = papers.filter((paper) => paper.issueDate === latestDate());
  } else if (!query && state.scope === 'issue') {
    papers = papers.filter((paper) => paper.issueDate === state.issueDate);
  }

  if (state.topic !== '全部') papers = papers.filter((paper) => paper.topic === state.topic);
  if (query) {
    papers = papers.filter((paper) => {
      const searchable = [
        paper.title, paper.topic, paper.placement, paper.verdict, paper.evidence,
        paper.insight, paper.risk, paper.question, ...paper.tags,
      ].join(' ').toLowerCase();
      return searchable.includes(query);
    });
  }

  return [...papers].sort((left, right) => {
    if (state.sort === 'score') return right.score - left.score;
    const dateOrder = right.issueDate.localeCompare(left.issueDate);
    return dateOrder || right.score - left.score;
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

function contextView(papers) {
  const query = state.query.trim();
  if (query) {
    return {
      eyebrow: `全库检索 / ${state.catalog.paperCount} PAPERS`,
      title: `“${query}”`,
      accent: '检索结果',
      stat: papers.length,
      statLabel: '命中论文',
      statDetail: `覆盖 ${state.catalog.issueCount} 期归档`,
      signal: '当前在全部历史论文的标题、方法、标签、结论、证据和风险字段中检索。',
    };
  }

  if (state.scope === 'all') {
    return {
      eyebrow: `ARCHIVE / ${state.catalog.issueCount} ISSUES`,
      title: '可持续积累的',
      accent: '论文知识库',
      stat: state.catalog.paperCount,
      statLabel: '已归档论文',
      statDetail: `${state.catalog.issueCount} 期 · ${Object.keys(topicCounts()).length} 个方向`,
      signal: '每期数据独立保存；全库索引按论文 ID 去重，并支持主题筛选、关键词检索与评分排序。',
    };
  }

  const date = state.scope === 'issue' ? state.issueDate : latestDate();
  const issue = issueMeta(date);
  return {
    eyebrow: `${formatDate(date)} / ${issue.volume}`,
    title: state.scope === 'latest' ? '今天值得你' : `${formatDate(date, true)} 值得你`,
    accent: 'Follow 的论文',
    stat: issue.stats.fetched,
    statLabel: '本期扫描',
    statDetail: `${issue.stats.candidates} 篇入围 · ${issue.stats.recommended} 篇推荐`,
    signal: issue.signal,
  };
}

function paperCard(paper) {
  const saved = state.saved.includes(paper.id);
  return `
    <article class="paper-card">
      <div class="card-index">${formatDate(paper.issueDate, true)}</div>
      <div class="paper-body">
        <div class="paper-meta">
          <span class="level ${paper.level === '精读' ? 'deep' : ''}">${escapeHtml(paper.level)}</span>
          <span>${escapeHtml(paper.topic)}</span><span>·</span><span>${escapeHtml(paper.placement)}</span>
          <button class="issue-link" data-action="issue" data-date="${paper.issueDate}">${escapeHtml(paper.volume)}</button>
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
  const saved = state.saved.includes(paper.id);
  const rating = state.ratings[paper.id] ?? 0;
  return `
    <div class="drawer-backdrop" data-action="close">
      <section class="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <button class="drawer-close" data-action="close" aria-label="关闭详情">×</button>
        <p class="eyebrow">PAPER BRIEF / ${formatDate(paper.issueDate)}</p>
        <div class="drawer-meta"><span class="level ${paper.level === '精读' ? 'deep' : ''}">${escapeHtml(paper.level)}</span><span>${escapeHtml(paper.topic)}</span><span>${escapeHtml(paper.placement)}</span><span>${escapeHtml(paper.volume)}</span></div>
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
          <div class="rating" aria-label="论文评分">${[1, 2, 3, 4, 5].map((value) => `<button class="${rating >= value ? 'active' : ''}" data-action="rate" data-id="${escapeHtml(paper.id)}" data-rating="${value}" aria-label="${value} 分">★</button>`).join('')}</div>
        </div>
        <div class="drawer-actions">
          <button class="${saved ? 'primary' : ''}" data-action="save" data-id="${escapeHtml(paper.id)}">${saved ? '✓ 已在阅读队列' : '+ 加入阅读队列'}</button>
          <a href="${escapeHtml(paper.url)}" target="_blank" rel="noreferrer">打开 arXiv ↗</a>
        </div>
      </section>
    </div>`;
}

function render() {
  const papers = visiblePapers();
  const context = contextView(papers);
  const counts = topicCounts();
  const topics = Object.keys(counts).sort((left, right) => counts[right] - counts[left]);
  const currentIssue = issueMeta(state.scope === 'issue' ? state.issueDate : latestDate());
  const focusPaper = paperById(currentIssue?.focus?.paperId) ?? state.catalog.papers[0];
  const nextReading = state.catalog.papers.find((paper) => state.saved.includes(paper.id)) ?? focusPaper;
  const queue = state.catalog.papers.filter((paper) => state.saved.includes(paper.id));

  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#top" aria-label="Paper Radar 首页"><span class="brand-mark">N</span><span><b>NEXUS</b><small>PAPER INTELLIGENCE</small></span></a>
      <label class="search-box"><span aria-hidden="true">⌕</span><input id="paper-search" value="${escapeHtml(state.query)}" placeholder="搜索全库标题、方法、标签或结论" /><kbd>⌘ K</kbd></label>
      <div class="status-pill"><span></span>${state.catalog.paperCount} 篇 · ${state.catalog.issueCount} 期 · 更新于 ${formatTime(state.latest.generatedAt)}</div>
    </header>
    <div class="workspace" id="top">
      <aside class="sidebar">
        <p class="eyebrow">论文库</p>
        <div class="scope-switch">
          <button data-action="scope" data-scope="latest" class="${state.scope === 'latest' && !state.query ? 'active' : ''}"><span>01</span>最新一期<small>${formatDate(latestDate(), true)}</small></button>
          <button data-action="scope" data-scope="all" class="${state.scope === 'all' && !state.query && state.topic === '全部' ? 'active' : ''}"><span>02</span>全部归档<small>${state.catalog.paperCount}</small></button>
        </div>
        <p class="eyebrow sidebar-section">分类归档</p>
        <nav aria-label="论文主题">
          ${topics.map((topic, index) => `<button data-action="topic" data-topic="${escapeHtml(topic)}" class="${state.scope === 'all' && state.topic === topic && !state.query ? 'active' : ''}"><span>${String(index + 1).padStart(2, '0')}</span>${escapeHtml(topic)}<small>${counts[topic]}</small></button>`).join('')}
        </nav>
        <p class="eyebrow sidebar-section">期次归档</p>
        <div class="archive-list">
          ${state.issues.map((issue) => `<button data-action="issue" data-date="${issue.date}" class="${state.scope === 'issue' && state.issueDate === issue.date && !state.query ? 'active' : ''}"><span><b>${formatDate(issue.date, true)}</b><small>${escapeHtml(issue.volume)}</small></span><em>${issue.paperCount} 篇</em></button>`).join('')}
        </div>
        <div class="sidebar-note"><span>自动归档</span><b>工作日 09:00</b><small>采集 · 分类 · 检索 · 发布</small></div>
      </aside>
      <section class="feed">
        <div class="hero-row"><div><p class="eyebrow">${escapeHtml(context.eyebrow)}</p><h1>${escapeHtml(context.title)}<br /><em>${escapeHtml(context.accent)}</em></h1></div><div class="scan-stat"><strong>${context.stat}</strong><span>${escapeHtml(context.statLabel)}</span><small>${escapeHtml(context.statDetail)}</small></div></div>
        <div class="signal-banner"><span>${state.scope === 'all' || state.query ? '索引状态' : '本期信号'}</span><p>${escapeHtml(context.signal)}</p></div>
        <div class="section-head"><div><h2>${state.topic === '全部' ? '论文列表' : escapeHtml(state.topic)}</h2><span>${papers.length} 篇结果</span></div><label class="sort-control">排序<select id="paper-sort"><option value="date" ${state.sort === 'date' ? 'selected' : ''}>最新优先</option><option value="score" ${state.sort === 'score' ? 'selected' : ''}>评分优先</option></select></label></div>
        <div class="paper-list">${papers.length ? papers.map(paperCard).join('') : '<div class="empty-state">没有命中当前筛选，换个关键词或分类试试。</div>'}</div>
      </section>
      <aside class="reading-rail">
        <div class="rail-title"><span>阅读队列</span><b>${state.saved.length}</b></div>
        <div class="library-card"><span>知识库规模</span><strong>${state.catalog.paperCount}</strong><p>篇论文 / ${state.catalog.issueCount} 期归档</p></div>
        <div class="focus-card"><p>当前期优先阅读</p><strong>${escapeHtml(currentIssue?.focus?.shortTitle ?? focusPaper.title.split(':')[0])}</strong><span>${escapeHtml(currentIssue?.focus?.readingQuestion ?? focusPaper.question)}</span><div><i></i>预计 ${currentIssue?.focus?.minutes ?? 12} MIN</div></div>
        <div class="queue-list">${queue.map((paper) => `<div><span>${formatDate(paper.issueDate, true)}</span><p>${escapeHtml(paper.title.split(':')[0])}<small>${escapeHtml(paper.placement)}</small></p></div>`).join('')}</div>
        <button class="start-reading" data-action="detail" data-id="${escapeHtml(nextReading.id)}">开始阅读 <span>↗</span></button>
      </aside>
    </div>${drawer()}`;

  document.body.style.overflow = state.selectedId ? 'hidden' : '';
}

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action === 'scope') {
    state.scope = target.dataset.scope;
    state.topic = '全部';
    state.query = '';
  }
  if (action === 'topic') {
    state.scope = 'all';
    state.topic = target.dataset.topic;
    state.query = '';
  }
  if (action === 'issue') {
    state.scope = 'issue';
    state.issueDate = target.dataset.date;
    state.topic = '全部';
    state.query = '';
  }
  if (action === 'detail') state.selectedId = target.dataset.id;
  if (action === 'save') toggleSaved(target.dataset.id);
  if (action === 'rate') setRating(target.dataset.id, Number(target.dataset.rating));
  if (action === 'close' && (target === event.target || target.classList.contains('drawer-close'))) state.selectedId = null;
  if (!['save', 'rate'].includes(action)) render();
});

app.addEventListener('input', (event) => {
  if (event.target.id !== 'paper-search') return;
  if (!state.query && event.target.value) {
    state.scope = 'all';
    state.topic = '全部';
  }
  state.query = event.target.value;
  render();
  const search = document.querySelector('#paper-search');
  search.focus();
  search.setSelectionRange(state.query.length, state.query.length);
});

app.addEventListener('change', (event) => {
  if (event.target.id !== 'paper-sort') return;
  state.sort = event.target.value;
  render();
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

Promise.all([
  fetch('./data/latest.json', { cache: 'no-store' }).then((response) => response.json()),
  fetch('./data/issues/index.json', { cache: 'no-store' }).then((response) => response.json()),
  fetch('./data/catalog.json', { cache: 'no-store' }).then((response) => response.json()),
])
  .then(([latest, issues, catalog]) => {
    state.latest = latest;
    state.issues = issues;
    state.catalog = catalog;
    state.issueDate = issues[0]?.date;
    state.saved = Array.isArray(state.saved)
      ? state.saved.filter((id) => typeof id === 'string' && paperById(id))
      : [];
    render();
  })
  .catch((error) => {
    app.innerHTML = `<section class="load-error"><h1>论文库加载失败</h1><p>${escapeHtml(error.message)}</p><button onclick="location.reload()">重新加载</button></section>`;
  });

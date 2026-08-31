'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import latestData from './data/latest.json';

type Paper = {
  id: string;
  title: string;
  topic: string;
  placement: string;
  score: number;
  date: string;
  verdict: string;
  evidence: string;
  tags: string[];
  level: string;
  insight: string;
  risk: string;
  question: string;
  url: string;
};

type RadarData = {
  generatedAt: string;
  volume: string;
  stats: { fetched: number; candidates: number; recommended: number };
  signal: string;
  focus: { paperId: string; shortTitle: string; readingQuestion: string; minutes: number };
  papers: Paper[];
};

const radar = latestData as RadarData;
const papers = radar.papers;
const topics = ['全部', ...Array.from(new Set(papers.map((paper) => paper.topic)))];
const issueDate = new Date(radar.generatedAt);
const issueLabel = issueDate.toLocaleDateString('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'Asia/Shanghai',
}).replaceAll('/', '.');
const issueTime = issueDate.toLocaleTimeString('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Shanghai',
});

export default function Home() {
  const [activeTopic, setActiveTopic] = useState('全部');
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState<string[]>([]);
  const [selected, setSelected] = useState<Paper | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const storedSaved = JSON.parse(localStorage.getItem('nexus-saved') ?? '[]');
      const storedRatings = JSON.parse(localStorage.getItem('nexus-ratings') ?? '{}');
      setSaved(Array.isArray(storedSaved) ? storedSaved.filter((value) => typeof value === 'string') : []);
      setRatings(storedRatings && typeof storedRatings === 'object' ? storedRatings : {});
    } catch {
      localStorage.removeItem('nexus-saved');
      localStorage.removeItem('nexus-ratings');
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const filtered = useMemo(() => papers.filter((paper) => {
    const topicMatch = activeTopic === '全部' || paper.topic === activeTopic;
    const queryMatch = `${paper.title} ${paper.tags.join(' ')} ${paper.verdict}`.toLowerCase().includes(query.toLowerCase());
    return topicMatch && queryMatch;
  }), [activeTopic, query]);

  const toggleSaved = (id: string) => {
    setSaved((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      localStorage.setItem('nexus-saved', JSON.stringify(next));
      return next;
    });
  };

  const ratePaper = (id: string, rating: number) => {
    setRatings((current) => {
      const next = { ...current, [id]: rating };
      localStorage.setItem('nexus-ratings', JSON.stringify(next));
      return next;
    });
  };

  const focusPaper = papers.find((paper) => paper.id === radar.focus.paperId) ?? papers[0];
  const nextReading = papers.find((paper) => saved.includes(paper.id)) ?? focusPaper;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Paper Radar 首页">
          <span className="brand-mark">N</span>
          <span><b>NEXUS</b><small>PAPER INTELLIGENCE</small></span>
        </a>
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索论文、方法或标签" />
          <kbd>⌘ K</kbd>
        </label>
        <div className="status-pill"><span /> 更新于 {issueTime}</div>
      </header>

      <div className="workspace" id="top">
        <aside className="sidebar">
          <p className="eyebrow">研究频道</p>
          <nav aria-label="论文主题">
            {topics.map((topic, index) => (
              <button key={topic} className={activeTopic === topic ? 'active' : ''} onClick={() => setActiveTopic(topic)}>
                <span>{String(index + 1).padStart(2, '0')}</span>{topic}
              </button>
            ))}
          </nav>
          <div className="sidebar-note">
            <span>自动同步</span><b>工作日 09:00</b><small>采集 · 总结 · 发布</small>
          </div>
        </aside>

        <section className="feed" aria-live="polite">
          <div className="hero-row">
            <div>
              <p className="eyebrow">{issueLabel} / {radar.volume}</p>
              <h1>今天值得你<br /><em>Follow</em> 的论文</h1>
            </div>
            <div className="scan-stat"><strong>{radar.stats.fetched}</strong><span>本期扫描</span><small>{radar.stats.candidates} 篇入围 · {radar.stats.recommended} 篇推荐</small></div>
          </div>

          <div className="signal-banner">
            <span>本期信号</span><p>{radar.signal}</p>
          </div>

          <div className="section-head"><h2>优先阅读</h2><span>{filtered.length} / {papers.length}</span></div>

          <div className="paper-list">
            {filtered.map((paper) => {
              const paperIndex = papers.findIndex((item) => item.id === paper.id) + 1;
              return (
                <article className="paper-card" key={paper.id}>
                  <div className="card-index">{String(paperIndex).padStart(2, '0')}</div>
                  <div className="paper-body">
                    <div className="paper-meta">
                      <span className={`level ${paper.level === '精读' ? 'deep' : ''}`}>{paper.level}</span>
                      <span>{paper.topic}</span><span>·</span><span>{paper.placement}</span><time>{paper.date}</time>
                    </div>
                    <h3><button className="title-button" onClick={() => setSelected(paper)}>{paper.title}</button></h3>
                    <p>{paper.verdict}</p>
                    <div className="evidence"><span>证据</span>{paper.evidence}</div>
                    <div className="card-footer">
                      <div>{paper.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
                      <div className="card-actions">
                        <button onClick={() => setSelected(paper)}>查看初读</button>
                        <button className={saved.includes(paper.id) ? 'saved' : ''} onClick={() => toggleSaved(paper.id)}>
                          {saved.includes(paper.id) ? '✓ 已加入阅读' : '+ 加入阅读'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="score"><strong>{paper.score}</strong><span>RADAR SCORE</span></div>
                </article>
              );
            })}
            {filtered.length === 0 && <div className="empty-state">没有命中当前筛选，换个关键词试试。</div>}
          </div>
        </section>

        <aside className="reading-rail">
          <div className="rail-title"><span>阅读队列</span><b>{saved.length}</b></div>
          <div className="focus-card">
            <p>本周只读一篇</p><strong>{radar.focus.shortTitle}</strong>
            <span>{radar.focus.readingQuestion}</span><div><i /> 预计 {radar.focus.minutes} MIN</div>
          </div>
          <div className="queue-list">
            {papers.filter((paper) => saved.includes(paper.id)).map((paper) => (
              <div key={paper.id}><span>{String(papers.findIndex((item) => item.id === paper.id) + 1).padStart(2, '0')}</span><p>{paper.title.split(':')[0]}<small>{paper.placement}</small></p></div>
            ))}
          </div>
          <button className="start-reading" onClick={() => setSelected(nextReading)}>开始阅读 <span>↗</span></button>
        </aside>
      </div>

      {selected && (
        <div className="drawer-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <section className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={(event) => event.stopPropagation()}>
            <button className="drawer-close" onClick={() => setSelected(null)} aria-label="关闭详情">×</button>
            <p className="eyebrow">PAPER BRIEF / {String(papers.findIndex((paper) => paper.id === selected.id) + 1).padStart(2, '0')}</p>
            <div className="drawer-meta"><span className={`level ${selected.level === '精读' ? 'deep' : ''}`}>{selected.level}</span><span>{selected.topic}</span><span>{selected.placement}</span></div>
            <h2 id="detail-title">{selected.title}</h2>
            <p className="drawer-verdict">{selected.verdict}</p>
            <div className="drawer-grid">
              <div><b>工程启发</b><p>{selected.insight}</p></div>
              <div><b>证据强度</b><p>{selected.evidence}</p></div>
              <div><b>风险点</b><p>{selected.risk}</p></div>
              <div><b>精读问题</b><p>{selected.question}</p></div>
            </div>
            <div className="feedback-panel">
              <div><b>这篇对你有用吗？</b><small>反馈会保存在当前设备，帮助后续调整选题。</small></div>
              <div className="rating" aria-label="论文评分">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button key={rating} className={(ratings[selected.id] ?? 0) >= rating ? 'active' : ''} onClick={() => ratePaper(selected.id, rating)} aria-label={`${rating} 分`}>★</button>
                ))}
              </div>
            </div>
            <div className="drawer-actions">
              <button className={saved.includes(selected.id) ? 'primary' : ''} onClick={() => toggleSaved(selected.id)}>{saved.includes(selected.id) ? '✓ 已在阅读队列' : '+ 加入阅读队列'}</button>
              <a href={selected.url} target="_blank" rel="noreferrer">打开 arXiv ↗</a>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

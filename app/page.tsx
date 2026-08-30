'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Paper = {
  id: number;
  title: string;
  topic: string;
  placement: string;
  score: number;
  date: string;
  verdict: string;
  evidence: string;
  tags: string[];
  level: '精读' | '泛读';
  insight: string;
  risk: string;
  question: string;
  url: string;
};

const topics = ['全部', '搜索与排序', '推荐系统', '广告与商业化', '大模型 × 搜广推'];

const papers: Paper[] = [
  {
    id: 1,
    title: 'SWIM: Step-Wise Integrated Measure for Session-supervised List Evaluation',
    topic: '搜索与排序',
    placement: '列表重排',
    score: 87.9,
    date: '08.25',
    verdict: '把列表价值建模为 session survival 过程，让评价目标跨越请求边界，更贴近连续消费场景。',
    evidence: '工业延迟约束 · Listwise 显著提升 · 数值待正文核验',
    tags: ['Re-ranking', 'Session', 'Industrial'],
    level: '精读',
    insight: '评价目标不必受单次请求的列表边界限制，可直接贴近 session 时长、留存或累计价值。',
    risk: 'Survival 分解在不同流量分布下的校准稳定性，以及离线 evaluator 与线上指标的一致性仍需核验。',
    question: '训练标签如何处理跨请求归因、位置偏差与未观察反事实？',
    url: 'https://arxiv.org/abs/2608.25104v1',
  },
  {
    id: 2,
    title: 'TAGR: Temporally Adaptive Generative Recommendation for Live-Streaming Ads',
    topic: '广告与商业化',
    placement: '广告推荐',
    score: 75.1,
    date: '08.25',
    verdict: '从广告 Token、用户意图和偏好对齐三层处理直播广告的快速变化，且已上线。',
    evidence: '收入 +16.1% · 进房率 +8.5% · 加购点击 +7.4%',
    tags: ['Generative Rec', 'Ads', 'Online A/B'],
    level: '精读',
    insight: '新鲜度问题同时存在于 item token、行为窗口和偏好数据分布，分层处理比单纯增量训练更清晰。',
    risk: '三层改动的独立贡献、实验周期与收入显著性未在摘要披露。',
    question: 'LSID 刷新后如何保持 token 空间稳定并避免线上索引抖动？',
    url: 'https://arxiv.org/abs/2608.24034v1',
  },
  {
    id: 3,
    title: 'Scaling Graph Neural Networks for Friend Recommendation',
    topic: '推荐系统',
    placement: '图排序',
    score: 78.1,
    date: '08.27',
    verdict: '用 multi-hash embedding 与时序邻居采样，将 GNN 扩展到 1.94 亿用户和 280 亿边。',
    evidence: '好友添加 +16% · ID 表缩小 >98% · 生产规模',
    tags: ['GNN', 'Ranking', 'Production'],
    level: '精读',
    insight: '算法收益来自表示压缩与数据布局共同成立，适合对照高基数 ID 表和时序采样成本。',
    risk: '摘要没有披露线上基线、实验周期、端到端成本与模型新鲜度。',
    question: 'Hash collision 对长尾用户和增量训练稳定性的影响如何度量？',
    url: 'https://arxiv.org/abs/2608.27413v1',
  },
  {
    id: 4,
    title: 'An Event is Worth One Token: Event Tokenization for Industrial-scale LLM Recommendation',
    topic: '大模型 × 搜广推',
    placement: '表征层',
    score: 69.5,
    date: '08.26',
    verdict: '把一次交互的用户、物品、上下文与结果压成可缓存 Event Token，让每个序列位置携带完整快照。',
    evidence: 'Compute–quality 前沿改善 · 工业级 Benchmark · 线上结果未披露',
    tags: ['LLM Rec', 'Tokenization', 'Efficiency'],
    level: '精读',
    insight: '将昂贵多域融合前移到离线 tokenizer，在线排序只消费紧凑历史特征。',
    risk: '缓存更新、行为泄漏和 tokenizer/下游模型的版本管理可能成为主要复杂度。',
    question: 'Snapshot resolution 增大时，收益是否来自不公平的计算量增加？',
    url: 'https://arxiv.org/abs/2608.25546v1',
  },
  {
    id: 5,
    title: 'When Memory Takes Gradients: Collaborative Vector Memory for Agentic Recommenders',
    topic: '大模型 × 搜广推',
    placement: '用户记忆',
    score: 94.8,
    date: '08.27',
    verdict: '用冻结 LightGCN 状态构成向量记忆，替代需要持续 LLM 改写的纯文本用户记忆。',
    evidence: '20 个指标中 19 个持平或更优 · 零额外记忆维护 LLM 调用',
    tags: ['Agentic Rec', 'Memory', 'LightGCN'],
    level: '泛读',
    insight: '协同过滤信号作为连续记忆，比反复翻译成自然语言更保真且成本可控。',
    risk: '冻结协同状态的新鲜度、soft token 跨模型迁移与用户快速漂移仍需确认。',
    question: '候选条件检索是否会形成闭环偏差并强化当前召回器偏好？',
    url: 'https://arxiv.org/abs/2608.26895v1',
  },
  {
    id: 6,
    title: 'Retrieve, Match, Escalate: Scalable Product Linking with Agentic VLMs',
    topic: '搜索与排序',
    placement: '商品治理',
    score: 76.8,
    date: '08.25',
    verdict: '产品归一化采用分级级联：检索、轻量 cross-encoder，再把困难尾部升级到 agentic VLM。',
    evidence: '98% Precision 门槛 · 覆盖率 68%→77% · Agent 成本约 1/7',
    tags: ['Cascade', 'Cross-encoder', 'VLM'],
    level: '泛读',
    insight: '显式按难度分配算力，比让大模型处理所有 pair 更易满足成本与 SLA。',
    risk: '双 VLM 共识并不等于真实标签，蒸馏可能放大系统性错误。',
    question: 'Escalation gate 如何同时优化 coverage、precision 与单位成本？',
    url: 'https://arxiv.org/abs/2608.25037v1',
  },
  {
    id: 7,
    title: 'Keeping the Index Open: The Recommendation-Side Cost of Shared Search and Recommendation',
    topic: '搜索与排序',
    placement: '统一召回',
    score: 70.6,
    date: '08.25',
    verdict: '共享双塔索引可以自然服务新物品，但在 warm recommendation 精度上需要付出可测代价。',
    evidence: 'Cold-start Recall@20 = 0.172 · Warm NDCG 落后 11.4%',
    tags: ['Dual Encoder', 'Cold-start', 'Index'],
    level: '泛读',
    insight: '统一索引应把新物品可用性、重训成本和服务复杂度一起计价，不能只看 warm 指标。',
    risk: '主要实验来自 MovieLens/MIND，离工业商品目录和新物品分布仍有距离。',
    question: '混合 ID/内容塔或蒸馏能否缩小 warm gap 并保留 open-index 能力？',
    url: 'https://arxiv.org/abs/2608.24079v2',
  },
];

export default function Home() {
  const [activeTopic, setActiveTopic] = useState('全部');
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState<number[]>([2]);
  const [selected, setSelected] = useState<Paper | null>(null);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedSaved = localStorage.getItem('nexus-saved');
    const storedRatings = localStorage.getItem('nexus-ratings');
    if (storedSaved) setSaved(JSON.parse(storedSaved));
    if (storedRatings) setRatings(JSON.parse(storedRatings));
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
    const queryMatch = `${paper.title} ${paper.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase());
    return topicMatch && queryMatch;
  }), [activeTopic, query]);

  const toggleSaved = (id: number) => {
    setSaved((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      localStorage.setItem('nexus-saved', JSON.stringify(next));
      return next;
    });
  };

  const ratePaper = (id: number, rating: number) => {
    setRatings((current) => {
      const next = { ...current, [id]: rating };
      localStorage.setItem('nexus-ratings', JSON.stringify(next));
      return next;
    });
  };

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
        <div className="status-pill"><span /> 雷达在线</div>
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
            <span>下次扫描</span><b>明天 09:00</b><small>工作日自动更新</small>
          </div>
        </aside>

        <section className="feed" aria-live="polite">
          <div className="hero-row">
            <div>
              <p className="eyebrow">2026.08.30 / VOL. 001</p>
              <h1>今天值得你<br /><em>Follow</em> 的论文</h1>
            </div>
            <div className="scan-stat"><strong>214</strong><span>本期扫描</span><small>12 篇入围 · 7 篇推荐</small></div>
          </div>

          <div className="signal-banner">
            <span>本期信号</span>
            <p>生成式推荐正从“ID Token 化”转向<strong>可训练记忆、事件级表征与时间适应</strong>。</p>
          </div>

          <div className="section-head">
            <h2>优先阅读</h2><span>{filtered.length} / {papers.length}</span>
          </div>

          <div className="paper-list">
            {filtered.map((paper) => (
              <article className="paper-card" key={paper.id}>
                <div className="card-index">{String(paper.id).padStart(2, '0')}</div>
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
            ))}
            {filtered.length === 0 && <div className="empty-state">没有命中当前筛选，换个关键词试试。</div>}
          </div>
        </section>

        <aside className="reading-rail">
          <div className="rail-title"><span>阅读队列</span><b>{saved.length}</b></div>
          <div className="focus-card">
            <p>本周只读一篇</p>
            <strong>SWIM</strong>
            <span>重点验证 label 构造与 survival 分解</span>
            <div><i /> 预计 18 MIN</div>
          </div>
          <div className="queue-list">
            {papers.filter((paper) => saved.includes(paper.id)).map((paper) => (
              <div key={paper.id}><span>{String(paper.id).padStart(2, '0')}</span><p>{paper.title.split(':')[0]}<small>{paper.placement}</small></p></div>
            ))}
          </div>
          <button className="start-reading" onClick={() => setSelected(papers.find((paper) => saved.includes(paper.id)) ?? papers[0])}>开始阅读 <span>↗</span></button>
        </aside>
      </div>

      {selected && (
        <div className="drawer-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <section className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={(event) => event.stopPropagation()}>
            <button className="drawer-close" onClick={() => setSelected(null)} aria-label="关闭详情">×</button>
            <p className="eyebrow">PAPER BRIEF / {String(selected.id).padStart(2, '0')}</p>
            <div className="drawer-meta">
              <span className="level deep">{selected.level}</span><span>{selected.topic}</span><span>{selected.placement}</span>
            </div>
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

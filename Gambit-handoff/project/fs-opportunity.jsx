
// fs-opportunity.jsx — Opportunity Map: Stacked Area Chart + Confidence Bands

const OpportunityChart = () => {
  const W = 760, H = 340;
  const pad = { l:50, r:20, t:20, b:50 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;

  // Time points: 0=2026Q2, 1=Q3, 2=Q4, 3=2027Q1, 4=Q2
  const timeLabels = ['2026 Q2','Q3','Q4','2027 Q1','Q2'];
  const N = timeLabels.length;

  // Tracks: base values 0-1 (stacked), plus confidence spread
  const tracks = [
    {
      name:'AI 写作',
      color:'rgba(108,92,231,0.75)',
      vals:    [0.18, 0.20, 0.22, 0.23, 0.24],
      spread:  [0.01, 0.01, 0.02, 0.02, 0.02],  // half-width of confidence band
    },
    {
      name:'AI 视频',
      color:'rgba(80,160,200,0.65)',
      vals:    [0.14, 0.17, 0.20, 0.22, 0.24],
      spread:  [0.01, 0.02, 0.03, 0.04, 0.05],
    },
    {
      name:'AI 搜索',
      color:'rgba(100,180,130,0.60)',
      vals:    [0.08, 0.11, 0.14, 0.17, 0.20],
      spread:  [0.02, 0.03, 0.04, 0.06, 0.08],
    },
    {
      name:'AI 编程',
      color:'rgba(200,160,80,0.55)',
      vals:    [0.07, 0.08, 0.09, 0.10, 0.11],
      spread:  [0.01, 0.01, 0.02, 0.02, 0.02],
    },
    {
      name:'多模型整合',
      color:'rgba(220,100,80,0.60)',
      vals:    [0.02, 0.03, 0.05, 0.08, 0.12],
      spread:  [0.01, 0.02, 0.03, 0.05, 0.06],
    },
  ];

  const px = i => pad.l + (i / (N-1)) * iW;
  const totalAtI = i => tracks.reduce((s,t) => s + t.vals[i], 0);

  // Build stacked paths
  const stackedPaths = [];
  const cumulBase = Array(N).fill(0);

  tracks.forEach(track => {
    const topYs = track.vals.map((v,i) => {
      const base = cumulBase[i];
      return { base, top: base + v };
    });
    topYs.forEach((_, i) => { cumulBase[i] += track.vals[i]; });

    // Area path (top curve + bottom curve reversed)
    const topPts = topYs.map((y,i) => [px(i), pad.t + (1-y.top) * iH]);
    const botPts = topYs.map((y,i) => [px(i), pad.t + (1-y.base) * iH]);

    const pathD = `M ${topPts.map(p=>p.join(',')).join(' L ')} L ${[...botPts].reverse().map(p=>p.join(',')).join(' L ')} Z`;

    // Confidence band path (top + spread, bottom - spread)
    const bandTop = topYs.map((y,i) => [px(i), pad.t + (1-(y.top + track.spread[i])) * iH]);
    const bandBot = topYs.map((y,i) => [px(i), pad.t + (1-(y.base - 0.005)) * iH]);
    const bandD = `M ${bandTop.map(p=>p.join(',')).join(' L ')} L ${[...bandBot].reverse().map(p=>p.join(',')).join(' L ')} Z`;

    stackedPaths.push({ track, pathD, bandD, topPts });
  });

  // Grid levels
  const yLevels = [0.25, 0.5, 0.75];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <defs>
        {tracks.map((t,i) => (
          <linearGradient key={i} id={`og-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.color} stopOpacity={0.9}/>
            <stop offset="100%" stopColor={t.color} stopOpacity={0.6}/>
          </linearGradient>
        ))}
      </defs>

      {/* Horizontal grid */}
      {yLevels.map(v => (
        <g key={v}>
          <line x1={pad.l} y1={pad.t + (1-v)*iH} x2={pad.l+iW} y2={pad.t + (1-v)*iH}
            stroke="rgba(255,255,255,0.05)" strokeWidth={1}/>
          <text x={pad.l - 6} y={pad.t + (1-v)*iH + 3} textAnchor="end"
            fill="rgba(255,255,255,0.2)" fontSize={8} fontFamily="Inter,sans-serif">{Math.round(v*100)}%</text>
        </g>
      ))}

      {/* Axes */}
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t+iH} stroke="rgba(255,255,255,0.12)" strokeWidth={1}/>
      <line x1={pad.l} y1={pad.t+iH} x2={pad.l+iW} y2={pad.t+iH} stroke="rgba(255,255,255,0.12)" strokeWidth={1}/>

      {/* Time labels */}
      {timeLabels.map((l,i) => (
        <text key={l} x={px(i)} y={pad.t+iH+16} textAnchor="middle"
          fill="rgba(255,255,255,0.3)" fontSize={8.5} fontFamily="Inter,sans-serif">{l}</text>
      ))}

      {/* Y label */}
      <text x={12} y={pad.t+iH/2} textAnchor="middle" fill="rgba(255,255,255,0.2)"
        fontSize={8} fontFamily="Inter,sans-serif" transform={`rotate(-90,12,${pad.t+iH/2})`}>机会价值</text>

      {/* Stacked areas + confidence bands */}
      {stackedPaths.map(({track,pathD,bandD,topPts},i) => (
        <g key={i}>
          {/* Confidence band */}
          <path d={bandD} fill="rgba(255,255,255,0.04)" stroke="none"/>
          {/* Main area */}
          <path d={pathD} fill={`url(#og-${i})`} stroke="none"/>
          {/* Top line */}
          <polyline points={topPts.map(p=>p.join(',')).join(' ')}
            fill="none" stroke={track.color.replace(/[\d.]+\)$/, '0.9)')} strokeWidth={1.5}/>
          {/* Track name at right edge */}
          <text x={topPts[N-1][0]+8} y={topPts[N-1][1]+3}
            fill={track.color.replace(/[\d.]+\)$/, '0.85)')}
            fontSize={9} fontFamily="Inter,sans-serif" fontWeight={600}>{track.name}</text>
        </g>
      ))}

      {/* Confidence band legend indicator */}
      <rect x={pad.l+iW-130} y={pad.t+4} width={20} height={8} rx={2} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth={0.5}/>
      <text x={pad.l+iW-106} y={pad.t+11} fill="rgba(255,255,255,0.25)" fontSize={8} fontFamily="Inter,sans-serif">置信区间（模型分歧越大，区间越宽）</text>
    </svg>
  );
};

const OpportunityPage = () => (
  <SectionWrap id="opportunity">
    <SectionHeader num="06" en="Opportunity Map" zh="机会窗口"
      note="面积图展示各赛道机会价值的时序演变；半透明置信区间带反映三模型预测的一致程度——区间越窄代表判断越确定"/>

    <div style={{ background:FC.surface, borderRadius:8, padding:'28px 24px', border:`1px solid ${FC.border}`, marginBottom:40 }}>
      <OpportunityChart/>
    </div>

    {/* Insight row */}
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0, border:`1px solid ${FC.border}`, borderRadius:6 }}>
      {[
        {
          track:'AI 写作 · AI 视频',
          conf:'高置信',
          confColor:'rgba(100,180,130,0.9)',
          lit:[true,true,true],
          desc:'三模型预测一致：这两个赛道将在 2026 年内保持稳定增长，置信区间极窄。建议立即进入而非等待。'
        },
        {
          track:'AI 搜索 · AI 编程',
          conf:'中置信',
          confColor:'rgba(200,160,80,0.9)',
          lit:[true,true,false],
          desc:'两个赛道增长趋势确定，但具体规模分歧较大。DeepSeek 和 Qwen 对速度预测相差 1.8 倍。'
        },
        {
          track:'多模型整合',
          conf:'低置信 · 高潜力',
          confColor:FC.purple,
          lit:[true,false,false],
          desc:'这是置信区间最宽的赛道——预测分歧最大，意味着不确定性最高，但上行空间也最大。这正是 Gambit 的进入点。'
        },
      ].map((item,i) => (
        <div key={i} style={{ padding:'20px 22px', borderRight:i<2?`1px solid ${FC.border}`:'none' }}>
          <div style={{ fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:13, color:FC.text, marginBottom:6 }}>{item.track}</div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <span style={{ fontFamily:'Inter,sans-serif', fontSize:9, fontWeight:700, color:item.confColor,
              background: item.confColor.replace(/[\d.]+\)$/, '0.12)'), padding:'2px 7px', borderRadius:2, letterSpacing:'0.5px' }}>
              {item.conf}
            </span>
            <ModelDots lit={item.lit}/>
          </div>
          <p style={{ margin:0, fontSize:11, color:FC.textSec, lineHeight:1.7 }}>{item.desc}</p>
        </div>
      ))}
    </div>
  </SectionWrap>
);

window.OpportunityPage = OpportunityPage;

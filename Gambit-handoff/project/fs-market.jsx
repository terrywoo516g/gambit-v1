
// fs-market.jsx — Market Landscape Bubble Chart

const MarketBubbleChart = () => {
  const W = 680, H = 420;
  const pad = { l:60, r:20, t:20, b:50 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;

  // x: commercialization maturity 0-1, y: market size 0-1
  // r: relative revenue size, growth: 0=low, 1=med, 2=high, 3=very high
  const sectors = [
    { name:'AI 写作',   x:0.72, y:0.78, r:44, growth:2, sub:'¥42亿/年' },
    { name:'AI 视频',   x:0.54, y:0.72, r:40, growth:3, sub:'¥28亿/年' },
    { name:'AI 搜索',   x:0.44, y:0.68, r:36, growth:3, sub:'¥19亿/年' },
    { name:'AI 编程',   x:0.76, y:0.58, r:32, growth:2, sub:'¥15亿/年' },
    { name:'AI 客服',   x:0.80, y:0.50, r:28, growth:1, sub:'¥12亿/年' },
    { name:'AI 教育',   x:0.52, y:0.42, r:26, growth:1, sub:'¥10亿/年' },
    { name:'AI 设计',   x:0.38, y:0.36, r:22, growth:2, sub:'¥7亿/年' },
    { name:'数字人',    x:0.28, y:0.48, r:20, growth:0, sub:'¥5亿/年' },
    { name:'AI 医疗',   x:0.18, y:0.28, r:16, growth:1, sub:'¥3亿/年' },
    { name:'AI 金融',   x:0.62, y:0.32, r:18, growth:1, sub:'¥4亿/年' },
    { name:'AI 营销',   x:0.60, y:0.55, r:24, growth:2, sub:'¥9亿/年' },
    { name:'AI 法律',   x:0.24, y:0.18, r:12, growth:0, sub:'¥2亿/年' },
  ];

  // Growth color: dark purple (highest) → light gray (lowest)
  const growthColor = (g) => [
    'rgba(100,100,110,0.55)',   // 0 low
    'rgba(120,110,150,0.65)',   // 1 med
    'rgba(100,80,200,0.72)',    // 2 high
    FC.purple,                  // 3 very high
  ][g];

  const growthGlow = (g) => [
    'rgba(255,255,255,0)',
    'rgba(255,255,255,0)',
    'rgba(108,92,231,0.12)',
    'rgba(108,92,231,0.28)',
  ][g];

  const px = x => pad.l + x * iW;
  const py = y => pad.t + (1-y) * iH;

  // Dotted lines between related sectors
  const connections = [
    ['AI 写作','AI 设计'], ['AI 写作','AI 营销'], ['AI 视频','数字人'],
    ['AI 搜索','AI 金融'], ['AI 编程','AI 客服'],
  ];
  const sMap = Object.fromEntries(sectors.map(s => [s.name, s]));

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {/* Grid lines */}
      {[0.25,0.5,0.75,1].map(v => (
        <line key={v} x1={px(0)} y1={py(v)} x2={px(1)} y2={py(v)}
          stroke="rgba(255,255,255,0.05)" strokeWidth={1}/>
      ))}
      {[0.25,0.5,0.75,1].map(v => (
        <line key={v} x1={px(v)} y1={py(0)} x2={px(v)} y2={py(1)}
          stroke="rgba(255,255,255,0.05)" strokeWidth={1}/>
      ))}

      {/* Axes */}
      <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(0)} stroke="rgba(255,255,255,0.15)" strokeWidth={1}/>
      <line x1={px(0)} y1={py(0)} x2={px(0)} y2={py(1)} stroke="rgba(255,255,255,0.15)" strokeWidth={1}/>

      {/* Axis labels */}
      <text x={px(0.5)} y={H-6} textAnchor="middle" fill="rgba(255,255,255,0.3)"
        fontSize={9} fontFamily="Inter,sans-serif" letterSpacing={1}>商业化成熟度 →</text>
      <text x={12} y={py(0.5)} textAnchor="middle" fill="rgba(255,255,255,0.3)"
        fontSize={9} fontFamily="Inter,sans-serif" letterSpacing={1}
        transform={`rotate(-90, 12, ${py(0.5)})`}>市场规模 →</text>


      {[['早期探索',0.05],['快速成长',0.38],['规模商业化',0.72]].map(([l,x]) => (
        <text key={l} x={px(x)} y={py(0)+14} fill="rgba(255,255,255,0.2)"
          fontSize={8} fontFamily="Inter,sans-serif">{l}</text>
      ))}

      {/* Connection lines */}
      {connections.map(([a,b],i) => {
        const na = sMap[a], nb = sMap[b];
        if (!na||!nb) return null;
        return <line key={i} x1={px(na.x)} y1={py(na.y)} x2={px(nb.x)} y2={py(nb.y)}
          stroke="rgba(255,255,255,0.07)" strokeWidth={1} strokeDasharray="3,4"/>;
      })}

      {/* Bubbles */}
      {sectors.map(s => {
        const bx = px(s.x), by = py(s.y);
        const glowColor = growthGlow(s.growth);
        return (
          <g key={s.name}>
            {/* Glow behind high-growth bubbles */}
            {s.growth >= 2 && (
              <circle cx={bx} cy={by} r={s.r + 14} fill={glowColor}/>
            )}
            {/* Bubble */}
            <circle cx={bx} cy={by} r={s.r} fill={growthColor(s.growth)} stroke="rgba(255,255,255,0.1)" strokeWidth={1}/>
            {/* Label inside if large enough */}
            {s.r >= 28 ? (
              <>
                <text x={bx} y={by-3} textAnchor="middle" fill="rgba(255,255,255,0.9)"
                  fontSize={9} fontFamily="Inter,sans-serif" fontWeight={700}>{s.name}</text>
                <text x={bx} y={by+9} textAnchor="middle" fill="rgba(255,255,255,0.45)"
                  fontSize={7.5} fontFamily="Inter,sans-serif">{s.sub}</text>
              </>
            ) : (
              <text x={bx + s.r + 5} y={by + 3} fill="rgba(255,255,255,0.55)"
                fontSize={8} fontFamily="Inter,sans-serif">{s.name}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

const MarketPage = () => (
  <SectionWrap id="market">
    <SectionHeader num="02" en="Market Landscape" zh="市场全景"
      note="气泡大小代表当前营收规模，颜色深浅代表增长速度——越深增长越快，越浅增长越慢"/>

    <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:48, alignItems:'start' }}>
      <div style={{ background:FC.surface, borderRadius:8, padding:'28px 24px', border:`1px solid ${FC.border}` }}>
        <MarketBubbleChart/>
      </div>

      {/* Legend + insights */}
      <div style={{ width:200 }}>
        <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:FC.textMuted, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:16 }}>增长速度图例</div>
        {[
          { color:FC.purple, label:'极高增长 (>80%/yr)' },
          { color:'rgba(100,80,200,0.72)', label:'高速增长 (40-80%)' },
          { color:'rgba(120,110,150,0.65)', label:'稳定增长 (10-40%)' },
          { color:'rgba(100,100,110,0.55)', label:'增长放缓 (<10%)' },
        ].map((l,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <div style={{ width:12, height:12, borderRadius:'50%', background:l.color, flexShrink:0 }}/>
            <span style={{ fontFamily:'Inter,sans-serif', fontSize:10, color:FC.textSec }}>{l.label}</span>
          </div>
        ))}

        <Rule/>

        <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:FC.textMuted, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:14 }}>关键洞察</div>
        {[
          { dot:[true,true,true], text:'AI 写作已进入收割期，前三甲格局基本锁定' },
          { dot:[true,false,true], text:'AI 搜索是增长最快但格局最不确定的赛道' },
          { dot:[false,true,true], text:'数字人进入资本寒冬，洗牌不可避免' },
        ].map((item,i) => (
          <div key={i} style={{ marginBottom:14 }}>
            <ModelDots lit={item.dot}/>
            <p style={{ margin:'6px 0 0', fontSize:11, color:FC.textSec, lineHeight:1.6 }}>{item.text}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Sector stats row */}
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0, marginTop:40, border:`1px solid ${FC.border}`, borderRadius:6 }}>
      {[
        { v:'¥158亿', l:'全市场 ARR 估算', sub:'2026 Q2 快照' },
        { v:'2', l:'规模化盈利赛道', sub:'AI写作 · AI视频' },
        { v:'67%', l:'TOP3 赛道营收集中度', sub:'写作/视频/搜索' },
        { v:'4.2×', l:'B2B vs B2C 付费率', sub:'企业客户更易转化' },
      ].map((s,i) => (
        <div key={i} style={{ padding:'20px 24px', borderRight: i<3 ? `1px solid ${FC.border}` : 'none' }}>
          <div style={{ fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:26, color:FC.text, letterSpacing:'-0.5px' }}>{s.v}</div>
          <div style={{ fontFamily:'Inter,sans-serif', fontSize:11, color:FC.textSec, marginTop:4 }}>{s.l}</div>
          <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:FC.textMuted, marginTop:2 }}>{s.sub}</div>
        </div>
      ))}
    </div>
  </SectionWrap>
);

window.MarketPage = MarketPage;

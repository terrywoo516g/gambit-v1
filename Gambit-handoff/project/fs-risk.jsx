
// fs-risk.jsx — Risk Matrix + Model Risk Rankings

const RiskMatrix = () => {
  const W = 480, H = 380;
  const pad = { l:60, r:20, t:20, b:60 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;

  const risks = [
    { id:'r1', label:'API政策\n突变', prob:0.72, impact:0.88, models:[1,1,1] },
    { id:'r2', label:'监管收紧', prob:0.55, impact:0.82, models:[0,1,1] },
    { id:'r3', label:'大厂降维\n打击', prob:0.68, impact:0.70, models:[1,1,0] },
    { id:'r4', label:'算力成本\n持续高企', prob:0.80, impact:0.60, models:[1,0,1] },
    { id:'r5', label:'用户教育\n成本超预期', prob:0.60, impact:0.50, models:[1,1,1] },
    { id:'r6', label:'核心技术\n人才流失', prob:0.42, impact:0.65, models:[0,1,0] },
    { id:'r7', label:'竞争对手\n融资超额', prob:0.58, impact:0.45, models:[1,0,0] },
    { id:'r8', label:'用户数据\n安全事件', prob:0.30, impact:0.78, models:[0,1,1] },
  ];

  const px = v => pad.l + v * iW;
  const py = v => pad.t + (1-v) * iH;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {/* Danger zone glow (high prob + high impact) */}
      <defs>
        <radialGradient id="danger-glow" cx="100%" cy="0%" r="60%">
          <stop offset="0%" stopColor={FC.purple} stopOpacity={0.12}/>
          <stop offset="100%" stopColor={FC.purple} stopOpacity={0}/>
        </radialGradient>
      </defs>
      <rect x={px(0.5)} y={pad.t} width={iW/2} height={iH/2} fill="url(#danger-glow)" rx={4}/>

      {/* Quadrant lines */}
      <line x1={px(0.5)} y1={pad.t} x2={px(0.5)} y2={pad.t+iH} stroke={FC.border2} strokeWidth={1} strokeDasharray="4,4"/>
      <line x1={pad.l} y1={py(0.5)} x2={pad.l+iW} y2={py(0.5)} stroke={FC.border2} strokeWidth={1} strokeDasharray="4,4"/>

      {/* Axes */}
      <line x1={pad.l} y1={pad.t+iH} x2={pad.l+iW} y2={pad.t+iH} stroke="rgba(255,255,255,0.15)" strokeWidth={1}/>
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t+iH} stroke="rgba(255,255,255,0.15)" strokeWidth={1}/>

      {/* Axis labels */}
      <text x={pad.l + iW/2} y={H-8} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize={9} fontFamily="Inter,sans-serif" letterSpacing={1}>发生概率 →</text>
      <text x={14} y={pad.t + iH/2} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize={9} fontFamily="Inter,sans-serif" letterSpacing={1} transform={`rotate(-90,14,${pad.t+iH/2})`}>影响程度 →</text>

      {/* Quadrant labels */}
      {[
        { t:'监控观察', x:0.25, y:0.88, op:0.18 },
        { t:'重点关注', x:0.75, y:0.88, op:0.35, c:FC.purpleText },
        { t:'可接受', x:0.25, y:0.12, op:0.18 },
        { t:'风险管理', x:0.75, y:0.12, op:0.22 },
      ].map((q,i) => (
        <text key={i} x={px(q.x)} y={py(q.y)} textAnchor="middle"
          fill={q.c||'rgba(255,255,255,0.25)'} fontSize={8} fontFamily="Inter,sans-serif" letterSpacing={0.5} opacity={q.op||0.2}>{q.t}</text>
      ))}

      {/* Risk nodes */}
      {risks.map(r => {
        const x = px(r.prob), y = py(r.impact);
        const isHigh = r.prob > 0.5 && r.impact > 0.6;
        const lines = r.label.split('\n');
        return (
          <g key={r.id}>
            {isHigh && <circle cx={x} cy={y} r={22} fill={FC.purple} opacity={0.08}/>}
            <circle cx={x} cy={y} r={14}
              fill={isHigh ? 'rgba(108,92,231,0.25)' : FC.surface2}
              stroke={isHigh ? FC.purple : 'rgba(255,255,255,0.15)'}
              strokeWidth={isHigh ? 1.2 : 0.8}/>
            {lines.map((line,li) => (
              <text key={li} x={x} y={y + (li - (lines.length-1)/2) * 8}
                textAnchor="middle" dominantBaseline="middle"
                fill={isHigh ? FC.purpleText : 'rgba(255,255,255,0.6)'}
                fontSize={6.5} fontFamily="system-ui,sans-serif" fontWeight={isHigh?700:400}>{line}</text>
            ))}
          </g>
        );
      })}
    </svg>
  );
};

const RiskPage = () => {
  const modelRankings = [
    {
      model:'DeepSeek-R1', color:'rgba(180,200,230,0.9)', short:'D',
      ranks:['API政策突变','算力成本高企','大厂降维打击','用户教育成本','竞争对手融资']
    },
    {
      model:'Qwen-Max', color:'rgba(230,215,180,0.9)', short:'Q',
      ranks:['监管收紧','API政策突变','用户教育成本','核心人才流失','大厂降维打击']
    },
    {
      model:'MiniMax-01', color:'rgba(180,230,195,0.9)', short:'M',
      ranks:['API政策突变','用户数据安全','算力成本高企','监管收紧','用户教育成本']
    },
  ];

  const sharedTop = ['API政策突变','用户教育成本'];

  return (
    <SectionWrap id="risk">
      <SectionHeader num="05" en="Risk Matrix" zh="风险矩阵"
        note="横轴为发生概率，纵轴为影响程度。右上角为高优先级风险区，品牌紫色渐变标注。"/>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'start' }}>

        {/* Matrix */}
        <div style={{ background:FC.surface, borderRadius:8, padding:'24px 20px', border:`1px solid ${FC.border}` }}>
          <RiskMatrix/>
        </div>

        {/* Model rankings */}
        <div>
          <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:FC.textMuted, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:20 }}>
            三模型风险优先级排序
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
            {modelRankings.map(mr => (
              <div key={mr.model} style={{ background:FC.surface, borderRadius:6, padding:'14px 14px', border:`1px solid ${FC.border}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
                  <div style={{ width:16, height:16, borderRadius:'50%', background:mr.color,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:7, fontWeight:800, fontFamily:'Inter,sans-serif', color:'#0D0D0D' }}>{mr.short}</div>
                  <span style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:FC.textSec, fontWeight:600 }}>{mr.model}</span>
                </div>
                {mr.ranks.map((risk,i) => {
                  const isShared = sharedTop.includes(risk);
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                      <span style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:FC.textMuted, minWidth:12 }}>#{i+1}</span>
                      <span style={{ fontSize:10, color:isShared ? FC.purpleText : FC.textSec, fontWeight:isShared?700:400 }}>{risk}</span>
                      {isShared && <div style={{ width:4, height:4, borderRadius:'50%', background:FC.purple, flexShrink:0 }}/>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Connection lines explanation */}
          <div style={{ padding:'14px 16px', background:FC.surface, borderRadius:6, border:`1px solid ${FC.border}` }}>
            <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:FC.textMuted, letterSpacing:'1px', textTransform:'uppercase', marginBottom:8 }}>三模型共同点名的风险</div>
            {sharedTop.map((risk,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:i<sharedTop.length-1?8:0 }}>
                <div style={{ width:6, height:6, borderRadius:1, background:FC.purple, flexShrink:0 }}/>
                <span style={{ fontSize:11, color:FC.text, fontWeight:700 }}>{risk}</span>
                <ModelDots lit={[true,true,true]}/>
              </div>
            ))}
          </div>

          <div style={{ marginTop:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:0, border:`1px solid ${FC.border}`, borderRadius:6 }}>
            {[
              { v:'8', l:'识别风险总数' },
              { v:'2', l:'三模型共识风险' },
              { v:'高', l:'API依赖风险等级' },
              { v:'12mo', l:'建议对冲时间窗口' },
            ].map((s,i) => (
              <div key={i} style={{ padding:'14px 16px', borderRight:i%2===0?`1px solid ${FC.border}`:'none', borderBottom:i<2?`1px solid ${FC.border}`:'none' }}>
                <div style={{ fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:20, color:FC.text, letterSpacing:'-0.3px' }}>{s.v}</div>
                <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:FC.textMuted, marginTop:3 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionWrap>
  );
};

window.RiskPage = RiskPage;

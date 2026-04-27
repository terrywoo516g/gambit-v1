
// fs-consensus.jsx — Force-directed Graph: Consensus & Divergence

const ForceGraph = () => {
  const W = 560, H = 440;
  const cx = W * 0.46, cy = H * 0.5;

  // Nodes: tier 0=consensus(center), 1=partial, 2=minority
  const nodes = [
    // Consensus — center cluster
    { id:'c1', label:'AI写作视频\n率先盈利',       x:cx,     y:cy,     r:36, tier:0, models:[1,1,1] },
    { id:'c2', label:'B2B付费意愿\n强于C端',        x:cx-70,  y:cy-55,  r:26, tier:0, models:[1,1,1] },
    { id:'c3', label:'市场进入\n整合期',            x:cx+75,  y:cy-45,  r:26, tier:0, models:[1,1,1] },
    // Partial consensus — middle ring
    { id:'p1', label:'AI搜索格局\n未定',            x:cx-140, y:cy+30,  r:20, tier:1, models:[1,1,0] },
    { id:'p2', label:'数字人进入\n资本寒冬',         x:cx+130, y:cy+40,  r:20, tier:1, models:[0,1,1] },
    { id:'p3', label:'开源降低\n进入门槛',           x:cx+20,  y:cy+100, r:20, tier:1, models:[1,0,1] },
    { id:'p4', label:'企业AI采购\n预算释放',         x:cx-60,  y:cy+95,  r:18, tier:1, models:[1,1,0] },
    { id:'p5', label:'LLM能力已\n达商业阈值',        x:cx+105, y:cy-115, r:18, tier:1, models:[1,0,1] },
    // Minority — outer ring
    { id:'m1', label:'垂直行业切入\n优先于通用',     x:cx-195, y:cy-60,  r:13, tier:2, models:[0,1,0] },
    { id:'m2', label:'AI设计将并购\n传统SaaS',       x:cx+175, y:cy-90,  r:13, tier:2, models:[0,0,1] },
    { id:'m3', label:'多模型整合层\n是最大机会',     x:cx+190, y:cy+100, r:13, tier:2, models:[1,0,0] },
    { id:'m4', label:'监管将成\n关键变量',           x:cx-175, y:cy+120, r:11, tier:2, models:[0,1,0] },
    { id:'m5', label:'AI教育最终\n靠内容不靠AI',     x:cx-50,  y:cy-130, r:11, tier:2, models:[0,0,1] },
  ];

  // Edges: [from, to, weight 1-3]
  const edges = [
    ['c1','c2',3],['c1','c3',3],['c2','c3',2],
    ['c1','p1',2],['c1','p2',2],['c1','p3',2],['c2','p4',2],['c3','p5',2],
    ['p1','m1',1],['p2','m2',1],['p3','m3',1],['p4','m4',1],['p5','m5',1],
    ['c2','m1',1],['c3','m3',1],
  ];

  const nMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  const tierStyle = [
    { fill:'rgba(255,255,255,0.92)', stroke:'rgba(255,255,255,0.3)', textFill:'#0D0D0D', labelSize:8.5 },
    { fill:'rgba(255,255,255,0.18)', stroke:'rgba(255,255,255,0.2)', textFill:'rgba(255,255,255,0.75)', labelSize:7.5 },
    { fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.12)', textFill:'rgba(255,255,255,0.45)', labelSize:7 },
  ];

  const modelColors = ['rgba(180,200,230,0.8)','rgba(230,215,180,0.8)','rgba(180,230,195,0.8)'];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:'visible' }}>
      {/* Edges */}
      {edges.map(([a,b,w],i) => {
        const na = nMap[a], nb = nMap[b];
        const isConsensus = na.tier===0 && nb.tier===0;
        return (
          <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
            stroke={isConsensus ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}
            strokeWidth={w * (isConsensus ? 1.2 : 0.8)}
            strokeDasharray={nb.tier===2 ? '3,4' : 'none'}/>
        );
      })}

      {/* Nodes */}
      {nodes.map(n => {
        const ts = tierStyle[n.tier];
        // Purple glow for center node
        const isCenter = n.id === 'c1';
        const lines = n.label.split('\n');
        return (
          <g key={n.id}>
            {isCenter && <circle cx={n.x} cy={n.y} r={n.r+18} fill={FC.purpleGlow} opacity={0.5}/>}
            {isCenter && <circle cx={n.x} cy={n.y} r={n.r+8} fill="rgba(108,92,231,0.2)"/>}
            <circle cx={n.x} cy={n.y} r={n.r}
              fill={isCenter ? FC.purple : ts.fill}
              stroke={isCenter ? 'rgba(140,120,255,0.5)' : ts.stroke}
              strokeWidth={1}/>
            {/* Label */}
            {lines.map((line,li) => (
              <text key={li} x={n.x} y={n.y + (li - (lines.length-1)/2) * (ts.labelSize+1.5)}
                textAnchor="middle" dominantBaseline="middle"
                fill={isCenter ? 'white' : ts.textFill}
                fontSize={ts.labelSize} fontFamily="system-ui,sans-serif" fontWeight={n.tier===0?700:400}>
                {line}
              </text>
            ))}
            {/* Model dot indicators for partial/minority */}
            {n.tier > 0 && (
              <g>
                {n.models.map((lit,mi) => (
                  <circle key={mi} cx={n.x - (n.models.length-1)*4 + mi*8} cy={n.y + n.r + 6}
                    r={2.5} fill={lit ? modelColors[mi] : 'rgba(255,255,255,0.1)'}/>
                ))}
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};

const ConsensusPage = () => (
  <SectionWrap id="consensus">
    <SectionHeader num="03" en="Consensus & Divergence" zh="共识与分歧"
      note="中心节点为三模型完全共识，向外依次为部分共识与少数派观点。节点下方小圆圈标注各模型贡献。"/>

    <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:64, alignItems:'start' }}>

      {/* Graph */}
      <div style={{ background:FC.surface, borderRadius:8, padding:'32px 24px', border:`1px solid ${FC.border}` }}>
        <ForceGraph/>
      </div>

      {/* Annotation cards */}
      <div style={{ width:220 }}>
        {/* Legend */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:FC.textMuted, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:12 }}>节点图例</div>
          {[
            { fill:'rgba(255,255,255,0.92)', label:'三模型完全共识' },
            { fill:'rgba(255,255,255,0.18)', label:'部分共识（2/3 模型）' },
            { fill:'rgba(255,255,255,0.07)', label:'少数派观点（1/3）' },
          ].map((l,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <div style={{ width:12, height:12, borderRadius:'50%', background:l.fill, border:'1px solid rgba(255,255,255,0.2)', flexShrink:0 }}/>
              <span style={{ fontFamily:'Inter,sans-serif', fontSize:10, color:FC.textSec }}>{l.label}</span>
            </div>
          ))}
        </div>

        <Rule/>

        {/* Key consensus */}
        <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:FC.textMuted, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:12 }}>核心共识</div>
        {[
          { text:'AI 写作和视频是唯一规模化盈利的赛道', lit:[1,1,1] },
          { text:'B2B 付费意愿显著高于 C 端用户', lit:[1,1,1] },
          { text:'市场整合期已经开始', lit:[1,1,1] },
        ].map((item,i) => (
          <div key={i} style={{ marginBottom:12, paddingBottom:12, borderBottom:`1px solid ${FC.border}` }}>
            <ModelDots lit={item.lit.map(v=>!!v)}/>
            <p style={{ margin:'5px 0 0', fontSize:11, color:FC.textSec, lineHeight:1.6 }}>{item.text}</p>
          </div>
        ))}

        <Rule/>

        {/* Key divergence */}
        <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:FC.textMuted, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:12 }}>关键分歧</div>
        {[
          { text:'AI 搜索：谁会赢？3 个模型给出了完全不同的预测。', lit:[1,1,0] },
          { text:'多模型整合层的市场时机——现在还是 12 个月后？', lit:[1,0,0] },
        ].map((item,i) => (
          <div key={i} style={{ marginBottom:12 }}>
            <ModelDots lit={item.lit.map(v=>!!v)}/>
            <p style={{ margin:'5px 0 0', fontSize:11, color:FC.textSec, lineHeight:1.6 }}>{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  </SectionWrap>
);

window.ConsensusPage = ConsensusPage;

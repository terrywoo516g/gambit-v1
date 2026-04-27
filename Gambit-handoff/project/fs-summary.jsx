
// fs-summary.jsx — Executive Summary + SVG Sankey Diagram

const SankeyDiagram = () => {
  const W = 420, H = 320;
  const lx = 80, rx = 340;

  // Left nodes: 3 models
  const leftNodes = [
    { id:'D', label:'DeepSeek-R1', color:'rgba(180,200,230,0.85)', y:60  },
    { id:'Q', label:'Qwen-Max',    color:'rgba(230,215,180,0.85)', y:160 },
    { id:'M', label:'MiniMax-01',  color:'rgba(180,230,195,0.85)', y:260 },
  ];

  // Right nodes: conclusion categories
  const rightNodes = [
    { id:'earn', label:'赚钱赛道',  color:FC.purple,   y:50  },
    { id:'burn', label:'烧钱赛道',  color:'rgba(200,80,60,0.7)',  y:140 },
    { id:'opp',  label:'机会窗口',  color:'rgba(80,160,120,0.7)', y:220 },
    { id:'wait', label:'待观察',    color:'rgba(120,120,130,0.6)', y:290 },
  ];

  // Flows: [from, to, width, opacity]
  const flows = [
    ['D','earn',14,0.7], ['D','burn',6,0.5],  ['D','opp',10,0.65], ['D','wait',4,0.4],
    ['Q','earn',10,0.6], ['Q','burn',8,0.55], ['Q','opp',14,0.7],  ['Q','wait',6,0.45],
    ['M','earn',8,0.55], ['M','burn',5,0.45], ['M','opp',12,0.65], ['M','wait',8,0.5],
  ];

  const lMap = Object.fromEntries(leftNodes.map(n => [n.id, n]));
  const rMap = Object.fromEntries(rightNodes.map(n => [n.id, n]));

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:'visible' }}>
      {/* Flows */}
      {flows.map(([fid, tid, w, op], i) => {
        const fn = lMap[fid], tn = rMap[tid];
        const mx = (lx + rx) / 2;
        const path = `M ${lx} ${fn.y} C ${mx} ${fn.y} ${mx} ${tn.y} ${rx} ${tn.y}`;
        const grad_id = `sg-${i}`;
        return (
          <g key={i}>
            <defs>
              <linearGradient id={grad_id} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={fn.color} stopOpacity={op * 0.8}/>
                <stop offset="60%" stopColor={FC.purple} stopOpacity={op * 0.5}/>
                <stop offset="100%" stopColor={tn.color} stopOpacity={op}/>
              </linearGradient>
            </defs>
            <path d={path} fill="none" stroke={`url(#${grad_id})`} strokeWidth={w} strokeLinecap="round" opacity={op}/>
          </g>
        );
      })}

      {/* Left nodes */}
      {leftNodes.map(n => (
        <g key={n.id}>
          <rect x={lx - 6} y={n.y - 16} width={12} height={32} rx={3} fill={n.color}/>
          <text x={lx - 14} y={n.y + 4} textAnchor="end" fill="rgba(255,255,255,0.6)"
            fontSize={9} fontFamily="Inter,sans-serif" fontWeight={600} letterSpacing={0.5}>
            {n.label}
          </text>
        </g>
      ))}

      {/* Right nodes */}
      {rightNodes.map(n => (
        <g key={n.id}>
          <rect x={rx - 6} y={n.y - 12} width={12} height={24} rx={3} fill={n.color}/>
          {/* Glow for purple node */}
          {n.id === 'earn' && (
            <rect x={rx - 10} y={n.y - 16} width={20} height={32} rx={5}
              fill={FC.purple} opacity={0.15}/>
          )}
          <text x={rx + 14} y={n.y + 4} textAnchor="start" fill={n.id==='earn' ? FC.purpleText : 'rgba(255,255,255,0.5)'}
            fontSize={9} fontFamily="Inter,sans-serif" fontWeight={n.id==='earn' ? 700 : 500} letterSpacing={0.3}>
            {n.label}
          </text>
        </g>
      ))}

      {/* Center label */}
      <text x={W/2} y={H - 8} textAnchor="middle" fill="rgba(255,255,255,0.2)"
        fontSize={8} fontFamily="Inter,sans-serif" letterSpacing={1}>
        流线宽度代表模型对该结论的支撑力度
      </text>
    </svg>
  );
};

const SummaryPage = () => (
  <SectionWrap id="summary">
    <SectionHeader num="01" en="Executive Summary" zh="分析摘要"/>

    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:80, alignItems:'start' }}>

      {/* Left: Text */}
      <div>
        {[
          {
            lit:[true,true,true],
            head:'AI 写作与视频是当前唯一规模化盈利的赛道',
            body:'三个模型一致确认，2026 年中国 AI 应用市场中，AI 写作工具和 AI 视频生成是仅有的两个已实现规模化付费的赛道。豆包、可灵、即梦等头部产品月活跃付费用户已超过百万量级。'
          },
          {
            lit:[true,true,false],
            head:'B2B 场景的付费意愿显著强于 C 端',
            body:'DeepSeek 和 Qwen 均指出，企业客户的付费转化率是个人用户的 3–5 倍。AI 客服、AI 编程助手等 B2B 工具正在形成更稳定的收入结构，尽管绝对规模仍小。'
          },
          {
            lit:[false,true,true],
            head:'数字人赛道资金消耗速度超过市场预期',
            body:'Qwen 和 MiniMax 均对数字人赛道持保守态度：当前头部公司的技术成本远高于预期收入，市场教育周期被系统性低估。多家获得大额融资的公司已悄然降低了增长指引。'
          },
          {
            lit:[true,false,true],
            head:'多模型整合工具是下一个尚未被占领的机会',
            body:'DeepSeek 和 MiniMax 均独立提出，帮助用户同时使用并对比多个 AI 模型输出的工具层产品，是当前市场中最明显的空白。用户对"AI 结果可信度"的焦虑正在创造真实需求。'
          },
        ].map((item,i) => (
          <div key={i} style={{ marginBottom:28, paddingBottom:28, borderBottom:`1px solid ${FC.border}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <ModelDots lit={item.lit}/>
              <span style={{ fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:13, color:FC.text }}>{item.head}</span>
            </div>
            <p style={{ margin:0, fontSize:12, color:FC.textSec, lineHeight:1.75 }}>{item.body}</p>
          </div>
        ))}

        {/* Footer meta */}
        <div style={{ display:'flex', gap:24, paddingTop:8 }}>
          {[
            {l:'综合置信度', v:'87%', c:FC.purple},
            {l:'分析耗时',   v:'6.2s'},
            {l:'交叉验证轮次', v:'3'},
          ].map((m,i) => (
            <div key={i}>
              <div style={{ fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:18, color:m.c||FC.text, letterSpacing:'-0.3px' }}>{m.v}</div>
              <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:FC.textMuted, textTransform:'uppercase', letterSpacing:'1px', marginTop:2 }}>{m.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Sankey */}
      <div>
        <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:FC.textMuted, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:20 }}>
          观点流向图 · Three Model Flows
        </div>
        <div style={{ background:FC.surface, borderRadius:8, padding:'32px 28px', border:`1px solid ${FC.border}` }}>
          <SankeyDiagram/>
        </div>
        <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:6 }}>
          {[
            { color:'rgba(180,200,230,0.85)', label:'DeepSeek-R1 观点流向' },
            { color:'rgba(230,215,180,0.85)', label:'Qwen-Max 观点流向' },
            { color:'rgba(180,230,195,0.85)', label:'MiniMax-01 观点流向' },
          ].map((l,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:20, height:3, borderRadius:2, background:l.color }}/>
              <span style={{ fontFamily:'Inter,sans-serif', fontSize:10, color:FC.textMuted }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </SectionWrap>
);

window.SummaryPage = SummaryPage;

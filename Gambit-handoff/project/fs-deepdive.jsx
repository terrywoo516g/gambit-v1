
// fs-deepdive.jsx — Deep Dive: Dot Matrix + Mini Sankey

// Dot matrix: filled dots = value%, total = 100 dots (10x10 grid)
const DotMatrix = ({ value, color = FC.purple, size = 7, gap = 3 }) => {
  const total = 100;
  const filled = Math.round(value);
  const cols = 10;
  const rows = 10;
  return (
    <svg width={cols*(size+gap)-gap} height={rows*(size+gap)-gap} viewBox={`0 0 ${cols*(size+gap)-gap} ${rows*(size+gap)-gap}`}>
      {Array.from({length:total}).map((_,i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const isFilled = i < filled;
        return (
          <rect key={i}
            x={col*(size+gap)} y={row*(size+gap)}
            width={size} height={size} rx={1.5}
            fill={isFilled ? color : 'rgba(255,255,255,0.06)'}
            opacity={isFilled ? 1 : 1}
          />
        );
      })}
    </svg>
  );
};

// Mini Sankey for fund flow
const MiniSankey = ({ title, flows }) => {
  const W = 280, H = 90;
  // flows: [{label, value, color}]
  const total = flows.reduce((s,f) => s+f.value, 0);
  let offset = 10;
  const rects = flows.map(f => {
    const h = (f.value / total) * (H - 20);
    const r = { ...f, y: offset, h };
    offset += h + 4;
    return r;
  });

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <text x={0} y={8} fill="rgba(255,255,255,0.3)" fontSize={8} fontFamily="Inter,sans-serif" letterSpacing={0.5}>{title}</text>
      {/* Source block */}
      <rect x={0} y={12} width={14} height={H-14} rx={2} fill="rgba(255,255,255,0.15)"/>
      <text x={7} y={H/2+4} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={7} fontFamily="Inter,sans-serif"
        transform={`rotate(-90,7,${H/2})`}>融资</text>

      {/* Flows + dest bars */}
      {rects.map((r,i) => {
        const sy = 12 + (r.y - 10) * (H-14) / (H-20);
        const ey = r.y + r.h/2;
        const mx = W/2;
        return (
          <g key={i}>
            {/* Bezier path */}
            <path d={`M 14 ${sy} C ${mx*0.5} ${sy} ${mx*0.5} ${ey} ${W-60} ${ey}`}
              fill="none" stroke={r.color} strokeWidth={Math.max(2, r.h * 0.6)} opacity={0.5} strokeLinecap="round"/>
            {/* Dest bar */}
            <rect x={W-56} y={r.y} width={10} height={r.h} rx={1.5} fill={r.color} opacity={0.8}/>
            {/* Label */}
            <text x={W-42} y={r.y + r.h/2 + 3} fill="rgba(255,255,255,0.5)"
              fontSize={7.5} fontFamily="Inter,sans-serif">{r.label}</text>
            <text x={W-4} y={r.y + r.h/2 + 3} fill={r.color} textAnchor="end"
              fontSize={7.5} fontFamily="Inter,sans-serif" fontWeight={700}>{r.value}%</text>
          </g>
        );
      })}
    </svg>
  );
};

const MetricRow = ({ label, value, color, lit }) => (
  <div style={{ marginBottom:20 }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
      <span style={{ fontFamily:'system-ui,sans-serif', fontSize:12, color:FC.textSec }}>{label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {lit && <ModelDots lit={lit}/>}
        <span style={{ fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:16, color:color||FC.white, letterSpacing:'-0.3px' }}>{value}%</span>
      </div>
    </div>
    <DotMatrix value={value} color={color||FC.purple}/>
  </div>
);

const DeepDivePage = () => (
  <SectionWrap id="deepdive">
    <SectionHeader num="04" en="Deep Dive" zh="赛道深度分析"
      note="聚焦 AI 写作工具与 AI 视频生成两个当前最成熟的赛道，逐项拆解核心业务指标"/>

    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:60 }}>

      {/* ── Left: AI Writing ── */}
      <div>
        <div style={{ marginBottom:28, paddingBottom:20, borderBottom:`1px solid ${FC.border}` }}>
          <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, fontWeight:700, color:FC.textMuted, letterSpacing:'2px', textTransform:'uppercase', marginBottom:8 }}>赛道 A</div>
          <div style={{ fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:22, color:FC.text, letterSpacing:'-0.3px' }}>AI 写作工具</div>
          <div style={{ fontFamily:'Inter,sans-serif', fontSize:11, color:FC.textSec, marginTop:4 }}>代表产品：豆包 · 通义 · Kimi · 文心</div>
        </div>

        <div style={{ marginBottom:28 }}>
          <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:FC.textMuted, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:16 }}>核心指标（每点 = 1%）</div>
          <MetricRow label="市场渗透率" value={38} color={FC.purple} lit={[true,true,true]}/>
          <MetricRow label="付费转化率" value={12} color="rgba(180,200,230,0.9)" lit={[true,true,false]}/>
          <MetricRow label="7日用户留存" value={54} color="rgba(100,180,140,0.9)" lit={[true,false,true]}/>
          <MetricRow label="NPS 净推荐值" value={41} color="rgba(200,160,80,0.9)" lit={[false,true,true]}/>
        </div>

        <div style={{ background:FC.surface, borderRadius:6, padding:'16px 18px', border:`1px solid ${FC.border}` }}>
          <MiniSankey title="资金流向（典型头部公司）" flows={[
            { label:'研发 & 模型', value:45, color:FC.purple },
            { label:'用户获取', value:30, color:'rgba(180,200,230,0.8)' },
            { label:'运营 & 合规', value:15, color:'rgba(200,160,80,0.7)' },
            { label:'基础设施', value:10, color:'rgba(120,120,130,0.7)' },
          ]}/>
        </div>

        <div style={{ marginTop:16, padding:'12px 16px', border:`1px solid ${FC.border}`, borderRadius:6 }}>
          <ModelDots lit={[true,true,true]}/>
          <p style={{ margin:'8px 0 0', fontSize:11, color:FC.textSec, lineHeight:1.65 }}>
            三模型一致认为 AI 写作已进入成熟竞争阶段，差异化窗口正在收窄。下一轮竞争焦点在于垂直行业适配与多模态能力。
          </p>
        </div>
      </div>

      {/* ── Right: AI Video ── */}
      <div>
        <div style={{ marginBottom:28, paddingBottom:20, borderBottom:`1px solid ${FC.border}` }}>
          <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, fontWeight:700, color:FC.textMuted, letterSpacing:'2px', textTransform:'uppercase', marginBottom:8 }}>赛道 B</div>
          <div style={{ fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:22, color:FC.text, letterSpacing:'-0.3px' }}>AI 视频生成</div>
          <div style={{ fontFamily:'Inter,sans-serif', fontSize:11, color:FC.textSec, marginTop:4 }}>代表产品：可灵 · 即梦 · Sora·CN · 海螺</div>
        </div>

        <div style={{ marginBottom:28 }}>
          <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:FC.textMuted, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:16 }}>核心指标（每点 = 1%）</div>
          <MetricRow label="市场渗透率" value={22} color={FC.purple} lit={[true,true,true]}/>
          <MetricRow label="付费转化率" value={19} color="rgba(180,200,230,0.9)" lit={[true,true,true]}/>
          <MetricRow label="7日用户留存" value={43} color="rgba(100,180,140,0.9)" lit={[true,true,false]}/>
          <MetricRow label="NPS 净推荐值" value={61} color="rgba(200,160,80,0.9)" lit={[false,true,true]}/>
        </div>

        <div style={{ background:FC.surface, borderRadius:6, padding:'16px 18px', border:`1px solid ${FC.border}` }}>
          <MiniSankey title="资金流向（典型头部公司）" flows={[
            { label:'研发 & 训练', value:55, color:FC.purple },
            { label:'用户获取', value:22, color:'rgba(180,200,230,0.8)' },
            { label:'算力租赁', value:18, color:'rgba(200,160,80,0.7)' },
            { label:'运营', value:5, color:'rgba(120,120,130,0.7)' },
          ]}/>
        </div>

        <div style={{ marginTop:16, padding:'12px 16px', border:`1px solid ${FC.border}`, borderRadius:6 }}>
          <ModelDots lit={[false,true,true]}/>
          <p style={{ margin:'8px 0 0', fontSize:11, color:FC.textSec, lineHeight:1.65 }}>
            Qwen 和 MiniMax 均指出 AI 视频的付费转化率远高于 AI 写作，核心原因是内容创作者的商业需求更明确。但算力成本仍然是制约盈利能力的核心瓶颈。
          </p>
        </div>
      </div>
    </div>
  </SectionWrap>
);

window.DeepDivePage = DeepDivePage;

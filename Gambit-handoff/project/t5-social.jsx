
// Template 5 v2 — Social Cards, premium dark annual-report aesthetic

const Template5 = () => {
  const [activeCard, setActiveCard] = React.useState(0);

  const cards = [
    {
      tag: 'Decision Report',
      tagLabel: '决策分析',
      accent: '#8B7FF0',
      title: '面向中国市场的\n多模型 AI 工作台\n是否值得做？',
      subtitle: '3 个 AI 模型交叉分析 · 覆盖市场、技术、商业化三个维度',
      stats: [
        { v:'91%', l:'市场需求置信度', up:true },
        { v:'33%', l:'12月盈亏平衡', up:false },
        { v:'3', l:'参与分析模型', neutral:true },
      ],
      findings: [
        { icon:'consensus', color:'#2E8B5A', label:'共识', text:'市场需求真实，技术路径可行，差异化优势明确' },
        { icon:'diverge',   color:'#C4651A', label:'最大分歧', text:'商业化路径：B端订阅 vs C端增值 vs 混合策略' },
        { icon:'risk',      color:'#B52020', label:'最大风险', text:'API 依赖风险——主要提供商政策随时可能变动' },
      ],
      verdict: '值得推进，节奏需谨慎',
      verdictUp: true,
    },
    {
      tag: 'Competitive Analysis',
      tagLabel: '竞品分析',
      accent: '#1A5FA8',
      title: '豆包 · DeepSeek\nKimi · 文心一言\n谁最值得选择？',
      subtitle: '3 个 AI 模型综合评测 · 覆盖功能、定价、适用场景六大维度',
      stats: [
        { v:'4', l:'参与对比产品', neutral:true },
        { v:'高', l:'整合层机会优先级', up:true },
        { v:'中', l:'工作台化优先级', neutral:true },
      ],
      findings: [
        { icon:'check',    color:'#2E8B5A', label:'共识', text:'中文写作质量已超用户预期，差异化竞争进入细分阶段' },
        { icon:'diverge',  color:'#C4651A', label:'最大分歧', text:'豆包护城河是否稳固——3 个模型判断出现根本分歧' },
        { icon:'trend',    color:'#1A5FA8', label:'机会窗口', text:'多模型整合层是当前最明显的市场空白' },
      ],
      verdict: '市场存在明显空白，整合者胜出',
      verdictUp: true,
    },
    {
      tag: 'Content Studio',
      tagLabel: '内容创作',
      accent: '#1A6B45',
      title: 'AI 时代\n最值钱的不是技能\n是判断力',
      subtitle: '3 个模型分别建议不同切入角度，Gambit 综合后生成完整创作包',
      stats: [
        { v:'5', l:'推荐标题备选', neutral:true },
        { v:'3', l:'推荐开头备选', neutral:true },
        { v:'92%', l:'判断力价值置信度', up:true },
      ],
      findings: [
        { icon:'target',   color:'#5C4FD4', label:'核心观点', text:'判断力 > 执行力，AI 越强越放大判断优势' },
        { icon:'diverge',  color:'#C4651A', label:'最大分歧', text:'专精 vs 通才——哪种路线更抗风险？3 模型各有立场' },
        { icon:'minority', color:'#1A5FA8', label:'少数派洞察', text:'元技能（学习力本身）比任何具体技能都更抗风险' },
      ],
      verdict: '5 种技能让 AI 越强你越值钱',
      verdictUp: true,
    },
    {
      tag: 'Writing Review',
      tagLabel: '写作审查',
      accent: '#B52020',
      title: '你的融资邮件\n被 3 个 AI 打了几分？\n原稿：42 分',
      subtitle: '多模型高风险写作审查 · 共识问题 + 分歧建议 + 最终推荐版本',
      stats: [
        { v:'42', l:'原稿综合评分', up:false },
        { v:'87', l:'修改后评分', up:true },
        { v:'3', l:'共识性高优先级问题', up:false },
      ],
      findings: [
        { icon:'alert',  color:'#B52020', label:'共识问题', text:'"革命性""非常好"——投资人最讨厌的措辞，立即删除' },
        { icon:'chart',  color:'#C4651A', label:'数据缺失', text:'0 个具体数字，无法支撑任何投资决策' },
        { icon:'check',  color:'#2E8B5A', label:'修改后', text:'7 日留存 68%，周均使用 4.2 次——这才是会说话的数字' },
      ],
      verdict: '修改后评分提升 45 分',
      verdictUp: true,
    },
  ];

  const card = cards[activeCard];

  return (
    <div style={{fontFamily:'system-ui,-apple-system,sans-serif',background:C.bg,minHeight:'100vh',padding:'32px 40px'}}>
      <div style={{maxWidth:680,margin:'0 auto'}}>

        {/* Section Header */}
        <div style={{marginBottom:20}}>
          <SectionLabel icon="memo" label="社交媒体分享卡片（小红书 / 朋友圈格式）"/>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {cards.map((c,i) => (
              <button key={i} onClick={() => setActiveCard(i)} style={{
                padding:'6px 14px',borderRadius:2,
                border:`1px solid ${activeCard===i ? C.purple : C.border}`,
                background: activeCard===i ? C.purple : C.paper,
                color: activeCard===i ? 'white' : C.inkSecondary,
                fontFamily:'Inter,sans-serif',fontWeight:600,fontSize:11,
                letterSpacing:'0.3px',cursor:'pointer',transition:'all 0.15s'
              }}>{c.tagLabel}</button>
            ))}
          </div>
        </div>

        {/* Card */}
        <div style={{
          background:'#0C0B14', borderRadius:8,
          overflow:'hidden',boxShadow:'0 24px 64px rgba(0,0,0,0.35)',
          border:`1px solid rgba(255,255,255,0.06)`
        }}>

          {/* Card Header */}
          <div style={{padding:'32px 36px 24px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <PixelCat size={26} invert={true}/>
                <div>
                  <div style={{fontFamily:'Inter,sans-serif',fontWeight:800,fontSize:16,color:'white',letterSpacing:'-0.3px',lineHeight:1}}>Gambit</div>
                  <div style={{fontFamily:'Inter,sans-serif',fontSize:9,color:'rgba(255,255,255,0.35)',letterSpacing:'1px',textTransform:'uppercase',marginTop:2}}>AI Workbench</div>
                </div>
              </div>
              <div style={{
                padding:'4px 10px',borderRadius:2,
                border:`1px solid ${card.accent}40`,
                background: card.accent+'15',
                fontFamily:'Inter,sans-serif',fontSize:9,fontWeight:700,
                color:card.accent,letterSpacing:'1px',textTransform:'uppercase'
              }}>{card.tag}</div>
            </div>

            <h2 style={{
              margin:'0 0 12px',fontFamily:'Inter,sans-serif',fontWeight:900,fontSize:28,
              color:'white',lineHeight:1.2,letterSpacing:'-0.5px',whiteSpace:'pre-line'
            }}>{card.title}</h2>
            <p style={{margin:0,fontSize:12,color:'rgba(255,255,255,0.45)',lineHeight:1.6,letterSpacing:'0.1px'}}>{card.subtitle}</p>
          </div>

          {/* Stats Row */}
          <div style={{
            display:'grid',gridTemplateColumns:'repeat(3,1fr)',
            borderTop:'1px solid rgba(255,255,255,0.07)',
            borderBottom:'1px solid rgba(255,255,255,0.07)',
          }}>
            {card.stats.map((s,i) => (
              <div key={i} style={{
                padding:'16px 20px',textAlign:'center',
                borderRight: i<2 ? '1px solid rgba(255,255,255,0.07)' : 'none'
              }}>
                <div style={{
                  fontFamily:'Inter,sans-serif',fontWeight:800,fontSize:22,letterSpacing:'-0.5px',
                  color: s.up ? '#2E8B5A' : s.neutral ? 'rgba(255,255,255,0.85)' : '#B52020'
                }}>{s.v}</div>
                <div style={{fontFamily:'Inter,sans-serif',fontSize:9,color:'rgba(255,255,255,0.35)',marginTop:4,letterSpacing:'0.5px',textTransform:'uppercase'}}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Findings */}
          <div style={{padding:'0 36px'}}>
            {card.findings.map((f,i) => (
              <div key={i} style={{
                display:'flex',gap:14,alignItems:'flex-start',
                padding:'14px 0',
                borderBottom: i<card.findings.length-1 ? '1px solid rgba(255,255,255,0.06)' : 'none'
              }}>
                <div style={{
                  width:30,height:30,borderRadius:3,flexShrink:0,marginTop:1,
                  background:f.color+'20',border:`1px solid ${f.color}30`,
                  display:'flex',alignItems:'center',justifyContent:'center'
                }}>
                  <Icon name={f.icon} size={13} color={f.color}/>
                </div>
                <div>
                  <div style={{fontFamily:'Inter,sans-serif',fontSize:9,fontWeight:700,color:f.color,letterSpacing:'1px',textTransform:'uppercase',marginBottom:3}}>{f.label}</div>
                  <div style={{fontSize:13,color:'rgba(255,255,255,0.78)',lineHeight:1.55}}>{f.text}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Verdict */}
          <div style={{
            margin:'0 36px 0',padding:'14px 0',
            borderTop:'1px solid rgba(255,255,255,0.07)',
            display:'flex',alignItems:'center',gap:12
          }}>
            <div style={{width:3,height:32,background:card.verdictUp?'#2E8B5A':'#B52020',borderRadius:1,flexShrink:0}}/>
            <div>
              <div style={{fontFamily:'Inter,sans-serif',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:3}}>Gambit 综合判断</div>
              <div style={{fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:14,color:'white'}}>{card.verdict}</div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding:'14px 36px',margin:'0',
            borderTop:'1px solid rgba(255,255,255,0.07)',
            background:'rgba(0,0,0,0.25)',
            display:'flex',alignItems:'center',justifyContent:'space-between'
          }}>
            <div style={{fontFamily:'Inter,sans-serif',fontSize:10,color:'rgba(255,255,255,0.25)',letterSpacing:'0.2px'}}>
              完整报告由 Gambit 生成 · 由 3 个 AI 模型交叉分析
            </div>
            <div style={{
              fontFamily:'Inter,sans-serif',fontSize:10,fontWeight:700,
              color:card.accent,letterSpacing:'0.5px'
            }}>gambit.app →</div>
          </div>
        </div>

        {/* Note */}
        <div style={{
          marginTop:14,padding:'10px 14px',borderRadius:3,
          background:C.paper,border:`1px solid ${C.borderLight}`,
          display:'flex',alignItems:'center',gap:8
        }}>
          <Icon name="info" size={13} color={C.inkMuted}/>
          <span style={{fontSize:11,color:C.inkMuted,lineHeight:1.5}}>
            遵循 1080px 宽度规范，适合截图分享至小红书、朋友圈或微博。内容基于完整报告自动提炼生成。
          </span>
        </div>
      </div>
    </div>
  );
};

window.Template5 = Template5;

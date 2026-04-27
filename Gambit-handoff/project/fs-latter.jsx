
// fs-latter.jsx — Executive One-Pager + Social Card

// ── ONE-PAGER MEMO ───────────────────────────────────────────────────────────

const MemoPage = () => (
  <SectionWrap id="memo" style={{ background:'#0A0A0C', display:'flex', alignItems:'center', justifyContent:'center' }}>
    <div style={{ width:'100%', maxWidth:700 }}>
      {/* Top rule */}
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:52 }}>
        <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.08)' }}/>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <FlagshipIcon size={20}/>
          <span style={{ fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:13, color:'rgba(255,255,255,0.4)', letterSpacing:'2px', textTransform:'uppercase' }}>Executive One-Pager</span>
        </div>
        <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.08)' }}/>
      </div>

      {/* Question */}
      <div style={{ marginBottom:44 }}>
        <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:FC.textMuted, letterSpacing:'2px', textTransform:'uppercase', marginBottom:12 }}>核心问题</div>
        <div style={{ fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:28, color:FC.white, lineHeight:1.2, letterSpacing:'-0.5px' }}>
          2026 年中国 AI 应用市场，谁在赚钱，<br/>谁在烧钱，下一个机会在哪里？
        </div>
      </div>

      <div style={{ height:1, background:'rgba(255,255,255,0.06)', marginBottom:44 }}/>

      {/* Core conclusions */}
      <div style={{ marginBottom:44 }}>
        <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:FC.textMuted, letterSpacing:'2px', textTransform:'uppercase', marginBottom:20 }}>核心结论</div>
        {[
          { n:'01', text:'AI 写作和视频是唯一实现规模化盈利的赛道，头部格局基本锁定，进入时机已过。', lit:[1,1,1] },
          { n:'02', text:'数字人等高估值赛道正在经历资本寒冬，其技术成本被系统性低估，整合洗牌不可避免。', lit:[0,1,1] },
          { n:'03', text:'多模型整合工具层是当前最明显的机会空白：用户不缺 AI，缺的是对 AI 的判断力。', lit:[1,0,1] },
        ].map(item => (
          <div key={item.n} style={{ display:'flex', gap:20, marginBottom:20, alignItems:'flex-start' }}>
            <span style={{ fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:11, color:FC.purple, letterSpacing:'1px', minWidth:20, marginTop:1 }}>{item.n}</span>
            <p style={{ margin:0, fontFamily:'system-ui,sans-serif', fontSize:14, color:FC.text, lineHeight:1.75, flex:1 }}>{item.text}</p>
            <ModelDots lit={item.lit.map(v=>!!v)}/>
          </div>
        ))}
      </div>

      <div style={{ height:1, background:'rgba(255,255,255,0.06)', marginBottom:44 }}/>

      {/* Max consensus / divergence / risk */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:32, marginBottom:44 }}>
        {[
          { label:'最大共识', color:'rgba(100,180,130,0.9)', content:'AI写作/视频已成熟，多模型整合层尚未被占领——这两点三模型完全一致。' },
          { label:'最大分歧', color:'rgba(200,160,80,0.9)', content:'AI 搜索赛道的最终赢家：3 个模型给出了 3 个不同答案，结论相互矛盾。' },
          { label:'最大风险', color:FC.purple, content:'API 依赖风险——所有结论建立在第三方 AI 能力之上，政策变动可能归零所有假设。' },
        ].map((item,i) => (
          <div key={i}>
            <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:item.color, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:10, fontWeight:700 }}>{item.label}</div>
            <p style={{ margin:0, fontSize:12, color:FC.textSec, lineHeight:1.7 }}>{item.content}</p>
          </div>
        ))}
      </div>

      <div style={{ height:1, background:'rgba(255,255,255,0.06)', marginBottom:44 }}/>

      {/* Actions */}
      <div style={{ marginBottom:52 }}>
        <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:FC.textMuted, letterSpacing:'2px', textTransform:'uppercase', marginBottom:20 }}>推荐行动</div>
        {[
          '立即评估多模型整合产品的 MVP 可行性——时间窗口为 6–12 个月',
          '避开 AI 写作/视频赛道的直接竞争，格局已定，进入成本过高',
          '建立 API 多来源冗余策略，任何 AI 产品都应将此列为第一优先级',
        ].map((a,i) => (
          <div key={i} style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:14 }}>
            <div style={{ width:18, height:18, borderRadius:'50%', border:`1px solid ${FC.purple}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
              <span style={{ fontFamily:'Inter,sans-serif', fontSize:8, fontWeight:700, color:FC.purple }}>{i+1}</span>
            </div>
            <span style={{ fontFamily:'system-ui,sans-serif', fontSize:13, color:FC.text, lineHeight:1.7 }}>{a}</span>
          </div>
        ))}
      </div>

      {/* Model indicators */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:24 }}>
        {MODELS.map((m,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:m.color,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'Inter,sans-serif', fontSize:10, fontWeight:800, color:'#0D0D0D' }}>{m.key}</div>
            <span style={{ fontFamily:'Inter,sans-serif', fontSize:10, color:FC.textMuted }}>{m.name}</span>
          </div>
        ))}
      </div>
    </div>
  </SectionWrap>
);

// ── SOCIAL CARD ──────────────────────────────────────────────────────────────

const SocialCardPage = () => (
  <SectionWrap id="social" style={{ background:'#060608', display:'flex', alignItems:'center', justifyContent:'center', padding:'60px 40px' }}>
    <div style={{ width:'100%', maxWidth:560 }}>
      <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:FC.textMuted, letterSpacing:'2px', textTransform:'uppercase', marginBottom:20 }}>
        08 · Social Card · 竖版 1080px
      </div>

      {/* Card */}
      <div style={{ background:'#0D0D0D', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'32px 36px 24px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:32 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <FlagshipIcon size={24}/>
              <span style={{ fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:15, color:'white', letterSpacing:'-0.2px' }}>Gambit</span>
            </div>
            <span style={{ fontFamily:'Inter,sans-serif', fontSize:8, color:'rgba(255,255,255,0.3)', letterSpacing:'2px', textTransform:'uppercase' }}>2026 · Q2 Research</span>
          </div>
          <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:FC.purple, fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', marginBottom:14 }}>
            3 模型 · 交叉验证 · 综合置信度 87%
          </div>
          <div style={{ fontFamily:'Inter,sans-serif', fontWeight:900, fontSize:32, color:'white', lineHeight:1.15, letterSpacing:'-0.8px' }}>
            91% 共识：<br/>AI 写作赛道<br/>已进入洗牌期
          </div>
        </div>

        {/* Data points */}
        <div style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          {[
            { icon:'chart', v:'¥158亿', l:'中国 AI 应用市场 ARR（2026 Q2）', up:true },
            { icon:'target', v:'2个', l:'实现规模化盈利的赛道（写作 · 视频）', up:true },
            { icon:'alert', v:'87%', l:'数字人赛道公司陷入资金压力（预测）', up:false },
          ].map((item,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:16, padding:'18px 36px', borderBottom:i<2?'1px solid rgba(255,255,255,0.04)':'none' }}>
              <div style={{ width:34, height:34, borderRadius:4, background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <FIcon name={item.icon} size={14} color="rgba(255,255,255,0.4)"/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:20, color:item.up?'white':'rgba(255,255,255,0.6)', letterSpacing:'-0.3px' }}>{item.v}</div>
                <div style={{ fontFamily:'Inter,sans-serif', fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:2 }}>{item.l}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Verdict */}
        <div style={{ padding:'20px 36px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(108,92,231,0.06)' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
            <div style={{ width:3, height:40, background:FC.purple, borderRadius:2, flexShrink:0, marginTop:2 }}/>
            <div>
              <div style={{ fontFamily:'Inter,sans-serif', fontSize:8, color:FC.purple, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:4 }}>下一个机会</div>
              <div style={{ fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:14, color:'white', lineHeight:1.4 }}>多模型整合工具层——用户不缺 AI，缺的是对 AI 的判断力</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 36px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.2)', fontFamily:'Inter,sans-serif' }}>
            完整报告由 3 个 AI 模型交叉分析生成
          </div>
          <div style={{ fontFamily:'Inter,sans-serif', fontSize:10, fontWeight:700, color:FC.purple, letterSpacing:'0.3px' }}>gambit.app →</div>
        </div>
      </div>
    </div>
  </SectionWrap>
);

window.MemoPage = MemoPage;
window.SocialCardPage = SocialCardPage;

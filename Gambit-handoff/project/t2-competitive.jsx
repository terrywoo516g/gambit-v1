
// Template 2 v2 — Competitive Analysis, annual-report aesthetic

const Template2 = () => {
  const [highlight, setHighlight] = React.useState(null);

  const products = [
    { name:'豆包', org:'字节跳动', color:'#9E4D0A',
      features:'多模态生成，创意写作，语音交互',
      users:'泛娱乐用户，Z 世代',
      price:'免费 · Pro ¥59/月',
      pros:'生态整合强，用户体验流畅，流量入口优势显著',
      cons:'内容深度不足，创作者工具偏弱，定制化差',
      scene:'轻量内容生成，日常对话助手' },
    { name:'DeepSeek', org:'深度求索', color:'#0A3F7A',
      features:'深度推理，代码生成，长文本理解',
      users:'研究人员，开发者，专业用户',
      price:'API 按量计费，价格极低',
      pros:'推理能力顶级，开源生态完善，成本极低',
      cons:'产品化程度低，界面简陋，非技术用户门槛高',
      scene:'技术研究，代码辅助，复杂推理任务' },
    { name:'Kimi', org:'月之暗面', color:'#5C4FD4',
      features:'超长上下文，文档分析，联网搜索',
      users:'知识工作者，研究者，学生',
      price:'免费 · Pro ¥199/月',
      pros:'长文档处理业界领先，联网搜索准确',
      cons:'创意写作弱，多轮对话记忆不稳定',
      scene:'文献研究，长文档处理，信息整合' },
    { name:'文心一言', org:'百度', color:'#1A6B45',
      features:'中文理解，商业写作，多模态',
      users:'企业用户，政务机构，传统行业',
      price:'免费 · 企业版定制',
      pros:'中文语境最佳，本土化最深，合规性强',
      cons:'创新速度慢，通用能力落后头部，依赖百度生态',
      scene:'企业合规场景，中文专业写作，政务应用' },
  ];

  const rows = [
    ['核心功能','features'],['目标用户','users'],['定价','price'],
    ['核心优势','pros'],['主要劣势','cons'],['适用场景','scene'],
  ];

  return (
    <div style={{fontFamily:'system-ui,-apple-system,sans-serif',color:C.ink}}>
      <ReportHeader label="Competitive Analysis"/>

      {/* Title Band */}
      <div style={{padding:'44px 44px 36px',borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontFamily:'Inter,sans-serif',fontSize:10,fontWeight:700,color:C.inkMuted,letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:12}}>
          Gambit Competitive Analysis &nbsp;·&nbsp; No. 002
        </div>
        <h1 style={{fontFamily:'Inter,sans-serif',fontWeight:900,fontSize:26,lineHeight:1.2,color:C.ink,margin:'0 0 14px',letterSpacing:'-0.5px'}}>
          中国市场主流 AI 写作工具竞品对比
        </h1>
        <p style={{fontSize:13,color:C.inkSecondary,lineHeight:1.7,margin:0}}>
          分析范围：豆包 · DeepSeek · Kimi · 文心一言 &nbsp;·&nbsp; 覆盖核心功能、目标用户、定价、优劣势与适用场景六大维度 &nbsp;·&nbsp; 2026-04-25
        </p>
      </div>

      <div style={{padding:'36px 44px'}}>

        {/* Comparison Table */}
        <div style={{marginBottom:44}}>
          <SectionLabel icon="model" label="多维度对比总览" number={1}/>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{borderBottom:`2px solid ${C.border}`}}>
                  <th style={{
                    padding:'10px 14px 12px',textAlign:'left',
                    fontFamily:'Inter,sans-serif',fontSize:9,fontWeight:700,
                    color:C.inkMuted,letterSpacing:'1px',textTransform:'uppercase',
                    width:90,borderRight:`1px solid ${C.borderLight}`
                  }}>维度</th>
                  {products.map(p => (
                    <th key={p.name}
                      onClick={() => setHighlight(highlight===p.name?null:p.name)}
                      style={{
                        padding:'10px 14px 12px',textAlign:'left',cursor:'pointer',
                        borderBottom: highlight===p.name ? `2px solid ${p.color}` : '2px solid transparent',
                        transition:'all 0.15s'
                      }}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{width:6,height:6,borderRadius:1,background:p.color}}/>
                        <span style={{fontFamily:'Inter,sans-serif',fontWeight:800,fontSize:13,color:C.ink}}>{p.name}</span>
                      </div>
                      <div style={{fontFamily:'Inter,sans-serif',fontSize:9,color:C.inkMuted,marginTop:2,letterSpacing:'0.3px'}}>{p.org}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, key], ri) => (
                  <tr key={key} style={{borderBottom:`1px solid ${C.borderLight}`,background: ri%2===0 ? '#FAFAF8' : C.paper}}>
                    <td style={{
                      padding:'11px 14px',fontFamily:'Inter,sans-serif',fontWeight:700,
                      fontSize:9,color:C.inkMuted,textTransform:'uppercase',letterSpacing:'0.8px',
                      borderRight:`1px solid ${C.borderLight}`,verticalAlign:'top'
                    }}>{label}</td>
                    {products.map(p => (
                      <td key={p.name} style={{
                        padding:'11px 14px',color: key==='pros' ? C.green : key==='cons' ? C.red : C.inkSecondary,
                        lineHeight:1.6,verticalAlign:'top',fontSize:12,
                        background: highlight===p.name ? p.color+'08' : 'transparent',
                        borderLeft: highlight===p.name ? `1.5px solid ${p.color}30` : '1.5px solid transparent',
                        transition:'all 0.15s'
                      }}>{p[key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:8,fontFamily:'Inter,sans-serif',fontSize:10,color:C.inkMuted}}>
            点击产品列标题可高亮该列
          </div>
        </div>

        {/* Consensus + Divergence */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:40,marginBottom:44}}>
          <div>
            <SectionLabel icon="consensus" label="多模型共识" color={C.green} number={2}/>
            {[
              {l:'中文写作质量已超用户预期', d:'所有分析模型一致认为，国内主流 AI 写作工具的中文输出质量已达到"可直接使用"的阈值，用户最大痛点已从"质量"转向"可信度"与"效率"。'},
              {l:'差异化竞争进入细分阶段', d:'大模型同质化明显，差异化竞争已从能力转向场景。谁能在特定场景做到"刚好够用 + 极其顺手"，谁就能赢得留存。'},
            ].map((item,i) => (
              <InsightRow key={i} icon="check" iconColor={C.green} label={item.l}>{item.d}</InsightRow>
            ))}
          </div>
          <div>
            <SectionLabel icon="diverge" label="关键分歧" color={C.orange} number={3}/>
            {[
              {l:'豆包的护城河是否稳固？', d:'DeepSeek 认为字节的流量入口是真实护城河；Qwen 认为 AI 写作场景与抖音生态协同有限，护城河被高估；MiniMax 不置可否。'},
              {l:'文心一言能否突围？', d:'Qwen 对文心一言在合规场景的增长较乐观；DeepSeek 认为其技术落差正在扩大，已处于被动防御状态。'},
            ].map((item,i) => (
              <InsightRow key={i} icon="alert" iconColor={C.orange} label={item.l}>{item.d}</InsightRow>
            ))}
          </div>
        </div>

        {/* Opportunity Window */}
        <div style={{marginBottom:44}}>
          <SectionLabel icon="trend" label="机会窗口" color={C.blue} number={4}/>
          <div style={{border:`1px solid ${C.border}`,borderRadius:4,overflow:'hidden'}}>
            {[
              {t:'多模型整合层', d:'现有工具各有侧重，无一能提供"让我同时看到多个 AI 怎么说"的体验。这正是 Gambit 的进入点。', score:'高'},
              {t:'可信度与溯源', d:'用户越来越需要知道"AI 为什么这么说"。透明度功能是真实需求缺口，现有工具均未触及。', score:'高'},
              {t:'写作工作台化', d:'当前产品多为一问一答，缺乏面向内容创作全流程的项目管理视角。工作台化是下一个竞争维度。', score:'中'},
            ].map((item,i) => (
              <div key={i} style={{
                display:'flex',alignItems:'flex-start',gap:20,
                padding:'16px 20px',
                borderBottom: i<2 ? `1px solid ${C.borderLight}` : 'none',
                background: i%2===0 ? '#FAFAF8' : C.paper
              }}>
                <div style={{flex:1}}>
                  <div style={{fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:13,color:C.ink,marginBottom:4}}>{item.t}</div>
                  <div style={{fontSize:12,color:C.inkSecondary,lineHeight:1.7}}>{item.d}</div>
                </div>
                <div style={{
                  flexShrink:0,padding:'3px 10px',borderRadius:3,
                  background: item.score==='高' ? C.greenBg : C.orangeBg,
                  color: item.score==='高' ? C.green : C.orange,
                  fontFamily:'Inter,sans-serif',fontSize:9,fontWeight:700,
                  letterSpacing:'0.5px',textTransform:'uppercase',marginTop:2
                }}>{item.score}优先级</div>
              </div>
            ))}
          </div>
        </div>

        {/* Strategy */}
        <div>
          <SectionLabel icon="target" label="推荐策略" color={C.purple} number={5}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0,border:`1px solid ${C.border}`,borderRadius:4}}>
            {[
              {t:'差异化定位：整合者而非生产者', d:'不在内容生成质量上与现有工具竞争，而是成为"让现有工具的结果更可信、更有用"的元层产品。'},
              {t:'优先打通 DeepSeek + Kimi + 豆包', d:'三者覆盖了不同能力极（推理 / 长文档 / 创意），整合价值最高，且 API 生态最成熟。'},
              {t:'以知识工作者为核心初始用户', d:'研究者、分析师、内容创作者——他们有对比多个信息源的习惯，教育成本最低，付费意愿最强。'},
              {t:'建立"分歧可视化"为标志性功能', d:'让用户看到"两个 AI 在这个问题上意见不同，因为……"是无可替代的差异化体验。'},
            ].map((item,i) => (
              <div key={i} style={{
                padding:'18px 20px',
                borderRight: i%2===0 ? `1px solid ${C.border}` : 'none',
                borderBottom: i<2 ? `1px solid ${C.border}` : 'none'
              }}>
                <div style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:6}}>
                  <Icon name="arrow" size={13} color={C.purple} style={{marginTop:2}}/>
                  <span style={{fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:13,color:C.ink}}>{item.t}</span>
                </div>
                <div style={{fontSize:12,color:C.inkSecondary,lineHeight:1.7,paddingLeft:21}}>{item.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <ReportFooter/>
    </div>
  );
};

window.Template2 = Template2;

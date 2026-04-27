
// Template 1 v2 — Decision Report, annual-report aesthetic

const Template1 = () => {
  const [memoOpen, setMemoOpen] = React.useState(false);

  return (
    <div style={{fontFamily:'system-ui,-apple-system,sans-serif',color:C.ink}}>
      <ReportHeader label="Decision Report"/>

      {/* Title Band */}
      <div style={{padding:'44px 44px 36px',borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:40}}>
          <div style={{flex:1}}>
            <div style={{fontFamily:'Inter,sans-serif',fontSize:10,fontWeight:700,color:C.inkMuted,letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:12}}>
              Gambit Decision Report &nbsp;·&nbsp; No. 001
            </div>
            <h1 style={{fontFamily:'Inter,sans-serif',fontWeight:900,fontSize:26,lineHeight:1.2,color:C.ink,margin:'0 0 16px',letterSpacing:'-0.5px'}}>
              面向中国市场的多模型 AI 工作台<br/>是否值得投入开发？
            </h1>
            <p style={{fontSize:13,color:C.inkSecondary,lineHeight:1.75,margin:0,maxWidth:540}}>
              综合 DeepSeek-R1、Qwen-Max、MiniMax-01 三个模型的独立分析，经 Gambit 交叉验证后生成本报告。分析覆盖市场机会、技术可行性、商业化路径与核心风险四个维度。
            </p>
          </div>
          {/* Key Stats */}
          <div style={{display:'flex',gap:0,flexShrink:0,border:`1px solid ${C.border}`,borderRadius:4}}>
            {[
              {v:'3', l:'参与模型'},
              {v:'91%', l:'需求置信度', c:C.green},
              {v:'33%', l:'盈亏平衡', c:C.red},
            ].map((s,i) => (
              <div key={i} style={{
                padding:'16px 20px',textAlign:'center',
                borderRight: i<2 ? `1px solid ${C.border}` : 'none'
              }}>
                <div style={{fontFamily:'Inter,sans-serif',fontWeight:800,fontSize:22,color:s.c||C.ink,letterSpacing:'-0.5px'}}>{s.v}</div>
                <div style={{fontFamily:'Inter,sans-serif',fontSize:9,fontWeight:600,color:C.inkMuted,marginTop:3,letterSpacing:'0.5px',textTransform:'uppercase'}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{padding:'36px 44px'}}>

        {/* Executive Summary */}
        <div style={{marginBottom:40}}>
          <SectionLabel icon="memo" label="分析摘要" number={1}/>
          <div style={{paddingLeft:24,borderLeft:`3px solid ${C.purple}`}}>
            <p style={{fontSize:14,lineHeight:1.8,color:C.ink,margin:'0 0 10px'}}>
              综合三模型交叉分析，当前时间窗口对该产品具有较高战略价值——中国 AI 应用市场处于快速扩张期，用户对"AI 结果可信度"的焦虑正在形成真实需求缺口，而市场上尚无成熟的多模型整合产品。
            </p>
            <p style={{fontSize:14,lineHeight:1.8,color:C.ink,margin:'0 0 10px'}}>
              核心挑战集中于 <strong>API 依赖风险与商业化路径选择</strong>，三个模型在盈利模式上存在根本分歧，12 个月内实现盈亏平衡的置信度偏低（33%）。
            </p>
            <p style={{fontSize:14,lineHeight:1.8,color:C.ink,margin:0}}>
              整体判断：<strong style={{color:C.green}}>值得推进，节奏需谨慎。</strong>建议以轻量 MVP 入场，优先验证付费意愿后再加速投入。
            </p>
          </div>
        </div>

        {/* Consensus + Divergence side by side */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:40,marginBottom:40}}>
          <div>
            <SectionLabel icon="consensus" label="多模型共识" color={C.green} number={2}/>
            {[
              {l:'市场需求真实且紧迫', d:'三个模型均确认，用户对"AI 答案可信度"的不确定感是真实痛点，2025 年后尤为突出。'},
              {l:'差异化优势明确', d:'当前市场无同类成熟产品，多模型整合具有先发优势，用户教育成本可控。'},
              {l:'技术路径可行', d:'基于现有 API 生态，MVP 的技术实现难度中等，3 人团队 2 个月内可完成核心功能。'},
            ].map((item,i) => (
              <InsightRow key={i} icon="check" iconColor={C.green} label={item.l}>{item.d}</InsightRow>
            ))}
          </div>
          <div>
            <SectionLabel icon="diverge" label="关键分歧" color={C.orange} number={3}/>
            {[
              {l:'商业化路径', d:'DeepSeek 倾向 B 端订阅；Qwen 建议 C 端免费增值；MiniMax 推荐先 B 后 C 混合策略。'},
              {l:'核心目标用户', d:'DeepSeek 指向内容创作者，Qwen 倾向知识工作者与研究人员，MiniMax 更看好企业中层决策者。'},
              {l:'护城河可持续性', d:'DeepSeek 乐观，MiniMax 持保留态度，认为差异化窗口期可能短于预期。'},
            ].map((item,i) => (
              <InsightRow key={i} icon="alert" iconColor={C.orange} label={item.l}>{item.d}</InsightRow>
            ))}
          </div>
        </div>

        {/* Minority Views */}
        <div style={{marginBottom:40}}>
          <SectionLabel icon="minority" label="少数派观点" color={C.blue} number={4}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0,border:`1px solid ${C.border}`,borderRadius:4}}>
            {[
              {model:'Qwen-Max', l:'垂直行业优先切入', d:'建议先聚焦法律或金融行业做深度整合，而非通用场景。垂直赛道付费意愿更高，口碑传播更聚焦。'},
              {model:'MiniMax-01', l:'API 缓存是核心成本杠杆', d:'早期 API 调用成本可能吞噬利润空间，需在 MVP 阶段就建立缓存机制，否则规模化后成本结构将持续恶化。'},
            ].map((item,i) => (
              <div key={i} style={{padding:'20px',borderRight: i===0 ? `1px solid ${C.border}` : 'none'}}>
                <div style={{marginBottom:8}}><ModelTag name={item.model}/></div>
                <div style={{fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:13,color:C.ink,marginBottom:6}}>{item.l}</div>
                <div style={{fontSize:12,color:C.inkSecondary,lineHeight:1.7}}>{item.d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Confidence Analysis */}
        <div style={{marginBottom:40}}>
          <SectionLabel icon="chart" label="置信度分析" number={5}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:40}}>
            <div>
              <div style={{fontFamily:'Inter,sans-serif',fontSize:10,fontWeight:700,color:C.green,letterSpacing:'1px',textTransform:'uppercase',marginBottom:14}}>高置信结论</div>
              <ConfidenceBar label="市场需求真实存在" value={91}/>
              <ConfidenceBar label="技术层面可行" value={87}/>
              <ConfidenceBar label="差异化优势存在" value={82}/>
            </div>
            <div>
              <div style={{fontFamily:'Inter,sans-serif',fontSize:10,fontWeight:700,color:C.red,letterSpacing:'1px',textTransform:'uppercase',marginBottom:14}}>低置信结论</div>
              <ConfidenceBar label="12 个月内盈亏平衡" value={33}/>
              <ConfidenceBar label="C 端用户付费意愿" value={51}/>
              <ConfidenceBar label="护城河可持续性" value={44}/>
            </div>
          </div>
        </div>

        {/* Max Risk */}
        <div style={{marginBottom:40,border:`1px solid ${C.red}40`,borderLeft:`3px solid ${C.red}`,borderRadius:4,padding:'20px 24px',background:C.redBg}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <Icon name="risk" size={15} color={C.red}/>
            <span style={{fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:10,color:C.red,letterSpacing:'1.2px',textTransform:'uppercase'}}>最大风险</span>
          </div>
          <div style={{fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:15,color:C.ink,marginBottom:8}}>API 依赖风险：主要 AI 提供商的服务政策随时可能变动</div>
          <div style={{fontSize:13,color:C.inkSecondary,lineHeight:1.7}}>产品核心价值依托于多家 AI API 的稳定性。若某家提供商收紧 API 政策、大幅提价，或封禁特定使用场景，将直接影响产品可用性。建议 MVP 阶段即签订框架协议，并设计模型热替换机制。</div>
        </div>

        {/* Recommended Actions */}
        <div style={{marginBottom:40}}>
          <SectionLabel icon="action" label="推荐行动" number={6}/>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:`1.5px solid ${C.border}`}}>
                {['优先级','行动项','说明'].map((h,i) => (
                  <th key={i} style={{textAlign:'left',padding:'8px 12px 10px',fontFamily:'Inter,sans-serif',fontSize:9,fontWeight:700,color:C.inkMuted,letterSpacing:'1px',textTransform:'uppercase',width:i===0?90:i===1?200:'auto'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {p:'高',a:'构建并发布 MVP',d:'3 个月内覆盖核心决策分析场景，优先验证用户愿意为"整合报告"付费的价格区间（预期 ¥99–299/月）。'},
                {p:'高',a:'锁定种子用户群',d:'在 100 名种子用户中进行深度访谈，尤其聚焦"从多个 AI 得到不同答案时的真实困扰"。'},
                {p:'中',a:'建立 API 稳定合作',d:'与 2 家以上 AI API 提供商建立稳定关系，协商价格保障条款，测试模型热切换机制。'},
                {p:'中',a:'引入 API 缓存机制',d:'预估缓存命中率可降低 40–60% 的 API 成本，是规模化前的关键成本杠杆。'},
                {p:'低',a:'储备垂直行业方案',d:'作为 B 计划，若 C 端付费验证不达预期，可快速转向法律/金融行业用户。'},
              ].map((r,i) => (
                <tr key={i} style={{borderBottom:`1px solid ${C.borderLight}`}}>
                  <td style={{padding:'12px',verticalAlign:'top'}}><PriorityTag level={r.p}/></td>
                  <td style={{padding:'12px',fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:13,color:C.ink,verticalAlign:'top'}}>{r.a}</td>
                  <td style={{padding:'12px',fontSize:12,color:C.inkSecondary,lineHeight:1.7,verticalAlign:'top'}}>{r.d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Validation Plan */}
        <div style={{marginBottom:40}}>
          <SectionLabel icon="verify" label="下一步验证计划" number={7}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:0,border:`1px solid ${C.border}`,borderRadius:4}}>
            {[
              {phase:'第 01–04 周',title:'用户访谈',desc:'招募 20 名目标用户，聚焦"多 AI 结果冲突时的决策困境"，提炼核心价值主张。'},
              {phase:'第 05–08 周',title:'MVP 开发',desc:'实现三模型并行调用 + 结构化整合输出，部署内测版，邀请 100 名用户试用并收集反馈。'},
              {phase:'第 09–12 周',title:'付费验证',desc:'推出基础订阅方案（¥99/月），目标 50 个付费用户，验证留存率与推荐意愿。'},
            ].map((item,i) => (
              <div key={i} style={{padding:'20px 22px',borderRight:i<2?`1px solid ${C.border}`:'none'}}>
                <div style={{fontFamily:'Inter,sans-serif',fontSize:9,fontWeight:700,color:C.inkMuted,letterSpacing:'1px',textTransform:'uppercase',marginBottom:8}}>{item.phase}</div>
                <div style={{fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:14,color:C.ink,marginBottom:8}}>{item.title}</div>
                <div style={{fontSize:12,color:C.inkSecondary,lineHeight:1.7}}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* One-pager Memo */}
        <div style={{border:`1px solid ${C.border}`,borderRadius:4}}>
          <div
            onClick={() => setMemoOpen(p => !p)}
            style={{
              padding:'14px 20px',cursor:'pointer',display:'flex',
              alignItems:'center',justifyContent:'space-between',
              background:C.bg,borderRadius: memoOpen ? '4px 4px 0 0' : 4
            }}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <Icon name="memo" size={14} color={C.inkSecondary}/>
              <span style={{fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:12,color:C.inkSecondary,letterSpacing:'0.3px'}}>一页纸 Memo 摘要版（可独立分发）</span>
            </div>
            <span style={{fontSize:10,color:C.inkMuted,fontFamily:'Inter,sans-serif',fontWeight:600}}>{memoOpen ? '收起' : '展开'}</span>
          </div>
          {memoOpen && (
            <div style={{padding:'28px 32px',borderTop:`1px solid ${C.border}`}}>
              <div style={{textAlign:'center',marginBottom:24,paddingBottom:20,borderBottom:`1px solid ${C.border}`}}>
                <div style={{fontFamily:'Inter,sans-serif',fontSize:9,color:C.inkMuted,letterSpacing:'2px',textTransform:'uppercase',marginBottom:6}}>GAMBIT · DECISION MEMO · CONFIDENTIAL</div>
                <div style={{fontFamily:'Inter,sans-serif',fontWeight:900,fontSize:20,color:C.ink,letterSpacing:'-0.3px'}}>多模型 AI 工作台开发决策备忘录</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:32}}>
                <div>
                  <div style={{fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:12,color:C.ink,marginBottom:10,textTransform:'uppercase',letterSpacing:'0.5px'}}>核心结论</div>
                  <p style={{fontSize:13,lineHeight:1.75,color:C.inkSecondary,margin:'0 0 18px'}}>市场机会真实，技术可行，建议推进。关键前提：以 MVP 验证付费意愿，控制 API 依赖风险，优先聚焦内容创作者与研究者群体。</p>
                  <div style={{fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:12,color:C.ink,marginBottom:10,textTransform:'uppercase',letterSpacing:'0.5px'}}>立即行动</div>
                  {['启动用户访谈（目标 20 人，2 周内）','3 个月内发布内测 MVP','与主要 API 提供商签订框架协议'].map((a,i) => (
                    <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:8}}>
                      <Icon name="arrow" size={13} color={C.purple}/>
                      <span style={{fontSize:13,color:C.inkSecondary}}>{a}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:12,color:C.ink,marginBottom:10,textTransform:'uppercase',letterSpacing:'0.5px'}}>关键指标</div>
                  {[
                    {l:'市场需求置信度', v:'91%', c:C.green},
                    {l:'技术可行性', v:'87%', c:C.green},
                    {l:'付费意愿', v:'51%', c:C.orange},
                    {l:'12月盈亏平衡', v:'33%', c:C.red},
                  ].map((r,i) => (
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${C.borderLight}`}}>
                      <span style={{fontSize:12,color:C.inkSecondary}}>{r.l}</span>
                      <span style={{fontSize:12,fontWeight:700,color:r.c,fontFamily:'Inter,sans-serif'}}>{r.v}</span>
                    </div>
                  ))}
                  <div style={{marginTop:14,padding:'12px',border:`1px solid ${C.red}30`,borderRadius:3,background:C.redBg}}>
                    <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}>
                      <Icon name="risk" size={11} color={C.red}/>
                      <span style={{fontSize:9,color:C.red,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px'}}>最大风险</span>
                    </div>
                    <div style={{fontSize:11,color:C.inkSecondary,lineHeight:1.6}}>API 政策变动导致产品可用性中断</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ReportFooter/>
    </div>
  );
};

window.Template1 = Template1;

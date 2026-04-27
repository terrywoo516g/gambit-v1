
// Template 3 v2 — Content Creation, annual-report aesthetic

const Template3 = () => {
  const [selectedAngle, setSelectedAngle] = React.useState(1);
  const [selectedTitle, setSelectedTitle] = React.useState(null);
  const [selectedOpening, setSelectedOpening] = React.useState(null);

  const angles = [
    { model:'DeepSeek-R1', angle:'技能替代论', desc:'AI 会替代哪些技能？哪些不会？从"不可替代性"逆推值得投入的方向。立意犀利，适合热度型内容。' },
    { model:'Qwen-Max', angle:'元技能框架', desc:'提炼 AI 时代最底层的"元技能"——学习能力、问题拆解、跨域整合。框架感强，适合知识型读者。' },
    { model:'MiniMax-01', angle:'个人护城河', desc:'从"个人竞争壁垒"视角出发：什么技能能让你在 AI 辅助下产生乘数效应？偏实战，收藏率高。' },
  ];

  const proposals = [
    { id:1, title:'AI 时代，最值钱的不是技能，是判断力', reason:'切入角度反常识，标题本身就是观点，能快速筛选目标读者。', tag:'爆款潜力' },
    { id:2, title:'学这 5 种技能，AI 越强你越值钱', reason:'直给型标题，搜索友好，适合算法推荐场景。', tag:'实用型' },
    { id:3, title:'别再问"AI 会替代我吗"——问这个问题才对', reason:'转移焦虑、提供新框架，引发读者认知重塑欲望。', tag:'思维型' },
  ];

  const outline = [
    { section:'01', title:'引言：你问错了问题', points:['AI 焦虑的根源不是技术，是认知框架','重新定义问题：不是"AI 会不会替代我"，而是"我怎么让 AI 为我所用"'] },
    { section:'02', title:'三类注定被淘汰的技能', points:['纯执行型：信息搬运、格式整理、简单翻译','重复创作型：低差异化文案、模板化报告','单点专业型：依赖记忆而非判断的资格认证'] },
    { section:'03', title:'AI 时代最值钱的 5 种技能', points:['判断力：在 AI 给出 10 个答案时，知道用哪个','问题拆解力：把模糊目标转化为 AI 可执行的精确指令','跨域整合：把 A 领域的解法移植到 B 领域','人际共情：AI 永远不能替代真实的情感连接','领域深度：让 AI 帮你加速，而不是帮你入门'] },
    { section:'04', title:'行动建议', points:['每天花 30 分钟练习"把你的工作流程 AI 化"','选一个你最擅长的领域，系统学到专家级别','刻意训练：让 AI 给你 10 个答案，练习你的选择和判断'] },
  ];

  const titles = [
    'AI 时代，最值钱的不是技能，是判断力',
    '学这 5 种技能，AI 越强你越值钱',
    '别再问"AI 会替代我吗"——问这个才对',
    '我用 AI 工作了一年，发现真正重要的是这件事',
    '2026 年，这 5 种人不用担心 AI',
  ];

  const openings = [
    '去年，我问了三个 AI 同一个问题："未来十年，什么技能最值钱？"它们给了我三个完全不同的答案。那一刻我意识到——也许问题本身就错了。',
    'AI 会替代你吗？大概率会替代你现在做的部分工作。但有一种能力，是 AI 无论如何都无法替代的：知道什么时候该相信 AI，什么时候不该。',
    '有人问我：要不要学 Python？要不要学提示词工程？我说：都学，但更重要的是先搞清楚——你想用 AI 放大什么？',
  ];

  return (
    <div style={{fontFamily:'system-ui,-apple-system,sans-serif',color:C.ink}}>
      <ReportHeader label="Content Studio"/>

      {/* Title Band */}
      <div style={{padding:'44px 44px 36px',borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontFamily:'Inter,sans-serif',fontSize:10,fontWeight:700,color:C.inkMuted,letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:12}}>
          Gambit Content Studio &nbsp;·&nbsp; No. 003
        </div>
        <h1 style={{fontFamily:'Inter,sans-serif',fontWeight:900,fontSize:26,lineHeight:1.2,color:C.ink,margin:'0 0 14px',letterSpacing:'-0.5px'}}>
          AI 时代哪些技能最值得花时间学习？
        </h1>
        <p style={{fontSize:13,color:C.inkSecondary,lineHeight:1.7,margin:0}}>
          3 个模型参与选题分析 &nbsp;·&nbsp; 推荐立意 3 个 &nbsp;·&nbsp; 文章大纲、标题备选、开头备选及完整初稿已生成
        </p>
      </div>

      <div style={{padding:'36px 44px'}}>

        {/* Angle Analysis */}
        <div style={{marginBottom:40}}>
          <SectionLabel icon="search" label="三个模型的切入角度" number={1}/>
          <div style={{border:`1px solid ${C.border}`,borderRadius:4,overflow:'hidden'}}>
            {angles.map((a,i) => (
              <div key={i} style={{
                display:'flex',gap:20,padding:'16px 20px',
                borderBottom: i<2 ? `1px solid ${C.borderLight}` : 'none',
                background: i%2===0 ? '#FAFAF8' : C.paper
              }}>
                <div style={{flexShrink:0,paddingTop:1}}><ModelTag name={a.model}/></div>
                <div>
                  <div style={{fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:13,color:C.ink,marginBottom:4}}>{a.angle}</div>
                  <div style={{fontSize:12,color:C.inkSecondary,lineHeight:1.7}}>{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Proposals */}
        <div style={{marginBottom:40}}>
          <SectionLabel icon="target" label="Gambit 推荐立意" color={C.purple} number={2}/>
          {proposals.map(p => (
            <div key={p.id}
              onClick={() => setSelectedAngle(p.id)}
              style={{
                border:`1px solid ${selectedAngle===p.id ? C.purple : C.border}`,
                borderLeft:`3px solid ${selectedAngle===p.id ? C.purple : C.border}`,
                borderRadius:4,padding:'14px 18px',cursor:'pointer',
                background: selectedAngle===p.id ? '#F8F7FF' : C.paper,
                marginBottom:8,display:'flex',alignItems:'center',gap:14,transition:'all 0.15s'
              }}>
              <div style={{
                width:18,height:18,borderRadius:'50%',flexShrink:0,
                border:`1.5px solid ${selectedAngle===p.id ? C.purple : C.border}`,
                display:'flex',alignItems:'center',justifyContent:'center',
                background: selectedAngle===p.id ? C.purple : 'transparent'
              }}>
                {selectedAngle===p.id && <div style={{width:6,height:6,borderRadius:'50%',background:'white'}}/>}
              </div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                  <span style={{fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:13,color:C.ink}}>{p.title}</span>
                  <span style={{
                    fontFamily:'Inter,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.5px',textTransform:'uppercase',
                    color:C.purple,background:C.purple+'15',padding:'2px 6px',borderRadius:2
                  }}>{p.tag}</span>
                </div>
                <div style={{fontSize:12,color:C.inkSecondary}}>{p.reason}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Outline */}
        <div style={{marginBottom:40}}>
          <SectionLabel icon="memo" label="文章大纲" number={3}/>
          <div style={{border:`1px solid ${C.border}`,borderRadius:4,overflow:'hidden'}}>
            {outline.map((sec,i) => (
              <div key={i} style={{
                display:'flex',gap:0,
                borderBottom: i<outline.length-1 ? `1px solid ${C.borderLight}` : 'none'
              }}>
                <div style={{
                  width:40,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                  background: C.purple,
                  fontFamily:'Inter,sans-serif',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.7)',
                  letterSpacing:'0.5px',writingMode:'horizontal-tb'
                }}>{sec.section}</div>
                <div style={{padding:'14px 20px',flex:1,background: i%2===0 ? '#FAFAF8' : C.paper}}>
                  <div style={{fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:13,color:C.ink,marginBottom:8}}>{sec.title}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    {sec.points.map((pt,j) => (
                      <div key={j} style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                        <div style={{width:4,height:4,borderRadius:'50%',background:C.inkMuted,flexShrink:0,marginTop:6}}/>
                        <span style={{fontSize:12,color:C.inkSecondary,lineHeight:1.65}}>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Arguments + Counter */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:40,marginBottom:40}}>
          <div>
            <SectionLabel icon="trend" label="核心论点与支撑素材" number={4}/>
            {[
              {pt:'判断力 > 执行力', src:'DeepSeek-R1', mat:'麦肯锡 2025 报告：AI 自动化将影响 40% 的工作任务，但判断类工作受影响最小。'},
              {pt:'专精 + AI = 乘数效应', src:'Qwen-Max', mat:'深度专家借助 AI 工具，个人产出可达普通专家的 5–10 倍（硅谷生产力研究数据）。'},
              {pt:'元技能比具体技能更抗风险', src:'MiniMax-01', mat:'每次技术革命后，能快速学习新技能的人比精通旧技能的人更快恢复就业竞争力。'},
            ].map((item,i) => (
              <div key={i} style={{
                padding:'12px 0',borderBottom:`1px solid ${C.borderLight}`,
                display:'flex',flexDirection:'column',gap:6
              }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:13,color:C.ink}}>{item.pt}</span>
                  <ModelTag name={item.src}/>
                </div>
                <div style={{fontSize:12,color:C.inkSecondary,lineHeight:1.65}}>{item.mat}</div>
              </div>
            ))}
          </div>
          <div>
            <SectionLabel icon="diverge" label="反方观点与潜在争议" color={C.orange} number={5}/>
            {[
              {q:'判断力也可以被 AI 训练替代？', a:'若 AI 推荐系统足够强大，用户的"选择判断"可能退化为点击习惯，个人判断力优势缩水。'},
              {q:'"专精"反而会被 AI 快速超越', a:'在单一垂直领域，AI 的专家级能力进化速度超过人类，深度专精可能很快失去溢价。'},
              {q:'文章可能缺乏普适性', a:'对已有职业规划的读者价值高，对刚入职场的新人可能过于抽象，需要更具体的落地建议。'},
            ].map((item,i) => (
              <div key={i} style={{padding:'12px 0',borderBottom:`1px solid ${C.borderLight}`}}>
                <div style={{display:'flex',gap:6,alignItems:'flex-start',marginBottom:4}}>
                  <Icon name="alert" size={13} color={C.orange} style={{marginTop:1,flexShrink:0}}/>
                  <span style={{fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:12,color:C.orange}}>{item.q}</span>
                </div>
                <div style={{fontSize:12,color:C.inkSecondary,lineHeight:1.65,paddingLeft:21}}>{item.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Titles */}
        <div style={{marginBottom:40}}>
          <SectionLabel icon="edit" label="推荐标题（5 个备选）" number={6}/>
          {titles.map((t,i) => (
            <div key={i}
              onClick={() => setSelectedTitle(selectedTitle===i?null:i)}
              style={{
                padding:'11px 16px',borderRadius:3,cursor:'pointer',
                border:`1px solid ${selectedTitle===i ? C.purple : C.borderLight}`,
                background: selectedTitle===i ? '#F8F7FF' : C.paper,
                display:'flex',alignItems:'center',gap:12,marginBottom:6,transition:'all 0.15s'
              }}>
              <span style={{fontFamily:'Inter,sans-serif',fontSize:10,fontWeight:700,color:C.inkMuted,minWidth:20}}>#{i+1}</span>
              <span style={{fontSize:13,color:C.ink,fontWeight: selectedTitle===i ? 700 : 400,flex:1}}>{t}</span>
              {selectedTitle===i && <span style={{fontSize:9,color:C.purple,fontWeight:700,letterSpacing:'0.5px',textTransform:'uppercase'}}>已选定</span>}
            </div>
          ))}
        </div>

        {/* Openings */}
        <div style={{marginBottom:40}}>
          <SectionLabel icon="memo" label="推荐开头（3 个备选）" number={7}/>
          {openings.map((o,i) => (
            <div key={i}
              onClick={() => setSelectedOpening(selectedOpening===i?null:i)}
              style={{
                padding:'14px 18px',borderRadius:3,cursor:'pointer',marginBottom:8,
                border:`1px solid ${selectedOpening===i ? C.purple : C.borderLight}`,
                borderLeft:`3px solid ${selectedOpening===i ? C.purple : C.border}`,
                background: selectedOpening===i ? '#F8F7FF' : C.paper,
                transition:'all 0.15s'
              }}>
              <div style={{fontFamily:'Inter,sans-serif',fontSize:9,fontWeight:700,color:C.inkMuted,letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:6}}>开头方案 #{i+1}</div>
              <div style={{fontSize:13,color:C.inkSecondary,lineHeight:1.8,fontStyle:'italic'}}>{o}</div>
            </div>
          ))}
        </div>

        {/* Full Article */}
        <div style={{border:`1px solid ${C.border}`,borderRadius:4}}>
          <div style={{
            padding:'14px 20px',background:C.bg,borderBottom:`1px solid ${C.border}`,
            display:'flex',alignItems:'center',justifyContent:'space-between',borderRadius:'4px 4px 0 0'
          }}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <Icon name="memo" size={14} color={C.inkSecondary}/>
              <span style={{fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:11,color:C.inkSecondary,letterSpacing:'0.3px'}}>最终整合文章（Gambit 综合三模型生成）</span>
            </div>
            <span style={{
              fontFamily:'Inter,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.5px',
              textTransform:'uppercase',color:C.green,background:C.greenBg,padding:'3px 8px',borderRadius:2
            }}>已整合 · 可直接使用</span>
          </div>
          <div style={{padding:'24px',fontSize:13,color:C.ink,lineHeight:1.9}}>
            <p style={{margin:'0 0 16px',fontFamily:'Inter,sans-serif',fontWeight:800,fontSize:16,letterSpacing:'-0.3px'}}>AI 时代，最值钱的不是技能，是判断力</p>
            <p style={{margin:'0 0 12px',color:C.inkSecondary}}>去年，我问了三个 AI 同一个问题："未来十年，什么技能最值钱？"它们给了我三个完全不同的答案。那一刻我意识到——也许问题本身就错了。</p>
            <p style={{margin:'0 0 12px',color:C.inkSecondary}}>我们焦虑的根源，不是技术进步太快，而是我们还在用"学一门技能保饭碗"的旧框架，来理解一个"AI 随时可以学会任何技能"的新世界。</p>
            <p style={{margin:'0 0 10px',fontWeight:700,color:C.ink}}>真正值得投入的，是这 5 种能力：</p>
            {['判断力——在 AI 给你 10 个答案时，你知道用哪个','问题拆解——把模糊目标转化为 AI 能执行的精确指令','跨域整合——把 A 领域的解法迁移到 B 领域','真实共情——AI 替代不了的情感连接与信任建立','领域深度——让 AI 帮你加速，而不是替你入门'].map((s,i) => (
              <div key={i} style={{display:'flex',gap:12,marginBottom:8,alignItems:'flex-start'}}>
                <span style={{fontFamily:'Inter,sans-serif',fontWeight:700,color:C.purple,minWidth:18,fontSize:12}}>{i+1}.</span>
                <span style={{color:C.inkSecondary}}>{s}</span>
              </div>
            ))}
            <p style={{margin:'16px 0 0',color:C.inkMuted,fontSize:12,borderTop:`1px solid ${C.borderLight}`,paddingTop:14}}>这不是鸡汤。这是在 AI 加速的世界里，真正能产生"乘数效应"的人，和只能被 AI 替代的人之间，最核心的那条分界线。</p>
          </div>
        </div>
      </div>
      <ReportFooter/>
    </div>
  );
};

window.Template3 = Template3;

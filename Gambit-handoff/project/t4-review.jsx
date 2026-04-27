
// Template 4 v2 — Writing Review with diff, annual-report aesthetic

const Template4 = () => {
  const [view, setView] = React.useState('diff');
  const [expandModel, setExpandModel] = React.useState(null);

  const original = [
    { id:'p1', text:'您好，我是 [姓名]，我们正在开发一款革命性的 AI 产品，叫做 Gambit。这款产品通过同时调用多个大模型并整合结果，彻底改变了用户使用 AI 的方式。我们目前处于早期阶段，正在寻找有远见的投资人加入我们。' },
    { id:'p2', text:'Gambit 有非常强大的技术壁垒和清晰的商业模式。我们的竞争对手没有做到这一点，所以我们有很大的先发优势。目前我们的产品已经吸引了很多用户，数据表现非常好。' },
    { id:'p3', text:'我们希望获得 500 万人民币的天使轮融资，主要用于产品研发和市场推广。如果您有兴趣，希望能安排一次会面详细介绍我们的想法。期待您的回复！' },
  ];

  const revised = [
    { id:'f1', text:'您好，[投资人姓名]——我在 [某渠道] 了解到您在关注 AI 效率工具领域，Gambit 正好处于这个交叉点上，想花 3 分钟向您介绍一个真实的市场机会。', note:'重写开头：先建立相关性，再介绍产品（Qwen 建议）' },
    { id:'f2', text:'Gambit 是一个多模型 AI 工作台：用户输入一个问题，系统同时调用 DeepSeek、Qwen、MiniMax 三个模型，然后自动提炼共识、标注分歧、识别少数派观点，最终输出一份可直接使用的分析报告。目前内测用户 7 日留存率达 68%，核心用户每周平均使用 4.2 次。', note:'产品描述具体化 + 关键数据替换模糊表述（DeepSeek 建议）' },
    { id:'f3', text:'中国 AI 工具市场当前存在一个明显缺口：用户不缺 AI，缺的是对 AI 的判断力。现有产品没有解决"多个 AI 结果相互矛盾时用户不知道该信哪个"的问题。Gambit 的时机就在这里。', note:'新增 Why Now 段落（MiniMax 建议）' },
    { id:'f4', text:'我们正在进行 500 万元天使轮融资，具体用途：产品研发 60%（3 名工程师，12 个月 runway）、种子用户获取 25%、API 合作谈判 15%。已有 [某机构] 意向跟投。如有兴趣，附上 3 页数据看板：[链接]；或可安排周三下午的 20 分钟通话。', note:'融资信息结构化 + 主动掌握节奏（Qwen 建议）' },
  ];

  const modelReviews = [
    {
      name:'DeepSeek-R1', color:C.blue,
      tone:'过于自信，缺乏具体支撑。专业投资人看到这种措辞会立刻存疑。',
      issues:[
        {text:'"革命性"是投资人最反感的词之一，过度承诺损害可信度',sev:'high'},
        {text:'"非常强大""非常好"等模糊表述无法支撑投资决策，应替换为具体数据',sev:'high'},
        {text:'融资金额应附带具体用途拆分，"产品研发和市场推广"过于笼统',sev:'med'},
      ]
    },
    {
      name:'Qwen-Max', color:C.orange,
      tone:'结构逻辑不清晰，投资人无法快速判断"这和我有什么关系"。',
      issues:[
        {text:'邮件开头缺少"为什么写信给你"的理由，冷邮件必须先建立相关性',sev:'high'},
        {text:'"竞争对手没有做到这一点"——哪些竞争对手？没有具体指向等于没说',sev:'med'},
        {text:'结尾过于被动，建议主动提出"我已预留了周X下午的时间"以掌握节奏',sev:'med'},
      ]
    },
    {
      name:'MiniMax-01', color:C.green,
      tone:'缺少投资叙事的核心要素——Why You、Why Now、Why Win。',
      issues:[
        {text:'"早期阶段"应放在第三段配合融资金额，放在开头会过早暴露弱点',sev:'med'},
        {text:'整段缺少"为什么是现在"（Why Now）的叙述，投资人需要时间窗口的理由',sev:'high'},
        {text:'结尾应替换为具体行动引导，如附上产品演示链接或数据看板链接',sev:'low'},
      ]
    },
  ];

  const sevCfg = {
    high:{label:'高',c:C.red,bg:C.redBg},
    med:{label:'中',c:C.orange,bg:C.orangeBg},
    low:{label:'低',c:C.blue,bg:C.blueBg}
  };

  return (
    <div style={{fontFamily:'system-ui,-apple-system,sans-serif',color:C.ink}}>
      <ReportHeader label="Writing Review"/>

      {/* Title Band */}
      <div style={{padding:'44px 44px 28px',borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontFamily:'Inter,sans-serif',fontSize:10,fontWeight:700,color:C.inkMuted,letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:12}}>
          Gambit Writing Review &nbsp;·&nbsp; No. 004 &nbsp;·&nbsp; 高风险场景
        </div>
        <h1 style={{fontFamily:'Inter,sans-serif',fontWeight:900,fontSize:26,lineHeight:1.2,color:C.ink,margin:'0 0 14px',letterSpacing:'-0.5px'}}>
          融资邮件多模型审查
        </h1>
        <p style={{fontSize:13,color:C.inkSecondary,lineHeight:1.7,margin:'0 0 20px'}}>
          3 个模型独立审查同一份投资人触达邮件，提炼共识性问题与分歧性建议，并生成最终推荐版本。
        </p>
        {/* View Toggle */}
        <div style={{display:'flex',gap:0,border:`1px solid ${C.border}`,borderRadius:4,width:'fit-content',overflow:'hidden'}}>
          {[['diff','对比视图'],['original','原始稿'],['final','最终版本']].map(([v,l],i) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding:'8px 18px',border:'none',
              background: view===v ? C.purple : 'transparent',
              color: view===v ? 'white' : C.inkSecondary,
              fontFamily:'Inter,sans-serif',fontWeight:600,fontSize:12,
              borderRight: i<2 ? `1px solid ${C.border}` : 'none',
              transition:'all 0.15s',cursor:'pointer'
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{padding:'36px 44px'}}>

        {/* Consensus Issues */}
        <div style={{marginBottom:36,border:`1px solid ${C.red}30`,borderLeft:`3px solid ${C.red}`,borderRadius:4,padding:'18px 22px',background:C.redBg}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <Icon name="risk" size={14} color={C.red}/>
            <span style={{fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:10,color:C.red,letterSpacing:'1.2px',textTransform:'uppercase'}}>共识性问题（三个模型均指出，高优先级）</span>
          </div>
          {['缺少具体量化数据支撑（用户数、增长率、留存率）','未说明创始人背景和团队构成','"革命性 / 非常强大"等过度表述损害专业形象'].map((issue,i) => (
            <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:6}}>
              <Icon name="alert" size={12} color={C.red}/>
              <span style={{fontSize:13,color:C.ink}}>{issue}</span>
            </div>
          ))}
        </div>

        {/* Model Reviews */}
        <div style={{marginBottom:36}}>
          <SectionLabel icon="model" label="三个模型的独立审查" number={1}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:0,border:`1px solid ${C.border}`,borderRadius:4,overflow:'hidden'}}>
            {modelReviews.map((rev,i) => (
              <div key={rev.name}
                onClick={() => setExpandModel(expandModel===rev.name?null:rev.name)}
                style={{
                  padding:'16px 18px',cursor:'pointer',
                  borderRight: i<2 ? `1px solid ${C.border}` : 'none',
                  background: expandModel===rev.name ? rev.color+'08' : C.paper,
                  transition:'all 0.15s'
                }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                  <ModelTag name={rev.name}/>
                  <Icon name={expandModel===rev.name?'alert':'info'} size={12} color={C.inkMuted}/>
                </div>
                <p style={{fontSize:12,color:C.inkSecondary,lineHeight:1.65,fontStyle:'italic',margin:'0 0 0'}}>{rev.tone}</p>
                {expandModel===rev.name && (
                  <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.borderLight}`}}>
                    {rev.issues.map((issue,j) => {
                      const cfg = sevCfg[issue.sev];
                      return (
                        <div key={j} style={{
                          display:'flex',gap:6,alignItems:'flex-start',
                          padding:'7px 0',borderBottom:j<rev.issues.length-1?`1px solid ${C.borderLight}`:'none'
                        }}>
                          <span style={{
                            flexShrink:0,fontFamily:'Inter,sans-serif',fontSize:8,fontWeight:700,
                            color:cfg.c,background:cfg.bg,padding:'2px 5px',borderRadius:2,
                            letterSpacing:'0.3px',textTransform:'uppercase',marginTop:1
                          }}>{cfg.label}</span>
                          <span style={{fontSize:11,color:C.inkSecondary,lineHeight:1.6}}>{issue.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{marginTop:6,fontFamily:'Inter,sans-serif',fontSize:10,color:C.inkMuted}}>点击模型卡片可展开详细建议</div>
        </div>

        {/* Main Content */}
        {view==='original' && (
          <div>
            <SectionLabel icon="memo" label="原始稿" number={2}/>
            <div style={{border:`1px solid ${C.border}`,borderRadius:4,overflow:'hidden'}}>
              {original.map((p,i) => (
                <div key={p.id} style={{
                  padding:'16px 20px',fontSize:13,lineHeight:1.85,color:C.inkSecondary,
                  borderBottom: i<original.length-1 ? `1px solid ${C.borderLight}` : 'none',
                  background: i%2===0 ? '#FAFAF8' : C.paper
                }}>{p.text}</div>
              ))}
            </div>
          </div>
        )}

        {view==='diff' && (
          <div>
            <SectionLabel icon="diff" label="修改对比" number={2}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div>
                <div style={{
                  fontFamily:'Inter,sans-serif',fontSize:9,fontWeight:700,color:C.red,
                  letterSpacing:'1px',textTransform:'uppercase',marginBottom:10,
                  display:'flex',alignItems:'center',gap:6
                }}>
                  <div style={{width:10,height:10,borderRadius:2,background:C.red+'30',border:`1px solid ${C.red}50`}}/>
                  原始版本
                </div>
                {original.map((p,i) => (
                  <div key={p.id} style={{
                    background:C.redBg,borderLeft:`2px solid ${C.red}40`,
                    borderRadius:3,padding:'12px 14px',marginBottom:8,
                    fontSize:12,lineHeight:1.8,color:C.inkSecondary,
                    textDecoration:'line-through',textDecorationColor:C.red+'60'
                  }}>{p.text}</div>
                ))}
              </div>
              <div>
                <div style={{
                  fontFamily:'Inter,sans-serif',fontSize:9,fontWeight:700,color:C.green,
                  letterSpacing:'1px',textTransform:'uppercase',marginBottom:10,
                  display:'flex',alignItems:'center',gap:6
                }}>
                  <div style={{width:10,height:10,borderRadius:2,background:C.green+'30',border:`1px solid ${C.green}50`}}/>
                  修改后版本
                </div>
                {revised.map((p,i) => (
                  <div key={p.id} style={{
                    background:C.greenBg,borderLeft:`2px solid ${C.green}60`,
                    borderRadius:3,padding:'12px 14px',marginBottom:8
                  }}>
                    <div style={{
                      fontFamily:'Inter,sans-serif',fontSize:9,fontWeight:700,color:C.green,
                      letterSpacing:'0.3px',marginBottom:6
                    }}>{p.note}</div>
                    <div style={{fontSize:12,lineHeight:1.8,color:C.ink}}>{p.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view==='final' && (
          <div>
            <SectionLabel icon="check" label="最终推荐版本" color={C.green} number={2}/>
            <div style={{border:`1px solid ${C.green}40`,borderRadius:4,overflow:'hidden'}}>
              {revised.map((p,i) => (
                <div key={p.id} style={{
                  padding:'16px 20px',
                  borderBottom: i<revised.length-1 ? `1px solid ${C.borderLight}` : 'none',
                  background: i%2===0 ? '#FAFAF8' : C.paper
                }}>
                  <p style={{margin:0,fontSize:14,lineHeight:1.85,color:C.ink}}>{p.text}</p>
                </div>
              ))}
            </div>
            <div style={{marginTop:20}}>
              <SectionLabel icon="edit" label="修改说明" number={3}/>
              {revised.map((p,i) => (
                <div key={p.id} style={{
                  display:'flex',gap:10,padding:'10px 0',
                  borderBottom:`1px solid ${C.borderLight}`,alignItems:'flex-start'
                }}>
                  <Icon name="check" size={13} color={C.green}/>
                  <span style={{fontSize:12,color:C.inkSecondary,lineHeight:1.65}}>{p.note}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <ReportFooter/>
    </div>
  );
};

window.Template4 = Template4;


// ─── Gambit Shared Design System v2 ─────────────────────────────────────────
// Annual-report aesthetic: thin-line SVG icons, editorial typography, no emoji

const C = {
  purple: '#5C4FD4', purpleLight: '#8B7FF0', purpleDark: '#3D339E',
  bg: '#F4F3F1', paper: '#FFFFFF',
  ink: '#0D0D0D', inkSecondary: '#4A4A4A', inkMuted: '#8A8A8A',
  green: '#1A6B45', greenBg: '#F0F7F3', greenAccent: '#2E8B5A',
  orange: '#9E4D0A', orangeBg: '#FDF4EE', orangeAccent: '#C4651A',
  blue: '#0A3F7A', blueBg: '#EEF4FB', blueAccent: '#1A5FA8',
  red: '#8B1A1A', redBg: '#FBF1F1', redAccent: '#B52020',
  gold: '#8A6C0A', goldBg: '#FBF6E8',
  border: '#DDDBD8', borderLight: '#ECEAE7',
};

// ── Icon System ──────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = C.ink, strokeWidth = 1.5 }) => {
  const s = { display:'inline-block', verticalAlign:'middle', flexShrink:0 };
  const base = { fill:'none', stroke:color, strokeWidth, strokeLinecap:'round', strokeLinejoin:'round' };

  const paths = {
    check: <><circle cx="8" cy="8" r="6.5" {...base}/><polyline points="5,8.5 7,10.5 11,6" {...base}/></>,
    alert: <><polygon points="8,2 14.5,13.5 1.5,13.5" {...base}/><line x1="8" y1="6.5" x2="8" y2="9.5" {...base}/><circle cx="8" cy="11.5" r="0.5" fill={color} stroke="none"/></>,
    info: <><circle cx="8" cy="8" r="6.5" {...base}/><line x1="8" y1="7" x2="8" y2="11" {...base}/><circle cx="8" cy="5" r="0.5" fill={color} stroke="none"/></>,
    target: <><circle cx="8" cy="8" r="6.5" {...base}/><circle cx="8" cy="8" r="3" {...base}/><circle cx="8" cy="8" r="0.8" fill={color} stroke="none"/></>,
    chart: <><polyline points="1.5,12 5,7 8,9.5 11,4.5 14.5,7" {...base}/><line x1="1.5" y1="14" x2="14.5" y2="14" {...base}/></>,
    risk: <><path d="M8,1.5 L14,4.5 L14,9 C14,12 11,14.5 8,15 C5,14.5 2,12 2,9 L2,4.5 Z" {...base}/><line x1="8" y1="5.5" x2="8" y2="9" {...base}/><circle cx="8" cy="11" r="0.5" fill={color} stroke="none"/></>,
    memo: <><rect x="2.5" y="1.5" width="11" height="13" rx="1.5" {...base}/><line x1="5" y1="5.5" x2="11" y2="5.5" {...base}/><line x1="5" y1="8" x2="11" y2="8" {...base}/><line x1="5" y1="10.5" x2="8.5" y2="10.5" {...base}/></>,
    search: <><circle cx="7" cy="7" r="5" {...base}/><line x1="10.5" y1="10.5" x2="14" y2="14" {...base}/></>,
    edit: <><path d="M10,3 L13,6 L5,14 L2,14 L2,11 Z" {...base}/><line x1="8.5" y1="4.5" x2="11.5" y2="7.5" {...base}/></>,
    diverge: <><path d="M2,8 L6,4 M2,8 L6,12" {...base}/><path d="M14,8 L10,4 M14,8 L10,12" {...base}/><line x1="2" y1="8" x2="14" y2="8" {...base} strokeDasharray="2,2"/></>,
    consensus: <><path d="M2,8 C5,3 11,3 14,8" {...base}/><path d="M2,8 C5,13 11,13 14,8" {...base}/><circle cx="8" cy="8" r="2" {...base}/></>,
    arrow: <><line x1="2" y1="8" x2="13" y2="8" {...base}/><polyline points="9.5,4.5 13,8 9.5,11.5" {...base}/></>,
    trend: <><polyline points="2,12 5.5,7.5 8.5,9.5 12,5" {...base}/><polyline points="10,5 12,5 12,7" {...base}/></>,
    model: <><rect x="2" y="5" width="5" height="7" rx="1" {...base}/><rect x="9" y="3" width="5" height="9" rx="1" {...base}/><line x1="7" y1="9" x2="9" y2="8" {...base}/></>,
    minority: <><circle cx="8" cy="8" r="6.5" {...base}/><circle cx="8" cy="8" r="2.5" {...base} strokeDasharray="2,1.5"/></>,
    action: <><rect x="2" y="3" width="12" height="10" rx="1.5" {...base}/><line x1="5" y1="7" x2="11" y2="7" {...base}/><line x1="5" y1="9.5" x2="9" y2="9.5" {...base}/><polyline points="10,1.5 12,3 10,4.5" {...base}/></>,
    verify: <><path d="M2,8 L5,5 L5,11" {...base}/><path d="M14,8 L11,5 L11,11" {...base}/><line x1="7" y1="6" x2="9" y2="10" {...base}/></>,
    diff: <><rect x="2" y="2" width="5" height="12" rx="1" {...base}/><rect x="9" y="2" width="5" height="12" rx="1" {...base}/><line x1="7.5" y1="8" x2="8.5" y2="8" {...base}/></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={s}>
      {paths[name] || paths.info}
    </svg>
  );
};

// ── Gambit Icon ───────────────────────────────────────────────────────────────
const PixelCat = ({ size = 28, invert = false }) => (
  <img
    src="gambit-icon.png"
    width={size}
    height={size}
    style={{
      display:'block', flexShrink:0,
      objectFit:'contain',
      filter: invert ? 'brightness(0) invert(1)' : 'none'
    }}
    alt="Gambit"
  />
);

// ── Report Header ────────────────────────────────────────────────────────────
const ReportHeader = ({ label }) => (
  <div style={{
    background:C.paper, borderBottom:`1px solid ${C.border}`,
    padding:'16px 44px', display:'flex', alignItems:'center', justifyContent:'space-between'
  }}>
    <div style={{display:'flex',alignItems:'center',gap:10}}>
      <PixelCat size={24}/>
      <span style={{fontFamily:'Inter,sans-serif',fontWeight:800,fontSize:16,color:C.ink,letterSpacing:'-0.3px'}}>Gambit</span>
      <span style={{width:1,height:16,background:C.border,display:'inline-block',margin:'0 6px'}}/>
      <span style={{fontFamily:'Inter,sans-serif',fontSize:11,fontWeight:600,color:C.inkMuted,letterSpacing:'1.2px',textTransform:'uppercase'}}>{label}</span>
    </div>
    <div style={{fontSize:11,color:C.inkMuted,fontFamily:'Inter,sans-serif',letterSpacing:'0.3px'}}>2026 · Q2</div>
  </div>
);

// ── Report Footer ────────────────────────────────────────────────────────────
const ReportFooter = ({ models = ['DeepSeek-R1','Qwen-Max','MiniMax-01'] }) => (
  <div style={{borderTop:`1px solid ${C.border}`,padding:'14px 44px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#FAFAF8'}}>
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <PixelCat size={18}/>
      <span style={{fontSize:10,color:C.inkMuted,fontFamily:'Inter,sans-serif',letterSpacing:'0.2px'}}>
        由 {models.length} 个 AI 模型交叉分析生成 &nbsp;·&nbsp; {models.join(' · ')}
      </span>
    </div>
    <span style={{fontSize:10,color:C.inkMuted,fontFamily:'Inter,sans-serif',letterSpacing:'0.2px'}}>
      Gambit AI Workbench &nbsp;·&nbsp; 2026-04-25
    </span>
  </div>
);

// ── Section Label ─────────────────────────────────────────────────────────────
const SectionLabel = ({ icon, label, color = C.inkSecondary, number }) => (
  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
    {number && (
      <span style={{fontFamily:'Inter,sans-serif',fontSize:10,fontWeight:700,color:C.inkMuted,letterSpacing:'0.5px',minWidth:16}}>{String(number).padStart(2,'0')}</span>
    )}
    <div style={{width:1,height:12,background:color,opacity:0.5}}/>
    {icon && <Icon name={icon} size={13} color={color}/>}
    <span style={{fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:11,color,letterSpacing:'1.2px',textTransform:'uppercase'}}>{label}</span>
    <div style={{flex:1,height:1,background:C.borderLight,marginLeft:4}}/>
  </div>
);

// ── Insight Row (replaces colored cards) ─────────────────────────────────────
const InsightRow = ({ icon, iconColor, label, children, accent }) => (
  <div style={{
    display:'flex',gap:14,padding:'14px 0',
    borderBottom:`1px solid ${C.borderLight}`
  }}>
    <div style={{
      width:28,height:28,borderRadius:4,background: (iconColor||C.ink)+'12',
      display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1
    }}>
      <Icon name={icon||'info'} size={14} color={iconColor||C.ink}/>
    </div>
    <div style={{flex:1}}>
      {label && <div style={{fontFamily:'Inter,sans-serif',fontWeight:700,fontSize:12,color:C.ink,marginBottom:4}}>{label}</div>}
      <div style={{fontSize:13,color:C.inkSecondary,lineHeight:1.7}}>{children}</div>
    </div>
    {accent && <div style={{width:3,alignSelf:'stretch',background:accent,borderRadius:2,flexShrink:0}}/>}
  </div>
);

// ── Confidence Bar ────────────────────────────────────────────────────────────
const ConfidenceBar = ({ label, value, color }) => {
  const c = color || (value >= 75 ? C.green : value >= 50 ? C.orange : C.red);
  return (
    <div style={{marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
        <span style={{fontSize:12,color:C.inkSecondary,fontFamily:'system-ui,sans-serif'}}>{label}</span>
        <span style={{fontSize:12,fontWeight:700,color:c,fontFamily:'Inter,sans-serif',letterSpacing:'-0.3px'}}>{value}%</span>
      </div>
      <div style={{height:3,background:C.borderLight,borderRadius:2}}>
        <div style={{height:'100%',width:`${value}%`,borderRadius:2,background:c}}/>
      </div>
    </div>
  );
};

// ── Model Tag ─────────────────────────────────────────────────────────────────
const ModelTag = ({ name }) => {
  const map = { 'DeepSeek':{c:'#0A3F7A'}, 'Qwen':{c:'#9E4D0A'}, 'MiniMax':{c:'#1A6B45'} };
  const k = Object.keys(map).find(k => name.includes(k)) || 'DeepSeek';
  return (
    <span style={{
      color:map[k].c, background:map[k].c+'12', border:`1px solid ${map[k].c}20`,
      borderRadius:3,padding:'2px 7px',fontSize:9,fontWeight:700,
      fontFamily:'Inter,sans-serif',letterSpacing:'0.8px',textTransform:'uppercase'
    }}>{name}</span>
  );
};

// ── Priority Tag ──────────────────────────────────────────────────────────────
const PriorityTag = ({ level }) => {
  const map = {'高':{c:C.red,bg:C.redBg},'中':{c:C.orange,bg:C.orangeBg},'低':{c:C.blue,bg:C.blueBg}};
  const cfg = map[level]||map['中'];
  return (
    <span style={{
      color:cfg.c,background:cfg.bg,borderRadius:3,
      padding:'2px 7px',fontSize:9,fontWeight:700,
      fontFamily:'Inter,sans-serif',letterSpacing:'0.5px',textTransform:'uppercase'
    }}>{level}优先级</span>
  );
};

// ── Stat Block ────────────────────────────────────────────────────────────────
const StatBlock = ({ value, label, sub, color }) => (
  <div style={{padding:'16px 0'}}>
    <div style={{fontFamily:'Inter,sans-serif',fontWeight:800,fontSize:32,color:color||C.ink,letterSpacing:'-1px',lineHeight:1}}>{value}</div>
    <div style={{fontFamily:'Inter,sans-serif',fontSize:11,fontWeight:600,color:C.inkSecondary,marginTop:5,letterSpacing:'0.2px'}}>{label}</div>
    {sub && <div style={{fontSize:10,color:C.inkMuted,marginTop:2}}>{sub}</div>}
  </div>
);

Object.assign(window, {
  C, Icon, PixelCat, ReportHeader, ReportFooter,
  SectionLabel, InsightRow, ConfidenceBar, ModelTag, PriorityTag, StatBlock
});

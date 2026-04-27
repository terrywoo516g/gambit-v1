
// ─── Flagship Report Shared Components ──────────────────────────────────────

const FC = {
  bg:         '#0D0D0D',
  surface:    '#141416',
  surface2:   '#1C1C1F',
  surface3:   '#242428',
  border:     'rgba(255,255,255,0.07)',
  border2:    'rgba(255,255,255,0.12)',
  white:      '#FFFFFF',
  text:       'rgba(255,255,255,0.88)',
  textSec:    'rgba(255,255,255,0.52)',
  textMuted:  'rgba(255,255,255,0.24)',
  purple:     '#6C5CE7',
  purpleD:    '#4A3FB5',
  purpleGlow: 'rgba(108,92,231,0.35)',
  purpleText: '#9D8FF5',
  green:      '#2ECC71',
  greenD:     'rgba(46,204,113,0.7)',
  orange:     '#E67E22',
  orangeD:    'rgba(230,126,34,0.7)',
  red:        '#E74C3C',
  redD:       'rgba(231,76,60,0.7)',
};

// Model configuration
const MODELS = [
  { key:'D', name:'DeepSeek-R1', short:'DeepSeek', color:'rgba(180,200,230,0.9)' },
  { key:'Q', name:'Qwen-Max',    short:'Qwen',     color:'rgba(230,215,180,0.9)' },
  { key:'M', name:'MiniMax-01',  short:'MiniMax',  color:'rgba(180,230,195,0.9)' },
];

// ── Model Dot Indicators ─────────────────────────────────────────────────────
// lit[0]=DeepSeek, lit[1]=Qwen, lit[2]=MiniMax
const ModelDots = ({ lit = [true, true, true] }) => (
  <div style={{ display:'flex', gap:4, alignItems:'center' }}>
    {MODELS.map((m, i) => (
      <div key={i} title={m.name} style={{
        width: 16, height: 16, borderRadius: '50%',
        background: lit[i] ? m.color : 'rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 7, fontWeight: 800, fontFamily: 'Inter,sans-serif',
        color: lit[i] ? '#0D0D0D' : 'rgba(255,255,255,0.2)',
        transition: 'all 0.2s',
      }}>{m.key}</div>
    ))}
  </div>
);

// ── Flagship Icon (white on dark) ────────────────────────────────────────────
const FlagshipIcon = ({ size = 28 }) => (
  <img src="gambit-icon.png" width={size} height={size}
    style={{ display:'block', objectFit:'contain', filter:'brightness(0) invert(1)', flexShrink:0 }}
    alt="Gambit"/>
);

// ── Section Wrapper ───────────────────────────────────────────────────────────
const SectionWrap = ({ id, children, style = {} }) => (
  <section id={id} data-screen-label={id} style={{
    background: FC.bg, minHeight: '100vh', padding: '72px 80px 80px',
    borderBottom: `1px solid ${FC.border}`, position: 'relative',
    ...style
  }}>
    {children}
  </section>
);

// ── Section Header ────────────────────────────────────────────────────────────
const SectionHeader = ({ num, en, zh, note }) => (
  <div style={{ marginBottom: 56 }}>
    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
      <span style={{ fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:11,
        color: FC.purple, letterSpacing:'2px' }}>{num}</span>
      <div style={{ flex:1, height:1, background: FC.border2 }}/>
    </div>
    <div style={{ fontFamily:'Inter,sans-serif', fontSize:10, fontWeight:600,
      color: FC.textMuted, letterSpacing:'2px', textTransform:'uppercase', marginBottom:10 }}>{en}</div>
    <h2 style={{ fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:30,
      color: FC.text, margin:0, letterSpacing:'-0.5px', lineHeight:1.15 }}>{zh}</h2>
    {note && <p style={{ fontFamily:'system-ui,sans-serif', fontSize:13, color: FC.textSec,
      margin:'10px 0 0', lineHeight:1.6 }}>{note}</p>}
  </div>
);

// ── Data Label ─────────────────────────────────────────────────────────────────
const DataLabel = ({ value, unit, label, color }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
    <div style={{ fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:36,
      color: color || FC.white, letterSpacing:'-1px', lineHeight:1 }}>
      {value}<span style={{ fontSize:16, fontWeight:600, marginLeft:2, opacity:0.6 }}>{unit}</span>
    </div>
    <div style={{ fontFamily:'Inter,sans-serif', fontSize:10, color: FC.textMuted,
      textTransform:'uppercase', letterSpacing:'1px' }}>{label}</div>
  </div>
);

// ── Thin Rule ──────────────────────────────────────────────────────────────────
const Rule = ({ opacity = 0.07 }) => (
  <div style={{ height:1, background:`rgba(255,255,255,${opacity})`, margin:'24px 0' }}/>
);

// ── Flagship Icon (dark) — for nav bar ───────────────────────────────────────
const FlagshipLogo = () => (
  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
    <FlagshipIcon size={22}/>
    <span style={{ fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:15,
      color: FC.white, letterSpacing:'-0.3px' }}>Gambit</span>
  </div>
);

// ── Inline SVG Icon (thin-line, white) ────────────────────────────────────────
const FIcon = ({ name, size = 14, color = FC.textSec }) => {
  const base = { fill:'none', stroke:color, strokeWidth:1.4, strokeLinecap:'round', strokeLinejoin:'round' };
  const paths = {
    arrow:   <><line x1="2" y1="8" x2="13" y2="8" {...base}/><polyline points="9.5,4.5 13,8 9.5,11.5" {...base}/></>,
    check:   <><circle cx="8" cy="8" r="6" {...base}/><polyline points="5,8.5 7,10.5 11,6" {...base}/></>,
    alert:   <><polygon points="8,2 14,13.5 2,13.5" {...base}/><line x1="8" y1="7" x2="8" y2="10" {...base}/></>,
    target:  <><circle cx="8" cy="8" r="6" {...base}/><circle cx="8" cy="8" r="2.5" {...base}/></>,
    chart:   <><polyline points="2,12 5,7 8,9 11,4 14,6" {...base}/><line x1="2" y1="14" x2="14" y2="14" {...base}/></>,
    grid:    <><rect x="2" y="2" width="5" height="5" {...base}/><rect x="9" y="2" width="5" height="5" {...base}/><rect x="2" y="9" width="5" height="5" {...base}/><rect x="9" y="9" width="5" height="5" {...base}/></>,
    branch:  <><line x1="8" y1="2" x2="8" y2="14" {...base}/><polyline points="5,5 8,2 11,5" {...base}/><line x1="5" y1="8" x2="11" y2="8" {...base}/></>,
    risk:    <><path d="M8,1.5 L14,4.5 L14,9 C14,12 11,14.5 8,15 C5,14.5 2,12 2,9 L2,4.5 Z" {...base}/></>,
    time:    <><circle cx="8" cy="8" r="6" {...base}/><polyline points="8,5 8,8.5 10.5,10" {...base}/></>,
    memo:    <><rect x="3" y="2" width="10" height="12" rx="1.5" {...base}/><line x1="5.5" y1="6" x2="10.5" y2="6" {...base}/><line x1="5.5" y1="9" x2="10.5" y2="9" {...base}/></>,
    share:   <><circle cx="13" cy="3" r="1.5" {...base}/><circle cx="13" cy="13" r="1.5" {...base}/><circle cx="3" cy="8" r="1.5" {...base}/><line x1="4.4" y1="7.3" x2="11.6" y2="3.7" {...base}/><line x1="4.4" y1="8.7" x2="11.6" y2="12.3" {...base}/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{display:'inline-block',verticalAlign:'middle',flexShrink:0}}>
      {paths[name] || null}
    </svg>
  );
};

Object.assign(window, {
  FC, MODELS, ModelDots, FlagshipIcon, FlagshipLogo, SectionWrap, SectionHeader,
  DataLabel, Rule, FIcon,
});

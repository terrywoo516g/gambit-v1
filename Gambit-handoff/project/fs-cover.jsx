
// fs-cover.jsx — Cover page with canvas particle convergence

const CoverPage = () => {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;
    const cx = () => W() * 0.5;
    const cy = () => H() * 0.46;

    // 3 emitter origins (top-left, top-right, bottom-center)
    const emitters = [
      { ox: 0.06, oy: 0.08, hue: 210 },   // top-left, cool
      { ox: 0.94, oy: 0.06, hue: 45  },   // top-right, warm
      { ox: 0.5,  oy: 0.95, hue: 150 },   // bottom, green-gray
    ];

    // Generate static particles for each emitter
    const streams = emitters.map(em => {
      const pts = [];
      for (let i = 0; i < 60; i++) {
        const progress = (i / 59);
        // Add slight noise to make it look organic
        const noise = (Math.random() - 0.5) * 0.06;
        pts.push({
          px: progress + noise * (1 - progress),
          py: progress + ((Math.random() - 0.5) * 0.04) * (1 - progress),
          baseSize: 1 + Math.random() * 2.5,
          speed: 0.003 + Math.random() * 0.005,
          phase: Math.random() * Math.PI * 2,
          jitter: (Math.random() - 0.5) * 20,
        });
      }
      return { ...em, pts };
    });

    // Particle trail state
    const particles = [];
    emitters.forEach((em, ei) => {
      for (let i = 0; i < 80; i++) {
        particles.push({
          ei,
          life: Math.random(),
          speed: 0.002 + Math.random() * 0.004,
          offset: (Math.random() - 0.5) * 30,
          size: 0.8 + Math.random() * 2,
          opacity: 0.3 + Math.random() * 0.5,
        });
      }
    });

    const draw = () => {
      t += 0.008;
      const w = W(), h = H(), cX = cx(), cY = cy();

      ctx.clearRect(0, 0, w, h);

      // Glow at center
      const grd = ctx.createRadialGradient(cX, cY, 0, cX, cY, 180);
      grd.addColorStop(0,   'rgba(108,92,231,0.22)');
      grd.addColorStop(0.4, 'rgba(108,92,231,0.08)');
      grd.addColorStop(1,   'rgba(108,92,231,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

      // Secondary inner glow
      const grd2 = ctx.createRadialGradient(cX, cY, 0, cX, cY, 60);
      grd2.addColorStop(0,   'rgba(140,120,255,0.4)');
      grd2.addColorStop(0.5, 'rgba(108,92,231,0.15)');
      grd2.addColorStop(1,   'rgba(108,92,231,0)');
      ctx.fillStyle = grd2;
      ctx.fillRect(0, 0, w, h);

      // Draw streaming particles
      particles.forEach(p => {
        const em = emitters[p.ei];
        p.life = (p.life + p.speed) % 1;

        const progress = p.life;
        const ox = em.ox * w, oy = em.oy * h;

        // Curved path toward center (quadratic bezier approximation)
        const mx = (ox + cX) * 0.5 + (p.ei === 0 ? 60 : p.ei === 1 ? -60 : 0);
        const my = (oy + cY) * 0.5 + (p.ei === 2 ? -40 : 20);

        const t0 = progress;
        const px = (1-t0)*(1-t0)*ox + 2*(1-t0)*t0*mx + t0*t0*cX;
        const py = (1-t0)*(1-t0)*oy + 2*(1-t0)*t0*my + t0*t0*cY;

        // Perpendicular offset
        const dx = cX - ox, dy = cY - oy;
        const len = Math.sqrt(dx*dx + dy*dy);
        const nx = -dy/len, ny = dx/len;
        const finalX = px + nx * p.offset * (1 - progress * 0.8);
        const finalY = py + ny * p.offset * (1 - progress * 0.8);

        const alpha = p.opacity * (progress < 0.1 ? progress * 10 : progress > 0.85 ? (1 - (progress-0.85)/0.15) : 1);
        const size = p.size * (0.5 + progress * 0.8) * (progress > 0.9 ? (1 - (progress-0.9)/0.1) : 1);

        // Color shifts: mostly white-gray, hint of model color
        const hueMap = [210, 40, 150];
        ctx.beginPath();
        ctx.arc(finalX, finalY, Math.max(0.3, size), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hueMap[p.ei]}, 20%, 85%, ${alpha})`;
        ctx.fill();
      });

      // Draw thin stream lines (bezier curves)
      emitters.forEach((em, ei) => {
        const ox = em.ox * w, oy = em.oy * h;
        const mx = (ox + cX) * 0.5 + (ei === 0 ? 60 : ei === 1 ? -60 : 0);
        const my = (oy + cY) * 0.5 + (ei === 2 ? -40 : 20);

        const grad = ctx.createLinearGradient(ox, oy, cX, cY);
        grad.addColorStop(0,   `rgba(255,255,255,0.02)`);
        grad.addColorStop(0.6, `rgba(255,255,255,0.06)`);
        grad.addColorStop(1,   `rgba(108,92,231,0.12)`);

        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.quadraticCurveTo(mx, my, cX, cY);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });

      // Animated pulse ring at center
      const pulse = (Math.sin(t * 2) + 1) / 2;
      ctx.beginPath();
      ctx.arc(cX, cY, 20 + pulse * 8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(108,92,231,${0.6 - pulse * 0.3})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cX, cY, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(140,120,255,0.9)';
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <section id="cover" data-screen-label="01 Cover" style={{
      position:'relative', height:'100vh', background:FC.bg,
      display:'flex', flexDirection:'column', overflow:'hidden'
    }}>
      {/* Canvas fills entire cover */}
      <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}/>

      {/* Top nav */}
      <div style={{ position:'relative', zIndex:2, padding:'28px 48px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <FlagshipLogo/>
        <div style={{ fontFamily:'Inter,sans-serif', fontSize:10, color:FC.textMuted, letterSpacing:'1.5px', textTransform:'uppercase' }}>
          2026 · Q2 · Flagship Report
        </div>
      </div>

      {/* Title block */}
      <div style={{ position:'relative', zIndex:2, flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 80px 40px' }}>
        <div style={{ fontFamily:'Inter,sans-serif', fontSize:10, fontWeight:600, color:FC.purple, letterSpacing:'3px', textTransform:'uppercase', marginBottom:24 }}>
          Gambit Research · No. 005
        </div>
        <h1 style={{
          fontFamily:'Inter,sans-serif', fontWeight:900, fontSize:56,
          color:FC.white, margin:0, lineHeight:1.08, letterSpacing:'-1.5px',
          maxWidth:760, textWrap:'balance'
        }}>
          2026 年中国<br/>AI 应用市场格局
        </h1>
        <div style={{
          fontFamily:'Inter,sans-serif', fontWeight:400, fontSize:22,
          color:FC.textSec, margin:'20px 0 0', lineHeight:1.5, maxWidth:560
        }}>
          谁在赚钱，谁在烧钱，<br/>下一个机会在哪里
        </div>

        {/* Bottom meta */}
        <div style={{ marginTop:64, display:'flex', alignItems:'center', gap:32 }}>
          {[
            { v:'3 Models', d:'DeepSeek R1 · Qwen Max · MiniMax-01' },
            { v:'Cross-Analysis', d:'交叉验证 · 综合置信度 87%' },
            { v:'2026 Q2', d:'研究时间窗口' },
          ].map((item,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12 }}>
              {i > 0 && <div style={{ width:1, height:28, background:FC.border }}/>}
              <div>
                <div style={{ fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:13, color:FC.text, letterSpacing:'-0.2px' }}>{item.v}</div>
                <div style={{ fontFamily:'Inter,sans-serif', fontSize:10, color:FC.textMuted, marginTop:2 }}>{item.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll hint */}
      <div style={{ position:'absolute', bottom:32, left:'50%', transform:'translateX(-50%)', zIndex:2,
        display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
        <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:FC.textMuted, letterSpacing:'2px', textTransform:'uppercase' }}>scroll</div>
        <div style={{ width:1, height:32, background:'linear-gradient(to bottom, rgba(255,255,255,0.15), transparent)' }}/>
      </div>
    </section>
  );
};

window.CoverPage = CoverPage;

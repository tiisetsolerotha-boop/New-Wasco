import { useNavigate } from 'react-router-dom';

const SERVICES = [
  { icon: '💧', title: 'Water Supply', desc: 'Potable water to residential, commercial, and industrial premises across all 10 districts of Lesotho.' },
  { icon: '🚰', title: 'Sewerage Services', desc: 'Wastewater collection, treatment, and safe disposal in urban and peri-urban areas.' },
  { icon: '📊', title: 'Online Billing', desc: 'View and pay your water bills securely online. Full transaction history at your fingertips.' },
  { icon: '🔧', title: 'Leakage Reporting', desc: 'Report water pipe leakages 24/7 for rapid response and repair by our technical teams.' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--clr-bg)' }}>
      {}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1.2rem 4rem', borderBottom:'1px solid var(--clr-border)', position:'sticky', top:0, background:'rgba(10,15,30,0.9)', backdropFilter:'blur(16px)', zIndex:50 }}>
        <div style={{ fontFamily:'Outfit,sans-serif', fontSize:'1.4rem', fontWeight:800, background:'linear-gradient(135deg,#3b82f6,#06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          💧 WASCO
        </div>
        <div style={{ display:'flex', gap:'1rem' }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/login')}>Login</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>Register</button>
        </div>
      </nav>

      {}
      <section style={{ textAlign:'center', padding:'6rem 2rem 4rem', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'10%', left:'50%', transform:'translateX(-50%)', width:'600px', height:'600px', background:'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ fontSize:'0.85rem', fontWeight:600, color:'var(--clr-primary)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'1rem' }}>
          Lesotho Water &amp; Sewerage Company
        </div>
        <h1 style={{ fontFamily:'Outfit,sans-serif', fontSize:'clamp(2.5rem,6vw,4rem)', fontWeight:800, lineHeight:1.1, marginBottom:'1.5rem', maxWidth:'750px', margin:'0 auto 1.5rem' }}>
          Manage Your Water Account<br />
          <span style={{ background:'linear-gradient(135deg,#3b82f6,#06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Anytime. Anywhere.</span>
        </h1>
        <p style={{ color:'var(--clr-muted)', fontSize:'1.1rem', maxWidth:'550px', margin:'0 auto 2.5rem' }}>
          Pay bills, track water usage, report leakages, and manage your WASCO account — all in one secure platform.
        </p>
        <div style={{ display:'flex', gap:'1rem', justifyContent:'center', flexWrap:'wrap' }}>
          <button className="btn btn-primary" style={{ padding:'0.9rem 2rem', fontSize:'1rem' }} onClick={() => navigate('/register')}>
            Create Free Account
          </button>
          <button className="btn btn-outline" style={{ padding:'0.9rem 2rem', fontSize:'1rem' }} onClick={() => navigate('/login')}>
            Sign In →
          </button>
          <button className="btn btn-outline" style={{ padding:'0.9rem 2rem', fontSize:'1rem', background:'transparent' }} onClick={() => navigate('/services')}>
            View Rates & Services
          </button>
        </div>
      </section>

      {}
      <section style={{ padding:'4rem 4rem', maxWidth:'1100px', margin:'0 auto' }}>
        <h2 style={{ fontFamily:'Outfit,sans-serif', fontSize:'1.8rem', fontWeight:700, textAlign:'center', marginBottom:'0.75rem' }}>Our Services</h2>
        <p style={{ color:'var(--clr-muted)', textAlign:'center', marginBottom:'3rem' }}>Everything you need to manage your water services in Lesotho</p>
        <div className="grid-4">
          {SERVICES.map(s => (
            <div key={s.title} className="card" style={{ textAlign:'center', transition:'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='var(--shadow-glow)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}>
              <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>{s.icon}</div>
              <h3 style={{ fontFamily:'Outfit,sans-serif', fontWeight:700, marginBottom:'0.5rem' }}>{s.title}</h3>
              <p style={{ color:'var(--clr-muted)', fontSize:'0.88rem', lineHeight:1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {}
      <section style={{ background:'var(--clr-surface)', borderTop:'1px solid var(--clr-border)', borderBottom:'1px solid var(--clr-border)', padding:'2rem 4rem', textAlign:'center', margin:'2rem 0' }}>
        <p style={{ color:'var(--clr-muted)', fontSize:'0.88rem', marginBottom:'1rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>Serving All 10 Districts</p>
        <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'0.6rem' }}>
          {['Maseru','Berea','Leribe','Butha-Buthe','Mafeteng',"Mohale's Hoek",'Quthing',"Qacha's Nek",'Mokhotlong','Thaba-Tseka'].map(d => (
            <span key={d} style={{ background:'rgba(59,130,246,0.1)', color:'var(--clr-primary)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:'99px', padding:'0.3rem 0.9rem', fontSize:'0.82rem', fontWeight:500 }}>{d}</span>
          ))}
        </div>
      </section>

      {}
      <footer style={{ textAlign:'center', padding:'2rem', color:'var(--clr-muted)', fontSize:'0.82rem', borderTop:'1px solid var(--clr-border)' }}>
        © 2026 WASCO – Lesotho Water &amp; Sewerage Company · All rights reserved
      </footer>
    </div>
  );
}

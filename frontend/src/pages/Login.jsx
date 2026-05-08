import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm] = useState({ email:'', password:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--clr-bg)', padding:'2rem' }}>
      <div style={{ position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)', width:'500px', height:'500px', background:'radial-gradient(circle,rgba(59,130,246,0.1) 0%,transparent 70%)', pointerEvents:'none' }} />
      <div className="card" style={{ width:'100%', maxWidth:'420px', position:'relative' }}>
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ fontFamily:'Outfit,sans-serif', fontSize:'2rem', fontWeight:800, background:'linear-gradient(135deg,#3b82f6,#06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>💧 WASCO</div>
          <h1 style={{ fontFamily:'Outfit,sans-serif', fontSize:'1.4rem', fontWeight:700, margin:'0.5rem 0 0.3rem' }}>Welcome Back</h1>
          <p style={{ color:'var(--clr-muted)', fontSize:'0.88rem' }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Email Address</label>
            <input type="email" placeholder="you@example.com" value={form.email}
              onChange={e => setForm(f => ({...f, email:e.target.value}))} required />
          </div>
          <div className="form-group">
            <label className="label">Password</label>
            <input type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm(f => ({...f, password:e.target.value}))} required />
          </div>
          {error && <div className="error-msg" style={{ marginBottom:'1rem' }}>{error}</div>}
          <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'0.8rem' }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:'1.5rem', color:'var(--clr-muted)', fontSize:'0.88rem' }}>
          Don't have an account? <Link to="/register" style={{ color:'var(--clr-primary)', fontWeight:600 }}>Register here</Link>
        </p>
        <p style={{ textAlign:'center', marginTop:'0.75rem' }}>
          <Link to="/" style={{ color:'var(--clr-muted)', fontSize:'0.82rem' }}>← Back to home</Link>
        </p>
      </div>
    </div>
  );
}

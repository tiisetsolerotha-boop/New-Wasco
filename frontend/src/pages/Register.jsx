import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DISTRICTS } from '../components/shared';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name:'', email:'', phone:'', address:'', district:'Maseru', password:'', confirm:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({...f, [k]: e.target.value}));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    setLoading(true);
    try {
      await register({ name:form.name, email:form.email, phone:form.phone, address:form.address, district:form.district, password:form.password });
      toast.success('Account created! Welcome to WASCO.');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--clr-bg)', padding:'2rem' }}>
      <div className="card" style={{ width:'100%', maxWidth:'480px' }}>
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ fontFamily:'Outfit,sans-serif', fontSize:'2rem', fontWeight:800, background:'linear-gradient(135deg,#3b82f6,#06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>💧 WASCO</div>
          <h1 style={{ fontFamily:'Outfit,sans-serif', fontSize:'1.4rem', fontWeight:700, margin:'0.5rem 0 0.3rem' }}>Create Account</h1>
          <p style={{ color:'var(--clr-muted)', fontSize:'0.88rem' }}>Register for WASCO online services</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Full Name *</label>
              <input placeholder="Thabo Mokoena" value={form.name} onChange={set('name')} required />
            </div>
            <div className="form-group">
              <label className="label">Phone Number</label>
              <input placeholder="+266 5000 0000" value={form.phone} onChange={set('phone')} />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Email Address *</label>
            <input type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">District *</label>
              <select value={form.district} onChange={set('district')} required>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Address</label>
              <input placeholder="Street, Area" value={form.address} onChange={set('address')} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Password *</label>
              <input type="password" placeholder="Min. 8 characters" value={form.password} onChange={set('password')} required />
            </div>
            <div className="form-group">
              <label className="label">Confirm Password *</label>
              <input type="password" placeholder="Repeat password" value={form.confirm} onChange={set('confirm')} required />
            </div>
          </div>
          {error && <div className="error-msg" style={{ marginBottom:'1rem' }}>{error}</div>}
          <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'0.8rem' }} disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:'1.5rem', color:'var(--clr-muted)', fontSize:'0.88rem' }}>
          Already have an account? <Link to="/login" style={{ color:'var(--clr-primary)', fontWeight:600 }}>Sign in</Link>
        </p>
        <p style={{ textAlign:'center', marginTop:'0.5rem' }}>
          <Link to="/" style={{ color:'var(--clr-muted)', fontSize:'0.82rem' }}>← Back to home</Link>
        </p>
      </div>
    </div>
  );
}

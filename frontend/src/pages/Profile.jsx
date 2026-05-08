import { useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { DISTRICTS } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [pwForm, setPwForm] = useState({ current:'', new_password:'', confirm:'' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then(({ data }) => {
      setProfile(data.user);
      setForm({ name: data.user.name, phone: data.user.phone || '', address: data.user.address || '', district: data.user.district });
    }).catch(() => toast.error('Could not load profile.'));
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.put(`/customers/${user.account_number}`, form);
      toast.success('Profile updated!');
      setEditing(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
    finally { setLoading(false); }
  };

  const set = k => e => setForm(f => ({...f, [k]: e.target.value}));

  if (!profile) return <AppLayout><div style={{ padding:'4rem', color:'var(--clr-muted)', textAlign:'center' }}>Loading profile…</div></AppLayout>;

  const roleLabel = { admin:'Administrator', branch_manager:'Branch Manager', customer:'Customer' };

  return (
    <AppLayout>
      <div className="page-header"><h1>My Profile</h1><p>View and update your account information</p></div>

      <div style={{ maxWidth:600 }}>
        {}
        <div className="card" style={{ marginBottom:'1.5rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'1.2rem', marginBottom:'1.5rem' }}>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'linear-gradient(135deg,#3b82f6,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem', fontWeight:700, color:'#fff' }}>
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily:'Outfit,sans-serif', fontSize:'1.2rem', fontWeight:700 }}>{profile.name}</div>
              <div style={{ color:'var(--clr-muted)', fontSize:'0.88rem' }}>{profile.email}</div>
              <span className={`role-badge role-${profile.role === 'branch_manager' ? 'manager' : profile.role}`} style={{ marginTop:'0.3rem', display:'inline-block' }}>
                {roleLabel[profile.role]}
              </span>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom:'1rem' }}>
            {[
              ['Account Number', profile.account_number],
              ['District', profile.district],
              ['Phone', profile.phone || '—'],
              ['Member Since', new Date(profile.created_at).toLocaleDateString('en-GB', { month:'long', year:'numeric' })],
            ].map(([k,v]) => (
              <div key={k}>
                <div style={{ color:'var(--clr-muted)', fontSize:'0.78rem', marginBottom:'0.2rem', textTransform:'uppercase', letterSpacing:'0.05em' }}>{k}</div>
                <div style={{ fontWeight:500 }}>{v}</div>
              </div>
            ))}
          </div>

          {!editing ? (
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>Edit Profile</button>
          ) : (
            <form onSubmit={saveProfile}>
              <div className="grid-2">
                <div className="form-group"><label className="label">Full Name</label><input value={form.name} onChange={set('name')} required /></div>
                <div className="form-group"><label className="label">Phone</label><input value={form.phone} onChange={set('phone')} /></div>
                <div className="form-group">
                  <label className="label">District</label>
                  <select value={form.district} onChange={set('district')}>{DISTRICTS.map(d => <option key={d}>{d}</option>)}</select>
                </div>
                <div className="form-group"><label className="label">Address</label><input value={form.address} onChange={set('address')} /></div>
              </div>
              <div style={{ display:'flex', gap:'0.75rem' }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

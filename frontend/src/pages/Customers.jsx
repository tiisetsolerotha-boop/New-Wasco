import { useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { Spinner, EmptyState, fmtDate, fmtMoney, DISTRICTS } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [selected, setSelected] = useState(null); // for reset-password modal
  const [showEdit, setShowEdit] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/customers', { params: { search, district } });
      setCustomers(data.customers);
    } catch { toast.error('Could not load customers.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (c) => {
    try {
      await api.put(`/customers/${c.account_number}`, { is_active: !c.is_active });
      toast.success(`Account ${c.is_active ? 'deactivated' : 'activated'}`);
      load();
    } catch { toast.error('Failed.'); }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1>Customers</h1>
        <p>Manage all customer accounts</p>
      </div>

      <div style={{ display:'flex', gap:'1rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
        <input placeholder="Search by name, email, account…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth:280 }} />
        <select style={{ maxWidth:180 }} value={district} onChange={e => setDistrict(e.target.value)}>
          <option value="">All Districts</option>
          {DISTRICTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <button className="btn btn-outline btn-sm" onClick={load}>Search</button>
      </div>

      <div className="card">
        {loading ? <Spinner /> : customers.length === 0 ? <EmptyState icon="👥" message="No customers found." /> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>District</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  {user?.role === 'admin' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.account_number}>
                    <td style={{ fontFamily:'monospace', fontSize:'0.85rem', color:'var(--clr-muted)' }}>{c.account_number}</td>
                    <td style={{ fontWeight:500 }}>{c.name}</td>
                    <td style={{ fontSize:'0.88rem' }}>{c.email}</td>
                    <td>{c.district}</td>
                    <td><span className={`badge badge-${c.role === 'admin' ? 'overdue' : c.role === 'branch_manager' ? 'partial' : 'paid'}`}>{c.role}</span></td>
                    <td><span className={`badge badge-${c.is_active ? 'paid' : 'unpaid'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ color:'var(--clr-muted)', fontSize:'0.85rem' }}>{fmtDate(c.created_at)}</td>
                    {user?.role === 'admin' && (
                      <td>
                        <div style={{ display:'flex', gap:'0.4rem' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => setShowEdit(c)}>Edit</button>
                          <button className="btn btn-outline btn-sm" onClick={() => setSelected(c)}>Reset PW</button>
                          <button className={`btn btn-sm ${c.is_active ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleActive(c)}>
                            {c.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showEdit && <EditCustomerModal customer={showEdit} onClose={() => setShowEdit(null)} onDone={load} />}
      {selected && <ResetPasswordModal customer={selected} onClose={() => setSelected(null)} />}
    </AppLayout>
  );
}

function ResetPasswordModal({ customer, onClose }) {
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post(`/customers/${customer.account_number}/reset-password`, { new_password: pw });
      toast.success('Password reset successfully!'); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
    finally { setLoading(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Reset Password</h2><button className="modal-close" onClick={onClose}>×</button></div>
        <p style={{ color:'var(--clr-muted)', marginBottom:'1.2rem', fontSize:'0.9rem' }}>Resetting password for <strong style={{ color:'var(--clr-text)' }}>{customer.name}</strong></p>
        <form onSubmit={submit}>
          <div className="form-group"><label className="label">New Password (min. 8 chars)</label><input type="password" value={pw} onChange={e => setPw(e.target.value)} required minLength={8} /></div>
          <button type="submit" className="btn btn-danger" style={{ width:'100%', justifyContent:'center' }} disabled={loading}>{loading ? 'Resetting…' : 'Reset Password'}</button>
        </form>
      </div>
    </div>
  );
}

function EditCustomerModal({ customer, onClose, onDone }) {
  const [form, setForm] = useState({ name: customer.name, email: customer.email, phone: customer.phone || '', address: customer.address || '', district: customer.district || 'Maseru', role: customer.role });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({...f, [k]: e.target.value}));
  
  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.put(`/customers/${customer.account_number}`, form);
      toast.success('Customer updated!'); onDone(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Edit Customer</h2><button className="modal-close" onClick={onClose}>×</button></div>
        <form onSubmit={submit}>
          <div className="form-group"><label className="label">Name</label><input value={form.name} onChange={set('name')} required /></div>
          <div className="form-group"><label className="label">Email</label><input type="email" value={form.email} onChange={set('email')} required /></div>
          <div className="grid-2">
            <div className="form-group"><label className="label">Phone</label><input value={form.phone} onChange={set('phone')} /></div>
            <div className="form-group"><label className="label">District</label><select value={form.district} onChange={set('district')}>{DISTRICTS.map(d=><option key={d}>{d}</option>)}</select></div>
          </div>
          <div className="form-group"><label className="label">Address</label><input value={form.address} onChange={set('address')} /></div>
          <div className="form-group">
            <label className="label">Role</label>
            <select value={form.role} onChange={set('role')}>
              <option value="customer">Customer</option>
              <option value="branch_manager">Branch Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</button>
        </form>
      </div>
    </div>
  );
}

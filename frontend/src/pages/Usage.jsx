import { useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { Spinner, EmptyState, fmtDate, fmtMoney } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function UsagePage() {
  const { user } = useAuth();
  const isAdmin = ['admin','branch_manager'].includes(user?.role);
  const isStrictAdmin = user?.role === 'admin';
  const [usage, setUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const isStaff = ['admin', 'branch_manager'].includes(user?.role);
      let url = '/usage/my';
      if (isStaff) {
        url = search ? `/usage/account/${search}` : '/usage';
      }
      const { data } = await api.get(url);
      setUsage(data.usage || []);
    } catch { toast.error('Could not load usage.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <AppLayout>
      <div className="page-header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <h1>Water Usage</h1>
            <p>{isAdmin ? 'View meter readings and record new usage' : 'Your monthly water consumption history'}</p>
          </div>
          {isStrictAdmin && <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Record Reading</button>}
        </div>
      </div>

      {isAdmin && (
        <div style={{ display:'flex', gap:'1rem', marginBottom:'1.5rem' }}>
          <input placeholder="Account number to search…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth:260 }} />
          <button className="btn btn-outline btn-sm" onClick={load}>Search</button>
        </div>
      )}

      <div className="card">
        {loading ? <Spinner /> : usage.length === 0 ? <EmptyState icon="💧" message="No usage records found." /> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {isAdmin && <th>Account</th>}
                  <th>Month</th>
                  <th>Previous (kL)</th>
                  <th>Current (kL)</th>
                  <th>Consumed (kL)</th>
                  <th>Recorded</th>
                  {isAdmin && <th>Recorded By</th>}
                </tr>
              </thead>
              <tbody>
                {usage.map((u, i) => (
                  <tr key={u.usage_id || i}>
                    {isAdmin && <td style={{ fontFamily:'monospace', fontSize:'0.85rem' }}>{u.account_number}</td>}
                    <td style={{ fontWeight:500 }}>{fmtDate(u.billing_month)}</td>
                    <td>{parseFloat(u.previous_reading).toFixed(3)}</td>
                    <td>{parseFloat(u.current_reading).toFixed(3)}</td>
                    <td>
                      <span style={{ fontWeight:700, color:'var(--clr-accent)' }}>
                        {parseFloat(u.units_consumed).toFixed(3)}
                      </span>
                    </td>
                    <td style={{ color:'var(--clr-muted)', fontSize:'0.85rem' }}>{fmtDate(u.recorded_at)}</td>
                    {isAdmin && <td style={{ color:'var(--clr-muted)', fontSize:'0.85rem' }}>{u.recorded_by || '—'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <RecordUsageModal onClose={() => setShowAdd(false)} onDone={load} />}
    </AppLayout>
  );
}

function RecordUsageModal({ onClose, onDone }) {
  const [form, setForm] = useState({ account_number:'', billing_month:'', previous_reading:'0', current_reading:'', recorded_by:'', notes:'' });
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    api.get('/customers').then(res => setCustomers(res.data.customers || [])).catch(() => {});
  }, []);

  const set = k => e => setForm(f => ({...f, [k]: e.target.value}));
  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/usage', form);
      toast.success('Usage recorded successfully!'); onDone(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:520 }}>
        <div className="modal-header"><h2>Record Meter Reading</h2><button className="modal-close" onClick={onClose}>×</button></div>
        <form onSubmit={submit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Customer Account *</label>
              <select value={form.account_number} onChange={set('account_number')} required>
                <option value="" disabled>-- Select a Customer --</option>
                {customers.filter(c => c.role === 'customer').map(c => (
                  <option key={c.account_number} value={c.account_number}>
                    {c.name} ({c.account_number})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group"><label className="label">Billing Month *</label><input type="date" value={form.billing_month} onChange={set('billing_month')} required /></div>
            <div className="form-group"><label className="label">Previous Reading (kL) *</label><input type="number" step="0.001" value={form.previous_reading} onChange={set('previous_reading')} required /></div>
            <div className="form-group"><label className="label">Current Reading (kL) *</label><input type="number" step="0.001" value={form.current_reading} onChange={set('current_reading')} required /></div>
          </div>
          <div className="form-group"><label className="label">Recorded By</label><input placeholder="Meter reader name" value={form.recorded_by} onChange={set('recorded_by')} /></div>
          <div className="form-group"><label className="label">Notes</label><textarea rows={2} placeholder="Any notes…" value={form.notes} onChange={set('notes')} /></div>
          <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} disabled={loading}>{loading ? 'Saving…' : 'Record Reading'}</button>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { Spinner, fmtMoney } from '../components/shared';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function RatesPage() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/billing-rates');
      setRates(data.rates);
    } catch { toast.error('Could not load rates.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <AppLayout>
      <div className="page-header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div><h1>Billing Rates</h1><p>Manage tiered water billing rates (M per kL)</p></div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Rate Tier</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom:'1.5rem' }}>
        <h3 style={{ fontFamily:'Outfit,sans-serif', fontWeight:600, marginBottom:'1rem', color:'var(--clr-muted)' }}>Current Tiered Rate Structure</h3>
        {loading ? <Spinner /> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Min (kL)</th>
                  <th>Max (kL)</th>
                  <th>Cost per kL</th>
                  <th>Description</th>
                  <th>Effective From</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {rates.map(r => (
                  <tr key={r.rate_id}>
                    <td><span style={{ fontWeight:800, fontFamily:'Outfit,sans-serif', fontSize:'1.1rem', color:'var(--clr-primary)' }}>T{r.tier}</span></td>
                    <td>{parseFloat(r.min_units).toFixed(2)}</td>
                    <td>{r.max_units !== null ? parseFloat(r.max_units).toFixed(2) : '∞'}</td>
                    <td style={{ fontWeight:700, color:'var(--clr-accent)' }}>{fmtMoney(r.cost_per_unit)}</td>
                    <td style={{ color:'var(--clr-muted)' }}>{r.description || '—'}</td>
                    <td style={{ color:'var(--clr-muted)', fontSize:'0.85rem' }}>{r.effective_from}</td>
                    <td><span className={`badge badge-${r.is_current ? 'paid' : 'unpaid'}`}>{r.is_current ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card glass">
        <h3 style={{ fontFamily:'Outfit,sans-serif', fontWeight:600, marginBottom:'0.75rem' }}>📘 How Tiered Billing Works</h3>
        <p style={{ color:'var(--clr-muted)', fontSize:'0.9rem', lineHeight:1.8 }}>
          WASCO uses a <strong style={{ color:'var(--clr-text)' }}>progressive tiered system</strong>. Each kL consumed is charged at the rate of the tier it falls within.
          For example, if a customer uses 25 kL: Tier 1 covers 0–6 kL at M 3.50/kL, Tier 2 covers 6–20 kL at M 7.80/kL, and Tier 3 covers the remaining 5 kL at M 12.50/kL.
        </p>
      </div>

      {showAdd && <AddRateModal onClose={() => setShowAdd(false)} onDone={load} />}
    </AppLayout>
  );
}

function AddRateModal({ onClose, onDone }) {
  const [form, setForm] = useState({ tier:'', min_units:'', max_units:'', cost_per_unit:'', description:'' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({...f, [k]:e.target.value}));
  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/billing-rates', form);
      toast.success('Rate tier added!'); onDone(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
    finally { setLoading(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Add Rate Tier</h2><button className="modal-close" onClick={onClose}>×</button></div>
        <form onSubmit={submit}>
          <div className="grid-2">
            <div className="form-group"><label className="label">Tier Number *</label><input type="number" min="1" value={form.tier} onChange={set('tier')} required /></div>
            <div className="form-group"><label className="label">Cost per kL (M) *</label><input type="number" step="0.0001" value={form.cost_per_unit} onChange={set('cost_per_unit')} required /></div>
            <div className="form-group"><label className="label">Min Units (kL) *</label><input type="number" step="0.01" value={form.min_units} onChange={set('min_units')} required /></div>
            <div className="form-group"><label className="label">Max Units (kL, blank = ∞)</label><input type="number" step="0.01" value={form.max_units} onChange={set('max_units')} /></div>
          </div>
          <div className="form-group"><label className="label">Description</label><input placeholder="e.g. Lifeline (0–6 kL)" value={form.description} onChange={set('description')} /></div>
          <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} disabled={loading}>{loading ? 'Adding…' : 'Add Rate Tier'}</button>
        </form>
      </div>
    </div>
  );
}

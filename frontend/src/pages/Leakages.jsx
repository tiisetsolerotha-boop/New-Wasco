import { useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { Spinner, EmptyState, statusBadge, fmtDate, DISTRICTS } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

const PRIORITY_COLORS = { Low:'var(--clr-muted)', Medium:'var(--clr-warning)', High:'var(--clr-danger)', Critical:'#ff4040' };

export default function LeakagesPage() {
  const { user } = useAuth();
  const isAdmin = ['admin','branch_manager'].includes(user?.role);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const url = isAdmin ? '/leakages' : '/leakages/my';
      const { data } = await api.get(url);
      setReports(data.reports);
    } catch { toast.error('Could not load reports.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/leakages/${id}/status`, { status });
      toast.success('Status updated');
      load();
    } catch { toast.error('Failed to update status.'); }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <h1>Leakage Reports</h1>
            <p>{isAdmin ? 'Manage all submitted leakage reports by priority' : 'Report and track water pipe leakages'}</p>
          </div>
          {!isAdmin && <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Report Leakage</button>}
        </div>
      </div>

      <div className="card">
        {loading ? <Spinner /> : reports.length === 0 ? (
          <EmptyState icon="✅" message={isAdmin ? 'No leakage reports.' : 'No reports submitted yet.'}>
            {!isAdmin && <button className="btn btn-primary btn-sm" style={{ marginTop:'1rem' }} onClick={() => setShowAdd(true)}>Submit First Report</button>}
          </EmptyState>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Location</th>
                  <th>District</th>
                  {isAdmin && <th>Reported By</th>}
                  <th>Description</th>
                  <th>Status</th>
                  <th>Reported</th>
                  {isAdmin && <th>Update</th>}
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.report_id}>
                    <td><span style={{ fontWeight:700, color: PRIORITY_COLORS[r.priority] }}>{r.priority}</span></td>
                    <td style={{ fontWeight:500 }}>{r.location}</td>
                    <td style={{ color:'var(--clr-muted)' }}>{r.district || '—'}</td>
                    {isAdmin && <td style={{ fontSize:'0.85rem' }}>{r.name || 'Anonymous'}<br /><span style={{ color:'var(--clr-muted)' }}>{r.phone}</span></td>}
                    <td style={{ maxWidth:200, color:'var(--clr-muted)', fontSize:'0.85rem' }}>{r.description || '—'}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td style={{ color:'var(--clr-muted)', fontSize:'0.85rem' }}>{fmtDate(r.reported_at)}</td>
                    {isAdmin && (
                      <td>
                        <select style={{ fontSize:'0.8rem', padding:'0.3rem 0.5rem' }}
                          value={r.status} onChange={e => updateStatus(r.report_id, e.target.value)}>
                          {['Open','In Progress','Resolved','Closed'].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <ReportModal onClose={() => setShowAdd(false)} onDone={load} />}
    </AppLayout>
  );
}

function ReportModal({ onClose, onDone }) {
  const [form, setForm] = useState({ location:'', district:'Maseru', description:'', priority:'Medium' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({...f, [k]:e.target.value}));
  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/leakages', form);
      toast.success('Report submitted!'); onDone(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
    finally { setLoading(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Report a Leakage</h2><button className="modal-close" onClick={onClose}>×</button></div>
        <form onSubmit={submit}>
          <div className="form-group"><label className="label">Location / Address *</label><input placeholder="e.g. Main Road, near Post Office" value={form.location} onChange={set('location')} required /></div>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">District</label>
              <select value={form.district} onChange={set('district')}>{DISTRICTS.map(d => <option key={d}>{d}</option>)}</select>
            </div>
            <div className="form-group">
              <label className="label">Priority</label>
              <select value={form.priority} onChange={set('priority')}>{['Low','Medium','High','Critical'].map(p => <option key={p}>{p}</option>)}</select>
            </div>
          </div>
          <div className="form-group"><label className="label">Description</label><textarea rows={3} placeholder="Describe the leakage…" value={form.description} onChange={set('description')} /></div>
          <button type="submit" className="btn btn-danger" style={{ width:'100%', justifyContent:'center' }} disabled={loading}>{loading ? 'Submitting…' : 'Submit Report'}</button>
        </form>
      </div>
    </div>
  );
}

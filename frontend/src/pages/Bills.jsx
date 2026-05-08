import { useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { Spinner, EmptyState, statusBadge, fmtMoney, fmtDate } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function BillsPage() {
  const { user } = useAuth();
  const isAdmin = ['admin','branch_manager'].includes(user?.role);
  const isStrictAdmin = user?.role === 'admin';
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showPay, setShowPay] = useState(null); // bill object
  const [filters, setFilters] = useState({ status:'', district:'' });

  const load = async () => {
    setLoading(true);
    try {
      const params = isAdmin ? filters : {};
      const url = isAdmin ? '/bills' : '/bills/my';
      const { data } = await api.get(url, { params });
      setBills(isAdmin ? data.bills : data.bills);
    } catch { toast.error('Could not load bills.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <AppLayout>
      <div className="page-header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <h1>{isAdmin ? 'All Bills' : 'My Bills'}</h1>
            <p>{isAdmin ? 'View and manage all customer bills' : 'View your billing history and make payments'}</p>
          </div>
          {isStrictAdmin && <button className="btn btn-primary" onClick={() => setShowGenerate(true)}>+ Generate Bill</button>}
        </div>
      </div>

      {isAdmin && (
        <div style={{ display:'flex', gap:'1rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
          <select style={{ maxWidth:160 }} value={filters.status} onChange={e => setFilters(f => ({...f, status:e.target.value}))}>
            <option value="">All Statuses</option>
            {['Paid','Unpaid','Overdue','Partial'].map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="btn btn-outline btn-sm" onClick={load}>Apply Filters</button>
        </div>
      )}

      <div className="card">
        {loading ? <Spinner /> : bills.length === 0 ? <EmptyState icon="📄" message="No bills found." /> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {isAdmin && <th>Customer</th>}
                  <th>Month</th>
                  <th>Usage (kL)</th>
                  <th>Amount</th>
                  {isAdmin && <th>Paid</th>}
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  {!isAdmin && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {bills.map(b => (
                  <tr key={b.bill_id}>
                    {isAdmin && <td><div style={{ fontWeight:500 }}>{b.name}</div><div style={{ fontSize:'0.78rem', color:'var(--clr-muted)' }}>{b.account_number}</div></td>}
                    <td>{fmtDate(b.billing_month)}</td>
                    <td>{parseFloat(b.units_consumed).toFixed(2)}</td>
                    <td style={{ fontWeight:600 }}>{fmtMoney(b.total_amount)}</td>
                    {isAdmin && <td style={{ color:'var(--clr-success)' }}>{fmtMoney(b.total_paid || 0)}</td>}
                    <td style={{ fontWeight:600, color: parseFloat(b.balance || b.total_amount) > 0 ? 'var(--clr-danger)' : 'var(--clr-success)' }}>
                      {fmtMoney(b.balance !== undefined ? b.balance : b.total_amount)}
                    </td>
                    <td>{statusBadge(b.payment_status)}</td>
                    <td style={{ color:'var(--clr-muted)' }}>{fmtDate(b.due_date)}</td>
                    {!isAdmin && (
                      <td>
                        {b.payment_status !== 'Paid' && (
                          <button className="btn btn-primary btn-sm" onClick={() => setShowPay(b)}>Pay</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showGenerate && <GenerateBillModal onClose={() => setShowGenerate(false)} onDone={load} />}
      {showPay      && <PayBillModal bill={showPay} onClose={() => setShowPay(null)} onDone={load} />}
    </AppLayout>
  );
}

function GenerateBillModal({ onClose, onDone }) {
  const [form, setForm] = useState({ account_number:'', billing_month:'' });
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    api.get('/customers').then(res => setCustomers(res.data.customers || [])).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/bills/generate', form);
      toast.success('Bill generated!'); onDone(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Generate Bill</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="label">Customer Account *</label>
            <select value={form.account_number} onChange={e => setForm(f=>({...f, account_number:e.target.value}))} required>
              <option value="" disabled>-- Select a Customer --</option>
              {customers.filter(c => c.role === 'customer').map(c => (
                <option key={c.account_number} value={c.account_number}>
                  {c.name} ({c.account_number})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group"><label className="label">Billing Month *</label><input type="date" value={form.billing_month} onChange={e => setForm(f=>({...f, billing_month:e.target.value}))} required /></div>
          <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} disabled={loading}>{loading ? 'Generating…' : 'Generate Bill'}</button>
        </form>
      </div>
    </div>
  );
}

function PayBillModal({ bill, onClose, onDone }) {
  const [form, setForm] = useState({ amount_paid: bill.balance || bill.total_amount, payment_method:'EFT', transaction_ref:'' });
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/payments', { ...form, bill_id: bill.bill_id });
      toast.success('Payment recorded!'); onDone(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
    finally { setLoading(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Make Payment</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ background:'var(--clr-surface2)', borderRadius:'var(--radius)', padding:'1rem', marginBottom:'1.2rem', fontSize:'0.88rem' }}>
          <strong>Balance due:</strong> {fmtMoney(bill.balance || bill.total_amount)}
        </div>
        <form onSubmit={submit}>
          <div className="form-group"><label className="label">Amount (M)</label><input type="number" step="0.01" min="0.01" value={form.amount_paid} onChange={e => setForm(f=>({...f, amount_paid:e.target.value}))} required /></div>
          <div className="form-group">
            <label className="label">Payment Method</label>
            <select value={form.payment_method} onChange={e => setForm(f=>({...f, payment_method:e.target.value}))}>
              {['Cash','EFT','Mobile Money','Card','Cheque'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="label">Reference (optional)</label><input placeholder="Transaction ref" value={form.transaction_ref} onChange={e => setForm(f=>({...f, transaction_ref:e.target.value}))} /></div>
          <button type="submit" className="btn btn-success" style={{ width:'100%', justifyContent:'center' }} disabled={loading}>{loading ? 'Processing…' : 'Confirm Payment'}</button>
        </form>
      </div>
    </div>
  );
}

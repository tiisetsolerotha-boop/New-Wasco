import { useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { Spinner, EmptyState, fmtDate, fmtMoney } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function PaymentsPage() {
  const { user } = useAuth();
  const isAdmin = ['admin','branch_manager'].includes(user?.role);
  const [data, setData] = useState(isAdmin ? { summary:{}, bills:[] } : []);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const { data: d } = await api.get('/payments/outstanding');
        setData(d);
      } else {
        const { data: d } = await api.get('/payments/history');
        setData(d.payments);
      }
    } catch { toast.error('Could not load payments.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <AppLayout>
      <div className="page-header">
        <h1>{isAdmin ? 'Outstanding Balances' : 'Payment History'}</h1>
        <p>{isAdmin ? 'Cross-DB report: unpaid bills with payment totals' : 'All payments made on your account'}</p>
      </div>

      {isAdmin && data.summary && (
        <div style={{ display:'flex', gap:'1rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
          {[
            { label:'Accounts with arrears', value: data.summary.total_accounts },
            { label:'Unpaid bills', value: data.summary.total_bills },
            { label:'Total outstanding', value: fmtMoney(data.summary.total_outstanding) },
          ].map(s => (
            <div key={s.label} className="card" style={{ flex:'1', minWidth:160, textAlign:'center' }}>
              <div style={{ fontSize:'1.5rem', fontWeight:700, color:'var(--clr-danger)' }}>{s.value}</div>
              <div style={{ color:'var(--clr-muted)', fontSize:'0.82rem', marginTop:'0.2rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        {loading ? <Spinner /> : (
          isAdmin ? (
            (data.bills || []).length === 0 ? <EmptyState icon="✅" message="No outstanding balances!" /> : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Customer</th><th>District</th><th>Month</th><th>Bill Amount</th><th>Paid</th><th>Outstanding</th><th>Status</th><th>Due</th></tr></thead>
                  <tbody>
                    {(data.bills || []).map(b => (
                      <tr key={b.bill_id}>
                        <td><div style={{ fontWeight:500 }}>{b.name}</div><div style={{ fontSize:'0.78rem', color:'var(--clr-muted)' }}>{b.account_number}</div></td>
                        <td>{b.district}</td>
                        <td>{fmtDate(b.billing_month)}</td>
                        <td>{fmtMoney(b.total_amount)}</td>
                        <td style={{ color:'var(--clr-success)' }}>{fmtMoney(b.total_paid)}</td>
                        <td style={{ fontWeight:700, color:'var(--clr-danger)' }}>{fmtMoney(b.outstanding)}</td>
                        <td><span className={`badge badge-${b.payment_status.toLowerCase()}`}>{b.payment_status}</span></td>
                        <td style={{ color:'var(--clr-muted)' }}>{fmtDate(b.due_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            (Array.isArray(data) && data.length === 0) ? <EmptyState icon="💳" message="No payments recorded yet." /> : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Date</th><th>Amount Paid</th><th>Method</th><th>Reference</th></tr></thead>
                  <tbody>
                    {(Array.isArray(data) ? data : []).map(p => (
                      <tr key={p.payment_id}>
                        <td>{fmtDate(p.payment_date)}</td>
                        <td style={{ fontWeight:700, color:'var(--clr-success)' }}>{fmtMoney(p.amount_paid)}</td>
                        <td><span className="badge badge-paid">{p.payment_method}</span></td>
                        <td style={{ color:'var(--clr-muted)', fontSize:'0.85rem' }}>{p.transaction_ref || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )
        )}
      </div>
    </AppLayout>
  );
}

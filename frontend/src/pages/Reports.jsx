import { useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { Spinner, fmtMoney } from '../components/shared';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts';

export default function ReportsPage() {
  const [tab, setTab] = useState('monthly');
  const [monthly, setMonthly] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const loadMonthly = async () => {
    try {
      const { data } = await api.get('/reports/monthly', { params:{ year } });
      setMonthly(data.monthly.map(d => ({ ...d, total_billed: parseFloat(d.total_billed), collected: parseFloat(d.collected), outstanding: parseFloat(d.outstanding) })));
    } catch { toast.error('Failed to load monthly data.'); }
  };

  const loadDistricts = async () => {
    try {
      const { data } = await api.get('/reports/district');
      setDistricts(data.districts.map(d => ({ ...d, total_billed: parseFloat(d.total_billed), total_collected: parseFloat(d.total_collected), total_outstanding: parseFloat(d.total_outstanding) })));
    } catch { toast.error('Failed to load district data.'); }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadMonthly(), loadDistricts()]).finally(() => setLoading(false));
  }, [year]);

  const TABS = ['monthly','district'];
  const tooltipStyle = { background:'#111827', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#f1f5f9', fontSize:13 };

  return (
    <AppLayout>
      <div className="page-header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div><h1>Reports & Analytics</h1><p>Cross-DB billing insights and usage trends</p></div>
          <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ width:100 }}>
              {[2023,2024,2025,2026].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem' }}>
        {TABS.map(t => (
          <button key={t} className={`btn btn-sm ${tab===t ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)} Report
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <>
          {tab === 'monthly' && (
            <div className="card">
              <h2 style={{ fontFamily:'Outfit,sans-serif', fontWeight:700, marginBottom:'1.5rem' }}>Monthly Billing Trend – {year}</h2>
              {monthly.length === 0 ? (
                <div style={{ color:'var(--clr-muted)', textAlign:'center', padding:'3rem' }}>No billing data for {year}.</div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={monthly} margin={{ top:5, right:20, left:10, bottom:5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="month_name" tick={{ fill:'#94a3b8', fontSize:12 }} />
                    <YAxis tick={{ fill:'#94a3b8', fontSize:12 }} tickFormatter={v => `M${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={v => fmtMoney(v)} />
                    <Legend wrapperStyle={{ color:'#94a3b8', fontSize:12 }} />
                    <Bar dataKey="total_billed"  name="Billed"      fill="#3b82f6" radius={[4,4,0,0]} />
                    <Bar dataKey="collected"     name="Collected"   fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="outstanding"   name="Outstanding" fill="#ef4444" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {tab === 'district' && (
            <div className="card">
              <h2 style={{ fontFamily:'Outfit,sans-serif', fontWeight:700, marginBottom:'1.5rem' }}>District Performance</h2>
              {districts.length === 0 ? (
                <div style={{ color:'var(--clr-muted)', textAlign:'center', padding:'3rem' }}>No district data.</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={districts} layout="vertical" margin={{ top:5, right:20, left:80, bottom:5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                      <XAxis type="number" tick={{ fill:'#94a3b8', fontSize:12 }} tickFormatter={v => `M${(v/1000).toFixed(0)}k`} />
                      <YAxis dataKey="district" type="category" tick={{ fill:'#94a3b8', fontSize:12 }} width={80} />
                      <Tooltip contentStyle={tooltipStyle} formatter={v => fmtMoney(v)} />
                      <Legend wrapperStyle={{ color:'#94a3b8', fontSize:12 }} />
                      <Bar dataKey="total_billed"     name="Billed"      fill="#3b82f6" radius={[0,4,4,0]} />
                      <Bar dataKey="total_collected"  name="Collected"   fill="#10b981" radius={[0,4,4,0]} />
                      <Bar dataKey="total_outstanding" name="Outstanding" fill="#ef4444" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="table-wrapper" style={{ marginTop:'2rem' }}>
                    <table>
                      <thead><tr><th>District</th><th>Customers</th><th>Bills</th><th>Billed</th><th>Collected</th><th>Outstanding</th></tr></thead>
                      <tbody>
                        {districts.map(d => (
                          <tr key={d.district}>
                            <td style={{ fontWeight:600 }}>{d.district}</td>
                            <td>{d.total_customers}</td>
                            <td>{d.total_bills}</td>
                            <td>{fmtMoney(d.total_billed)}</td>
                            <td style={{ color:'var(--clr-success)' }}>{fmtMoney(d.total_collected)}</td>
                            <td style={{ color:'var(--clr-danger)', fontWeight:700 }}>{fmtMoney(d.total_outstanding)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}

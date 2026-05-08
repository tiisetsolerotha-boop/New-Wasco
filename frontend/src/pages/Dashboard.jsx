import { useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { StatCard, Spinner, fmtMoney } from '../components/shared';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Users, FileText, Droplets, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';

async function fetchCustomerDashboard() {
  const [bills, usage] = await Promise.all([
    api.get('/bills/my'),
    api.get('/usage/my'),
  ]);
  const b = bills.data.bills;
  const unpaid  = b.filter(x => x.payment_status !== 'Paid').reduce((s,x) => s + parseFloat(x.balance || 0), 0);
  const lastBill = b[0] || null;
  return { bills: b, totalUnpaid: unpaid, lastBill, usageCount: usage.data.usage.length };
}

async function fetchAdminDashboard() {
  const res = await api.get('/reports/dashboard');
  return res.data.kpis;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = ['admin','branch_manager'].includes(user?.role);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (isAdmin ? fetchAdminDashboard() : fetchCustomerDashboard())
      .then(setData).catch(console.error).finally(() => setLoading(false));
  }, [isAdmin]);

  return (
    <AppLayout>
      <div className="topbar">
        <div className="page-header" style={{ margin:0 }}>
          <h1>Dashboard</h1>
          <p className="topbar-greeting">Good evening, <strong>{user?.name?.split(' ')[0]}</strong> — {new Date().toDateString()}</p>
        </div>
        <span className={`role-badge role-${user?.role === 'branch_manager' ? 'manager' : user?.role}`}>
          {user?.role === 'branch_manager' ? 'Branch Manager' : user?.role}
        </span>
      </div>

      {loading ? <Spinner /> : isAdmin ? <AdminKPIs data={data} /> : <CustomerKPIs data={data} />}
    </AppLayout>
  );
}

function AdminKPIs({ data }) {
  if (!data) return null;
  return (
    <>
      <div className="grid-4" style={{ marginBottom:'1.5rem' }}>
        <StatCard icon={<Users size={22}/>} label="Total Customers" value={data.total_customers ?? '—'} colorClass="stat-blue" />
        <StatCard icon={<FileText size={22}/>} label="Total Bills" value={data.total_bills ?? '—'} colorClass="stat-cyan" />
        <StatCard icon={<DollarSign size={22}/>} label="Total Billed" value={fmtMoney(data.total_billed)} colorClass="stat-green" />
        <StatCard icon={<TrendingUp size={22}/>} label="Outstanding" value={fmtMoney(data.total_outstanding)} colorClass="stat-red" />
      </div>
      <div className="grid-3">
        <StatCard icon={<DollarSign size={22}/>} label="Collected" value={fmtMoney(data.total_collected)} colorClass="stat-green" />
        <StatCard icon={<Droplets size={22}/>} label="Total kL Distributed" value={`${parseFloat(data.total_units_distributed || 0).toFixed(0)} kL`} colorClass="stat-blue" />
        <StatCard icon={<AlertTriangle size={22}/>} label="Open Leakage Reports" value={data.open_leakage_reports ?? 0} colorClass="stat-red" />
      </div>
    </>
  );
}

function CustomerKPIs({ data }) {
  if (!data) return null;
  const last = data.lastBill;
  return (
    <>
      <div className="grid-3" style={{ marginBottom:'1.5rem' }}>
        <StatCard icon={<DollarSign size={22}/>} label="Outstanding Balance" value={fmtMoney(data.totalUnpaid)} colorClass="stat-red" />
        <StatCard icon={<FileText size={22}/>} label="Total Bills" value={data.bills.length} colorClass="stat-blue" />
        <StatCard icon={<Droplets size={22}/>} label="Usage Records" value={data.usageCount} colorClass="stat-cyan" />
      </div>
      {last && (
        <div className="card">
          <h2 style={{ fontFamily:'Outfit,sans-serif', fontWeight:700, marginBottom:'1rem' }}>Latest Bill</h2>
          <div className="grid-2">
            {[
              ['Billing Month', new Date(last.billing_month).toLocaleDateString('en-GB',{month:'long',year:'numeric'})],
              ['Units Consumed', `${last.units_consumed} kL`],
              ['Amount Due',     fmtMoney(last.total_amount)],
              ['Status',         last.payment_status],
            ].map(([k,v]) => (
              <div key={k}>
                <div style={{ color:'var(--clr-muted)', fontSize:'0.8rem', marginBottom:'0.2rem' }}>{k}</div>
                <div style={{ fontWeight:600 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

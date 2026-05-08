import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export const DISTRICTS = [
  'Maseru','Berea','Leribe','Butha-Buthe','Mafeteng',
  "Mohale's Hoek",'Quthing',"Qacha's Nek",'Mokhotlong','Thaba-Tseka'
];

export function fmtMoney(val) {
  return `M ${parseFloat(val || 0).toFixed(2)}`;
}

export function fmtDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

export function statusBadge(status) {
  const map = {
    Paid:'paid', Unpaid:'unpaid', Overdue:'overdue', Partial:'partial',
    Open:'open', Resolved:'resolved', 'In Progress':'progress', Closed:'paid',
  };
  return <span className={`badge badge-${map[status] || 'unpaid'}`}>{status}</span>;
}

export function Spinner() {
  return <div className="loading-center"><div className="spinner" /></div>;
}

export function EmptyState({ icon = '📭', message = 'No records found.' }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <p>{message}</p>
    </div>
  );
}

export function StatCard({ icon, label, value, colorClass = 'stat-blue' }) {
  return (
    <div className={`stat-card ${colorClass}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

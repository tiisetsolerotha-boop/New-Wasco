import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Spinner } from '../components/shared';

export default function PublicServices() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/billing-rates')
      .then(res => setRates(res.data.rates))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--clr-background)', padding: '2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--clr-surface)', padding: '2rem', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ color: 'var(--clr-primary)' }}>WASCO</h1>
            <p style={{ color: 'var(--clr-muted)' }}>Water and Sewerage Services</p>
          </div>
          <Link to="/login" className="btn btn-outline">Back to Login</Link>
        </div>

        <h2 style={{ marginBottom: '1rem', borderBottom: '2px solid var(--clr-border)', paddingBottom: '0.5rem' }}>Our Available Services</h2>
        <div className="grid-2" style={{ marginBottom: '2rem' }}>
          <div className="card" style={{ background: 'var(--clr-surface2)', padding: '1.5rem', borderRadius: 'var(--radius)' }}>
            <h3>🚰 Potable Water Supply</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--clr-muted)', marginTop: '0.5rem' }}>Reliable and treated drinking water supplied directly to residential and commercial properties.</p>
          </div>
          <div className="card" style={{ background: 'var(--clr-surface2)', padding: '1.5rem', borderRadius: 'var(--radius)' }}>
            <h3>🚽 Sewerage & Sanitation</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--clr-muted)', marginTop: '0.5rem' }}>Safe disposal and treatment of wastewater to protect public health and the environment.</p>
          </div>
          <div className="card" style={{ background: 'var(--clr-surface2)', padding: '1.5rem', borderRadius: 'var(--radius)' }}>
            <h3>🔍 Leakage Reporting</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--clr-muted)', marginTop: '0.5rem' }}>24/7 emergency response for reported burst pipes and water leakages across all districts.</p>
          </div>
          <div className="card" style={{ background: 'var(--clr-surface2)', padding: '1.5rem', borderRadius: 'var(--radius)' }}>
            <h3>📱 Online Bill Management</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--clr-muted)', marginTop: '0.5rem' }}>Track your usage, view statements, and pay your bills securely using our online portal.</p>
          </div>
        </div>

        <h2 style={{ marginBottom: '1rem', borderBottom: '2px solid var(--clr-border)', paddingBottom: '0.5rem' }}>Current Billing Rates</h2>
        {loading ? <Spinner /> : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--clr-surface2)' }}>
                <th style={{ padding: '0.8rem' }}>Tier Description</th>
                <th style={{ padding: '0.8rem' }}>Usage Range (kL)</th>
                <th style={{ padding: '0.8rem' }}>Cost per kL (M)</th>
              </tr>
            </thead>
            <tbody>
              {rates.length > 0 ? rates.map(r => (
                <tr key={r.rate_id} style={{ borderBottom: '1px solid var(--clr-border)' }}>
                  <td style={{ padding: '0.8rem', fontWeight: 500 }}>{r.description}</td>
                  <td style={{ padding: '0.8rem', color: 'var(--clr-muted)' }}>{r.min_units} - {r.max_units || '∞'}</td>
                  <td style={{ padding: '0.8rem', color: 'var(--clr-accent)', fontWeight: 700 }}>M {parseFloat(r.cost_per_unit).toFixed(2)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="3" style={{ padding: '1rem', textAlign: 'center', color: 'var(--clr-muted)' }}>
                    Rates are dynamically loaded from our secure database. Please login to view your specific tariff.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
          <p style={{ marginBottom: '1rem' }}>Ready to manage your account online?</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/login" className="btn btn-primary">Login to Portal</Link>
            <Link to="/register" className="btn btn-outline">Register Account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

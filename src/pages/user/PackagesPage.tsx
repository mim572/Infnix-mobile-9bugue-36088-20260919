import { useNavigate } from 'react-router-dom';

const PRODUCTS = [
  { id: '1', name: 'Starter Saver', amount: 20000, daily: 1000, days: 30, total: 30000 },
  { id: '2', name: 'Growth Plan', amount: 50000, daily: 3000, days: 30, total: 90000 },
  { id: '3', name: 'Super Saver', amount: 100000, daily: 7000, days: 30, total: 210000 },
  { id: '4', name: 'VIP Investor', amount: 200000, daily: 15000, days: 30, total: 450000 },
];

export default function PackagesPage() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: 80, color: 'white' }}>
      <div style={{ background: '#1a1a1a', padding: '16px 20px', borderBottom: '1px solid #333', position: 'sticky', top: 0 }}>
        <h1 style={{ fontSize: 18, fontWeight: 'bold' }}>Invest</h1>
        <p style={{ fontSize: 12, color: '#888' }}>Choose package to earn daily</p>
      </div>
      <div style={{ padding: 20, display: 'grid', gap: 16 }}>
        {PRODUCTS.map(p => (
          <div key={p.id} onClick={() => navigate('/buy', { state: { product: p } })} style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: 16 }}>
              <h3 style={{ fontWeight: 'bold' }}>{p.name}</h3>
              <p style={{ fontSize: 12, color: '#aaa' }}>{p.days} days • HOT</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '0 16px 16px', textAlign: 'center' as const }}>
              <div style={{ background: '#2a2a2a', borderRadius: 12, padding: 8 }}><div style={{ fontSize: 10, color: '#888' }}>Invest</div><div style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: 13 }}>{p.amount.toLocaleString()}</div></div>
              <div style={{ background: '#2a2a2a', borderRadius: 12, padding: 8 }}><div style={{ fontSize: 10, color: '#888' }}>Daily</div><div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: 13 }}>+{p.daily.toLocaleString()}</div></div>
              <div style={{ background: '#2a2a2a', borderRadius: 12, padding: 8 }}><div style={{ fontSize: 10, color: '#888' }}>Total</div><div style={{ color: '#facc15', fontWeight: 'bold', fontSize: 13 }}>{p.total.toLocaleString()}</div></div>
            </div>
            <div style={{ padding: '0 16px 16px' }}>
              <button style={{ width: '100%', background: '#2563eb', color: 'white', padding: 12, borderRadius: 12, fontWeight: 'bold', border: 'none' }}>Invest Now</button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1a1a1a', borderTop: '1px solid #333', display: 'flex', justifyContent: 'space-around', padding: '10px 0' }}>
        <span onClick={() => navigate('/home')} style={{ color: '#888' }}>Home</span>
        <span style={{ color: '#2563eb', fontWeight: 'bold' }}>Invest</span>
        <span onClick={() => navigate('/team')} style={{ color: '#888' }}>Team</span>
        <span onClick={() => navigate('/mine')} style={{ color: '#888' }}>Mine</span>
      </div>
    </div>
  );
}

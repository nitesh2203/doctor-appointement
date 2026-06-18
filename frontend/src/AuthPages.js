import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { Btn, Input } from './components';

function Panel({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'linear-gradient(135deg,#091830 0%,#0d2040 50%,#081525 100%)' }}>
      {/* Decorative left */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 48, borderRight: '1px solid rgba(0,180,166,0.15)', background: 'radial-gradient(ellipse at 30% 50%, rgba(0,180,166,0.08) 0%, transparent 70%)' }} className="auth-left">
        <div style={{ maxWidth: 380 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 40 }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🩺</div>
            <div><div style={{ fontFamily: 'DM Serif Display', fontSize: 30 }}>MediBook</div><div style={{ fontSize: 12, color: 'var(--text-light)' }}>Smart Healthcare Booking</div></div>
          </div>
          {[['🏥','Top Specialists','Access cardiologists, neurologists & more'],
            ['📅','Easy Scheduling','Book, reschedule, cancel in seconds'],
            ['⭐','Verified Doctors','Real ratings from real patients'],
            ['🔒','Secure & Private','Your health data is encrypted']].map(([icon, t, d]) => (
            <div key={t} style={{ display: 'flex', gap: 16, marginBottom: 22, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 22 }}>{icon}</span>
              <div><p style={{ fontWeight: 600, marginBottom: 2 }}>{t}</p><p style={{ fontSize: 13, color: 'var(--text-light)' }}>{d}</p></div>
            </div>
          ))}
        </div>
      </div>
      {/* Right form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ width: '100%', maxWidth: 430, background: 'rgba(21,42,74,0.9)', borderRadius: 20, border: '1px solid var(--border)', padding: 36, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', animation: 'fadeIn 0.35s ease' }}>
          {children}
        </div>
      </div>
      <style>{`@media(max-width:768px){.auth-left{display:none!important}}`}</style>
    </div>
  );
}

export function LoginPage({ onSwitch }) {
  const { login } = useApp();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const go = (e) => {
    e.preventDefault();
    if (!f.email || !f.password) { setErr('Please fill in all fields.'); return; }
    setLoading(true);
    (async () => {
      const r = await login(f.email, f.password);
      if (!r.success) setErr(r.error);
      setLoading(false);
    })();
  };

  return (
    <Panel>
      <h2 style={{ fontSize: 26, marginBottom: 4 }}>Welcome back</h2>
      <p style={{ color: 'var(--text-light)', fontSize: 13, marginBottom: 26 }}>Sign in to your MediBook account</p>
      {err && <div style={{ background: 'rgba(224,92,92,0.1)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 9, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--danger)' }}>{err}</div>}
      <form onSubmit={go}>
        <Input label="Email" type="email" placeholder="you@email.com" value={f.email} onChange={e => { setF(p=>({...p,email:e.target.value})); setErr(''); }} />
        <Input label="Password" type="password" placeholder="••••••••" value={f.password} onChange={e => { setF(p=>({...p,password:e.target.value})); setErr(''); }} />
        <Btn type="submit" disabled={loading} style={{ width:'100%', padding:'12px', marginTop:4, justifyContent:'center' }}>{loading ? 'Signing in…' : 'Sign In'}</Btn>
      </form>
      <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'var(--text-light)' }}>No account? <span onClick={onSwitch} style={{ color:'var(--teal)', cursor:'pointer', fontWeight:600 }}>Register here</span></p>
    </Panel>
  );
}

export function RegisterPage({ onSwitch }) {
  const { register } = useApp();
  const [f, setF] = useState({ name:'', email:'', phone:'', dob:'', gender:'', address:'', blood:'', allergies:'', medical_info:'', password:'', confirm:'' });
  const [errs, setErrs] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('registerDraft');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      setF(prev => ({ ...prev, ...parsed }));
    } catch (e) {
      console.warn('Unable to load registration draft', e);
    }
  }, []);

  useEffect(() => {
    const draft = {
      name: f.name,
      email: f.email,
      phone: f.phone,
      dob: f.dob,
      gender: f.gender,
      address: f.address,
      blood: f.blood,
      allergies: f.allergies,
      medical_info: f.medical_info,
    };
    localStorage.setItem('registerDraft', JSON.stringify(draft));
  }, [f.name, f.email, f.phone, f.dob, f.gender, f.address, f.blood, f.allergies, f.medical_info]);

  const validate = () => {
    const e = {};
    if (!f.name.trim()) e.name = 'Required';
    if (!f.email.includes('@')) e.email = 'Valid email required';
    const phoneDigits = f.phone.replace(/\D/g, '');
    if (!/^(?:91)?[6-9]\d{9}$/.test(phoneDigits)) {
      e.phone = 'Valid Indian phone required';
    }
    if (f.password.length < 6) e.password = 'Min 6 characters';
    if (f.password !== f.confirm) e.confirm = 'Passwords do not match';
    return e;
  };

  const go = (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrs(v); return; }
    setLoading(true);
    (async () => {
      const payload = { ...f, role: 'patient' };
      const r = await register(payload);
      if (!r.success) {
        setErrs({ email: r.error });
      } else {
        localStorage.removeItem('registerDraft');
      }
      setLoading(false);
    })();
  };

  const fld = k => ({ value: f[k], onChange: e => { setF(p=>({...p,[k]:e.target.value})); setErrs(p=>({...p,[k]:''})); }, error: errs[k] });

  return (
    <Panel>
      <h2 style={{ fontSize: 26, marginBottom: 4 }}>Create account</h2>
      <p style={{ color:'var(--text-light)', fontSize:13, marginBottom:22 }}>Join MediBook as a patient</p>
      <form onSubmit={go}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 14px' }}>
          <Input label="Full Name" placeholder="Rahul Sharma" {...fld('name')} />
          <Input label="Phone" type="tel" placeholder="9876543210" {...fld('phone')} />
        </div>
        <Input label="Email" type="email" placeholder="rahul@email.com" {...fld('email')} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 14px' }}>
          <Input label="Date of Birth" type="date" {...fld('dob')} />
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:12, color:'var(--text-light)', marginBottom:5, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.04em' }}>Gender</label>
            <select value={f.gender} onChange={e=>setF(p=>({...p,gender:e.target.value}))} style={{ width:'100%', padding:'10px 13px', background:'var(--surface)', border:'1.5px solid var(--surface-border)', borderRadius:9, color:'var(--surface-text)', fontSize:14, appearance:'none', WebkitAppearance:'none', MozAppearance:'none' }}>
              <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </div>
        </div>
        <Input label="Address" placeholder="123 Main street" value={f.address} onChange={e => setF(p => ({ ...p, address: e.target.value }))} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 14px' }}>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:12, color:'var(--text-light)', marginBottom:5, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.04em' }}>Blood Group</label>
            <select value={f.blood} onChange={e => setF(p => ({ ...p, blood: e.target.value }))} style={{ width:'100%', padding:'10px 13px', background:'var(--surface)', border:'1.5px solid var(--surface-border)', borderRadius:9, color:'var(--surface-text)', fontSize:14, appearance:'none', WebkitAppearance:'none', MozAppearance:'none' }}>
              <option value="">Select</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <Input label="Known Allergies" value={f.allergies} onChange={e => setF(p => ({ ...p, allergies: e.target.value }))} placeholder="e.g. Penicillin" />
        </div>
        <Input label="Medical History" textarea value={f.medical_info} onChange={e => setF(p => ({ ...p, medical_info: e.target.value }))} placeholder="e.g. Asthma, surgeries, etc." />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 14px' }}>
          <Input label="Password" type="password" placeholder="Min. 6 chars" {...fld('password')} />
          <Input label="Confirm Password" type="password" placeholder="Repeat" {...fld('confirm')} />
        </div>
        <Btn type="submit" disabled={loading} style={{ width:'100%', padding:'12px', marginTop:4, justifyContent:'center' }}>{loading ? 'Creating…' : 'Create Account'}</Btn>
      </form>
      <p style={{ textAlign:'center', marginTop:18, fontSize:13, color:'var(--text-light)' }}>Have an account? <span onClick={onSwitch} style={{ color:'var(--teal)', cursor:'pointer', fontWeight:600 }}>Sign in</span></p>
    </Panel>
  );
}

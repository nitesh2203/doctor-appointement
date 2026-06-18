import React, { useState } from 'react';
import { useApp } from './AppContext';
import { Avatar } from './components';

export default function Nav({ page, setPage }) {
  const { user, logout, theme, toggleTheme } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDoctor = user?.role === 'doctor';
  const isAdmin = user?.role === 'admin';

  const patientLinks = [
    { id: 'home',         icon: '🏠', label: 'Dashboard' },
    { id: 'booking',      icon: '📅', label: 'Book Appointment' },
    { id: 'appointments', icon: '📋', label: 'My Appointments' },
    { id: 'profile',      icon: '👤', label: 'Profile' },
  ];

  const doctorLinks = [
    { id: 'doctor-home',     icon: '🏠', label: 'Dashboard' },
    { id: 'doctor-schedule', icon: '📅', label: 'Schedule' },
    { id: 'doctor-requests', icon: '📬', label: 'Requests' },
    { id: 'doctor-profile',  icon: '👤', label: 'My Profile' },
  ];

  const adminLinks = [
    { id: 'admin', icon: '📊', label: 'Admin Dashboard' },
  ];

  const links = isAdmin ? adminLinks : isDoctor ? doctorLinks : patientLinks;

  const SideContent = () => (
    <>
      <div style={{ padding: '26px 20px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:'var(--teal)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🩺</div>
          <div>
            <div style={{ fontFamily:'DM Serif Display', fontSize:18, lineHeight:1 }}>MediBook</div>
            <div style={{ fontSize:11, color:'var(--text-light)' }}>{isDoctor ? 'Doctor Portal' : 'Patient Portal'}</div>
          </div>
        </div>
      </div>
      <nav style={{ padding:'14px 10px', flex:1 }}>
        {links.map(({ id, icon, label }) => (
          <button key={id} onClick={() => { setPage(id); setMobileOpen(false); }} style={{
            display:'flex', alignItems:'center', gap:12, width:'100%', padding:'11px 14px', borderRadius:10, marginBottom:3,
            background: page===id ? 'rgba(0,180,166,0.13)' : 'transparent',
            color: page===id ? 'var(--teal)' : 'var(--text-light)',
            fontWeight: page===id ? 600 : 400,
            border: page===id ? '1px solid rgba(0,180,166,0.25)' : '1px solid transparent',
            fontSize:14, cursor:'pointer', transition:'all 0.18s',
          }}><span style={{ fontSize:16 }}>{icon}</span>{label}</button>
        ))}
      </nav>
      <div style={{ padding:'14px 10px', borderTop:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', marginBottom:8 }}>
          <Avatar name={user?.name} size={34} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize:11, color:'var(--text-light)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{isDoctor ? 'Doctor' : isAdmin ? 'Admin' : 'Patient'}</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, width:'100%', padding:'12px 14px', borderRadius:9, background:'var(--surface)', border:'1px solid var(--surface-border)', marginBottom:10 }}>
          <span style={{ fontSize:13, color:'var(--surface-text)', fontWeight:500 }}>Theme</span>
          <label style={{ position:'relative', display:'inline-flex', alignItems:'center', width:44, height:24 }}>
            <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} style={{ position:'absolute', opacity:0, width:0, height:0 }} />
            <span style={{ position:'absolute', inset:0, borderRadius:9999, background: theme === 'dark' ? 'var(--teal)' : 'rgba(15,23,42,0.12)', transition:'background 0.2s' }} />
            <span style={{ position:'absolute', left: theme === 'dark' ? '20px' : '4px', top: '4px', width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
          </label>
        </div>
        <button onClick={logout} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'9px 14px', borderRadius:9, background:'rgba(224,92,92,0.08)', color:'var(--danger)', border:'1px solid rgba(224,92,92,0.18)', fontSize:13, cursor:'pointer' }}>
          🚪 Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside style={{ width:220, background:'var(--navy-mid)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', minHeight:'100vh', position:'fixed', left:0, top:0, bottom:0, zIndex:100 }} className="desk-nav">
        <SideContent />
      </aside>
      <header style={{ display:'none', position:'fixed', top:0, left:0, right:0, zIndex:200, background:'var(--navy-mid)', borderBottom:'1px solid var(--border)', padding:'12px 16px', alignItems:'center', justifyContent:'space-between' }} className="mob-nav">
        <span style={{ fontFamily:'DM Serif Display', fontSize:20 }}>🩺 MediBook</span>
        <button onClick={() => setMobileOpen(o=>!o)} style={{ background:'none', border:'none', color:'#fff', fontSize:22, cursor:'pointer' }}>{mobileOpen ? '✕' : '☰'}</button>
      </header>
      {mobileOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:150, background:'rgba(0,0,0,0.65)' }} onClick={() => setMobileOpen(false)}>
          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:250, background:'var(--navy-mid)', display:'flex', flexDirection:'column' }} onClick={e=>e.stopPropagation()}>
            <SideContent />
          </div>
        </div>
      )}
      <style>{`@media(max-width:768px){.desk-nav{display:none!important}.mob-nav{display:flex!important}}`}</style>
    </>
  );
}

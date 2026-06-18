import React from 'react';
import { useApp } from './AppContext';
import { Card, Btn, Avatar, StatusBadge } from './components';

function fmt(d) { return d ? new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : ''; }

export default function HomePage({ setPage }) {
  const { user, myAppointments, doctors } = useApp();

  const upcoming = myAppointments.filter(a=>['pending','accepted'].includes(a.status)).sort((a,b)=>a.date.localeCompare(b.date)||a.slot.localeCompare(b.slot));
  const recent   = [...myAppointments].sort((a,b)=>new Date(b.bookedAt)-new Date(a.bookedAt)).slice(0,3);

  const stats = [
    { label:'Total Booked',  val:myAppointments.length,                                      icon:'📋', color:'var(--teal)' },
    { label:'Upcoming',      val:upcoming.length,                                             icon:'📅', color:'var(--gold)' },
    { label:'Completed',     val:myAppointments.filter(a=>a.status==='completed').length,     icon:'✔',  color:'var(--success)' },
    { label:'Cancelled',     val:myAppointments.filter(a=>a.status==='cancelled').length,     icon:'✕',  color:'var(--danger)' },
  ];

  const hour = new Date().getHours();
  const greeting = hour<12?'Good morning':'hour<17'?'Good afternoon':'Good evening';

  return (
    <div style={{ padding:'28px 32px', animation:'fadeIn 0.35s ease' }}>
      <div style={{ marginBottom:28 }}>
        <p style={{ color:'var(--text-light)', fontSize:13 }}>{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
        <h1 style={{ fontSize:28 }}>{hour<12?'Good morning':hour<17?'Good afternoon':'Good evening'}, {user?.name?.split(' ')[0]} 👋</h1>
        <p style={{ color:'var(--text-light)', marginTop:4 }}>Manage your healthcare appointments easily.</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:14, marginBottom:28 }}>
        {stats.map(s => (
          <Card key={s.label} style={{ padding:18, textAlign:'center' }}>
            <div style={{ fontSize:26, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.val}</div>
            <div style={{ fontSize:12, color:'var(--text-light)' }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:20 }}>
        {/* Upcoming */}
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <h3 style={{ fontSize:16 }}>Upcoming</h3>
            <button onClick={()=>setPage('appointments')} style={{ background:'none', border:'none', color:'var(--teal)', fontSize:12, cursor:'pointer' }}>View all →</button>
          </div>
          {upcoming.length===0
            ? <p style={{ color:'var(--text-light)', fontSize:13 }}>No upcoming appointments.</p>
            : upcoming.slice(0,4).map(a => (
              <div key={a.id} style={{ display:'flex', gap:12, alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ textAlign:'center', minWidth:40 }}>
                  <p style={{ fontSize:15, fontWeight:700, color:'var(--teal)' }}>{fmt(a.date)}</p>
                  <p style={{ fontSize:11, color:'var(--text-light)' }}>{a.slot}</p>
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:600, fontSize:13 }}>{a.doctorName}</p>
                  <p style={{ fontSize:11, color:'var(--text-light)' }}>{a.doctorSpecialty}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))
          }
        </Card>

        {/* Quick actions */}
        <Card>
          <h3 style={{ fontSize:16, marginBottom:16 }}>Quick Actions</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <Btn onClick={()=>setPage('booking')} style={{ width:'100%', justifyContent:'center', padding:13 }}>📅 Book an Appointment</Btn>
            <Btn variant="outline" onClick={()=>setPage('appointments')} style={{ width:'100%', justifyContent:'center', padding:13 }}>📋 My Appointments</Btn>
            <Btn variant="ghost" onClick={()=>setPage('profile')} style={{ width:'100%', justifyContent:'center', padding:13 }}>👤 Edit Profile</Btn>
          </div>
          <div style={{ marginTop:16, padding:12, background:'rgba(0,180,166,0.07)', borderRadius:10, border:'1px solid rgba(0,180,166,0.18)' }}>
            <p style={{ fontSize:12, color:'var(--text-light)', lineHeight:1.6 }}>💡 <strong style={{ color:'var(--white)' }}>Tip:</strong> After your appointment is completed, you can rate your doctor and share your experience!</p>
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      {recent.length > 0 && (
        <Card>
          <h3 style={{ fontSize:16, marginBottom:14 }}>Recent Activity</h3>
          {recent.map(a => (
            <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                <Avatar name={a.doctorName} size={40} />
                <div>
                  <p style={{ fontWeight:600, fontSize:14 }}>{a.doctorName}</p>
                  <p style={{ fontSize:12, color:'var(--text-light)' }}>{a.doctorSpecialty} · {fmt(a.date)} {a.slot}</p>
                </div>
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

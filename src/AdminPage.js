import React, { useState } from 'react';
import { useApp } from './AppContext';
import { Card, Btn, Input, Divider, StatusBadge, StarRating } from './components';


const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const metrics = [
  { label: 'Total Patients', value: '0', key: 'patients' },
  { label: 'Total Doctors', value: '0', key: 'doctors' },
  { label: 'Appointments Today', value: '0', key: 'today' },
  { label: 'Pending Requests', value: '0', key: 'pending' },
];

export default function AdminPage() {
  const { doctors, appointments, patients, user } = useApp();
  const [search, setSearch] = useState('');
  const [remindSent, setRemindSent] = useState({});

  const filteredPatients = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const todaysDate = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.date === todaysDate).length;
  const pendingAppointments = appointments.filter(a => a.status === 'pending');
  const pendingCount = pendingAppointments.length;

  const handleRemindDoctor = async (appt) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`${BACKEND_URL}/api/appointments/${appt.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ doctor_note: 'Admin reminder: Please review this pending booking.' }),
      });
      setRemindSent(prev => ({ ...prev, [appt.id]: true }));
    } catch (e) {
      console.error('Failed to remind doctor', e);
    }
  };

  const doctorInsights = doctors.map(d => {
    const doctorAppointments = appointments.filter(a => a.doctorId === d.id);
    const ratingCount = d.ratingCount || 0;
    const avgRating = ratingCount ? (d.ratingSum / ratingCount).toFixed(1) : 'N/A';
    return {
      id: d.id,
      name: d.name,
      specialty: d.specialty,
      booked: doctorAppointments.length,
      rating: avgRating,
      reviews: doctorAppointments.filter(a => a.rating).length,
    };
  });

  return (
    <div style={{ padding: '28px 32px', animation:'fadeIn 0.35s ease', maxWidth:1200 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:28, marginBottom:6 }}>Admin Dashboard</h1>
          <p style={{ color:'var(--text-light)', fontSize:14 }}>Manage patients, review doctor demand, and monitor ratings & reviews.</p>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:16, marginBottom:20 }}>
        <Card style={{ background:'var(--surface)', border:'1px solid var(--surface-border)', padding:'20px' }}>
          <div style={{ fontSize:12, color:'var(--text-light)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Total Patients</div>
          <div style={{ fontSize:28, fontWeight:700 }}>{patients.length}</div>
        </Card>
        <Card style={{ background:'var(--surface)', border:'1px solid var(--surface-border)', padding:'20px' }}>
          <div style={{ fontSize:12, color:'var(--text-light)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Total Doctors</div>
          <div style={{ fontSize:28, fontWeight:700 }}>{doctors.length}</div>
        </Card>
        <Card style={{ background:'var(--surface)', border:'1px solid var(--surface-border)', padding:'20px' }}>
          <div style={{ fontSize:12, color:'var(--text-light)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Appointments Today</div>
          <div style={{ fontSize:28, fontWeight:700 }}>{todayAppointments}</div>
        </Card>
        <Card style={{ background:'var(--surface)', border:'1px solid var(--surface-border)', padding:'20px' }}>
          <div style={{ fontSize:12, color:'var(--text-light)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Pending Appointments</div>
          <div style={{ fontSize:28, fontWeight:700 }}>{pendingCount}</div>
        </Card>
      </div>

      {pendingCount > 0 && (
        <Card style={{ background:'var(--surface)', border:'1px solid var(--surface-border)', padding:'20px', marginBottom:20 }}>
          <h2 style={{ fontSize:18, marginBottom:4 }}>Pending Bookings</h2>
          <p style={{ color:'var(--text-light)', fontSize:13, marginBottom:14 }}>{pendingCount} appointment{pendingCount !== 1 ? 's' : ''} awaiting doctor approval.</p>
          <div style={{ display:'grid', gap:12 }}>
            {pendingAppointments.map(appt => (
              <div key={appt.id} style={{ padding:'14px 16px', borderRadius:12, background:'var(--card-bg)', border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:14 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                      <span style={{ fontSize:15, fontWeight:600 }}>{appt.patientName || 'Unknown Patient'}</span>
                      <StatusBadge status="pending" />
                    </div>
                    <div style={{ fontSize:13, color:'var(--text-light)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 16px' }}>
                      <span>Doctor: <strong style={{ color:'var(--white)' }}>{appt.doctorName || 'Unknown'}</strong></span>
                      <span>Specialty: <strong style={{ color:'var(--white)' }}>{appt.doctorSpecialty || '—'}</strong></span>
                      <span>Date: <strong style={{ color:'var(--white)' }}>{appt.date || '—'}</strong></span>
                      <span>Time: <strong style={{ color:'var(--white)' }}>{appt.slot || '—'}</strong></span>
                      {appt.reason && <span style={{ gridColumn:'1/-1' }}>Reason: <strong style={{ color:'var(--white)' }}>{appt.reason}</strong></span>}
                      {appt.patientPhone && <span>Phone: <strong style={{ color:'var(--white)' }}>{appt.patientPhone}</strong></span>}
                    </div>
                  </div>
                  <Btn
                    variant={remindSent[appt.id] ? 'success' : 'outline'}
                    small
                    disabled={!!remindSent[appt.id]}
                    onClick={() => handleRemindDoctor(appt)}
                  >
                    {remindSent[appt.id] ? '✓ Reminded' : '🔔 Remind Doctor'}
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:20 }}>
        <Card style={{ background:'var(--surface)', border:'1px solid var(--surface-border)', padding:'20px' }}>
          <div style={{ marginBottom:14 }}>
            <div>
              <h2 style={{ fontSize:18, marginBottom:4 }}>Doctor Demand</h2>
              <p style={{ color:'var(--text-light)', fontSize:13 }}>Most requested specialties and booked slots.</p>
            </div>
          </div>
          <div style={{ display:'grid', gap:14 }}>
            {doctorInsights.map(doc => (
              <div key={doc.id} style={{ padding:'14px 16px', borderRadius:12, background:'var(--card-bg)', border:'1px solid var(--border)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:14, alignItems:'center' }}>
                  <div>
                    <h3 style={{ fontSize:15, marginBottom:4 }}>{doc.name}</h3>
                    <div style={{ fontSize:13, color:'var(--text-light)' }}>{doc.specialty}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:18, fontWeight:700 }}>{doc.booked}</div>
                    <div style={{ fontSize:12, color:'var(--text-light)' }}>Booked</div>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, marginTop:12 }}>
                  <div style={{ fontSize:13, color:'var(--text-light)' }}>Reviews: {doc.reviews}</div>
                  <div style={{ fontSize:13, color:'var(--text-light)' }}>Rating: {doc.rating}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ background:'var(--surface)', border:'1px solid var(--surface-border)', padding:'20px', minWidth:0 }}>
          <h2 style={{ fontSize:18, marginBottom:10 }}>Patient Search</h2>
          <Input label="Search patients" placeholder="Type patient name" value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ maxHeight:660, overflowY:'auto', marginTop:10 }}>
            {filteredPatients.map(patient => (
              <div key={patient.id} style={{ padding:'12px 14px', borderRadius:10, background:'var(--card-bg)', border:'1px solid var(--border)', marginBottom:10, minWidth:0, overflow:'hidden' }}>
                <div style={{ fontSize:14, fontWeight:600, whiteSpace:'normal', wordBreak:'break-word', overflowWrap:'break-word' }}>{patient.name}</div>
                <div style={{ fontSize:12, color:'var(--text-light)' }}>Patient ID: {patient.id}</div>
              </div>
            ))}
            {!filteredPatients.length && <div style={{ padding:'18px', color:'var(--text-light)' }}>No patients found.</div>}
          </div>
        </Card>
      </div>

      <Divider label="Top Doctor Reviews" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:16 }}>
        {doctors.slice(0, 3).map(doc => (
          <Card key={doc.id} style={{ background:'var(--surface)', border:'1px solid var(--surface-border)', padding:'20px' }}>
            <h3 style={{ fontSize:16, marginBottom:10 }}>{doc.name}</h3>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <span style={{ fontSize:12, color:'var(--text-light)' }}>Rating</span>
              <strong style={{ fontSize:18 }}>{doc.ratingCount ? (doc.ratingSum / doc.ratingCount).toFixed(1) : 'N/A'}</strong>
            </div>
            <StarRating value={doc.ratingCount ? Math.round(doc.ratingSum / doc.ratingCount) : 0} size={18} />
            <p style={{ color:'var(--text-light)', marginTop:14, fontSize:13 }}>Total reviews: {doc.ratingCount || 0}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

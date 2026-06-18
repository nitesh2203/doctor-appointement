import React, { useState } from 'react';
import { useApp } from './AppContext';
import { Card, Btn, Avatar, StatusBadge, Modal, StarRating, Toast, EmptyState } from './components';

function fmt(d) { return d ? new Date(d+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'}) : ''; }
function today() { return new Date().toISOString().split('T')[0]; }

/* ═══════════════════════════════════ DOCTOR HOME ═══════════════════════════ */
export function DoctorHome({ setPage }) {
  const { doctorAppointments, myDoctorProfile } = useApp();
  const doc = myDoctorProfile;
  const all  = doctorAppointments;
  const pending   = all.filter(a=>a.status==='pending');
  const accepted  = all.filter(a=>a.status==='accepted');
  const completed = all.filter(a=>a.status==='completed');
  const todayAppts = all.filter(a=>a.date===today() && ['accepted','pending'].includes(a.status));
  const rating = doc && doc.ratingCount ? (doc.ratingSum/doc.ratingCount).toFixed(1) : '—';

  const stats = [
    { label:'Pending',   val:pending.length,   icon:'⏳', color:'var(--gold)',    page:'doctor-requests' },
    { label:'Accepted',  val:accepted.length,  icon:'✓',  color:'var(--success)', page:'doctor-schedule' },
    { label:'Completed', val:completed.length, icon:'✔',  color:'#4ab3f4',        page:'doctor-schedule' },
    { label:'Rating',    val:rating,           icon:'⭐', color:'var(--gold)',    page:'doctor-profile'  },
  ];

  return (
    <div style={{ padding:'28px 32px', animation:'fadeIn 0.35s ease' }}>
      {doc && (
        <Card style={{ marginBottom:28, display:'flex', gap:18, alignItems:'center', background:'linear-gradient(135deg,rgba(0,180,166,0.1) 0%,var(--card-bg) 100%)', flexWrap:'wrap' }}>
          <Avatar name={doc.name} size={60} />
          <div style={{ flex:1 }}>
            <h2 style={{ fontSize:22, marginBottom:2 }}>{doc.name}</h2>
            <p style={{ color:'var(--teal)', fontWeight:600 }}>{doc.specialty}</p>
            <p style={{ fontSize:13, color:'var(--text-light)' }}>{doc.hospital} · {doc.qualification}</p>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:13, color:'var(--text-light)' }}>Consultation Fee</p>
            <p style={{ fontSize:24, fontWeight:700, color:'var(--gold)' }}>₹{doc.fee}</p>
          </div>
        </Card>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:14, marginBottom:28 }}>
        {stats.map(s => (
          <Card key={s.label} onClick={() => setPage(s.page)} style={{ cursor:'pointer', textAlign:'center', padding:18, transition:'transform 0.2s' }}
            onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
            onMouseLeave={e=>e.currentTarget.style.transform='none'}>
            <div style={{ fontSize:28, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontSize:28, fontWeight:800, color:s.color, marginBottom:2 }}>{s.val}</div>
            <div style={{ fontSize:12, color:'var(--text-light)' }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, flexWrap:'wrap' }}>
        <Card>
          <h3 style={{ fontSize:16, marginBottom:14 }}>Today's Schedule ({todayAppts.length})</h3>
          {todayAppts.length === 0
            ? <p style={{ color:'var(--text-light)', fontSize:13 }}>No appointments scheduled for today.</p>
            : todayAppts.sort((a,b)=>a.slot.localeCompare(b.slot)).map(a => (
              <div key={a.id} style={{ display:'flex', gap:12, alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ fontSize:13, color:'var(--teal)', fontWeight:700, minWidth:44 }}>{a.slot}</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:600, fontSize:14 }}>{a.patientName}</p>
                  <p style={{ fontSize:12, color:'var(--text-light)' }}>{a.reason}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))
          }
        </Card>

        <Card>
          <h3 style={{ fontSize:16, marginBottom:14 }}>⏳ Pending Requests ({pending.length})</h3>
          {pending.length === 0
            ? <p style={{ color:'var(--text-light)', fontSize:13 }}>No pending requests.</p>
            : pending.slice(0,4).map(a => (
              <div key={a.id} style={{ padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                  <p style={{ fontWeight:600, fontSize:14 }}>{a.patientName}</p>
                  <span style={{ fontSize:12, color:'var(--text-light)' }}>{fmt(a.date)}</span>
                </div>
                <p style={{ fontSize:12, color:'var(--text-light)' }}>🕐 {a.slot} · {a.reason}</p>
              </div>
            ))
          }
          {pending.length > 4 && <Btn small variant="outline" onClick={()=>setPage('doctor-requests')} style={{ marginTop:10 }}>View all {pending.length}</Btn>}
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════ REQUESTS ═══════════════════════════════ */
export function DoctorRequests() {
  const { doctorAppointments, acceptAppointment, rejectAppointment, completeAppointment } = useApp();
  const [filter, setFilter]     = useState('pending');
  const [actionModal, setActionModal] = useState(null); // {appt, type:'accept'|'reject'|'complete'}
  const [note, setNote]         = useState('');
  const [toast, setToast]       = useState(null);
  const [detailModal, setDetailModal] = useState(null);

  const tabs = [
    { id:'pending',   label:'Pending',   emoji:'⏳' },
    { id:'accepted',  label:'Accepted',  emoji:'✓'  },
    { id:'completed', label:'Completed', emoji:'✔'  },
    { id:'rejected',  label:'Rejected',  emoji:'✕'  },
    { id:'cancelled', label:'Cancelled', emoji:'—'  },
  ];

  const list = filter==='all' ? doctorAppointments : doctorAppointments.filter(a=>a.status===filter);
  const sorted = [...list].sort((a,b)=>a.date.localeCompare(b.date)||a.slot.localeCompare(b.slot));

  const doAction = async () => {
    const { appt, type } = actionModal;
    if (type === 'accept') {
      await acceptAppointment(appt.id, note);
      setToast({ msg:'Appointment accepted ✓', type:'success' });
    }
    if (type === 'reject') {
      await rejectAppointment(appt.id, note);
      setToast({ msg:'Appointment rejected', type:'error' });
    }
    if (type === 'complete') {
      await completeAppointment(appt.id, note);
      setToast({ msg:'Marked as completed ✔', type:'success' });
    }
    setActionModal(null); setNote('');
  };

  const actionLabels = { accept:{label:'Accept',variant:'success',emoji:'✓'}, reject:{label:'Reject',variant:'danger',emoji:'✕'}, complete:{label:'Mark Complete',variant:'primary',emoji:'✔'} };

  return (
    <div style={{ padding:'28px 32px', animation:'fadeIn 0.35s ease' }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
      <h1 style={{ fontSize:27, marginBottom:4 }}>📬 Appointment Requests</h1>
      <p style={{ color:'var(--text-light)', marginBottom:22 }}>Review and manage patient appointment requests</p>

      <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
        {tabs.map(t => {
          const cnt = doctorAppointments.filter(a=>a.status===t.id).length;
          return (
            <button key={t.id} onClick={()=>setFilter(t.id)} style={{
              padding:'8px 16px', borderRadius:9, fontSize:13, cursor:'pointer', fontWeight:filter===t.id?600:400,
              background:filter===t.id?'var(--teal)':'var(--card-bg)',
              color:filter===t.id?'var(--navy)':'var(--text-light)',
              border:`1px solid ${filter===t.id?'var(--teal)':'var(--border)'}`,
            }}>{t.emoji} {t.label} {cnt>0 && <span style={{ marginLeft:4, background:'rgba(0,0,0,0.15)', padding:'1px 7px', borderRadius:20, fontSize:11 }}>{cnt}</span>}</button>
          );
        })}
      </div>

      {sorted.length === 0
        ? <EmptyState icon="📭" title="No appointments" sub={`No ${filter} appointments.`} />
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {sorted.map(appt => (
              <Card key={appt.id}>
                <div style={{ display:'flex', gap:16, alignItems:'flex-start', flexWrap:'wrap' }}>
                  <Avatar name={appt.patientName} size={48} />
                  <div style={{ flex:1, minWidth:200 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:6 }}>
                      <div>
                        <p style={{ fontWeight:700, fontSize:15 }}>{appt.patientName}</p>
                        {appt.patientPhone && <p style={{ fontSize:12, color:'var(--text-light)' }}>📞 {appt.patientPhone}</p>}
                      </div>
                      <StatusBadge status={appt.status} />
                    </div>
                    <div style={{ display:'flex', gap:20, flexWrap:'wrap', marginBottom:8 }}>
                      <span style={{ fontSize:13, color:'var(--text-light)' }}>📅 {fmt(appt.date)}</span>
                      <span style={{ fontSize:13, color:'var(--text-light)' }}>🕐 {appt.slot}</span>
                    </div>
                    {appt.reason && <p style={{ fontSize:13, marginBottom:4 }}>📝 <em>{appt.reason}</em></p>}
                    {appt.symptoms && <p style={{ fontSize:12, color:'var(--text-light)', marginBottom:8 }}>Symptoms: {appt.symptoms}</p>}
                    {appt.doctorNote && <p style={{ fontSize:12, color:'#4ab3f4', background:'rgba(74,179,244,0.08)', padding:'6px 10px', borderRadius:7, marginBottom:8 }}>Your note: {appt.doctorNote}</p>}
                    {appt.rating && (
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                        <StarRating value={appt.rating} size={15} />
                        <span style={{ fontSize:12, color:'var(--text-light)' }}>{appt.review || 'No review'}</span>
                      </div>
                    )}
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
                      <Btn small variant="ghost" onClick={()=>setDetailModal(appt)}>Details</Btn>
                      {appt.status==='pending'  && <Btn small variant="success" onClick={()=>{setActionModal({appt,type:'accept'});setNote('')}}>✓ Accept</Btn>}
                      {appt.status==='pending'  && <Btn small variant="danger"  onClick={()=>{setActionModal({appt,type:'reject'});setNote('')}}>✕ Reject</Btn>}
                      {appt.status==='accepted' && <Btn small variant="primary" onClick={()=>{setActionModal({appt,type:'complete'});setNote('')}}>✔ Mark Complete</Btn>}
                      {appt.status==='accepted' && <Btn small variant="danger"  onClick={()=>{setActionModal({appt,type:'reject'});setNote('')}}>✕ Reject</Btn>}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      }

      {/* Action Modal */}
      <Modal isOpen={!!actionModal} onClose={()=>setActionModal(null)} title={actionModal ? `${actionLabels[actionModal.type]?.emoji} ${actionLabels[actionModal.type]?.label} Appointment` : ''}>
        {actionModal && (
          <div>
            <Card style={{ marginBottom:16, padding:16 }}>
              <p style={{ fontWeight:700 }}>{actionModal.appt.patientName}</p>
              <p style={{ fontSize:13, color:'var(--teal)' }}>📅 {fmt(actionModal.appt.date)} · 🕐 {actionModal.appt.slot}</p>
              <p style={{ fontSize:13, color:'var(--text-light)', marginTop:4 }}>📝 {actionModal.appt.reason}</p>
            </Card>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:12, color:'var(--text-light)', marginBottom:6, fontWeight:500, textTransform:'uppercase' }}>
                {actionModal.type==='complete' ? 'Prescription / Notes (optional)' : 'Note to patient (optional)'}
              </label>
              <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3}
                placeholder={actionModal.type==='reject' ? 'e.g. Slot unavailable, please reschedule…' : actionModal.type==='complete' ? 'e.g. Prescribed antibiotics, follow up in 7 days…' : 'e.g. Please arrive 10 mins early…'}
                style={{ width:'100%', padding:'10px 13px', background:'rgba(255,255,255,0.05)', border:'1.5px solid rgba(255,255,255,0.12)', borderRadius:9, color:'#fff', fontSize:14, resize:'vertical' }} />
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <Btn variant="ghost" onClick={()=>setActionModal(null)}>Cancel</Btn>
              <Btn variant={actionLabels[actionModal.type]?.variant} onClick={doAction}>
                {actionLabels[actionModal.type]?.emoji} {actionLabels[actionModal.type]?.label}
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!detailModal} onClose={()=>setDetailModal(null)} title="Patient Details">
        {detailModal && (
          <div>
            {[['Patient',  detailModal.patientName],
              ['Phone',    detailModal.patientPhone||'—'],
              ['Date',     fmt(detailModal.date)],
              ['Time',     detailModal.slot],
              ['Reason',   detailModal.reason],
              ['Symptoms', detailModal.symptoms||'—'],
              ['Status',   detailModal.status],
              ['Booked',   new Date(detailModal.bookedAt).toLocaleString('en-IN')],
            ].map(([k,v])=>(
              <div key={k} style={{ display:'flex', gap:12, padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ width:90, fontSize:13, color:'var(--text-light)', flexShrink:0 }}>{k}</span>
                <span style={{ fontSize:13, fontWeight:500 }}>{v}</span>
              </div>
            ))}
            {detailModal.rating && (
              <div style={{ marginTop:14 }}>
                <p style={{ fontSize:13, color:'var(--text-light)', marginBottom:6 }}>Patient rating:</p>
                <StarRating value={detailModal.rating} size={22} />
                {detailModal.review && <p style={{ fontSize:13, marginTop:6, fontStyle:'italic', color:'var(--text-light)' }}>"{detailModal.review}"</p>}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════ SCHEDULE ═══════════════════════════════ */
export function DoctorSchedule() {
  const { doctorAppointments, acceptAppointment, rejectAppointment, completeAppointment } = useApp();
  const [selDate, setSelDate] = useState(today());
  const [toast, setToast] = useState(null);

  // Build date list with appointment counts
  const dateMap = {};
  doctorAppointments.forEach(a => {
    if (!dateMap[a.date]) dateMap[a.date] = [];
    dateMap[a.date].push(a);
  });
  const allDates = Object.keys(dateMap).sort();

  const dayAppts = (doctorAppointments.filter(a=>a.date===selDate)).sort((a,b)=>a.slot.localeCompare(b.slot));

  // Generate next 14 days for calendar
  const calDays = Array.from({length:21}, (_,i)=>{
    const d = new Date(); d.setDate(d.getDate()+i-3);
    return d.toISOString().split('T')[0];
  });

  return (
    <div style={{ padding:'28px 32px', animation:'fadeIn 0.35s ease' }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
      <h1 style={{ fontSize:27, marginBottom:4 }}>📅 My Schedule</h1>
      <p style={{ color:'var(--text-light)', marginBottom:24 }}>View and manage your daily appointments</p>

      {/* Mini calendar strip */}
      <div style={{ display:'flex', gap:8, marginBottom:28, overflowX:'auto', paddingBottom:8 }}>
        {calDays.map(d => {
          const dt = new Date(d+'T00:00:00');
          const cnt = (dateMap[d]||[]).filter(a=>['pending','accepted'].includes(a.status)).length;
          const isToday = d===today();
          const isSel = d===selDate;
          return (
            <button key={d} onClick={()=>setSelDate(d)} style={{
              minWidth:62, padding:'10px 8px', borderRadius:11, cursor:'pointer', textAlign:'center', flexShrink:0,
              background: isSel ? 'var(--teal)' : isToday ? 'rgba(0,180,166,0.1)' : 'var(--card-bg)',
              border: `1.5px solid ${isSel ? 'var(--teal)' : isToday ? 'rgba(0,180,166,0.4)' : 'var(--border)'}`,
              color: isSel ? 'var(--navy)' : '#fff',
            }}>
              <div style={{ fontSize:11, marginBottom:2, opacity:0.8 }}>{dt.toLocaleDateString('en-IN',{weekday:'short'})}</div>
              <div style={{ fontSize:18, fontWeight:700 }}>{dt.getDate()}</div>
              <div style={{ fontSize:10, opacity:0.7 }}>{dt.toLocaleDateString('en-IN',{month:'short'})}</div>
              {cnt>0 && <div style={{ marginTop:4, width:18, height:18, borderRadius:'50%', background: isSel?'rgba(0,0,0,0.2)':'var(--teal)', color: isSel?'var(--navy)':'var(--navy)', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', margin:'4px auto 0' }}>{cnt}</div>}
            </button>
          );
        })}
      </div>

      <h3 style={{ fontSize:16, marginBottom:16 }}>
        {new Date(selDate+'T00:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
        <span style={{ fontSize:14, color:'var(--text-light)', marginLeft:10 }}>({dayAppts.length} appointments)</span>
      </h3>

      {dayAppts.length === 0
        ? <EmptyState icon="🗓" title="No appointments" sub="No appointments scheduled for this day." />
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {dayAppts.map(a => (
              <Card key={a.id} style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
                <div style={{ background:'rgba(0,180,166,0.1)', borderRadius:10, padding:'10px 14px', textAlign:'center', minWidth:60 }}>
                  <p style={{ fontSize:15, fontWeight:700, color:'var(--teal)' }}>{a.slot}</p>
                </div>
                <Avatar name={a.patientName} size={42} />
                <div style={{ flex:1, minWidth:160 }}>
                  <p style={{ fontWeight:700 }}>{a.patientName}</p>
                  <p style={{ fontSize:13, color:'var(--text-light)' }}>{a.reason}</p>
                </div>
                <StatusBadge status={a.status} />
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {a.status==='pending'  && <Btn small variant="success" onClick={()=>{acceptAppointment(a.id);setToast({msg:'Accepted ✓',type:'success'})}}>Accept</Btn>}
                  {a.status==='pending'  && <Btn small variant="danger"  onClick={()=>{rejectAppointment(a.id);setToast({msg:'Rejected',type:'error'})}}>Reject</Btn>}
                  {a.status==='accepted' && <Btn small variant="primary" onClick={()=>{completeAppointment(a.id);setToast({msg:'Marked complete ✔',type:'success'})}}>Complete</Btn>}
                </div>
              </Card>
            ))}
          </div>
        )
      }
    </div>
  );
}

/* ═══════════════════════════════════ DOCTOR PROFILE ═══════════════════════ */
export function DoctorProfilePage() {
  const { myDoctorProfile, doctorAppointments, user } = useApp();
  const doc = myDoctorProfile;
  const rating = doc && doc.ratingCount ? (doc.ratingSum/doc.ratingCount).toFixed(1) : '—';
  const reviews = doctorAppointments.filter(a=>a.rating);

  if (!doc) return <div style={{ padding:32, color:'var(--text-light)' }}>Doctor profile not found.</div>;

  return (
    <div style={{ padding:'28px 32px', animation:'fadeIn 0.35s ease', maxWidth:780 }}>
      <h1 style={{ fontSize:27, marginBottom:24 }}>👤 My Profile</h1>

      <Card style={{ marginBottom:20 }}>
        <div style={{ display:'flex', gap:20, alignItems:'center', flexWrap:'wrap' }}>
          <Avatar name={doc.name} size={70} />
          <div style={{ flex:1 }}>
            <h2 style={{ fontSize:22 }}>{doc.name}</h2>
            <p style={{ color:'var(--teal)', fontWeight:600, marginBottom:2 }}>{doc.specialty}</p>
            <p style={{ fontSize:13, color:'var(--text-light)' }}>{doc.qualification}</p>
            <p style={{ fontSize:13, color:'var(--text-light)' }}>🏥 {doc.hospital} · {doc.experience} experience</p>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:36, fontWeight:800, color:'var(--gold)' }}>{rating}</div>
            <StarRating value={Math.round(doc.ratingSum/(doc.ratingCount||1))} size={18} />
            <div style={{ fontSize:12, color:'var(--text-light)', marginTop:4 }}>{doc.ratingCount} ratings</div>
          </div>
        </div>
      </Card>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
        {[['Email', user.email], ['Specialty', doc.specialty], ['Hospital', doc.hospital], ['Experience', doc.experience], ['Consultation Fee', `₹${doc.fee}`], ['Qualification', doc.qualification]].map(([k,v])=>(
          <Card key={k} style={{ padding:'14px 18px' }}>
            <p style={{ fontSize:12, color:'var(--text-light)', marginBottom:4 }}>{k}</p>
            <p style={{ fontWeight:600 }}>{v}</p>
          </Card>
        ))}
      </div>

      {reviews.length > 0 && (
        <Card>
          <h3 style={{ fontSize:17, marginBottom:16 }}>⭐ Patient Reviews ({reviews.length})</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {reviews.slice().reverse().map(a => (
              <div key={a.id} style={{ padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <Avatar name={a.patientName} size={32} />
                    <span style={{ fontWeight:600, fontSize:14 }}>{a.patientName}</span>
                  </div>
                  <StarRating value={a.rating} size={16} />
                </div>
                {a.review && <p style={{ fontSize:13, color:'var(--text-light)', fontStyle:'italic', marginLeft:42 }}>"{a.review}"</p>}
                <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginLeft:42, marginTop:4 }}>{fmt(a.date)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

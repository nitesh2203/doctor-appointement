import React, { useState } from 'react';
import { useApp } from './AppContext';
import { Card, Btn, Badge, Avatar, Modal, Input, Toast } from './components';
import { Search, Star, Clock, DollarSign, Filter, Calendar, CheckCircle } from 'lucide-react';

export default function DoctorsPage() {
  const { DOCTORS, bookAppointment } = useApp();
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('All');
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState(1); // 1=slots, 2=reason, 3=confirm
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [reason, setReason] = useState('');
  const [toast, setToast] = useState(null);
  const [booked, setBooked] = useState(null);

  const specialties = ['All', ...new Set(DOCTORS.map(d => d.specialty))];
  const filtered = DOCTORS.filter(d =>
    (specialty === 'All' || d.specialty === specialty) &&
    (d.name.toLowerCase().includes(search.toLowerCase()) || d.specialty.toLowerCase().includes(search.toLowerCase()))
  );

  const dates = selected ? Object.keys(selected.slots).sort() : [];
  const slots = selected && date ? (selected.slots[date] || []) : [];

  const handleBook = () => {
    const appt = bookAppointment(selected.id, date, slot, reason);
    setBooked(appt);
    setStep(3);
  };

  const closeModal = () => { setSelected(null); setStep(1); setDate(''); setSlot(''); setReason(''); setBooked(null); };

  return (
    <div style={{ padding: 32, animation: 'fadeIn 0.4s ease' }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Find a Doctor</h1>
      <p style={{ color: 'var(--text-light)', marginBottom: 28 }}>Browse specialists and book your appointment</p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or specialty…"
            style={{ width: '100%', padding: '10px 14px 10px 36px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, color: '#fff', fontSize: 14 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {specialties.map(s => (
            <button key={s} onClick={() => setSpecialty(s)} style={{
              padding: '9px 16px', borderRadius: 9, fontSize: 13, cursor: 'pointer', fontWeight: specialty === s ? 600 : 400,
              background: specialty === s ? 'var(--teal)' : 'var(--card-bg)',
              color: specialty === s ? 'var(--navy)' : 'var(--text-light)',
              border: `1px solid ${specialty === s ? 'var(--teal)' : 'var(--border)'}`,
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Doctor cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
        {filtered.map(doc => (
          <Card key={doc.id} style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
            <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
              <Avatar name={doc.name} size={52} />
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontFamily: 'DM Sans', fontWeight: 700 }}>{doc.name}</h3>
                <p style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 500 }}>{doc.specialty}</p>
                <p style={{ fontSize: 12, color: 'var(--text-light)' }}>{doc.experience} experience</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Star size={13} color="var(--gold)" fill="var(--gold)" />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{doc.rating}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 13, color: 'var(--text-light)' }}>₹{doc.fee} / visit</span>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                {doc.available
                  ? <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--success)', background: 'rgba(46,184,126,0.1)', padding: '3px 8px', borderRadius: 20 }}>● Available</span>
                  : <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--danger)', background: 'rgba(224,92,92,0.1)', padding: '3px 8px', borderRadius: 20 }}>● Busy</span>}
              </div>
            </div>

            <Btn onClick={() => { setSelected(doc); setStep(1); }} style={{ width: '100%' }} variant={doc.available ? 'primary' : 'ghost'} disabled={!doc.available}>
              {doc.available ? 'Book Appointment' : 'Unavailable'}
            </Btn>
          </Card>
        ))}
      </div>

      {/* Booking Modal */}
      <Modal isOpen={!!selected} onClose={closeModal} title={step < 3 ? `Book with ${selected?.name}` : 'Booking Confirmed!'}>
        {selected && step === 1 && (
          <div>
            <p style={{ color: 'var(--text-light)', fontSize: 13, marginBottom: 20 }}>Select a date and time slot</p>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, color: 'var(--text-light)', display: 'block', marginBottom: 8, fontWeight: 500 }}>Available Dates</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {dates.map(d => (
                  <button key={d} onClick={() => { setDate(d); setSlot(''); }} style={{
                    padding: '8px 14px', borderRadius: 9, fontSize: 13, cursor: 'pointer',
                    background: date === d ? 'var(--teal)' : 'rgba(255,255,255,0.06)',
                    color: date === d ? 'var(--navy)' : 'var(--white)',
                    border: `1px solid ${date === d ? 'var(--teal)' : 'var(--border)'}`,
                    fontWeight: date === d ? 600 : 400,
                  }}>{new Date(d).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</button>
                ))}
              </div>
            </div>
            {date && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, color: 'var(--text-light)', display: 'block', marginBottom: 8, fontWeight: 500 }}>Available Time Slots</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {slots.map(s => (
                    <button key={s} onClick={() => setSlot(s)} style={{
                      padding: '8px 14px', borderRadius: 9, fontSize: 13, cursor: 'pointer',
                      background: slot === s ? 'var(--teal)' : 'rgba(255,255,255,0.06)',
                      color: slot === s ? 'var(--navy)' : 'var(--white)',
                      border: `1px solid ${slot === s ? 'var(--teal)' : 'var(--border)'}`,
                      fontWeight: slot === s ? 600 : 400,
                    }}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
              <Btn disabled={!date || !slot} onClick={() => setStep(2)}>Continue</Btn>
            </div>
          </div>
        )}

        {selected && step === 2 && (
          <div>
            <div style={{ background: 'rgba(0,180,166,0.07)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, border: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 600 }}>{selected.name}</p>
              <p style={{ fontSize: 13, color: 'var(--text-light)' }}>{new Date(date).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })} at {slot}</p>
              <p style={{ fontSize: 13, color: 'var(--teal)', marginTop: 4 }}>Consultation fee: ₹{selected.fee}</p>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: 'var(--text-light)', display: 'block', marginBottom: 8, fontWeight: 500 }}>Reason for Visit</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Describe your symptoms or reason for visit…"
                rows={4} style={{
                  width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.06)',
                  border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 9, color: '#fff', resize: 'none', fontSize: 14,
                }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setStep(1)}>Back</Btn>
              <Btn onClick={handleBook}>Confirm Booking</Btn>
            </div>
          </div>
        )}

        {step === 3 && booked && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(46,184,126,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={32} color="var(--success)" />
            </div>
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>Appointment Booked!</h3>
            <p style={{ color: 'var(--text-light)', marginBottom: 20, fontSize: 14 }}>Your appointment has been confirmed</p>
            <div style={{ background: 'rgba(0,180,166,0.07)', borderRadius: 10, padding: 16, border: '1px solid var(--border)', textAlign: 'left', marginBottom: 24 }}>
              <p style={{ fontWeight: 600 }}>{booked.doctor.name}</p>
              <p style={{ fontSize: 13, color: 'var(--text-light)' }}>{booked.specialty}</p>
              <p style={{ fontSize: 13, marginTop: 8 }}>{new Date(booked.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {booked.slot}</p>
            </div>
            <Btn onClick={closeModal} style={{ width: '100%' }}>Done</Btn>
          </div>
        )}
      </Modal>
    </div>
  );
}

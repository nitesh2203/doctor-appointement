import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);
const DEFAULT_THEME = 'dark';

// Generate next 14 days of slots dynamically
function genSlots(daysOffOn = [], slotSets = ['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00']) {
  const slots = {};
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dow = d.getDay();
    if (daysOffOn.includes(dow)) continue;
    const key = d.toISOString().split('T')[0];
    slots[key] = [...slotSets];
  }
  return slots;
}

export const DOCTORS_DATA = [
  { id: 'd1', name: 'Dr. Priya Sharma',    specialty: 'Cardiologist',      experience: '14 yrs', ratingSum: 44, ratingCount: 9, fee: 800, available: true,  qualification: 'MBBS, MD (Cardiology), DM', hospital: 'Apollo Hospital', slots: genSlots([0,6], ['09:00','10:00','11:00','14:00','15:00','16:00']) },
  { id: 'd2', name: 'Dr. Arjun Mehta',     specialty: 'Neurologist',       experience: '10 yrs', ratingSum: 37, ratingCount: 8, fee: 700, available: true,  qualification: 'MBBS, MD, DM (Neurology)', hospital: 'Fortis Hospital', slots: genSlots([0,5], ['08:00','09:30','11:00','13:00','15:00','16:30']) },
  { id: 'd3', name: 'Dr. Sneha Kulkarni', specialty: 'Dermatologist',     experience: '8 yrs',  ratingSum: 48, ratingCount: 10,fee: 600, available: true,  qualification: 'MBBS, DVD, DNB', hospital: 'Ruby Hall Clinic', slots: genSlots([0], ['10:00','11:30','13:00','14:00','16:00','17:00']) },
  { id: 'd4', name: 'Dr. Rohit Patil',     specialty: 'Orthopedic',        experience: '12 yrs', ratingSum: 32, ratingCount: 7, fee: 750, available: true,  qualification: 'MBBS, MS (Ortho)', hospital: 'Sahyadri Hospital', slots: genSlots([0,6], ['09:00','11:00','13:00','14:00','16:00']) },
  { id: 'd5', name: 'Dr. Anita Desai',    specialty: 'Pediatrician',      experience: '16 yrs', ratingSum: 49, ratingCount: 10,fee: 650, available: true,  qualification: 'MBBS, MD (Pediatrics)', hospital: 'KEM Hospital', slots: genSlots([0], ['08:30','10:00','11:30','13:00','14:30','16:00']) },
  { id: 'd6', name: 'Dr. Vikram Joshi',   specialty: 'General Physician', experience: '9 yrs',  ratingSum: 40, ratingCount: 9, fee: 500, available: true,  qualification: 'MBBS, MD', hospital: 'City Care Clinic', slots: genSlots([6], ['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00']) },
];

// Doctor login accounts (pre-seeded)
const DOCTOR_ACCOUNTS = DOCTORS_DATA.map(d => ({
  id: d.id,
  name: d.name,
  email: `${d.name.split(' ')[2]?.toLowerCase() || d.name.split(' ')[1].toLowerCase()}@medibook.com`,
  password: 'doctor123',
  role: 'doctor',
  doctorId: d.id,
}));

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const DOCTOR_ID_MAP = {
  'sharma@medibook.com': 'd1',
  'mehta@medibook.com': 'd2',
  'kulkarni@medibook.com': 'd3',
  'patil@medibook.com': 'd4',
  'desai@medibook.com': 'd5',
  'joshi@medibook.com': 'd6',
};

export function AppProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [theme, setTheme]             = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME;
    return localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });
  const [users, setUsers]             = useState(DOCTOR_ACCOUNTS);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors]         = useState(DOCTORS_DATA);
  const [patients, setPatients]       = useState([]);

  const normalizeAppointment = (appt) => ({
    ...appt,
    doctorId: appt.doctor_code || appt.doctorId,
    patientId: appt.patient_id || appt.patientId,
    patientName: appt.patient_name || appt.patientName,
    patientPhone: appt.patient_phone || appt.patientPhone,
    doctorName: appt.doctor_name || appt.doctorName,
    doctorSpecialty: appt.specialty || appt.doctorSpecialty,
    bookedAt: appt.booked_at || appt.bookedAt,
    doctorNote: appt.doctor_note || appt.doctorNote || '',
    date: appt.appointment_date || appt.date,
    slot: appt.appointment_time || appt.slot,
  });

  const fetchAppointments = async (currentUser) => {
    if (!currentUser) return;
    const params = new URLSearchParams();
    if (currentUser.role === 'doctor') {
      params.set('doctor_code', currentUser.doctorId);
    } else if (currentUser.role === 'patient') {
      params.set('patient_id', currentUser.id);  // send users.id, backend resolves via patients.user_id
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';
    try {
      const resp = await fetch(`${BACKEND_URL}/api/appointments${queryString}`);
      const data = await resp.json();
      if (!resp.ok) return;
      const normalized = data.map(normalizeAppointment);
      setAppointments(normalized);
    } catch (e) {
      console.error('Failed to load appointments', e);
    }
  };

  const fetchPatients = async () => {
    try {
      const resp = await fetch(`${BACKEND_URL}/api/patients`);
      const data = await resp.json();
      if (!resp.ok) return;
      setPatients(data);
    } catch (e) {
      console.error('Failed to load patients', e);
    }
  };

  useEffect(() => {
    // Auto-login if token present
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data && data.user) {
          const loadedUser = { ...data.user };
          if (loadedUser.role === 'doctor') {
            loadedUser.doctorId = DOCTOR_ID_MAP[loadedUser.email] || loadedUser.doctorId;
          }
          if (loadedUser.medical_info && !loadedUser.medHistory) {
            loadedUser.medHistory = loadedUser.medical_info;
          }
          setUser(loadedUser);
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
      });
  }, []);

  useEffect(() => {
    if (!user) {
      setAppointments([]);
      return;
    }
    fetchAppointments(user);
    if (user.role === 'admin') {
      fetchPatients();
    }
  }, [user?.id, user?.doctorId, user?.role]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  /* ───── Auth ───── */
  const register = async (data) => {
    try {
      const resp = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await resp.json();
      if (!resp.ok) return { success: false, error: json.error || 'Registration failed' };
      localStorage.setItem('token', json.token);
      setUser(json.user);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const login = async (email, password) => {
    try {
      const resp = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await resp.json();
      if (!resp.ok) return { success: false, error: json.error || 'Login failed' };
      const loginUser = { ...json.user };
      if (loginUser.role === 'doctor') {
        loginUser.doctorId = DOCTOR_ID_MAP[loginUser.email] || loginUser.doctorId;
      }
      if (loginUser.medical_info && !loginUser.medHistory) {
        loginUser.medHistory = loginUser.medical_info;
      }
      localStorage.setItem('token', json.token);
      setUser(loginUser);
      return { success: true, role: loginUser.role };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const logout = () => { setUser(null); setAppointments([]); localStorage.removeItem('token'); };

  const updateAppointmentStatus = async (id, data) => {
    try {
      const resp = await fetch(`${BACKEND_URL}/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await resp.json();
      if (!resp.ok) {
        console.error('Appointment update failed', json.error);
        return;
      }
      const updatedAppt = normalizeAppointment(json);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updatedAppt } : a));
    } catch (e) {
      console.error('Appointment update error', e);
    }
  };

  const updateProfile = async (data) => {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const payload = {
      ...data,
      medical_info: data.medHistory !== undefined ? data.medHistory : data.medical_info,
    };
    delete payload.medHistory;
    try {
      const resp = await fetch(`${BACKEND_URL}/api/auth/me`, {
        method: 'PATCH', headers, body: JSON.stringify(payload),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Profile update failed');
      const updated = { ...user, ...json.user };
      setUser(updated);
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
      return updated;
    } catch (e) {
      console.error('Profile update failed', e);
      return null;
    }
  };

  /* ───── Appointments (Patient) ───── */
  const bookAppointment = async ({ doctorId, date, slot, reason, symptoms }) => {
    if (!user) throw new Error('Please sign in to book an appointment');
    const doctor = doctors.find(d => d.id === doctorId);

    // Always send users.id (from JWT) — the backend resolves via patients.user_id
    // which avoids cross-table ID confusion between patients.id and users.id
    const patientIdToUse = user.id;
    if (!patientIdToUse) throw new Error('No patient account found — please register or sign in.');

    const payload = {
      doctor_code: doctorId,
      patient_id: patientIdToUse,
      appointment_date: date,
      appointment_time: slot,
      reason,
      symptoms,
      patient_phone: user.phone || '',
    };
    console.log('Booking payload:', payload);
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;

    const resp = await fetch(`${BACKEND_URL}/api/appointments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || 'Booking failed');

    setDoctors(prev => prev.map(d => {
      if (d.id !== doctorId) return d;
      const updated = { ...d, slots: { ...d.slots } };
      if (updated.slots[date]) updated.slots[date] = updated.slots[date].filter(s => s !== slot);
      return updated;
    }));

    const appt = {
      id: json.id,
      doctorId,
      doctor_code: doctorId,
      doctorName: json.doctor_name || doctor.name,
      doctorSpecialty: doctor.specialty,
      doctorFee: doctor.fee,
      patientId: json.patient_id || user.patientId,
      patientName: json.patient_name || user.name,
      patientPhone: user.phone || '',
      date,
      slot,
      reason,
      symptoms,
      status: json.status,
      bookedAt: json.booked_at || new Date().toISOString(),
      rating: null,
      review: '',
      doctorNote: json.doctor_note || '',
    };

    // Update user's patientId if the server returned a different one
    if (json.patient_id && json.patient_id !== user.patientId) {
      setUser(prev => ({ ...prev, patientId: json.patient_id }));
    }

    setAppointments(prev => [...prev, appt]);
    return appt;
  };

  const cancelAppointment = async (id) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt) return;
    // Restore slot
    setDoctors(prev => prev.map(d => {
      if (d.id !== appt.doctorId) return d;
      const updated = { ...d, slots: { ...d.slots } };
      if (updated.slots[appt.date]) updated.slots[appt.date] = [...(updated.slots[appt.date] || []), appt.slot].sort();
      else updated.slots[appt.date] = [appt.slot];
      return updated;
    }));
    await updateAppointmentStatus(id, { status: 'cancelled' });
  };

  const rescheduleAppointment = async (id, newDate, newSlot) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt) return;
    // Restore old slot, remove new slot
    setDoctors(prev => prev.map(d => {
      if (d.id !== appt.doctorId) return d;
      const s = { ...d.slots };
      if (s[appt.date]) s[appt.date] = [...s[appt.date], appt.slot].sort();
      if (s[newDate]) s[newDate] = s[newDate].filter(sl => sl !== newSlot);
      else s[newDate] = [newSlot];
      return { ...d, slots: s };
    }));
    await updateAppointmentStatus(id, { appointment_date: newDate, appointment_time: newSlot, status: 'pending' });
  };

  const rateAppointment = (id, rating, review) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt) return;
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, rating, review } : a));
    // Update doctor rating
    setDoctors(prev => prev.map(d => {
      if (d.id !== appt.doctorId) return d;
      return { ...d, ratingSum: d.ratingSum + rating, ratingCount: d.ratingCount + 1 };
    }));
  };

  /* ───── Appointments (Doctor) ───── */
  const acceptAppointment  = async (id, note = '') => {
    await updateAppointmentStatus(id, { status: 'accepted', doctor_note: note });
  };

  const rejectAppointment  = async (id, note = '') => {
    const appt = appointments.find(a => a.id === id);
    if (appt) {
      setDoctors(prev => prev.map(d => {
        if (d.id !== appt.doctorId) return d;
        const s = { ...d.slots };
        if (s[appt.date]) s[appt.date] = [...s[appt.date], appt.slot].sort();
        else s[appt.date] = [appt.slot];
        return { ...d, slots: s };
      }));
    }
    await updateAppointmentStatus(id, { status: 'rejected', doctor_note: note });
  };

  const completeAppointment = async (id, note = '') => {
    await updateAppointmentStatus(id, { status: 'completed', doctor_note: note });
  };

  /* ───── Derived ───── */
  const myAppointments     = appointments.filter(a => a.patientId === user?.patientId);
  const doctorAppointments = appointments.filter(a => a.doctorId === user?.doctorId);
  const myDoctorProfile    = doctors.find(d => d.id === user?.doctorId);

  return (
    <AppContext.Provider value={{
      user, login, register, logout, updateProfile,
      theme, toggleTheme,
      doctors, patients, DOCTOR_ACCOUNTS, appointments,
      bookAppointment, cancelAppointment, rescheduleAppointment, rateAppointment,
      acceptAppointment, rejectAppointment, completeAppointment,
      myAppointments, doctorAppointments, myDoctorProfile,
    }}>
      {children}
    </AppContext.Provider>
  );
}
export const useApp = () => useContext(AppContext);

import React, { useState } from 'react';
import { AppProvider, useApp } from './AppContext';
import { LoginPage, RegisterPage } from './AuthPages';
import Nav from './Nav';
import HomePage from './HomePage';
import BookingPage from './BookingPage';
import AppointmentsPage from './AppointmentsPage';
import ProfilePage from './ProfilePage';
import AdminPage from './AdminPage';
import { DoctorHome, DoctorRequests, DoctorSchedule, DoctorProfilePage } from './DoctorDashboard';

function Main() {
  const { user } = useApp();
  const [authMode, setAuthMode] = useState('login');
  const isDoctor = user?.role === 'doctor';
  const isAdmin = user?.role === 'admin';

  const [page, setPage] = useState(() => isAdmin ? 'admin' : isDoctor ? 'doctor-home' : 'home');

  // When user logs in set default page
  React.useEffect(() => {
    if (user) {
      setPage(user.role === 'doctor' ? 'doctor-home' : user.role === 'admin' ? 'admin' : 'home');
    }
  }, [user?.id]);

  if (!user) {
    return authMode === 'login'
      ? <LoginPage onSwitch={() => setAuthMode('register')} />
      : <RegisterPage onSwitch={() => setAuthMode('login')} />;
  }

  const patientPages = {
    'home':         <HomePage setPage={setPage} />,
    'booking':      <BookingPage setPage={setPage} />,
    'appointments': <AppointmentsPage setPage={setPage} />,
    'profile':      <ProfilePage />,
  };

  const doctorPages = {
    'doctor-home':     <DoctorHome setPage={setPage} />,
    'doctor-requests': <DoctorRequests />,
    'doctor-schedule': <DoctorSchedule />,
    'doctor-profile':  <DoctorProfilePage />,
  };

  const adminPages = { 'admin': <AdminPage setPage={setPage} /> };
  const pages = isAdmin ? adminPages : isDoctor ? doctorPages : patientPages;
  const currentPage = pages[page] || (isAdmin ? adminPages['admin'] : isDoctor ? doctorPages['doctor-home'] : patientPages['home']);

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <Nav page={page} setPage={setPage} />
      <main style={{ flex:1, marginLeft:220, minHeight:'100vh', overflowY:'auto' }} className="main-content">
        {currentPage}
      </main>
      <style>{`
        @media(max-width:768px){
          .main-content{ margin-left:0 !important; padding-top:58px; }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Main />
    </AppProvider>
  );
}

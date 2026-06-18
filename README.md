# 🩺 MediBook — Doctor Appointment Booking Platform

MediBook is a full-stack healthcare appointment booking system that connects patients with doctors through three dedicated portals. Patients can discover doctors, book appointments through a guided multi-step flow, and rate their experience after a visit. Doctors can accept or reject incoming requests, manage their daily schedule, and mark consultations complete. Admins get a dashboard to monitor overall platform activity.

## Features

### Patient Portal
- Register and log in with JWT-based authentication
- Browse and search doctors by name or specialty
- Book appointments through a guided multi-step flow (doctor → date → time slot → reason/symptoms → confirmation)
- View, reschedule, or cancel appointments
- Rate and review doctors after a completed appointment
- Manage personal profile and medical history (blood group, allergies, medical history)

### Doctor Portal
- View and manage incoming appointment requests
- Accept or reject bookings with an optional note to the patient
- Mark completed appointments, unlocking the patient rating flow
- View a day-by-day schedule of upcoming appointments
- View profile stats, average rating, and patient reviews

### Admin Dashboard
- Monitor total patients, total doctors, today's appointments, and pending requests
- View doctor demand and booking volume per specialty
- Search registered patients
- View top-rated doctors and review counts

## Tech Stack

| Layer          | Technology                          |
|----------------|--------------------------------------|
| Frontend       | React, React Router, Context API     |
| Backend        | Node.js, Express                      |
| Database       | SQLite (`sqlite3`, `bcryptjs`)        |
| Icons          | Lucide React                          |

## Getting Started

### Prerequisites
- Node.js (v16 or later recommended)
- npm

### Installation

```bash
git clone https://github.com/<your-username>/medibook.git
cd medibook
npm install
```

### Running the app

Start the backend API server:

```bash
npm run server
```

In a separate terminal, start the React frontend:

```bash
npm start
```

The app will be available at `http://localhost:3000`, with the API running at `http://localhost:5000`.

### Environment Variables

Create a `.env` file in the `server/` directory for secrets such as your JWT signing key:

```
JWT_SECRET=your_secret_key_here
PORT=5000
```

## Database

MediBook uses SQLite for persistence. The schema is defined in `server/database.js` and includes the following tables: `users`, `doctors`, `patients`, `appointments`, and `reviews`. The database file is excluded from version control via `.gitignore` — running the server for the first time will create a fresh local database automatically.

## Roadmap / Ideas

- Email or SMS appointment reminders
- Doctor availability calendar editing from the doctor portal
- Payment integration for consultation fees
- Video consultation support

## License

This project is open source and available for personal or educational use. Add a license file (e.g. MIT) if you plan to distribute or accept contributions.


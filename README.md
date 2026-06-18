# MediBook — Doctor Appointment Booking Platform

MediBook is a full-stack healthcare appointment booking system that connects patients with doctors through three dedicated portals. Patients can discover doctors, book appointments through a guided multi-step flow, and rate their experience after a visit. Doctors can accept or reject incoming requests, manage their daily schedule, and mark consultations complete. Admins get a dashboard to monitor overall platform activity.

## Project structure

```
MediBook-main/
├── backend/     # Node.js + Express API
├── frontend/    # React app
├── package.json # Root build/start scripts (Render deploy)
└── render.yaml  # Single-service Render blueprint
```

## Features

### Patient Portal
- Register and log in with JWT-based authentication
- Browse and search doctors by name or specialty
- Book appointments through a guided multi-step flow
- View, reschedule, or cancel appointments
- Rate and review doctors after a completed appointment
- Manage personal profile and medical history

### Doctor Portal
- View and manage incoming appointment requests
- Accept or reject bookings with an optional note
- Mark completed appointments
- View schedule and profile stats

### Admin Dashboard
- Monitor patients, doctors, appointments, and pending requests
- Search registered patients and view top-rated doctors

## Tech Stack

| Layer    | Technology                   |
|----------|------------------------------|
| Frontend | React, Context API           |
| Backend  | Node.js, Express             |
| Database | SQLite (`sqlite3`, `bcryptjs`) |

## Getting Started

### Prerequisites
- Node.js v18 or later
- npm

### Installation

```bash
git clone https://github.com/<your-username>/medibook.git
cd medibook
npm run install:all
```

### Running locally

Terminal 1 — backend:

```bash
npm run dev:backend
```

Terminal 2 — frontend:

```bash
npm run dev:frontend
```

- Frontend: `http://localhost:3001`
- API: `http://localhost:5000`

### Environment variables

**`frontend/.env`** (local dev):

```
PORT=3001
REACT_APP_BACKEND_URL=http://localhost:5000
```

**`backend/.env`** (local dev):

```
PORT=5000
JWT_SECRET=your_secret_key_here
CORS_ORIGIN=http://localhost:3001
```

## Deploy on Render (single service)

Both the React UI and API run on one URL.

1. Push this repo to GitHub
2. Render → **New** → **Blueprint** → connect repo
3. Render uses `render.yaml` automatically

Or create a **Web Service** manually:

| Field         | Value           |
|---------------|-----------------|
| Build Command | `npm run build` |
| Start Command | `npm start`     |

Environment variables:

- `NODE_ENV` = `production`
- `JWT_SECRET` = (generate a secure random string)

## Database

SQLite schema lives in `backend/db/database.js`. Tables: `users`, `doctors`, `patients`, `appointments`, `reviews`. The database file is gitignored and created on first server start. Demo users are seeded automatically.

## Demo logins

| Role   | Email                 | Password    |
|--------|-----------------------|-------------|
| Doctor | `sharma@medibook.com` | `doctor123` |
| Admin  | `admin@medibook.com`  | `admin123`  |

## License

Open source for personal or educational use.

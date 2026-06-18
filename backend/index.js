const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { db, initDb, ensurePatientRow, ensureDoctorRow } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

const DOCTOR_ID_MAP = {
  'sharma@medibook.com': 'd1',
  'mehta@medibook.com': 'd2',
  'kulkarni@medibook.com': 'd3',
  'patil@medibook.com': 'd4',
  'desai@medibook.com': 'd5',
  'joshi@medibook.com': 'd6',
};

const DOCTOR_CODE_TO_EMAIL = Object.entries(DOCTOR_ID_MAP).reduce((acc, [email, code]) => {
  acc[code] = email;
  return acc;
}, {});

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => {
      const trimmed = s.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
      return `https://${trimmed}`;
    })
  : undefined;
app.use(cors({ origin: corsOrigins || true, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const decodeJwt = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

initDb((seedErr) => {
  if (seedErr) console.error('Seed error:', seedErr);
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});

app.get('/api/doctors', (req, res) => {
  const sql = `
    SELECT d.id, u.name, u.email, d.specialty, d.rating, d.review_count
    FROM doctors d
    JOIN users u ON d.user_id = u.id
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/patients', (req, res) => {
  const sql = `
    SELECT p.id, u.id AS user_id, u.name, u.email, p.phone, p.dob, p.gender, p.address, p.blood, p.allergies, p.medical_info
    FROM patients p
    JOIN users u ON p.user_id = u.id
    ORDER BY u.name ASC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/appointments', (req, res) => {
  const filters = [];
  const params = [];

  if (req.query.doctor_code) {
    filters.push('a.doctor_code = ?');
    params.push(req.query.doctor_code);
  }
  if (req.query.patient_id) {
    // Accept either patients.id or users.id — resolve via subquery
    filters.push('a.patient_id IN (SELECT id FROM patients WHERE id = ? OR user_id = ?)');
    params.push(req.query.patient_id, req.query.patient_id);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const sql = `
    SELECT a.id, a.doctor_id, a.patient_id, a.appointment_date, a.appointment_time,
           a.status, a.reason, a.symptoms, a.patient_phone, a.doctor_code, a.doctor_note,
           a.booked_at, d.specialty AS doctor_specialty,
           du.name AS doctor_name, pu.name AS patient_name
    FROM appointments a
    LEFT JOIN doctors d ON a.doctor_id = d.id
    LEFT JOIN users du ON d.user_id = du.id
    LEFT JOIN patients p ON a.patient_id = p.id
    LEFT JOIN users pu ON p.user_id = pu.id
    ${where}
    ORDER BY a.booked_at DESC
  `;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/appointments', (req, res) => {
  console.log('POST /api/appointments payload:', req.body);
  const {
    doctor_code,
    doctorId,
    doctor_id,
    patient_id,
    patientId,
    appointment_date,
    appointment_time,
    reason,
    symptoms,
    patient_phone,
  } = req.body;

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const authPayload = token ? decodeJwt(token) : null;

  const resolvedDoctorCode = doctor_code || doctorId || doctor_id;
  const suppliedPatientId = patient_id || patientId;
  const missing = [];
  if (!resolvedDoctorCode) missing.push('doctor_code/doctorId');
  if (!suppliedPatientId && !authPayload?.userId) missing.push('patient_id/patientId or valid token');
  if (!appointment_date) missing.push('appointment_date');
  if (!appointment_time) missing.push('appointment_time');
  if (missing.length) {
    console.warn('Missing appointment fields:', missing, 'payload keys:', Object.keys(req.body));
    return res.status(400).json({ error: 'Missing required appointment fields.', missing });
  }

  const doctorEmail = DOCTOR_CODE_TO_EMAIL[resolvedDoctorCode] || resolvedDoctorCode;
  const doctorSql = `
    SELECT d.id AS doctor_id
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    WHERE u.email = ?
  `;

  db.get(doctorSql, [doctorEmail], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(400).json({ error: 'Invalid doctor code.' });

    // Resolve the candidate (patient_id from body or userId from JWT) to a
    // patients.id row.  The frontend may send either patients.id or users.id,
    // so we try both lookups and auto-create if needed.
    const resolvePatientId = (candidate, cb) => {
      if (!candidate) return cb(null, null);
      const candidateStr = String(candidate);

      // If it looks like an email, resolve via users.email first
      if (candidateStr.includes('@')) {
        db.get('SELECT id FROM users WHERE email = ?', [candidateStr], (uErr, uRow) => {
          if (uErr) return cb(uErr);
          if (!uRow) return cb(null, null);
          ensurePatientRow(uRow.id, cb);
        });
        return;
      }

      // Numeric candidate – try patients.user_id first (most common case from
      // frontend which sends user.patientId or user.id, both linking to users.id),
      // then patients.id, then fall back to users.id.
      if (/^\d+$/.test(candidateStr)) {
        // 1. Check if a patient row with this user_id exists
        db.get('SELECT id FROM patients WHERE user_id = ?', [candidate], (pErr, pRow) => {
          if (pErr) return cb(pErr);
          if (pRow) return cb(null, pRow.id);
          // 2. Check if this IS a patients.id directly
          db.get('SELECT id, user_id FROM patients WHERE id = ?', [candidate], (p2Err, p2Row) => {
            if (p2Err) return cb(p2Err);
            if (p2Row) return cb(null, p2Row.id);
            // 3. Treat as users.id and ensure patient row
            db.get('SELECT id, role FROM users WHERE id = ?', [candidate], (uErr, uRow) => {
              if (uErr) return cb(uErr);
              if (!uRow) return cb(null, null);
              if (uRow.role === 'patient') return ensurePatientRow(uRow.id, cb);
              return cb(null, null);
            });
          });
        });
        return;
      }

      // Fallback: try patients.user_id directly, auto-create if missing
      db.get('SELECT id FROM patients WHERE user_id = ?', [candidate], (pErr3, pRow3) => {
        if (pErr3) return cb(pErr3);
        if (pRow3) return cb(null, pRow3.id);
        db.get('SELECT id, role FROM users WHERE id = ?', [candidate], (uErr, uRow) => {
          if (uErr) return cb(uErr);
          if (uRow && uRow.role === 'patient') return ensurePatientRow(uRow.id, cb);
          return cb(null, null);
        });
      });
    };

    const candidate = suppliedPatientId || authPayload?.userId;
    resolvePatientId(candidate, (resolveErr, finalPatientId) => {
      if (resolveErr) return res.status(500).json({ error: resolveErr.message });
      if (!finalPatientId) return res.status(400).json({ error: 'Invalid patient identifier.' });

      // Check if the slot is already taken by a pending or accepted appointment
      const slotCheckSql = `
        SELECT a.id FROM appointments a
        WHERE a.doctor_id = ?
          AND a.appointment_date = ?
          AND a.appointment_time = ?
          AND a.status IN ('pending', 'accepted')
      `;
      db.get(slotCheckSql, [row.doctor_id, appointment_date, appointment_time], (slotErr, existingSlot) => {
        if (slotErr) return res.status(500).json({ error: slotErr.message });
        if (existingSlot) {
          return res.status(409).json({ error: 'This time slot is no longer available. Please choose a different slot.' });
        }

      const sql = `
        INSERT INTO appointments (
          doctor_id, patient_id, appointment_date, appointment_time,
          reason, symptoms, patient_phone, doctor_code, booked_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;

      db.run(
        sql,
        [row.doctor_id, finalPatientId, appointment_date, appointment_time, reason || '', symptoms || '', patient_phone || '', resolvedDoctorCode],
      function (insertErr) {
        if (insertErr) return res.status(500).json({ error: insertErr.message });
        // Fetch doctor_name and patient_name for the response
        db.get(
          'SELECT du.name AS doctor_name FROM doctors d JOIN users du ON d.user_id = du.id WHERE d.id = ?',
          [row.doctor_id],
          (dNameErr, dNameRow) => {
            db.get(
              'SELECT pu.name AS patient_name FROM patients p JOIN users pu ON p.user_id = pu.id WHERE p.id = ?',
              [finalPatientId],
              (pNameErr, pNameRow) => {
                res.status(201).json({
                  id: this.lastID,
                  doctor_id: row.doctor_id,
                  patient_id: finalPatientId,
                  appointment_date,
                  appointment_time,
                  status: 'pending',
                  reason: reason || '',
                  symptoms: symptoms || '',
                  patient_phone: patient_phone || '',
                  doctor_code: resolvedDoctorCode,
                  booked_at: new Date().toISOString(),
                  doctor_name: dNameRow ? dNameRow.doctor_name : '',
                  patient_name: pNameRow ? pNameRow.patient_name : '',
                });
              }
            );
          }
        );
      }
      );
      }); // end slot check
    });
  });
});

app.patch('/api/appointments/:id', (req, res) => {
  const allowedFields = ['status', 'doctor_note', 'appointment_date', 'appointment_time', 'reason', 'symptoms', 'patient_phone'];
  const updates = [];
  const params = [];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  });

  if (!updates.length) {
    return res.status(400).json({ error: 'No valid fields provided for update.' });
  }

  params.push(req.params.id);
  const sql = `UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`;

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Appointment not found.' });

    const selectSql = `
      SELECT a.id, a.doctor_id, a.patient_id, a.appointment_date, a.appointment_time,
             a.status, a.reason, a.symptoms, a.patient_phone, a.doctor_code, a.doctor_note,
             a.booked_at, d.specialty AS doctor_specialty,
             du.name AS doctor_name, pu.name AS patient_name
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users du ON d.user_id = du.id
      JOIN patients p ON a.patient_id = p.id
      JOIN users pu ON p.user_id = pu.id
      WHERE a.id = ?
    `;

    db.get(selectSql, [req.params.id], (selectErr, row) => {
      if (selectErr) return res.status(500).json({ error: selectErr.message });
      res.json(row);
    });
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const sql = 'SELECT id, name, email, role, password FROM users WHERE email = ?';
  db.get(sql, [email], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });

    const result = { id: user.id, name: user.name, email: user.email, role: user.role };
    if (user.role === 'doctor') {
      ensureDoctorRow(user.id, user.email, (dErr, doctorRowId) => {
        if (dErr) return res.status(500).json({ error: dErr.message });
        result.doctorId = DOCTOR_ID_MAP[user.email] || doctorRowId;
        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ user: result, token });
      });
    } else if (user.role === 'patient') {
      ensurePatientRow(user.id, (pErr, patientRowId) => {
        if (pErr) return res.status(500).json({ error: pErr.message });
        result.patientId = patientRowId;
        // Fetch full patient profile after ensuring row exists
        db.get(
          'SELECT medical_info, phone, dob, gender, address, blood, allergies FROM patients WHERE id = ?',
          [patientRowId],
          (profErr, profRow) => {
            if (profRow) {
              result.medHistory = profRow.medical_info || '';
              result.phone = profRow.phone || '';
              result.dob = profRow.dob || '';
              result.gender = profRow.gender || '';
              result.address = profRow.address || '';
              result.blood = profRow.blood || '';
              result.allergies = profRow.allergies || '';
            }
            const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ user: result, token });
          }
        );
      });
    } else {
      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ user: result, token });
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role, medical_info, phone, dob, gender, address, blood, allergies } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required.' });
  }

  const hashed = bcrypt.hashSync(password, 10);
  const userInsert = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
  db.run(userInsert, [name, email, hashed, role], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const userId = this.lastID;
    if (role === 'patient') {
      db.run(
        'INSERT INTO patients (user_id, medical_info, phone, dob, gender, address, blood, allergies) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, medical_info || '', phone || '', dob || '', gender || '', address || '', blood || '', allergies || ''],
        function (patientErr) {
          if (patientErr) return res.status(500).json({ error: patientErr.message });
          const token = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
          res.status(201).json({
            user: {
              id: userId,
              name,
              email,
              role,
              patientId: this.lastID,
              medHistory: medical_info || '',
              phone: phone || '',
              dob: dob || '',
              gender: gender || '',
              address: address || '',
              blood: blood || '',
              allergies: allergies || '',
            },
            token,
          });
        }
      );
    } else if (role === 'doctor') {
      ensureDoctorRow(userId, email, function (dErr, doctorRowId) {
        if (dErr) return res.status(500).json({ error: dErr.message });
        const token = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ user: { id: userId, name, email, role, doctorId: DOCTOR_ID_MAP[email] || doctorRowId }, token });
      });
    } else {
      const token = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ user: { id: userId, name, email, role }, token });
    }
  });
});

app.patch('/api/auth/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing Authorization header' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid Authorization header' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload.userId;
    const {
      name, phone, dob, gender, address, blood, allergies, medical_info,
    } = req.body;

    db.get('SELECT id, role, email FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const updates = [];
      const params = [];
      if (name !== undefined) {
        updates.push('name = ?');
        params.push(name);
      }
      if (updates.length) {
        params.push(userId);
        db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params, (uErr) => {
          if (uErr) return res.status(500).json({ error: uErr.message });
          updatePatient();
        });
      } else {
        updatePatient();
      }

      function updatePatient() {
        if (user.role !== 'patient') {
          return res.status(200).json({ user: { id: user.id, name: name || user.name, email: user.email, role: user.role } });
        }

        // Ensure patient row exists before trying to UPDATE
        ensurePatientRow(user.id, (ensureErr, patientRowId) => {
          if (ensureErr) return res.status(500).json({ error: ensureErr.message });

          const patUpdates = [];
          const patParams = [];
          if (medical_info !== undefined) { patUpdates.push('medical_info = ?'); patParams.push(medical_info); }
          if (phone !== undefined)       { patUpdates.push('phone = ?'); patParams.push(phone); }
          if (dob !== undefined)         { patUpdates.push('dob = ?'); patParams.push(dob); }
          if (gender !== undefined)      { patUpdates.push('gender = ?'); patParams.push(gender); }
          if (address !== undefined)     { patUpdates.push('address = ?'); patParams.push(address); }
          if (blood !== undefined)       { patUpdates.push('blood = ?'); patParams.push(blood); }
          if (allergies !== undefined)   { patUpdates.push('allergies = ?'); patParams.push(allergies); }

          if (!patUpdates.length) {
            return fetchProfile();
          }

          patParams.push(patientRowId);
          db.run(`UPDATE patients SET ${patUpdates.join(', ')} WHERE id = ?`, patParams, (pErr) => {
            if (pErr) return res.status(500).json({ error: pErr.message });
            fetchProfile();
          });
        });
      }

      function fetchProfile() {
        db.get('SELECT id, name, email, role FROM users WHERE id = ?', [userId], (uErr, updatedUser) => {
          if (uErr) return res.status(500).json({ error: uErr.message });
          const result = { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role };
          ensurePatientRow(userId, (pErr2, patientRowId) => {
            if (pErr2) return res.status(500).json({ error: pErr2.message });
            result.patientId = patientRowId;
            db.get(
              'SELECT medical_info, phone, dob, gender, address, blood, allergies FROM patients WHERE id = ?',
              [patientRowId],
              (profErr, profRow) => {
                if (profRow) {
                  result.medHistory = profRow.medical_info || '';
                  result.phone = profRow.phone || '';
                  result.dob = profRow.dob || '';
                  result.gender = profRow.gender || '';
                  result.address = profRow.address || '';
                  result.blood = profRow.blood || '';
                  result.allergies = profRow.allergies || '';
                }
                res.json({ user: result });
              }
            );
          });
        });
      }
    });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/api/auth/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing Authorization header' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid Authorization header' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload.userId;
    db.get('SELECT id, name, email, role FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(404).json({ error: 'User not found' });
      const result = { id: user.id, name: user.name, email: user.email, role: user.role };
      if (user.role === 'doctor') {
        ensureDoctorRow(user.id, user.email, (dErr, doctorRowId) => {
          if (dErr) return res.status(500).json({ error: dErr.message });
          result.doctorId = DOCTOR_ID_MAP[user.email] || doctorRowId;
          res.json({ user: result });
        });
      } else if (user.role === 'patient') {
        ensurePatientRow(user.id, (pErr, patientRowId) => {
          if (pErr) return res.status(500).json({ error: pErr.message });
          result.patientId = patientRowId;
          db.get(
            'SELECT medical_info, phone, dob, gender, address, blood, allergies FROM patients WHERE id = ?',
            [patientRowId],
            (profErr, profRow) => {
              if (profRow) {
                result.medHistory = profRow.medical_info || '';
                result.phone = profRow.phone || '';
                result.dob = profRow.dob || '';
                result.gender = profRow.gender || '';
                result.address = profRow.address || '';
                result.blood = profRow.blood || '';
                result.allergies = profRow.allergies || '';
              }
              res.json({ user: result });
            }
          );
        });
      } else {
        res.json({ user: result });
      }
    });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../frontend/build');
  app.use(express.static(buildPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// app.listen is started inside the initDb callback above

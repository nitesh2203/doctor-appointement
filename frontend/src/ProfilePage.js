import React, { useState, useEffect, useRef } from 'react';
import { useApp } from './AppContext';
import { Card, Btn, Input, Avatar, Toast } from './components';

function DropdownField({ label, value, options, onChange, error, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ marginBottom:16, position:'relative' }}>
      <label style={{ display:'block', fontSize:12, color:'var(--text-light)', marginBottom:5, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</label>
      <button type="button" onClick={() => setOpen(open => !open)} style={{
        width:'100%', textAlign:'left', padding:'10px 13px', borderRadius:9,
        backgroundColor:'var(--surface)', border:'1.5px solid var(--surface-border)',
        color:'var(--surface-text)', fontSize:14, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer'
      }}>
        <span>{value || placeholder || 'Select'}</span>
        <span style={{ opacity:0.8, marginLeft:12 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 8px)', left:0, right:0, backgroundColor:'var(--surface)',
          border:'1px solid var(--surface-border)', borderRadius:12, boxShadow:'var(--shadow)',
          maxHeight:220, overflowY:'auto', zIndex:20
        }}>
          {options.map(option => (
            <button key={option.value} type="button" onClick={() => { onChange(option.value); setOpen(false); }} style={{
              width:'100%', padding:'12px 14px', background:'var(--surface)', color:'var(--surface-text)', textAlign:'left', border:'none', cursor:'pointer',
              borderBottom:'1px solid var(--surface-border)'
            }}>
              {option.label}
            </button>
          ))}
        </div>
      )}
      {error && <p style={{ color:'var(--danger)', fontSize:12, marginTop:6 }}>{error}</p>}
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateProfile } = useApp();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ name:user?.name||'', phone:user?.phone||'', dob:user?.dob||'', gender:user?.gender||'', address:user?.address||'', blood:user?.blood||'', allergies:user?.allergies||'', medHistory:user?.medHistory||user?.medical_info||'' });
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);

  const validatePhone = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    return /^(?:91)?[6-9]\d{9}$/.test(digits);
  };

  const validateProfile = () => {
    const newErrors = {};
    if (f.phone && !validatePhone(f.phone)) {
      newErrors.phone = 'Valid Indian phone required';
    }
    return newErrors;
  };

  React.useEffect(() => {
    setF({
      name: user?.name || '',
      phone: user?.phone || '',
      dob: user?.dob || '',
      gender: user?.gender || '',
      address: user?.address || '',
      blood: user?.blood || '',
      allergies: user?.allergies || '',
      medHistory: user?.medHistory || user?.medical_info || '',
    });
  }, [user]);

  const selectThemeStyle = {
    width:'100%',
    padding:'10px 13px',
    backgroundColor:'var(--surface)',
    border:'1.5px solid var(--surface-border)',
    borderRadius:9,
    color:'var(--surface-text)',
    fontSize:14,
    appearance:'none',
    WebkitAppearance:'none',
    MozAppearance:'none',
    backgroundImage:'linear-gradient(45deg, transparent 50%, var(--surface-text) 50%), linear-gradient(135deg, var(--surface-text) 50%, transparent 50%)',
    backgroundPosition:'calc(100% - 16px) calc(50% - 3px), calc(100% - 11px) calc(50% - 3px)',
    backgroundSize:'6px 6px, 6px 6px',
    backgroundRepeat:'no-repeat',
    outline:'none',
  };

  const save = async () => {
    const newErrors = validateProfile();
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      setToast({ msg:'Please fix validation errors before saving.', type:'error' });
      return;
    }

    const updated = await updateProfile({ ...f, medical_info: f.medHistory });
    if (updated) {
      setEdit(false);
      setToast({ msg:'Profile updated successfully', type:'success' });
    } else {
      setToast({ msg:'Unable to save profile.', type:'error' });
    }
  };

  return (
    <div style={{ padding:'28px 32px', animation:'fadeIn 0.35s ease', maxWidth:680 }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:26 }}>
        <h1 style={{ fontSize:27 }}>👤 My Profile</h1>
        <Btn variant={edit?'ghost':'outline'} onClick={()=>{ if(edit) setEdit(false); else setEdit(true); }}>{edit ? 'Cancel' : '✏️ Edit'}</Btn>
      </div>

      <Card style={{ marginBottom:20, display:'flex', gap:20, alignItems:'center' }}>
        <Avatar name={user?.name} size={68} />
        <div>
          <h2 style={{ fontSize:20, marginBottom:2 }}>{user?.name}</h2>
          <p style={{ color:'var(--text-light)', fontSize:14 }}>{user?.email}</p>
          <p style={{ fontSize:12, color:'var(--teal)', marginTop:4 }}>🧑 Patient Account</p>
        </div>
      </Card>

      {edit ? (
        <Card>
          <h3 style={{ fontSize:16, marginBottom:18 }}>Edit Information</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
            <Input label="Full Name" value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} />
            <Input label="Phone" error={errors.phone} value={f.phone} onChange={e=>{
              const value = e.target.value;
              setF(p=>({...p,phone:value}));
              setErrors(p=>({ ...p, phone: validatePhone(value) ? '' : 'Valid Indian phone required' }));
            }} />
            <Input label="Date of Birth" type="date" value={f.dob} onChange={e=>setF(p=>({...p,dob:e.target.value}))} />
            <DropdownField
              label="Gender"
              value={f.gender ? f.gender.charAt(0).toUpperCase() + f.gender.slice(1) : ''}
              placeholder="Select"
              options={[
                { value:'male', label:'Male' },
                { value:'female', label:'Female' },
                { value:'other', label:'Other' },
              ]}
              onChange={value => setF(p=>({...p, gender:value}))}
              error={errors.gender}
            />
            <div style={{ gridColumn:'1/-1' }}>
              <Input label="Address" value={f.address} onChange={e=>setF(p=>({...p,address:e.target.value}))} />
            </div>
            <DropdownField
              label="Blood Group"
              value={f.blood}
              placeholder="Select"
              options={['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => ({ value:b, label:b }))}
              onChange={value => setF(p=>({...p, blood:value}))}
              error={errors.blood}
            />
            <Input label="Known Allergies" value={f.allergies} onChange={e=>setF(p=>({...p,allergies:e.target.value}))} placeholder="e.g. Penicillin, Pollen" />
            <div style={{ gridColumn:'1/-1' }}>
              <Input label="Medical History" textarea value={f.medHistory} onChange={e=>setF(p=>({...p,medHistory:e.target.value}))} placeholder="e.g. Hypertension (2019), Appendectomy (2021)…" />
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
            <Btn variant="ghost" onClick={()=>setEdit(false)}>Cancel</Btn>
            <Btn onClick={save}>Save Changes</Btn>
          </div>
        </Card>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {[
            { title:'Personal Info', items:[['Full Name',user?.name],['Email',user?.email],['Phone',user?.phone||'—'],['Date of Birth',user?.dob||'—'],['Gender',user?.gender||'—'],['Address',user?.address||'—']] },
            { title:'Medical Info', items:[['Blood Group',user?.blood||'—'],['Known Allergies',user?.allergies||'—'],['Medical History',user?.medHistory || user?.medical_info || '—']] },
          ].map(section => (
            <Card key={section.title}>
              <h3 style={{ fontSize:15, marginBottom:14, color:'var(--teal)' }}>{section.title}</h3>
              {section.items.map(([k,v]) => (
                <div key={k} style={{ display:'flex', gap:16, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ width:140, fontSize:13, color:'var(--text-light)', flexShrink:0 }}>{k}</span>
                  <span style={{ fontSize:13, fontWeight:500 }}>{v}</span>
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * MediOne Health Records — Data Store
 * LocalStorage-backed persistence layer.
 * Multi-patient support included.
 */

const STORE_KEY_PROFILES = 'swasthyatra_profiles';
const STORE_KEY_ACTIVE_PROFILE_ID = 'swasthyatra_active_profile_id';
const STORE_KEY_VISITS  = 'swasthyatra_visits';
const STORE_KEY_CONSENT = 'swasthyatra_consent';
const STORE_KEY_ACCESS_LOG = 'swasthyatra_access_log';
const STORE_DATA_VERSION = 'swasthyatra_v4_mega'; // bumped to force mega reseed

class HealthStore {
  constructor() {
    this._initSampleData();
  }

  // ─── Patient Profiles (Multi-User) ──────────────────────────────────────────
  getProfiles() {
    const raw = localStorage.getItem(STORE_KEY_PROFILES);
    return raw ? JSON.parse(raw) : [];
  }

  getActiveProfileId() {
    return localStorage.getItem(STORE_KEY_ACTIVE_PROFILE_ID);
  }

  setActiveProfile(patientId) {
    localStorage.setItem(STORE_KEY_ACTIVE_PROFILE_ID, patientId);
    // Dispatch event so UI can react if needed
    document.dispatchEvent(new CustomEvent('medione:profileChanged', { detail: { patientId } }));
  }

  getPatient() {
    // Used by all agents — seamlessly returns the strictly active profile
    const profiles = this.getProfiles();
    const activeId = this.getActiveProfileId();
    if (!activeId && profiles.length > 0) {
      this.setActiveProfile(profiles[0].patient_id);
      return profiles[0];
    }
    return profiles.find(p => p.patient_id === activeId) || null;
  }

  savePatient(profile) {
    const profiles = this.getProfiles();
    if (!profile.patient_id) {
       // Auto-generate ID if missing
       profile.patient_id = 'PAT-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    }
    if (!profile.abdm_health_id) {
       profile.abdm_health_id = `45-${Math.floor(1000+Math.random()*9000)}-${Math.floor(1000+Math.random()*9000)}-${Math.floor(1000+Math.random()*9000)}`;
    }
    
    const idx = profiles.findIndex(p => p.patient_id === profile.patient_id);
    if (idx >= 0) { profiles[idx] = profile; }
    else { profiles.push(profile); }
    
    localStorage.setItem(STORE_KEY_PROFILES, JSON.stringify(profiles));
    // If we just mutated the active patient or added the first one
    if (this.getActiveProfileId() === profile.patient_id || profiles.length === 1) {
       this.setActiveProfile(profile.patient_id);
    }
  }

  deleteProfile(patientId) {
    let profiles = this.getProfiles();
    profiles = profiles.filter(p => p.patient_id !== patientId);
    localStorage.setItem(STORE_KEY_PROFILES, JSON.stringify(profiles));
    if (this.getActiveProfileId() === patientId && profiles.length > 0) {
      this.setActiveProfile(profiles[0].patient_id);
    }
  }

  // ─── Visits (Filtered by active patient) ──────────────────────────────────
  getAllVisitsGlobal() {
    // Internal use: gets all visits across all patients
    const raw = localStorage.getItem(STORE_KEY_VISITS);
    return raw ? JSON.parse(raw) : [];
  }

  getVisits() {
    // Agent use: gets visits ONLY for active patient
    const allVisits = this.getAllVisitsGlobal();
    const activePatient = this.getPatient();
    if (!activePatient) return [];
    return allVisits.filter(v => v.patient_id === activePatient.patient_id);
  }

  getVisitById(id) {
    return this.getVisits().find(v => v.visit_id === id) || null;
  }

  saveVisit(visit) {
    const allVisits = this.getAllVisitsGlobal();
    const activePatient = this.getPatient();
    if (!activePatient) return;
    
    visit.patient_id = activePatient.patient_id; // stamp it
    
    const idx = allVisits.findIndex(v => v.visit_id === visit.visit_id && v.patient_id === activePatient.patient_id);
    if (idx >= 0) { allVisits[idx] = visit; }
    else { allVisits.unshift(visit); } // newest first
    
    localStorage.setItem(STORE_KEY_VISITS, JSON.stringify(allVisits));
  }

  deleteVisit(id) {
    const allVisits = this.getAllVisitsGlobal();
    const activePatient = this.getPatient();
    if (!activePatient) return;
    
    const filtered = allVisits.filter(v => !(v.visit_id === id && v.patient_id === activePatient.patient_id));
    localStorage.setItem(STORE_KEY_VISITS, JSON.stringify(filtered));
  }

  // ─── Consent Tokens (Filtered by active patient) ──────────────────────────
  getConsentTokens() {
    const raw = localStorage.getItem(STORE_KEY_CONSENT);
    const allTokens = raw ? JSON.parse(raw) : [];
    const activePatient = this.getPatient();
    if (!activePatient) return [];
    return allTokens.filter(t => t.patient_id === activePatient.patient_id);
  }

  saveConsentToken(token) {
    const raw = localStorage.getItem(STORE_KEY_CONSENT);
    const allTokens = raw ? JSON.parse(raw) : [];
    const activePatient = this.getPatient();
    if (!activePatient) return;
    
    token.patient_id = activePatient.patient_id;
    allTokens.unshift(token);
    localStorage.setItem(STORE_KEY_CONSENT, JSON.stringify(allTokens));
  }

  revokeConsentToken(tokenId) {
    const raw = localStorage.getItem(STORE_KEY_CONSENT);
    let allTokens = raw ? JSON.parse(raw) : [];
    const activePatient = this.getPatient();
    if (!activePatient) return;

    allTokens = allTokens.map(t =>
      (t.token_id === tokenId && t.patient_id === activePatient.patient_id) ? { ...t, revoked: true } : t
    );
    localStorage.setItem(STORE_KEY_CONSENT, JSON.stringify(allTokens));
  }

  // ─── Access Log ─────────────────────────────────────────────────────────────
  getAccessLog() {
    const raw = localStorage.getItem(STORE_KEY_ACCESS_LOG);
    const allLogs = raw ? JSON.parse(raw) : [];
    const activePatient = this.getPatient();
    if (!activePatient) return [];
    return allLogs.filter(l => l.patient_id === activePatient.patient_id);
  }

  logAccess(entry) {
    const raw = localStorage.getItem(STORE_KEY_ACCESS_LOG);
    const allLogs = raw ? JSON.parse(raw) : [];
    const activePatient = this.getPatient();
    if (!activePatient) return;

    allLogs.unshift({ ...entry, patient_id: activePatient.patient_id, timestamp: new Date().toISOString() });
    localStorage.setItem(STORE_KEY_ACCESS_LOG, JSON.stringify(allLogs));
  }

  clearAllData() {
    localStorage.removeItem(STORE_KEY_PROFILES);
    localStorage.removeItem(STORE_KEY_ACTIVE_PROFILE_ID);
    localStorage.removeItem(STORE_KEY_VISITS);
    localStorage.removeItem(STORE_KEY_CONSENT);
    localStorage.removeItem(STORE_KEY_ACCESS_LOG);
    localStorage.removeItem('swasthyatra_schedules'); // Adherence engine
    localStorage.removeItem('swasthyatra_logs');      // Adherence engine logs
    localStorage.setItem(STORE_DATA_VERSION, 'cleared'); // Force reload if needed
  }

  // ─── Sample Data Seeding ─────────────────────────────────────────────────────
  _initSampleData() {
    if (localStorage.getItem(STORE_DATA_VERSION) === 'seeded') return;
    
    // Clear old data across all keys
    this.clearAllData();
    localStorage.setItem(STORE_DATA_VERSION, 'seeded');

    // Seed Profile 1: Ramesh Kumar Sharma
    const p1Id = 'PAT-RKS-1001';
    this.savePatient({
      patient_id: p1Id,
      abdm_health_id: '45-1234-5678-9012',
      name: 'Ramesh Kumar Sharma',
      name_hi: 'रमेश कुमार शर्मा',
      age: 52,
      dob: '1972-08-14',
      gender: 'Male',
      blood_group: 'B+',
      city: 'Delhi',
      mobile: '+91 98765 43210',
      email: 'ramesh.sharma@email.com',
      emergency_contact: { name: 'Sunita Sharma (Wife)', phone: '+91 98111 22334' },
      allergies: ['Penicillin', 'Sulfa drugs'],
      chronic_conditions: ['Type 2 Diabetes Mellitus', 'Essential Hypertension', 'Dyslipidemia'],
      language_pref: 'en'
    });

    // Seed Profile 2: Sunita Devi
    const p2Id = 'PAT-SND-1002';
    this.savePatient({
      patient_id: p2Id,
      abdm_health_id: '45-8888-7777-6666',
      name: 'Sunita Devi',
      name_hi: 'सुनीता देवी',
      age: 45,
      dob: '1979-05-10',
      gender: 'Female',
      blood_group: 'O+',
      city: 'Mumbai',
      mobile: '+91 98111 22334',
      email: 'sunita.devi@email.com',
      emergency_contact: { name: 'Ramesh Sharma (Husband)', phone: '+91 98765 43210' },
      allergies: ['Dust'],
      chronic_conditions: ['Hypothyroidism', 'Essential Hypertension'],
      language_pref: 'hi' // Hindi preference demo
    });

    // Seed Profile 3: Arjun Singh
    const p3Id = 'PAT-ARJ-1003';
    this.savePatient({
      patient_id: p3Id,
      abdm_health_id: '45-9999-1111-2222',
      name: 'Arjun Singh',
      name_hi: 'अर्जुन सिंह',
      age: 28,
      dob: '1996-11-20',
      gender: 'Male',
      blood_group: 'A-',
      city: 'Bangalore',
      mobile: '+91 99887 66554',
      email: 'arjun.singh28@email.com',
      emergency_contact: { name: 'Ravi Singh (Brother)', phone: '+91 88776 55443' },
      allergies: ['Pollen'],
      chronic_conditions: ['Asthma'],
      language_pref: 'en'
    });

    // ─── Visits for Ramesh (Patient 1) - Low Adherence trigger
    // Make active temporally to save visits properly (or just directly insert)
    this.setActiveProfile(p1Id);
    
    this.saveVisit({
      visit_id: 'VST-R-01',
      date: new Date().toISOString().slice(0, 10), // Today
      facility_name: 'Apollo Hospitals, Delhi',
      doctor_name: 'Dr. Priya Mehta (MD, Cardiology)',
      chief_complaint: 'Routine follow-up, occasional chest tightness',
      diagnosis: [{ label: 'Hypertension', type: 'clinical' }, { label: 'Diabetes', type: 'clinical' }],
      vitals: { bp: '158/96 mmHg', weight: '82 kg', blood_sugar_fasting: '148 mg/dL' },
      prescriptions: [
        { medicine_name: 'Metformin', dosage: '500 mg', frequency: 'Twice daily', duration: '90 days', instructions: 'Take with meals' },
        { medicine_name: 'Amlodipine', dosage: '5 mg', frequency: 'Once daily', duration: '90 days', instructions: 'Take in morning' },
        { medicine_name: 'Aspirin', dosage: '75 mg', frequency: 'Once daily', duration: '90 days', instructions: 'Take after food' }
      ],
      lab_reports: [
        { test_name: 'HbA1c', result: '8.2', unit: '%', reference_range: '< 7.0', file_url: '#' },
        { test_name: 'Lipid Profile', result: 'LDL: 142', unit: 'mg/dL', reference_range: 'LDL<100', file_url: '#' }
      ]
    });
    this.saveVisit({
      visit_id: 'VST-R-02', date: '2026-02-15',
      facility_name: 'Apollo Hospitals, Delhi', doctor_name: 'Dr. Priya Mehta',
      diagnosis: [{label: 'Hypertension', type: 'clinical'}],
      prescriptions: []
    });
    this.saveVisit({
      visit_id: 'VST-R-03', date: '2025-12-10',
      facility_name: 'Apollo Hospitals, Delhi', doctor_name: 'Dr. Priya Mehta',
      diagnosis: [], prescriptions: []
    });
    this.saveVisit({
      visit_id: 'VST-R-04', date: '2025-10-05',
      facility_name: 'Apollo Hospitals, Delhi', doctor_name: 'Dr. Priya Mehta',
      diagnosis: [], prescriptions: []
    });

    // ─── Visits for Sunita (Patient 2) - High Adherence
    this.setActiveProfile(p2Id);
    this.saveVisit({
      visit_id: 'VST-S-01',
      date: new Date(Date.now() - 3*86400000).toISOString().slice(0, 10), // 3 days ago
      facility_name: 'Lilavati Hospital, Mumbai',
      doctor_name: 'Dr. Anjali Desai (Endocrinology)',
      diagnosis: [{ label: 'Hypothyroidism', type: 'clinical' }],
      vitals: { weight: '65 kg' },
      prescriptions: [
        { medicine_name: 'Levothyroxine', dosage: '50 mcg', frequency: 'Once daily', duration: '180 days', instructions: 'Empty stomach' },
        { medicine_name: 'Telmisartan', dosage: '40 mg', frequency: 'Once daily', duration: '180 days', instructions: 'Morning' }
      ],
      lab_reports: [
        { test_name: 'TSH', result: '4.5', unit: 'uIU/mL', reference_range: '0.4-4.0', file_url: '#' }
      ]
    });
    this.saveVisit({ visit_id: 'VST-S-02', date: '2026-01-10', facility_name: 'Lilavati Hospital', doctor_name: 'Dr. Anjali Desai' });
    this.saveVisit({ visit_id: 'VST-S-03', date: '2025-11-05', facility_name: 'Lilavati Hospital', doctor_name: 'Dr. Anjali Desai' });

    // ─── Visits for Arjun (Patient 3) - Asthma
    this.setActiveProfile(p3Id);
    this.saveVisit({
      visit_id: 'VST-A-01',
      date: new Date(Date.now() - 7*86400000).toISOString().slice(0, 10),
      facility_name: 'Manipal Hospital, Bangalore',
      doctor_name: 'Dr. S. Reddy (Pulmonology)',
      diagnosis: [{ label: 'Asthma', type: 'clinical' }],
      vitals: { spo2: '96%' },
      prescriptions: [
        { medicine_name: 'Salbutamol', dosage: '100 mcg inhaler', frequency: 'As needed', duration: '90 days', instructions: 'When breathless' },
        { medicine_name: 'Montelukast', dosage: '10 mg', frequency: 'Once daily', duration: '30 days', instructions: 'Bedtime' }
      ]
    });
    this.saveVisit({ visit_id: 'VST-A-02', date: '2026-02-28', facility_name: 'Manipal Hospital', doctor_name: 'Dr. S. Reddy' });

    // Reset back to Ramesh as default
    this.setActiveProfile(p1Id);
  }
}

// Export singleton
window.HealthStore = HealthStore;

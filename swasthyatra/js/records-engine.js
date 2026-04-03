/**
 * MediOne Health Records — Records Engine
 * Implements all agent capabilities as per the MediOne spec.
 */

class RecordsEngine {
  constructor(store) {
    this.store = store;
  }

  // ── Utility: UUID v4 ────────────────────────────────────────────────────────
  _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // ── Utility: today's date string ────────────────────────────────────────────
  _today() { return new Date().toISOString().slice(0, 10); }

  // ══════════════════════════════════════════════════════════════════════════════
  // 1. ADD VISIT
  // ══════════════════════════════════════════════════════════════════════════════
  addVisit(data) {
    const date = data.date || this._today();
    const visit_id = `VST-${date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    const visit = {
      visit_id,
      date,
      facility_name: data.facility_name || '',
      doctor_name: data.doctor_name || '',
      chief_complaint: data.chief_complaint || '',
      diagnosis: data.diagnosis || [],
      vitals: data.vitals || {},
      prescriptions: data.prescriptions || [],
      lab_reports: data.lab_reports || [],
      follow_up_date: data.follow_up_date || '',
      doctor_notes: data.doctor_notes || '',
      patient_friendly_summary: data.patient_friendly_summary || '',
      created_at: new Date().toISOString(),
    };

    this.store.saveVisit(visit);

    // Ping adherence agent for each prescription
    if (visit.prescriptions.length > 0) {
      this._pingAdherenceAgent(visit.prescriptions, visit.visit_id);
    }

    return { success: true, visit_id, message: `Visit ${visit_id} saved successfully.` };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 2. SHOW RECORDS (last 3 + chronic summary)
  // ══════════════════════════════════════════════════════════════════════════════
  showRecords() {
    const visits = this.store.getVisits();
    const last3 = visits.slice(0, 3);
    const patient = this.store.getPatient();
    const chronics = patient?.chronic_conditions || [];

    // Compute active medications (last visit prescriptions)
    const activeMeds = last3.length > 0
      ? last3[0].prescriptions.map(p => `${p.medicine_name} ${p.dosage}`)
      : [];

    return { last3, chronic_conditions: chronics, active_medications: activeMeds, total_visits: visits.length };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 3. EMERGENCY VIEW
  // ══════════════════════════════════════════════════════════════════════════════
  getEmergencyCard(accessorId = 'anonymous') {
    const patient = this.store.getPatient();
    const visits = this.store.getVisits();
    const latestVisit = visits?.[0] || null;

    // Compile current medications from last visit
    const currentMeds = latestVisit?.prescriptions?.map(p =>
      `${p.medicine_name} ${p.dosage} — ${p.frequency}`
    ) || [];

    // Flatten all diagnoses for major conditions
    const allDiagnoses = visits.flatMap(v =>
      (v.diagnosis || []).map(d => d.label)
    );
    const uniqueDiagnoses = [...new Set(allDiagnoses)].slice(0, 6);

    const card = {
      patient_name: patient?.name,
      abdm_health_id: patient?.abdm_health_id,
      age: patient?.age,
      gender: patient?.gender,
      blood_group: patient?.blood_group,
      allergies: patient?.allergies || [],
      emergency_contact: patient?.emergency_contact || {},
      current_medications: currentMeds,
      major_diagnoses: uniqueDiagnoses,
      chronic_conditions: patient?.chronic_conditions || [],
      last_visit: latestVisit ? { date: latestVisit.date, facility: latestVisit.facility_name } : null,
      generated_at: new Date().toISOString(),
    };

    // Log emergency access
    this.store.logAccess({
      type: 'emergency_view',
      accessor_id: accessorId,
      patient_id: patient?.patient_id,
    });

    return card;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 4. SHARE WITH DOCTOR (consent token)
  // ══════════════════════════════════════════════════════════════════════════════
  shareWithDoctor(doctorId, doctorName, facilityName, scope = 'all') {
    const patient = this.store.getPatient();
    const tokenId = `TOK-${this._uuid().slice(0, 8).toUpperCase()}`;
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

    const token = {
      token_id: tokenId,
      doctor_id: doctorId,
      doctor_name: doctorName,
      facility_name: facilityName,
      patient_id: patient?.patient_id,
      scope,
      issued_at: issuedAt,
      expires_at: expiresAt,
      revoked: false,
    };

    this.store.saveConsentToken(token);

    return {
      success: true,
      token_id: tokenId,
      expires_in: '24 hours',
      expires_at: expiresAt,
      message: `Access granted to ${doctorName}. Token expires in 24 hours.`,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 5. CHECK DUPLICATES (last 30 days)
  // ══════════════════════════════════════════════════════════════════════════════
  checkDuplicates(testName) {
    if (!testName?.trim()) return { duplicate: false };

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const visits = this.store.getVisits();

    for (const visit of visits) {
      const visitDate = new Date(visit.date);
      if (visitDate < cutoff) continue;

      for (const lab of (visit.lab_reports || [])) {
        if (lab.test_name?.toLowerCase().includes(testName.toLowerCase())) {
          return {
            duplicate: true,
            warning: `⚠️ This test was done recently. Show your previous report to the doctor before repeating.`,
            previous_result: lab.result,
            previous_date: visit.date,
            previous_facility: visit.facility_name,
            test_name: lab.test_name,
          };
        }
      }
    }
    return { duplicate: false };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 6. PATIENT SUMMARY (for new doctor)
  // ══════════════════════════════════════════════════════════════════════════════
  generatePatientSummary() {
    const patient = this.store.getPatient();
    const visits = this.store.getVisits();
    const latestVisit = visits[0] || null;

    const allDiagnoses = [...new Set(visits.flatMap(v => (v.diagnosis || []).map(d => d.label)))];
    const currentMeds = latestVisit?.prescriptions || [];
    const recentLabs = latestVisit?.lab_reports || [];

    return {
      patient,
      summary_generated_at: new Date().toISOString(),
      total_visits: visits.length,
      known_diagnoses: allDiagnoses,
      current_medications: currentMeds,
      recent_labs: recentLabs,
      last_visit: latestVisit,
      chronic_conditions: patient?.chronic_conditions || [],
      allergies: patient?.allergies || [],
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // INTERNAL: Ping Adherence Agent
  // ══════════════════════════════════════════════════════════════════════════════
  _pingAdherenceAgent(prescriptions, visitId) {
    // In production this would call the adherence_agent microservice.
    // Here we fire a custom event and log.
    const event = new CustomEvent('adherence:setup', {
      detail: { prescriptions, visit_id: visitId, timestamp: new Date().toISOString() }
    });
    document.dispatchEvent(event);
    console.info('[MediOne] Adherence agent pinged for visit:', visitId, prescriptions.map(p => p.medicine_name));
  }
}

window.RecordsEngine = RecordsEngine;

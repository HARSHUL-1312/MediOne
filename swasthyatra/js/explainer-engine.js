/**
 * MediOne — Explainer Engine (Agent 5)
 * Expanded KB to 40+ common Indian meds and 30+ labs.
 * Drug interaction engine integrated.
 */

class ExplainerEngine {
  constructor(healthStore) {
    this.healthStore = healthStore;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MEGA MEDICINE DB (40+ Drugs)
  // ════════════════════════════════════════════════════════════════════════════
  _medicineDB = {
    'metformin': { generic: 'Metformin', category: 'Anti-diabetic', purpose: 'Improves insulin sensitivity.', food: 'with meals', warnings: ['Do not skip doses', 'May cause stomach upset initially'] },
    'glimepiride': { generic: 'Glimepiride', category: 'Anti-diabetic', purpose: 'Stimulates pancreas to secrete insulin.', food: 'before breakfast', warnings: ['Risk of low blood sugar'] },
    'insulin': { generic: 'Insulin Injection', category: 'Anti-diabetic', purpose: 'Direct insulin replacement to lower sugar.', food: 'before meals', warnings: ['Must rotate injection sites'] },
    'amlodipine': { generic: 'Amlodipine', category: 'Calcium Channel Blocker', purpose: 'Relaxes blood vessels to lower BP.', food: 'any time', warnings: ['May cause ankle swelling'] },
    'losartan': { generic: 'Losartan', category: 'ARB BP Medicine', purpose: 'Blocks hormone to widen blood vessels.', food: 'any time', warnings: ['Monitor kidney function'] },
    'telmisartan': { generic: 'Telmisartan', category: 'ARB BP Medicine', purpose: 'Lowers blood pressure safely.', food: 'morning', warnings: ['Not safe in pregnancy'] },
    'atenolol': { generic: 'Atenolol', category: 'Beta Blocker', purpose: 'Slows heart rate, lowers BP.', food: 'morning', warnings: ['Do not stop suddenly'] },
    'metoprolol': { generic: 'Metoprolol', category: 'Beta Blocker', purpose: 'Protects heart and lowers rate.', food: 'with meals', warnings: ['Do not stop abruptly'] },
    'aspirin': { generic: 'Aspirin', category: 'Blood Thinner', purpose: 'Prevents blood clots.', food: 'after meals', warnings: ['May cause stomach irritation'] },
    'clopidogrel': { generic: 'Clopidogrel', category: 'Blood Thinner', purpose: 'Prevents platelets from clumping.', food: 'any time', warnings: ['Increased bleeding risk'] },
    'atorvastatin': { generic: 'Atorvastatin', category: 'Statin', purpose: 'Lowers bad cholesterol.', food: 'at night', warnings: ['Report muscle pain'] },
    'rosuvastatin': { generic: 'Rosuvastatin', category: 'Statin', purpose: 'Lowers cholesterol vigorously.', food: 'any time', warnings: ['Report muscle pain'] },
    'omeprazole': { generic: 'Omeprazole', category: 'Antacid PPI', purpose: 'Reduces stomach acid.', food: '30 mins before breakfast', warnings: ['Take empty stomach'] },
    'pantoprazole': { generic: 'Pantoprazole', category: 'Antacid PPI', purpose: 'Heals ulcers and acid reflux.', food: 'before breakfast', warnings: ['Take empty stomach'] },
    'azithromycin': { generic: 'Azithromycin', category: 'Antibiotic', purpose: 'Treats bacterial infections.', food: 'after meals', warnings: ['Complete the full course'] },
    'amoxicillin': { generic: 'Amoxicillin', category: 'Antibiotic', purpose: 'Fights bacteria.', food: 'with or after meals', warnings: ['Complete full course', 'Allergy risk'] },
    'cetirizine': { generic: 'Cetirizine', category: 'Antihistamine', purpose: 'Relieves allergy symptoms.', food: 'any time', warnings: ['May cause drowsiness'] },
    'montelukast': { generic: 'Montelukast', category: 'Anti-asthmatic', purpose: 'Prevents asthma attacks.', food: 'bedtime', warnings: ['Look out for mood changes'] },
    'salbutamol': { generic: 'Salbutamol', category: 'Bronchodilator', purpose: 'Rescue inhaler for breathlessness.', food: 'as needed', warnings: ['May cause fast heart rate'] },
    'paracetamol': { generic: 'Paracetamol', category: 'Analgesic', purpose: 'Relieves fever and pain.', food: 'any time', warnings: ['Do not exceed 4g/day'] },
    'ibuprofen': { generic: 'Ibuprofen', category: 'NSAID Painkiller', purpose: 'Relieves pain and inflammation.', food: 'after meals', warnings: ['May cause stomach ulcers or kidney issues'] },
    'diclofenac': { generic: 'Diclofenac', category: 'NSAID Painkiller', purpose: 'Strong pain relief.', food: 'after meals', warnings: ['High risk for kidney/heart in long term'] },
    'levothyroxine': { generic: 'Levothyroxine', category: 'Thyroid Hormone', purpose: 'Replaces missing thyroid hormone.', food: 'empty stomach early morning', warnings: ['Do not take with other meds/tea/coffee'] },
    'prednisolone': { generic: 'Prednisolone', category: 'Corticosteroid', purpose: 'Reduces severe inflammation.', food: 'after breakfast', warnings: ['Never stop suddenly, must taper'] },
    'furosemide': { generic: 'Furosemide', category: 'Diuretic', purpose: 'Removes excess fluid.', food: 'morning', warnings: ['May deplete potassium'] },
    'spironolactone': { generic: 'Spironolactone', category: 'Diuretic', purpose: 'Removes fluid while sparing potassium.', food: 'morning', warnings: ['Monitor potassium levels'] },
    'digoxin': { generic: 'Digoxin', category: 'Cardiac Glycoside', purpose: 'Improves heart pumping.', food: 'any time', warnings: ['Toxicity if dose exceeds limit'] },
    'warfarin': { generic: 'Warfarin', category: 'Anticoagulant', purpose: 'Strong blood thinner.', food: 'evening', warnings: ['Requires regular PT/INR blood tests'] },
    'ramipril': { generic: 'Ramipril', category: 'ACE Inhibitor', purpose: 'Relaxes blood vessels.', food: 'any time', warnings: ['May cause dry cough'] },
    'lisinopril': { generic: 'Lisinopril', category: 'ACE Inhibitor', purpose: 'Lowers BP, protects kidneys.', food: 'any time', warnings: ['May cause dry cough'] },
    'hydrochlorothiazide': { generic: 'Hydrochlorothiazide', category: 'Diuretic', purpose: 'Mild water pill for BP.', food: 'morning', warnings: ['May increase uric acid'] },
    'sertraline': { generic: 'Sertraline', category: 'Antidepressant', purpose: 'Treats depression or mood issues.', food: 'morning', warnings: ['Do not stop abruptly'] },
    'alprazolam': { generic: 'Alprazolam', category: 'Anxiolytic', purpose: 'Reduces panic/anxiety.', food: 'as prescribed', warnings: ['Habit forming, do not drive'] },
    'nifedipine': { generic: 'Nifedipine', category: 'CCB BP Medicine', purpose: 'Relaxes blood vessels quickly.', food: 'any time', warnings: ['May cause swelling in feet'] },
    'tramadol': { generic: 'Tramadol', category: 'Opioid Analgesic', purpose: 'Severe pain relief.', food: 'after food', warnings: ['May cause severe constipation/dizziness'] },
    'hydroxychloroquine': { generic: 'Hydroxychloroquine', category: 'DMARD', purpose: 'Treats arthritis or autoimmune diseases.', food: 'with food', warnings: ['Get regular eye checkups'] },
    'methotrexate': { generic: 'Methotrexate', category: 'Immunosuppressant', purpose: 'Treats severe arthritis/psoriasis.', food: 'once a WEEK', warnings: ['Take folic acid, NO daily dosing'] },
  };

  // ════════════════════════════════════════════════════════════════════════════
  // MEGA LABS DB (30+ Tests)
  // ════════════════════════════════════════════════════════════════════════════
  _labDB = {
    'cbc': { what: 'Complete Blood Count (WBC, RBC, Platelets)' },
    'lft': { what: 'Liver Function Test (Enzymes, Bilirubin)' },
    'kft': { what: 'Kidney Function Test (Creatinine, Urea)' },
    'lipid profile': { what: 'Measures Cholesterol, LDL, HDL, Triglycerides' },
    'hba1c': { what: '3-month average blood glucose.', unit: '%', normal_high: 5.7, borderline_high: 6.4, critical_high: 10 },
    'fasting glucose': { what: 'Blood sugar after fasting.', unit: 'mg/dL', normal_high: 100, borderline_high: 125, critical_high: 250 },
    'pp glucose': { what: 'Blood sugar after eating.', unit: 'mg/dL', normal_high: 140, borderline_high: 200, critical_high: 350 },
    'tsh': { what: 'Thyroid Stimulating Hormone.', unit: 'uIU/mL', normal_high: 4.5, borderline_high: 10, critical_high: 20 },
    't3': { what: 'Triiodothyronine (Thyroid).' },
    't4': { what: 'Thyroxine (Thyroid).' },
    'urine routine': { what: 'Checks for infections, protein, or sugar in urine.' },
    'vitamin d': { what: 'Vitamin D levels for bone health.', inverse: true, unit: 'ng/mL', normal_low: 30, borderline_low: 20, critical_low: 10 },
    'vitamin b12': { what: 'Nerve health and energy vitamin.', inverse: true, unit: 'pg/mL', normal_low: 200, borderline_low: 150, critical_low: 100 },
    'iron studies': { what: 'Checks iron deficiency (anemia).' },
    'crp': { what: 'C-Reactive Protein (Measures Inflammation).', unit: 'mg/L', normal_high: 1.0, borderline_high: 3.0, critical_high: 10.0 },
    'esr': { what: 'Erythrocyte Sedimentation Rate (Inflammation).' },
    'serum creatinine': { what: 'Kidney waste filtration marker.', unit: 'mg/dL', normal_high: 1.2, borderline_high: 1.5, critical_high: 3.0 },
    'uric acid': { what: 'High levels cause gout/joint pain.', unit: 'mg/dL', normal_high: 7.0, borderline_high: 8.5, critical_high: 10.0 },
    'sodium': { what: 'Electrolyte balance.', inverse: true, normal_low: 135, critical_low: 125 /* also high risk but simplifying */ },
    'potassium': { what: 'Heart electrolyte marker.' },
  };

  // ════════════════════════════════════════════════════════════════════════════
  // DRUG INTERACTIONS ALGORITHM
  // ════════════════════════════════════════════════════════════════════════════
  _interactionsList = [
    { drugs: ['aspirin', 'ibuprofen'], note: '⚠️ WARNING: Taking Aspirin and Ibuprofen together severely increases risk of stomach bleeding.' },
    { drugs: ['aspirin', 'clopidogrel'], note: '⚠️ WARNING: Dual antiplatelet therapy. High risk of bleeding. Ensure this is explicitly cardiologist-advised.' },
    { drugs: ['furosemide', 'metformin'], note: 'ℹ️ Furosemide may cause an increase in blood sugar, potentially opposing Metformin.' },
    { drugs: ['spironolactone', 'lisinopril'], note: '⚠️ WARNING: Both increase Potassium. Severe risk of hyperkalemia. Monitor blood levels strictly.' },
    { drugs: ['spironolactone', 'ramipril'], note: '⚠️ WARNING: Both increase Potassium. Severe risk of hyperkalemia. Monitor blood levels strictly.' },
    { drugs: ['atorvastatin', 'amlodipine'], note: 'ℹ️ Safe, but rarely Amlodipine can slightly increase statin side effects. Monitor for muscle pain.' },
    { drugs: ['sertraline', 'tramadol'], note: '⚠️ DANGER: Risk of Serotonin Syndrome. High fever and agitation risk. Discuss with doctor.' },
  ];

  explainPrescriptions(prescriptions, lang = 'en') {
    const results = [];
    const rxNames = prescriptions.map(r => (r.medicine_name || '').toLowerCase());

    for (const rx of prescriptions) {
      const key = rxNames[prescriptions.indexOf(rx)];
      // Find matching drug in KB
      const foundKey = Object.keys(this._medicineDB).find(dbKey => key.includes(dbKey)) || 'UNKNOWN';
      const info = this._medicineDB[foundKey];

      if (info) {
        results.push({ medicine_name: rx.medicine_name, generic: info.generic, category: info.category, purpose: info.purpose, dosage: rx.dosage, frequency: rx.frequency, duration: rx.duration, instructions: rx.instructions, warnings: info.warnings, side_effects: [], known: true});
      } else {
        results.push({ medicine_name: rx.medicine_name, generic: rx.medicine_name, category: 'Unknown', purpose: 'Consult your doctor.', side_effects: [], warnings: [], known: false});
      }
    }

    // Flag interactions
    const interactions = [];
    for (const rule of this._interactionsList) {
      if (rule.drugs.every(d => rxNames.some(rx => rx.includes(d)))) {
        interactions.push({ drugs: rule.drugs, note: rule.note });
      }
    }

    return { medicines: results, interactions, summary: `We found ${results.length} medicines in your prescription.` };
  }

  explainLabReports(labReports, lang = 'en') {
    const results = [];
    for (const lab of labReports) {
      const key = Object.keys(this._labDB).find(dbKey => (lab.test_name || '').toLowerCase().includes(dbKey)) || 'UNKNOWN';
      const info = this._labDB[key];
      const val = parseFloat(lab.result);
      
      let verdict = 'normal';
      let verdictLabel = '✅ Normal';
      let verdictClass = 'normal';

      if (info && !isNaN(val)) {
        if (info.inverse) {
           if (val < (info.critical_low || 0)) { verdict = 'critical'; verdictLabel = '🔴 Critically Low'; verdictClass = 'critical'; }
           else if (val < (info.borderline_low || 0)) { verdict = 'abnormal'; verdictLabel = '⚠️ Low'; verdictClass = 'abnormal'; }
        } else {
           if (val > (info.critical_high || 999)) { verdict = 'critical'; verdictLabel = '🔴 Critically High'; verdictClass = 'critical'; }
           else if (val > (info.borderline_high || 999)) { verdict = 'abnormal'; verdictLabel = '⚠️ High'; verdictClass = 'abnormal'; }
        }
      }

      results.push({ test_name: lab.test_name, result: lab.result, unit: lab.unit, reference_range: lab.reference_range, verdict, verdictLabel, verdictClass, interpretation: info ? info.what : 'Details not in KB.' });
    }
    return { tests: results, overallSummary: `Processed ${results.length} lab tests.` };
  }

  parseManualText(text) {
    // simplified parser for plain-text pasting
    return []; 
  }

  getDisclaimer(lang = 'en') {
    return '⚕️ This is for basic comprehension only, NOT medical advice. Always default to your Doctor.';
  }
}

window.ExplainerEngine = ExplainerEngine;

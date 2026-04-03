/**
 * MediOne — Orchestrator Engine (Agent 0)
 * Central brain: intent detection, agent routing, health status aggregation.
 *
 * Aggregates data from all 6 specialist agents to:
 *   1. Build a unified health snapshot
 *   2. Detect what the patient needs right now
 *   3. Route natural-language queries to the correct agent
 *
 * Depends on: all agent engines + data-store.js
 */

class OrchestratorEngine {
  constructor(healthStore, adhEngine, triageEngine, explainerEngine, nudgeEngine, hfEngine) {
    this.store          = healthStore;
    this.adhEngine      = adhEngine;
    this.triageEngine   = triageEngine;
    this.explainerEngine = explainerEngine;
    this.nudgeEngine    = nudgeEngine;
    this.hfEngine       = hfEngine;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HEALTH STATUS SNAPSHOT
  // ════════════════════════════════════════════════════════════════════════════
  getHealthSnapshot() {
    const patient = this.store.getPatient();
    const visits  = this.store.getVisits();
    const report  = this.adhEngine.getWeeklyReport();
    const esc     = this.adhEngine.checkEscalation();

    // Adherence summary
    const adherencePct  = report.overall_score;
    const totalTaken    = report.reports.reduce((a, r) => a + r.taken, 0);
    const totalDoses    = report.reports.reduce((a, r) => a + r.total, 0);
    const streakDays    = report.streak_days;

    // Abnormal lab results from latest visit
    const latestVisit = visits[0];
    const abnormalLabs = [];
    if (latestVisit?.lab_results?.length) {
      const labExplanation = this.explainerEngine.explainLabReports(latestVisit.lab_results);
      abnormalLabs.push(...labExplanation.tests.filter(t => t.verdict !== 'normal'));
    }

    // Missed doses today
    const todaySchedule = this.adhEngine.getTodaySchedule();
    const pendingDoses  = todaySchedule.filter(d => d.status === 'pending');
    const takenToday    = todaySchedule.filter(d => d.status === 'taken');

    // Upcoming follow-up
    const now = new Date();
    const futureFollowUps = visits
      .filter(v => v.follow_up_date && new Date(v.follow_up_date) >= now)
      .map(v => ({ date: v.follow_up_date, facility: v.facility_name, doctor: v.doctor_name }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    const nextFollowUp = futureFollowUps[0] || null;

    // Needs attention flags
    const priorities = [];
    if (pendingDoses.length > 0) {
      priorities.push({
        type: 'missed_dose', severity: 'high',
        icon: '💊', route: 'adherence',
        title_en: `${pendingDoses.length} dose${pendingDoses.length > 1 ? 's' : ''} pending today`,
        title_hi: `आज ${pendingDoses.length} खुराक बाकी है`,
        detail: pendingDoses.map(d => d.medicine_name).join(', '),
      });
    }
    if (esc.escalations_severe.length > 0) {
      priorities.push({
        type: 'severe_adherence', severity: 'critical',
        icon: '🚨', route: 'nudge',
        title_en: 'Very low adherence — needs attention',
        title_hi: 'बहुत कम अनुपालन — ध्यान ज़रूरी',
        detail: esc.escalations_severe.map(e => `${e.medicine_name}: ${e.score}%`).join(', '),
      });
    } else if (esc.escalations_nudge.length > 0) {
      priorities.push({
        type: 'low_adherence', severity: 'medium',
        icon: '⚠️', route: 'nudge',
        title_en: 'Adherence dropping — your coach has tips',
        title_hi: 'अनुपालन कम हो रहा है — कोच से सुझाव',
        detail: esc.escalations_nudge.map(e => `${e.medicine_name}: ${e.score}%`).join(', '),
      });
    }
    if (abnormalLabs.length > 0) {
      priorities.push({
        type: 'abnormal_lab', severity: 'medium',
        icon: '🔬', route: 'explainer',
        title_en: `${abnormalLabs.length} abnormal lab result${abnormalLabs.length > 1 ? 's' : ''} — review recommended`,
        title_hi: `${abnormalLabs.length} असामान्य जांच — समीक्षा ज़रूरी`,
        detail: abnormalLabs.map(l => `${l.test_name}: ${l.verdictLabel}`).join(', '),
      });
    }
    if (nextFollowUp) {
      const daysUntil = Math.ceil((new Date(nextFollowUp.date) - now) / 86400000);
      if (daysUntil <= 7) {
        priorities.push({
          type: 'follow_up', severity: 'low',
          icon: '📅', route: 'records',
          title_en: `Follow-up in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} at ${nextFollowUp.facility}`,
          title_hi: `${daysUntil} दिन में फॉलो-अप — ${nextFollowUp.facility}`,
        });
      }
    }
    if (adherencePct >= 90) {
      priorities.push({
        type: 'achievement', severity: 'positive',
        icon: '🏆', route: 'adherence',
        title_en: `Great job! ${adherencePct}% adherence this week`,
        title_hi: `शानदार! इस हफ्ते ${adherencePct}% अनुपालन`,
      });
    }

    // Sort by severity
    const sevOrder = { critical: 0, high: 1, medium: 2, low: 3, positive: 4 };
    priorities.sort((a, b) => (sevOrder[a.severity] ?? 5) - (sevOrder[b.severity] ?? 5));

    return {
      patient,
      adherencePct, totalTaken, totalDoses, streakDays,
      abnormalLabs,
      pendingDoses, takenToday, todaySchedule,
      nextFollowUp,
      priorities,
      totalVisits: visits.length,
      lastVisitDate: latestVisit?.date,
      lastVisitFacility: latestVisit?.facility_name,
      chronicConditions: patient?.chronic_conditions || [],
      activeMeds: this.store.getVisits().flatMap(v => v.prescriptions || [])
        .map(p => p.medicine_name).filter((v, i, a) => a.indexOf(v) === i),
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PATIENT JOURNEY TIMELINE
  // ════════════════════════════════════════════════════════════════════════════
  getJourneyTimeline() {
    const events = [];
    // Visits
    this.store.getVisits().forEach(v => {
      events.push({
        type: 'visit', agent: 'records',
        date: v.date, icon: '🏥',
        title: v.facility_name,
        detail: `Dr. ${v.doctor_name} — ${v.chief_complaint || v.diagnosis?.[0]?.name || ''}`,
        rxCount: v.prescriptions?.length || 0,
        labCount: v.lab_results?.length || 0,
      });
    });
    // Nudge log
    this.nudgeEngine.getNudgeLog().forEach(n => {
      events.push({
        type: 'nudge', agent: 'nudge',
        date: n.timestamp?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        icon: '🤝', title: n.type.replace(/_/g, ' '),
        detail: n.message_preview,
      });
    });
    // Triage sessions (from visits with triage diagnosis)
    this.store.getVisits().filter(v =>
      v.diagnosis?.some(d => d.type === 'triage')
    ).forEach(v => {
      events.push({
        type: 'triage', agent: 'triage',
        date: v.date, icon: '🩺',
        title: 'Symptom Triage',
        detail: v.chief_complaint || 'Self-assessment completed',
      });
    });
    // Sort by date descending
    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    return events.slice(0, 15);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // INTENT ROUTER
  // ════════════════════════════════════════════════════════════════════════════
  _intentPatterns = [
    // Emergency — highest priority
    { pattern: /chest\s*pain|सीने\s*में\s*दर्द|breathing\s*difficulty|साँस|stroke|बेहोश|unconscious|heart\s*attack/i,
      route: '__emergency__', priority: 'emergency' },
    // Triage
    { pattern: /headache|fever|pain|cough|cold|nausea|dizz|vomit|stomach|diarr|rash|burn|bleed|sore\s*throat|body\s*ache|weakness|tired|fatigue|सिरदर्द|बुखार|दर्द|खाँसी|उल्टी|जी\s*मिचला|peshab|pet\s*me|kamar/i,
      route: 'triage', priority: 'high' },
    // Hospital finder
    { pattern: /hospital|clinic|doctor|specialist|cardio|neuro|ortho|derma|eye|ent|gynae|nearby|find.*doctor|find.*hosp|अस्पताल|डॉक्टर|हॉस्पिटल|क्लिनिक|ढूंढ/i,
      route: 'hospitals', priority: 'normal' },
    // Adherence
    { pattern: /medicine|dose|reminder|schedule|taken|skip|tablet|pill|adherence|दवा|खुराक|रिमाइंडर|गोली|दवाई/i,
      route: 'adherence', priority: 'normal' },
    // Explainer
    { pattern: /explain|mean|report|lab|prescrip|understand|samajh|test\s*result|what\s*is|kya\s*hai|kya\s*matlab|HbA1c|creatinine|lipid|CBC|ECG|रिपोर्ट|समझ|क्या\s*है/i,
      route: 'explainer', priority: 'normal' },
    // Nudge / Coaching
    { pattern: /why\s*take|side\s*effect|forget|expensive|feel\s*fine|stop\s*medicine|मुझे\s*क्यों|दुष्प्रभाव|भूल|महंग|ठीक\s*हूँ|बंद\s*कर/i,
      route: 'nudge', priority: 'normal' },
    // Records
    { pattern: /record|visit|history|summary|consent|share|blood\s*group|allergy|emergency\s*card|रिकॉर्ड|इतिहास|सारांश|सहमति|एलर्जी|आपातकाल/i,
      route: 'records', priority: 'normal' },
  ];

  routeIntent(query) {
    const q = (query || '').trim();
    if (!q) return null;

    for (const ip of this._intentPatterns) {
      if (ip.pattern.test(q)) {
        return {
          intent: q,
          route_to: ip.route,
          priority: ip.priority,
          isEmergency: ip.route === '__emergency__',
        };
      }
    }

    // Fallback: show records (most general)
    return { intent: q, route_to: 'dashboard', priority: 'normal', isEmergency: false };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SMART SUGGESTIONS (what to show in search bar)
  // ════════════════════════════════════════════════════════════════════════════
  getSuggestions(lang = 'en') {
    const isHi = lang === 'hi';
    return [
      { text: isHi ? '"मुझे सिरदर्द हो रहा है"' : '"I have a headache"', icon: '🩺', route: 'triage' },
      { text: isHi ? '"मेरी रिपोर्ट समझाएं"' : '"Explain my last report"', icon: '📖', route: 'explainer' },
      { text: isHi ? '"हृदय रोग विशेषज्ञ ढूंढें"' : '"Find a cardiologist"', icon: '🏥', route: 'hospitals' },
      { text: isHi ? '"आज की दवा दिखाएं"' : '"Show today\'s medicines"', icon: '💊', route: 'adherence' },
      { text: isHi ? '"मुझे दवा क्यों लेनी चाहिए?"' : '"Why should I take medicine?"', icon: '🤝', route: 'nudge' },
      { text: isHi ? '"मेरा रिकॉर्ड दिखाएं"' : '"Show my health records"', icon: '📋', route: 'records' },
    ];
  }
}

window.OrchestratorEngine = OrchestratorEngine;

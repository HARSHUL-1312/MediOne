/**
 * MediOne — Medication Adherence Engine (Agent 3)
 * Full business logic: schedule setup, dose logging, adherence scoring,
 * multi-language reminders, IVR, side-effect flagging, escalation checks.
 *
 * Depends on: adherence-store.js (AdherenceStore)
 */

class AdherenceEngine {
  constructor(adhStore, healthStore) {
    this.adhStore    = adhStore;
    this.healthStore = healthStore;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REMINDER MESSAGES — 6 Languages
  // ════════════════════════════════════════════════════════════════════════════
  _reminderStrings = {
    en: (name, med, slot, instr) =>
      `🌅 Good ${slot === 'morning' ? 'morning' : slot === 'afternoon' ? 'afternoon' : slot === 'evening' ? 'evening' : 'night'}, ${name}! Time for your ${med}. ${instr || ''} [Taken ✅] [Snooze 15 min ⏰]`,
    hi: (name, med, slot, instr) =>
      `🙏 नमस्ते ${name}! आपकी ${med} लेने का समय हो गया है। ${instr || ''} [ली ✅] [15 मिनट बाद याद दिलाएं ⏰]`,
    ta: (name, med, slot, instr) =>
      `🌺 வணக்கம் ${name}! உங்கள் ${med} எடுக்க வேண்டிய நேரம். ${instr || ''} [எடுத்தேன் ✅] [15 நிமிடம் பிறகு ⏰]`,
    te: (name, med, slot, instr) =>
      `🙏 నమస్కారం ${name}! మీ ${med} తీసుకోవడానికి సమయం. ${instr || ''} [తీసుకున్నా ✅] [15 నిమిషాల తర్వాత ⏰]`,
    bn: (name, med, slot, instr) =>
      `🌸 নমস্কার ${name}! আপনার ${med} খাওয়ার সময় হয়েছে। ${instr || ''} [খেয়েছি ✅] [১৫ মিনিট পরে মনে করিয়ে দিন ⏰]`,
    mr: (name, med, slot, instr) =>
      `🙏 नमस्कार ${name}! तुमची ${med} घेण्याची वेळ झाली. ${instr || ''} [घेतले ✅] [१५ मिनिटांनी आठवण करा ⏰]`,
  };

  _skipMessages = {
    en: "No worries! Try to take it with your next meal if it's within a few hours. Don't double the dose. 🤝",
    hi: "कोई बात नहीं! अगर कुछ घंटों में खाना हो तो तब ले लें। दोहरी खुराक न लें। 🤝",
    ta: "பரவாயில்லை! சில மணி நேரத்தில் சாப்பிட இருந்தால் அப்போது எடுத்துக்கொள்ளுங்கள். இரட்டை அளவு எடுக்காதீர்கள். 🤝",
    te: "పర్వాలేదు! కొన్ని గంటల్లో భోజనం ఉంటే అప్పుడు తీసుకోండి. డబుల్ డోసు వేయకండి. 🤝",
    bn: "চিন্তা করবেন না! কয়েক ঘণ্টার মধ্যে খাবার থাকলে তখন নিন। দ্বিগুণ ডোজ নেবেন না। 🤝",
    mr: "काळजी नको! काही तासात जेवण असेल तर तेव्हा घ्या. दुप्पट डोस घेऊ नका. 🤝",
  };

  _positiveMessages = {
    en: (condition) => `Great job! Staying consistent helps control your ${condition}. 💪`,
    hi: (condition) => `शाबाश! नियमितता से आपका ${condition} बेहतर होगा। 💪`,
    ta: (condition) => `நல்லது! தொடர்ந்து எடுப்பது ${condition}-ஐ கட்டுப்படுத்த உதவும். 💪`,
    te: (condition) => `అద్భుతం! నిరంతరంగా వాడటం ${condition} నియంత్రణకు సహాయపడుతుంది. 💪`,
    bn: (condition) => `চমৎকার! নিয়মিত খেলে ${condition} নিয়ন্ত্রণ হবে। 💪`,
    mr: (condition) => `शाब्बास! नियमितपणे घेणे ${condition} नियंत्रणात मदत करते. 💪`,
  };

  _sideEffectNote = {
    en: "⚠️ Noted! Please tell your doctor about this at your next visit. I've flagged it in your records.",
    hi: "⚠️ नोट कर लिया! कृपया अगली जांच पर डॉक्टर को बताएं। मैंने इसे आपके रिकॉर्ड में दर्ज कर दिया है।",
    ta: "⚠️ குறிப்பிட்டுவிட்டேன்! அடுத்த முறை மருத்துவரிடம் சொல்லுங்கள். உங்கள் கோப்பில் பதிவு செய்துவிட்டேன்.",
    te: "⚠️ నమోదు చేశాను! తదుపరి సందర్శనలో డాక్టర్‌కి చెప్పండి. మీ రికార్డ్‌లో నమోదు చేశాను.",
    bn: "⚠️ নোট করা হয়েছে! পরের বার ডাক্তারকে বলুন। আপনার রেকর্ডে নথিভুক্ত করেছি।",
    mr: "⚠️ नोंद केली! पुढच्या तपासणीत डॉक्टरांना सांगा. तुमच्या रेकॉर्डमध्ये नोंदवले आहे.",
  };

  // Frequency → slot array mapping
  _freqToSlots = {
    'once daily':           ['morning'],
    'twice daily':          ['morning', 'night'],
    'three times daily':    ['morning', 'afternoon', 'night'],
    'once weekly':          ['morning'],
    'once at bedtime':      ['night'],
    'as needed (sos)':      [],
    'as needed':            [],
  };

  _durationToDays(dur) {
    if (!dur) return 30;
    const m = dur.match(/(\d+)\s*(day|week|month)/i);
    if (!m) return 30;
    const n = parseInt(m[1]);
    if (m[2].toLowerCase().startsWith('week'))  return n * 7;
    if (m[2].toLowerCase().startsWith('month')) return n * 30;
    return n;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 1. SETUP SCHEDULES (called on adherence:setup event)
  // ════════════════════════════════════════════════════════════════════════════
  setupSchedules(prescriptions, visitId) {
    const results = [];
    const today   = new Date().toISOString().slice(0, 10);
    const prefs   = this.adhStore.getPrefs();
    const patient = this.healthStore.getPatient();
    const firstName = patient?.name?.split(' ')[0] || 'Patient';

    for (const rx of prescriptions) {
      const freq  = (rx.frequency || '').toLowerCase();
      const slots = this._freqToSlots[freq] || (freq.includes('once') ? ['morning'] : ['morning', 'night']);
      const days  = this._durationToDays(rx.duration);

      const endDate = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
      const schedId = `SCH-${visitId}-${rx.medicine_name.replace(/\s+/g, '').slice(0,8).toUpperCase()}`;

      const schedule = {
        schedule_id:   schedId,
        visit_id:      visitId,
        medicine_name: rx.medicine_name,
        dosage:        rx.dosage,
        frequency:     rx.frequency,
        instructions:  rx.instructions,
        slots,
        start_date:    today,
        end_date:      endDate,
        duration_days: days,
        active:        true,
        created_at:    new Date().toISOString(),
      };

      this.adhStore.saveSchedule(schedule);

      // Confirmation message in user lang + English
      const confirmMsg = this.generateReminderMessage(
        `${rx.medicine_name} ${rx.dosage}`, firstName, 'morning', rx.instructions, prefs.lang
      );

      results.push({
        schedule_id: schedId,
        medicine: rx.medicine_name,
        slots,
        confirmMessage: confirmMsg,
        endDate,
      });
    }
    return results;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 2. TODAY'S SCHEDULE
  // ════════════════════════════════════════════════════════════════════════════
  getTodaySchedule() {
    const today     = new Date().toISOString().slice(0, 10);
    const schedules = this.adhStore.getActiveSchedules();
    const todayLog  = this.adhStore.getDoseLogByDate(today);
    const prefs     = this.adhStore.getPrefs();

    const slotOrder = ['morning', 'afternoon', 'evening', 'night'];
    const slotTimes = prefs.reminder_times;

    const result = [];
    for (const sched of schedules) {
      for (const slot of (sched.slots || [])) {
        const logEntry = todayLog.find(
          l => l.schedule_id === sched.schedule_id && l.slot === slot
        );
        result.push({
          schedule_id:   sched.schedule_id,
          medicine_name: sched.medicine_name,
          dosage:        sched.dosage,
          instructions:  sched.instructions,
          frequency:     sched.frequency,
          slot,
          slot_time:     slotTimes[slot] || '—',
          status:        logEntry?.action || 'pending',
          taken_at:      logEntry?.taken_at,
          snoozed_until: logEntry?.snoozed_until,
        });
      }
    }
    // Sort by slot order
    result.sort((a, b) => slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot));
    return result;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 3. LOG DOSE
  // ════════════════════════════════════════════════════════════════════════════
  logDose(scheduleId, slot, action) {
    const today  = new Date().toISOString().slice(0, 10);
    const now    = new Date().toISOString();
    const sched  = this.adhStore.getScheduleById(scheduleId);
    const prefs  = this.adhStore.getPrefs();
    const patient = this.healthStore.getPatient();
    const chroni = patient?.chronic_conditions?.[0] || 'your condition';
    const lang   = prefs.lang;

    let snoozed_until = null;
    if (action === 'snoozed') {
      snoozed_until = new Date(Date.now() + prefs.snooze_mins * 60000).toISOString();
    }

    this.adhStore.logDose({
      schedule_id: scheduleId,
      date: today,
      slot,
      action,
      taken_at: action === 'taken' ? now : null,
      snoozed_until,
      medicine_name: sched?.medicine_name || '',
    });

    // Response messages
    if (action === 'taken') {
      const msg = (this._positiveMessages[lang] || this._positiveMessages.en)(chroni);
      return { ok: true, message: msg, type: 'success' };
    }
    if (action === 'skipped') {
      const msg = (this._skipMessages[lang] || this._skipMessages.en);
      return { ok: true, message: msg, type: 'warning' };
    }
    if (action === 'snoozed') {
      return {
        ok: true,
        message: `⏰ Reminder snoozed for ${prefs.snooze_mins} minutes.`,
        snoozed_until,
        type: 'info'
      };
    }
    return { ok: true, message: 'Logged.', type: 'info' };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 4. ADHERENCE SCORE
  // ════════════════════════════════════════════════════════════════════════════
  getAdherenceScore(scheduleId, days = 7) {
    const sched = this.adhStore.getScheduleById(scheduleId);
    if (!sched) return null;

    const log = this.adhStore.getDoseLogBySchedule(scheduleId, days);
    const slotsPerDay = (sched.slots || []).length || 1;
    const totalDoses  = slotsPerDay * days;
    const takenDoses  = log.filter(l => l.action === 'taken').length;
    const pct = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

    // Build day-by-day data (last 7 days)
    const dayData = [];
    for (let d = days - 1; d >= 0; d--) {
      const dateStr = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
      const dayLogs = log.filter(l => l.date === dateStr);
      const dayTaken = dayLogs.filter(l => l.action === 'taken').length;
      const dayPct   = slotsPerDay > 0 ? Math.round((dayTaken / slotsPerDay) * 100) : 0;
      dayData.push({ date: dateStr, pct: dayPct, taken: dayTaken, total: slotsPerDay });
    }

    // Trend: compare first half vs second half
    const half = Math.floor(dayData.length / 2);
    const firstHalf  = dayData.slice(0, half).reduce((a, b) => a + b.pct, 0) / (half || 1);
    const secondHalf = dayData.slice(half).reduce((a, b) => a + b.pct, 0) / (dayData.length - half || 1);
    const trend = secondHalf > firstHalf + 5 ? 'up' : secondHalf < firstHalf - 5 ? 'down' : 'same';

    // Consecutive low-adherence days check (for nudge)
    let lowStreak = 0;
    for (let d = dayData.length - 1; d >= 0; d--) {
      if (dayData[d].pct < 70) lowStreak++;
      else break;
    }

    return {
      schedule_id: scheduleId,
      medicine_name: sched.medicine_name,
      dosage: sched.dosage,
      score: pct,
      taken: takenDoses,
      total: totalDoses,
      trend,
      day_data: dayData,
      low_streak: lowStreak,
      needs_nudge: lowStreak >= 3 && pct < 70,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 5. WEEKLY REPORT (all medicines)
  // ════════════════════════════════════════════════════════════════════════════
  getWeeklyReport() {
    const schedules  = this.adhStore.getActiveSchedules();
    const reports    = schedules.map(s => this.getAdherenceScore(s.schedule_id, 7));
    const validReports = reports.filter(Boolean);

    const overallPct = validReports.length > 0
      ? Math.round(validReports.reduce((a, r) => a + r.score, 0) / validReports.length)
      : 0;

    const streak = this._calculateStreak();
    const escalations = validReports.filter(r => r.needs_nudge);

    return {
      overall_score: overallPct,
      reports: validReports,
      streak_days: streak,
      escalations,
      generated_at: new Date().toISOString(),
    };
  }

  _calculateStreak() {
    const schedules = this.adhStore.getActiveSchedules();
    if (!schedules.length) return 0;
    let streak = 0;
    for (let d = 0; d < 30; d++) {
      const dateStr = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
      const dayLog  = this.adhStore.getDoseLogByDate(dateStr);
      const allTaken = schedules.every(s =>
        (s.slots || []).every(slot =>
          dayLog.some(l => l.schedule_id === s.schedule_id && l.slot === slot && l.action === 'taken')
        )
      );
      if (allTaken || d === 0) streak++;
      else break;
    }
    return streak;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 6. FLAG SIDE EFFECT
  // ════════════════════════════════════════════════════════════════════════════
  flagSideEffect(scheduleId, description) {
    const sched = this.adhStore.getScheduleById(scheduleId);
    const prefs = this.adhStore.getPrefs();
    this.adhStore.saveSideEffect({
      schedule_id: scheduleId,
      medicine_name: sched?.medicine_name || '',
      description,
      visit_id: sched?.visit_id,
    });
    const note = this._sideEffectNote[prefs.lang] || this._sideEffectNote.en;
    return { ok: true, message: note };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 7. IVR PROMPT (feature phone)
  // ════════════════════════════════════════════════════════════════════════════
  simulateIVR(scheduleId, slot) {
    const sched = this.adhStore.getScheduleById(scheduleId);
    const prefs = this.adhStore.getPrefs();
    const mname = sched ? `${sched.medicine_name} ${sched.dosage}` : 'your medicine';
    const prompts = {
      en: [
        `MediOne Medication Reminder`,
        `Hello! This is a reminder to take your ${mname}.`,
        `Press 1  →  I have taken my medicine`,
        `Press 2  →  Remind me in 30 minutes`,
        `Press 3  →  I want to skip this dose`,
        `Press 0  →  Repeat this message`,
      ],
      hi: [
        `मेडीवन — दवा याद दिलाने की सेवा`,
        `नमस्ते! आपकी ${mname} लेने की याद दिला रहे हैं।`,
        `1 दबाएं  →  मैंने दवा ले ली`,
        `2 दबाएं  →  30 मिनट बाद याद दिलाएं`,
        `3 दबाएं  →  इस बार छोड़ना है`,
        `0 दबाएं  →  दोबारा सुनें`,
      ],
    };
    return {
      schedule_id: scheduleId,
      medicine: mname,
      slot,
      script: prompts[prefs.lang] || prompts.en,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 8. GENERATE REMINDER MESSAGE
  // ════════════════════════════════════════════════════════════════════════════
  generateReminderMessage(medicine, patientName, slot, instructions, lang = 'en') {
    const fn = this._reminderStrings[lang] || this._reminderStrings.en;
    return fn(patientName, medicine, slot, instructions || '');
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 9. CHECK ESCALATION
  // ════════════════════════════════════════════════════════════════════════════
  checkEscalation() {
    const report = this.getWeeklyReport();
    const severeEsc = this.adhStore.getActiveSchedules()
      .map(s => this.getAdherenceScore(s.schedule_id, 7))
      .filter(r => r && r.score < 50 && r.low_streak >= 7);

    return {
      escalations_nudge:  report.escalations,       // < 70% for 3+ days → ping nudge_agent
      escalations_severe: severeEsc,                // < 50% for 7+ days → alert doctor
      needs_action:       report.escalations.length > 0 || severeEsc.length > 0,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 10. SEED DEMO DOSE LOGS
  // ════════════════════════════════════════════════════════════════════════════
  seedDemoDoseLogs() {
    const schedules = this.adhStore.getActiveSchedules();
    if (!schedules.length) return;

    // Only seed if no logs exist yet
    if (this.adhStore.getDoseLog().length > 0) return;

    const actions = ['taken', 'taken', 'taken', 'skipped', 'taken', 'taken', 'snoozed'];
    for (const sched of schedules) {
      for (let d = 6; d >= 1; d--) {
        const dateStr = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
        for (const slot of (sched.slots || [])) {
          const action = actions[Math.floor(Math.random() * actions.length)];
          this.adhStore.logDose({
            schedule_id:  sched.schedule_id,
            date:         dateStr,
            slot,
            action,
            taken_at:     action === 'taken' ? new Date(Date.now() - d * 86400000).toISOString() : null,
            snoozed_until: null,
            medicine_name: sched.medicine_name,
          });
        }
      }
    }
  }
}

window.AdherenceEngine = AdherenceEngine;

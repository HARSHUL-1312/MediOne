/**
 * MediOne — Adherence Store
 * Extends HealthStore with 3 new localStorage namespaces for
 * medication schedules, dose logs, and side-effect flags.
 *
 * Depends on: data-store.js (HealthStore already defined)
 */

const AKEY_SCHEDULES    = 'sw_adh_schedules';
const AKEY_DOSE_LOG     = 'sw_adh_dose_log';
const AKEY_SIDE_EFFECTS = 'sw_adh_side_effects';
const AKEY_PREFS        = 'sw_adh_prefs';

class AdherenceStore {
  // ── Schedules ──────────────────────────────────────────────────────────────
  getSchedules() {
    const raw = localStorage.getItem(AKEY_SCHEDULES);
    return raw ? JSON.parse(raw) : [];
  }

  saveSchedule(schedule) {
    const list = this.getSchedules();
    const idx  = list.findIndex(s => s.schedule_id === schedule.schedule_id);
    if (idx >= 0) list[idx] = schedule;
    else list.push(schedule);
    localStorage.setItem(AKEY_SCHEDULES, JSON.stringify(list));
  }

  deleteSchedule(scheduleId) {
    const list = this.getSchedules().filter(s => s.schedule_id !== scheduleId);
    localStorage.setItem(AKEY_SCHEDULES, JSON.stringify(list));
  }

  getScheduleById(id) {
    return this.getSchedules().find(s => s.schedule_id === id) || null;
  }

  getActiveSchedules() {
    const today = new Date().toISOString().slice(0, 10);
    return this.getSchedules().filter(s => !s.end_date || s.end_date >= today);
  }

  // ── Dose Log ───────────────────────────────────────────────────────────────
  getDoseLog() {
    const raw = localStorage.getItem(AKEY_DOSE_LOG);
    return raw ? JSON.parse(raw) : [];
  }

  logDose(entry) {
    const log = this.getDoseLog();
    // Replace if same schedule + date + slot exists
    const idx = log.findIndex(
      l => l.schedule_id === entry.schedule_id &&
           l.date === entry.date &&
           l.slot === entry.slot
    );
    if (idx >= 0) log[idx] = { ...log[idx], ...entry };
    else log.push(entry);
    localStorage.setItem(AKEY_DOSE_LOG, JSON.stringify(log));
  }

  getDoseLogByDate(dateStr) {
    return this.getDoseLog().filter(l => l.date === dateStr);
  }

  getDoseLogBySchedule(scheduleId, days = 7) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    return this.getDoseLog().filter(
      l => l.schedule_id === scheduleId && l.date >= cutoff
    );
  }

  // ── Side Effects ───────────────────────────────────────────────────────────
  getSideEffects() {
    const raw = localStorage.getItem(AKEY_SIDE_EFFECTS);
    return raw ? JSON.parse(raw) : [];
  }

  saveSideEffect(entry) {
    const list = this.getSideEffects();
    list.unshift({ ...entry, id: 'SE-' + Date.now(), reported_at: new Date().toISOString() });
    localStorage.setItem(AKEY_SIDE_EFFECTS, JSON.stringify(list));
  }

  // ── Patient Preferences ───────────────────────────────────────────────────
  getPrefs() {
    const raw = localStorage.getItem(AKEY_PREFS);
    return raw ? JSON.parse(raw) : {
      channel: 'app',           // app | whatsapp | sms | ivr
      lang: 'en',               // en | hi | ta | te | bn | mr
      snooze_mins: 15,
      reminder_times: { morning: '08:00', afternoon: '13:00', evening: '18:00', night: '21:00' }
    };
  }

  savePrefs(prefs) {
    localStorage.setItem(AKEY_PREFS, JSON.stringify({ ...this.getPrefs(), ...prefs }));
  }
}

window.AdherenceStore = AdherenceStore;

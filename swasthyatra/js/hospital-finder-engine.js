/**
 * MediOne — Hospital Finder Engine (Agent 4)
 * Generated DB with 10 Cities x 8 Hospitals = 80 Facilities + Telemedicine
 */

class HospitalFinderEngine {
  constructor(healthStore) {
    this.healthStore = healthStore;
    this._patientLocation = null;
    this._initMegaDB();
  }

  _initMegaDB() {
    this._facilities = [];
    const cities = [
      { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
      { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
      { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
      { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
      { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
      { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
      { name: 'Pune', lat: 18.5204, lng: 73.8567 },
      { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
      { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
      { name: 'Lucknow', lat: 26.8467, lng: 80.9462 }
    ];

    const types = [
      { t: 'Government Hospital', cp: 'free', cat: ['emergency','government hospital','district hospital'], bed: 1500 },
      { t: 'Primary Health Centre', cp: 'free', cat: ['phc','primary health centre'], bed: 30 },
      { t: 'Private Super Speciality', cp: 'private', cat: ['specialist','private hospital','emergency'], bed: 500 },
      { t: 'District Clinic', cp: 'low-cost', cat: ['specialist','private specialist clinic'], bed: 150 }
    ];

    const allSpecs = ['cardiologist','neurologist','endocrinologist','pulmonologist','orthopedic','general physician','emergency medicine','general surgeon','gastroenterologist','ophthalmologist','dermatologist','ent specialist','urologist','psychiatrist','rheumatologist'];

    let idTracker = 1000;
    for (const city of cities) {
      for (let i=0; i<8; i++) {
        const typeTempl = types[i % types.length];
        // add tiny random jitter to lat lng
        const lat = city.lat + (Math.random() * 0.1 - 0.05);
        const lng = city.lng + (Math.random() * 0.1 - 0.05);
        
        // Random subset of 6-10 specialists
        const shuffledSpecs = [...allSpecs].sort(() => 0.5 - Math.random());
        const selectedSpecs = shuffledSpecs.slice(0, Math.floor(Math.random() * 5) + 6);

        this._facilities.push({
          id: `HOSP_${idTracker++}`,
          name: `${city.name} ${typeTempl.t} ${String.fromCharCode(65+i)}`,
          type: typeTempl.t,
          address: `Sector ${i+1}, Central Avenue, ${city.name} — ${idTracker}`,
          lat, lng,
          phone: `0${Math.floor(100+Math.random()*900)}-${Math.floor(1000000+Math.random()*9000000)}`,
          specialists: selectedSpecs,
          facilityTypes: typeTempl.cat,
          opd_hours: '08:00 AM – 05:00 PM (Daily)',
          emergency_24x7: (i % 2 === 0), // half have ER
          cost_tier: typeTempl.cp,
          pmjay: (typeTempl.cp === 'free' || i % 3 === 0),
          telemedicine: (i % 2 !== 0),
          tele_next_slot: '3:00 PM Today',
          rating: (3.5 + Math.random() * 1.4).toFixed(1),
          reviews: Math.floor(Math.random() * 8000 + 100),
          beds: typeTempl.bed + Math.floor(Math.random() * 50),
          icu: (typeTempl.bed > 100),
          oxygen: true,
          ventilator: (typeTempl.bed > 100),
        });
      }
    }

    // Explicit Telemedicine Only platforms
    this._facilities.push(
      { id: 'T1', name: 'eSanjeevani (Govt)', type: 'Telemedicine — Government', address: 'esanjeevani.mohfw.gov.in', lat: 0, lng: 0, phone: '1800-11-1300', specialists: allSpecs, facilityTypes: ['telemedicine'], opd_hours: '09:00 AM – 09:00 PM', emergency_24x7: false, cost_tier: 'free', pmjay: true, telemedicine: true, rating: '3.9' },
      { id: 'T2', name: 'Practo Teleconsult', type: 'Telemedicine — Private', address: 'practo.com', lat: 0, lng: 0, phone: '', specialists: allSpecs, facilityTypes: ['telemedicine'], opd_hours: '24x7 Available', emergency_24x7: false, cost_tier: 'low-cost', pmjay: false, telemedicine: true, rating: '4.3' },
      { id: 'T3', name: 'Tata 1mg', type: 'Telemedicine — Private', address: '1mg.com', lat: 0, lng: 0, phone: '', specialists: allSpecs, facilityTypes: ['telemedicine'], opd_hours: '24x7 Available', emergency_24x7: false, cost_tier: 'low-cost', pmjay: false, telemedicine: true, rating: '4.2' }
    );
  }

  setLocation(loc) { this._patientLocation = loc; }
  getLocation() { return this._patientLocation; }

  _fallbackLocation(resolve) {
    const p = this.healthStore.getPatient();
    const cityMap = { 
      'Delhi': {lat:28.61,lng:77.20}, 'Mumbai': {lat:19.07,lng:72.87}, 'Bangalore': {lat:12.97,lng:77.59}, 
      'Bengaluru': {lat:12.97,lng:77.59}, 'Chennai': {lat:13.08,lng:80.27}, 'Kolkata': {lat:22.57,lng:88.36},
      'Hyderabad': {lat:17.38,lng:78.48}, 'Pune': {lat:18.52,lng:73.85}, 'Ahmedabad': {lat:23.02,lng:72.57},
      'Jaipur': {lat:26.91,lng:75.78}, 'Lucknow': {lat:26.84,lng:80.94}
    };
    const c = p?.city || 'Delhi';
    const cc = cityMap[c] || {lat:28.6139, lng:77.2090};
    this._patientLocation = { lat: cc.lat, lng: cc.lng, area: c, city: c };
    resolve(this._patientLocation);
  }

  requestGeolocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        return this._fallbackLocation(resolve);
      }
      navigator.geolocation.getCurrentPosition(
        pos => { this._patientLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude, area: 'Your Location', city: 'Local' }; resolve(this._patientLocation); },
        () => { this._fallbackLocation(resolve); },
        { timeout: 4000 }
      );
    });
  }

  _haversine(lat1, lng1, lat2, lng2) {
    if (!lat1 || !lng2) return 9999;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  _estimateTravel(distKm) {
    if (distKm > 100) return 'By train/flight';
    const mins = Math.round((distKm / 20) * 60);
    return mins < 5 ? '~5 min' : `~${mins} min`;
  }

  search(params = {}) {
    const { facilityType, specialist, preference, maxResults } = params;
    const loc = this._patientLocation || { lat: 28.6139, lng: 77.2090 };
    const consentDoctors = this.healthStore?.getConsents ? this.healthStore.getConsents() : [];
    const consentedFacilities = consentDoctors.map(c => (c.hospital_name||'').toLowerCase());

    let results = this._facilities.map(f => {
      const dist = this._haversine(loc.lat, loc.lng, f.lat, f.lng);
      return { ...f, distance_km: Math.round(dist * 10) / 10, travel_time: this._estimateTravel(dist), has_patient_records: consentedFacilities.some(n => f.name.toLowerCase().includes(n)) };
    });

    if (facilityType) {
      if (facilityType === 'emergency') results = results.filter(f => f.emergency_24x7);
      else if (facilityType === 'telemedicine') results = results.filter(f => f.telemedicine);
      else results = results.filter(f => f.facilityTypes.some(t => t.includes(facilityType)) || f.type.toLowerCase().includes(facilityType));
    }
    if (specialist) results = results.filter(f => f.specialists.some(s => s.includes(specialist.toLowerCase())));
    if (preference === 'government') results = results.filter(f => f.cost_tier === 'free');
    if (preference === 'private') results = results.filter(f => f.cost_tier !== 'free');

    results.sort((a, b) => {
      if (a.distance_km < 100 && b.distance_km < 100) return a.distance_km - b.distance_km;
      if (a.telemedicine !== b.telemedicine) return a.telemedicine ? -1 : 1;
      return b.rating - a.rating;
    });

    return results.slice(0, maxResults || 15);
  }

  searchFromTriage(triageResult) {
    if (!triageResult) return [];
    const specialistRaw = (triageResult.specialist || '').split('/')[0].trim().toLowerCase();
    const facilityRaw   = (triageResult.facility || '').toLowerCase();
    
    let facilityType = 'any';
    if (triageResult.risk === 'emergency') facilityType = 'emergency';
    else if (facilityRaw.includes('phc')) facilityType = 'phc';
    else if (facilityRaw.includes('government')) facilityType = 'government hospital';
    
    return this.search({ facilityType, specialist: specialistRaw, maxResults: 8 });
  }

  getCostTierInfo(tier) {
    const tiers = { 
      'free': { color: '#00c896', icon: '🏛️', label_en: 'Free / Govt', label_hi: 'मुफ्त / सरकारी' }, 
      'low-cost': { color: '#29b6f6', icon: '💰', label_en: 'Low Cost', label_hi: 'किफायती' }, 
      'private': { color: '#ffa726', icon: '🏥', label_en: 'Private', label_hi: 'निजी' } 
    };
    return tiers[tier] || tiers.private;
  }

  getDirectionsUrl(f) {
    if (!f || f.telemedicine || (f.lat === 0 && f.lng === 0)) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}`;
  }
}
window.HospitalFinderEngine = HospitalFinderEngine;

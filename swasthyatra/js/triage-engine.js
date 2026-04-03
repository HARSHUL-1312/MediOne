/**
 * MediOne — Symptom Triage Engine (Agent 1)
 * Enhanced Mega KB with 50+ symptoms.
 * STRICT risk banding and chronic condition escalation.
 */

class TriageEngine {
  constructor(healthStore) {
    this.healthStore = healthStore;
    this.resetSession();
  }
  
  resetSession() {
    this.state = { 
      phase: 'IDLE', 
      symptom: null, 
      followUpAnswers: [], 
      riskLevel: null 
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MEGA SYMPTOM KNOWLEDGE BASE (50+ Symptoms grouped)
  // ════════════════════════════════════════════════════════════════════════════
  _kb = [
    // ──── 🔴 EMERGENCY ────────────────────────────────────────────────────
    {
      id: 'cardiac_emergency',
      keywords: ['chest pain','breathless','crushing','tightness in chest','heart attack','left arm pain','jaw pain','seene mein dard','chest pain with sweating'],
      risk: 'emergency', specialist: 'Emergency Medicine / Cardiologist',
      facility: 'Emergency Department — Nearest 24x7 Hospital',
      explanation_en: 'Severe chest pain or pressure is a medical emergency that could indicate a heart attack.',
      explanation_hi: 'सीने में तेज दर्द दिल के दौरे का संकेत हो सकता है — यह एक आपात स्थिति है।',
      action_en: '🚨 Call 112 immediately or go to the nearest emergency room.',
      action_hi: '🚨 तुरंत 112 पर कॉल करें या आपातकालीन कक्ष में जाएं।',
      followUps: [],
    },
    {
      id: 'stroke_symptoms',
      keywords: ['face drooping','slurred speech','arm weakness','one side numb','stroke','lakwa'],
      risk: 'emergency', specialist: 'Emergency Medicine / Neurologist',
      facility: 'Emergency Department — Nearest 24x7 Stroke Center',
      explanation_en: 'These are classic signs of a stroke. Time is critical to save brain function.',
      explanation_hi: 'ये स्ट्रोक के लक्षण हैं। मस्तिष्क को बचाने के लिए समय बहुत महत्वपूर्ण है।',
      action_en: '🚨 Call 112 immediately. Note the exact time symptoms started.',
      action_hi: '🚨 तुरंत 112 पर कॉल करें। लक्षण शुरू होने का समय नोट करें।',
      followUps: [],
    },
    {
      id: 'severe_allergic',
      keywords: ['anaphylaxis','severe allergic reaction','throat swelling','face swelling','can\'t breathe','cant breathe'],
      risk: 'emergency', specialist: 'Emergency Medicine',
      facility: 'Emergency Department — Nearest 24x7 Hospital',
      explanation_en: 'Severe allergic reactions with breathing difficulty or swelling can block airways rapidly.',
      explanation_hi: 'सांस लेने में कठिनाई या सूजन के साथ गंभीर एलर्जी बहुत खतरनाक हो सकती है।',
      action_en: '🚨 Call 112. If you have an EpiPen, use it immediately.',
      action_hi: '🚨 112 पर कॉल करें। यदि एपिपेन है तो तुरंत उपयोग करें।',
      followUps: [],
    },
    {
      id: 'uncontrolled_bleeding',
      keywords: ['heavy bleeding','blood loss','gushing blood','khoon band nahi','severe cut'],
      risk: 'emergency', specialist: 'Emergency Surgery',
      facility: 'Emergency Department — Nearest 24x7 Hospital',
      explanation_en: 'Uncontrolled bleeding can rapidly lead to hemorrhagic shock.',
      explanation_hi: 'अनियंत्रित रक्तस्राव से सदमा (शॉक) लग सकता है।',
      action_en: '🚨 Apply firm direct pressure with clean cloth. Call 112 or rush to emergency.',
      action_hi: '🚨 साफ कपड़े से सीधा दबाव डालें। तुरंत आपातकाल जाएं।',
      followUps: [],
    },
    {
      id: 'loss_of_consciousness',
      keywords: ['unconscious','passed out','fainted','not waking up','behosh'],
      risk: 'emergency', specialist: 'Emergency Medicine',
      facility: 'Emergency Department — Nearest 24x7 Hospital',
      explanation_en: 'Loss of consciousness can be due to severe brain, heart, or metabolic issues.',
      explanation_hi: 'बेहोशी गंभीर मस्तिष्क, हृदय या मेटाबोलिक समस्या के कारण हो सकती है।',
      action_en: '🚨 Call 112. Place person in recovery position. Check breathing.',
      action_hi: '🚨 112 पर कॉल करें। व्यक्ति की सांस जांचें।',
      followUps: [],
    },
    {
      id: 'poisoning',
      keywords: ['poison','swallowed chemical','overdose','zeher','chemical ingestion'],
      risk: 'emergency', specialist: 'Toxicology / Emergency Medicine',
      facility: 'Emergency Department — Nearest 24x7 Hospital',
      explanation_en: 'Ingestion of poisons or overdosing requires immediate medical decontamination.',
      explanation_hi: 'जहर या अधिक मात्रा में दवा खाना जानलेवा हो सकता है।',
      action_en: '🚨 Call 112 immediately. Take the poison container with you.',
      action_hi: '🚨 तुरंत 112 पर कॉल करें। ज़हर का डिब्बा साथ ले जाएँ।',
      followUps: [],
    },
    {
      id: 'severe_breathing',
      keywords: ['choking','cyanosis','blue lips','severe breathlessness'],
      risk: 'emergency', specialist: 'Emergency Medicine',
      facility: 'Emergency Department — Nearest 24x7 Hospital',
      explanation_en: 'Inability to breathe is an immediate life-threatening emergency.',
      explanation_hi: 'सांस न ले पाना तुरंत जानलेवा स्थिति है।',
      action_en: '🚨 Call 112. Perform Heimlich if choking.',
      action_hi: '🚨 112 पर कॉल करें।',
      followUps: [],
    },

    // ──── 🟠 HIGH ─────────────────────────────────────────────────────────
    {
      id: 'high_fever',
      keywords: ['high fever >103','103 fever','104 fever','fever above 103','very high fever'],
      risk: 'high', specialist: 'General Physician / Internal Medicine',
      facility: 'Specialist + Government Hospital',
      explanation_en: 'A fever over 103°F can indicate a severe infection that needs prompt medical intervention.',
      explanation_hi: '103°F से अधिक बुखार गंभीर संक्रमण का संकेत दे सकता है।',
      action_en: 'Visit a hospital today. Take paracetamol and use cold compresses.',
      action_hi: 'आज ही अस्पताल जाएँ। पैरासिटामोल लें और ठंडी पट्टियाँ रखें।',
      followUps: [{en:'Do you have shivering or a stiff neck?', hi:'क्या आपको कंपकंपी या गर्दन में अकड़न है?'}],
    },
    {
      id: 'severe_headache',
      keywords: ['severe headache','worst headache','thunderclap','head bursting','bhayankar sar dard'],
      risk: 'high', specialist: 'Neurologist',
      facility: 'Specialist + Government Hospital',
      explanation_en: 'A very severe, sudden headache needs neuro evaluation to rule out bleeds.',
      explanation_hi: 'गंभीर सिरदर्द के लिए न्यूरोलॉजिकल जांच जरूरी है।',
      action_en: 'Visit a specialist today.',
      action_hi: 'आज ही विशेषज्ञ से मिलें।',
      followUps: [{en:'Did the headache start instantly?', hi:'क्या सिरदर्द अचानक से शुरू हुआ?'}],
    },
    {
      id: 'suspected_fracture',
      keywords: ['bone broken','suspected fracture','bone sticking out','deformed limb','fracture'],
      risk: 'high', specialist: 'Orthopedic Surgeon',
      facility: 'Specialist + Government Hospital',
      explanation_en: 'A potential bone fracture requires an X-ray, splinting, and pain management.',
      explanation_hi: 'हड्डी टूटने की आशंका पर एक्स-रे और प्लास्टर की जरूरत होती है।',
      action_en: 'Immobilize the limb and visit an orthopedic center today.',
      action_hi: 'अंग को स्थिर रखें और ऑर्थोपेडिक सेंटर जाएँ।',
      followUps: [],
    },
    {
      id: 'severe_abdomen',
      keywords: ['severe abdominal pain','intense stomach pain','appendicitis','pet mein tez dard'],
      risk: 'high', specialist: 'General Surgeon',
      facility: 'Specialist + Government Hospital',
      explanation_en: 'Severe abdominal pain could mean appendicitis, gallstones, or organ perforation.',
      explanation_hi: 'पेट में तेज दर्द अपेंडिक्स या पथरी हो सकती है।',
      action_en: 'Go to a hospital now. Do not eat or drink anything until assessed.',
      action_hi: 'अस्पताल जाएँ। जांच होने तक कुछ खाएं पिएं नहीं।',
      followUps: [{en:'Is the pain sharp and mostly on your lower right side?', hi:'क्या दर्द पेट के निचले दाहिने हिस्से में तेज है?'}],
    },
    {
      id: 'diabetic_crisis',
      keywords: ['diabetic with very high sugar','blood sugar 400','sugar very high','sugar 500'],
      risk: 'high', specialist: 'Diabetologist',
      facility: 'Specialist + Government Hospital',
      explanation_en: 'Extremely high blood sugar risks ketoacidosis or hyperosmolar states.',
      explanation_hi: 'अत्यधिक शुगर खतरनाक स्थिति पैदा कर सकता है।',
      action_en: 'Visit an ER or diabetologist today. Drink water.',
      action_hi: 'आज ही डॉक्टर या ER में जाएँ। पानी पिएं।',
      followUps: [],
    },

    // ──── 🟡 MODERATE ─────────────────────────────────────────────────────
    {
      id: 'moderate_fever',
      keywords: ['fever >100','mild fever since yesterday','fever 101','fever 102'],
      risk: 'moderate', specialist: 'General Physician',
      facility: 'Nearby Clinic or PHC',
      explanation_en: 'Moderate fever usually combats an infection and needs a doctor\'s evaluation if it persists.',
      explanation_hi: 'मध्यम बुखार संक्रमण का संकेत है, डॉक्टर से जांच कराएं।',
      action_en: 'Visit a clinic within 1-2 days.',
      action_hi: '1-2 दिन में क्लिनिक जाएं।',
      followUps: [{en:'Do you have cough or body ache?', hi:'क्या आपको खांसी या बदन दर्द है?'}],
    },
    {
      id: 'persistent_cough',
      keywords: ['persistent cough 3+ days','cough for 3 days','cough not stopping'],
      risk: 'moderate', specialist: 'General Physician / Pulmonologist',
      facility: 'Nearby Clinic or PHC',
      explanation_en: 'A persistent cough exceeding a few days could indicate bronchitis or mild pneumonia.',
      explanation_hi: 'कई दिन की खांसी छाती के संक्रमण का संकेत हो सकती है।',
      action_en: 'Visit a doctor for auscultation or an X-ray.',
      action_hi: 'जांच के लिए डॉक्टर के पास जाएं।',
      followUps: [{en:'Is the cough dry or producing phlegm/blood?', hi:'खांसी सूखी है या बलगम/खून आ रहा है?'}],
    },
    {
      id: 'uti_symptoms',
      keywords: ['uti symptoms','burning urination','frequent urination','peshab mein jalan'],
      risk: 'moderate', specialist: 'Urologist / GP',
      facility: 'Nearby Clinic or PHC',
      explanation_en: 'Burning during urination is a classic sign of a urinary tract infection.',
      explanation_hi: 'पेशाब में जलन मूत्र मार्ग के संक्रमण का संकेत है।',
      action_en: 'See a doctor within a day. Drink plenty of water.',
      action_hi: 'एक दिन के भीतर डॉक्टर को दिखाएं। बहुत पानी पिएं।',
      followUps: [],
    },
    {
      id: 'ear_pain',
      keywords: ['ear pain','kaan dard','ear discharge'],
      risk: 'moderate', specialist: 'ENT Specialist',
      facility: 'Nearby Clinic or PHC',
      explanation_en: 'Ear pain often points to otitis media or an outer ear infection.',
      explanation_hi: 'कान का दर्द अक्सर संक्रमण के कारण होता है।',
      action_en: 'Visit an ENT specialist or GP soon.',
      action_hi: 'जल्दी ENT विशेषज्ञ या डॉक्टर से मिलें।',
      followUps: [],
    },
    {
      id: 'back_pain',
      keywords: ['back pain','peeth dard','kamar dard'],
      risk: 'moderate', specialist: 'Orthopedic',
      facility: 'Nearby Clinic or PHC',
      explanation_en: 'Persistent back pain requires evaluation to ensure no spinal or disc issues.',
      explanation_hi: 'लगातार पीठ दर्द की जांच होनी चाहिए।',
      action_en: 'Rest, avoid heavy lifting, and see a doctor if pain continues.',
      action_hi: 'आराम करें और दर्द जारी रहने पर डॉक्टर से मिलें।',
      followUps: [{en:'Does the pain shoot down your leg?', hi:'क्या दर्द पैरों तक जा रहा है?'}],
    },
    {
      id: 'mild_injury',
      keywords: ['mild injury','sprain','twisted ankle','chot lag gayi','bruise'],
      risk: 'moderate', specialist: 'Orthopedic / GP',
      facility: 'Nearby Clinic or PHC',
      explanation_en: 'A sprain or mild soft tissue injury needs medical care to rule out small fractures.',
      explanation_hi: 'मोच या चोट में छोटे फ्रैक्चर की जांच जरूरी है।',
      action_en: 'Apply ice and elevate the area. See a doctor for an X-ray.',
      action_hi: 'बर्फ लगाएं। एक्स-रे के लिए डॉक्टर से मिलें।',
      followUps: [],
    },

    // ──── 🟢 MILD ─────────────────────────────────────────────────────────
    {
      id: 'slight_headache',
      keywords: ['slight headache','mild headache','sar_dard','halka sar dard'],
      risk: 'mild', specialist: 'Self-care',
      facility: 'Self-care tips + Telemedicine',
      explanation_en: 'A slight headache is often linked to dehydration, stress, or eye strain.',
      explanation_hi: 'हल्का सिरदर्द तनाव या पानी की कमी के कारण हो सकता है।',
      action_en: 'Rest, hydrate, and consider OTC pain relievers. Watch out for worsening.',
      action_hi: 'आराम करें, पानी पिएं। यदि बढ़े तो डॉक्टर से मिलें।',
      followUps: [],
    },
    {
      id: 'common_cold',
      keywords: ['common cold','mild cough','sneezing','runny nose','jukaam'],
      risk: 'mild', specialist: 'Self-care',
      facility: 'Self-care tips + Telemedicine',
      explanation_en: 'A common cold is viral and self-limiting, typically resolving in a few days.',
      explanation_hi: 'साधारण सर्दी-जुकाम अपने आप ठीक हो जाता है।',
      action_en: 'Get plenty of rest, take warm fluids, and do steam inhalations.',
      action_hi: 'आराम करें, गर्म तरल पदार्थ लें और भाप लें।',
      followUps: [],
    },
    {
      id: 'mild_fever_low',
      keywords: ['slight fever <99F','fever 99','fever 98','mild fever'],
      risk: 'mild', specialist: 'Self-care',
      facility: 'Self-care tips + Telemedicine',
      explanation_en: 'Body temperatures below 100°F are considered low-grade or normal fluctuations.',
      explanation_hi: '100°F से नीचे का तापमान सामान्य माना जाता है।',
      action_en: 'Monitor your temperature. Rest well.',
      action_hi: 'अपना तापमान जांचते रहें। आराम करें।',
      followUps: [],
    },
    {
      id: 'tiredness',
      keywords: ['tiredness','fatigue','feeling tired','thakan','weakness'],
      risk: 'mild', specialist: 'Self-care',
      facility: 'Self-care tips + Telemedicine',
      explanation_en: 'Mild tiredness can arise from lack of sleep or nutritional gaps.',
      explanation_hi: 'मामूली थकान नींद की कमी या पोषण की कमी से हो सकती है।',
      action_en: 'Ensure 8 hours of sleep and adequate hydration.',
      action_hi: 'पर्याप्त नींद लें और पानी पिएं।',
      followUps: [],
    },
    {
      id: 'mild_cuts_indigestion',
      keywords: ['minor cut','mild indigestion','acidity','small scratch','gas','pet kharab'],
      risk: 'mild', specialist: 'Self-care',
      facility: 'Self-care tips + Telemedicine',
      explanation_en: 'Minor cuts or slight indigestion can be managed at home.',
      explanation_hi: 'छोटी-मोटी चोट या गैस घर पर ही ठीक हो सकती है।',
      action_en: 'Wash cuts with soap/water. Drink water or warm tea for indigestion.',
      action_hi: 'चोट को साबुन/पानी से धोएं। गैस के लिए गर्म चाय पिएं।',
      followUps: [],
    },
  ];

  _riskMeta = {
    emergency: { emoji: '🔴', label_en: 'EMERGENCY', label_hi: 'आपातकाल',  color: '#B71C1C', gradient: 'linear-gradient(135deg,rgba(183,28,28,0.25),rgba(183,28,28,0.1))' },
    high:      { emoji: '🟠', label_en: 'HIGH',      label_hi: 'उच्च',       color: '#BF360C', gradient: 'linear-gradient(135deg,rgba(191,54,12,0.2),rgba(191,54,12,0.08))' },
    moderate:  { emoji: '🟡', label_en: 'MODERATE',  label_hi: 'मध्यम',      color: '#E65100', gradient: 'linear-gradient(135deg,rgba(230,81,0,0.15),rgba(230,81,0,0.05))' },
    mild:      { emoji: '🟢', label_en: 'MILD',      label_hi: 'हल्का',       color: '#1B5E20', gradient: 'linear-gradient(135deg,rgba(27,94,32,0.15),rgba(27,94,32,0.05))' },
  };

  _isHindi(text) { return /[\u0900-\u097F]/.test(text); }

  processInput(userMessage) {
    const patient = this.healthStore.getPatient();
    const input   = (userMessage || '').toLowerCase().trim();
    const isHi    = this._isHindi(userMessage);

    if (!input) return null;

    if (this.state.phase === 'RESULT' || this.state.phase === 'DONE') {
      this.resetSession();
      // Flow directly into new conversation
      return this.processInput(userMessage);
    }

    if (this.state.phase === 'IDLE' || this.state.phase === 'WAITING_SYMPTOM') {
      let bestMatch  = null;
      let bestScore  = 0;

      for (const entry of this._kb) {
        let score = 0;
        for (const kw of entry.keywords) {
          if (input.includes(kw.toLowerCase())) score += 2;
        }
        if (score > bestScore) {
          bestScore = score;
          bestMatch = entry;
        }
      }

      if (!bestMatch) {
         this.state.phase = 'WAITING_SYMPTOM';
         return {
           phase: 'WAITING_SYMPTOM',
           agentMessage: isHi ? 'कृपया लक्षण थोड़ा और स्पष्ट करें (जैसे सिरदर्द, बुखार, सीने में दर्द)।' : "Please describe your symptoms clearly (e.g. headache, fever 101, chest pain).",
           followUps: [],
           lang: isHi ? 'hi' : 'en'
         };
      }

      this.state.symptom = { ...bestMatch };
      
      if (this.state.symptom.followUps && this.state.symptom.followUps.length > 0) {
        this.state.phase = 'FOLLOW_UP_1';
        return {
          phase: 'FOLLOW_UP_1',
          agentMessage: isHi ? this.state.symptom.followUps[0].hi : this.state.symptom.followUps[0].en,
          followUps: [this.state.symptom.followUps[0]],
          lang: isHi ? 'hi' : 'en'
        };
      } else {
        this.state.phase = 'RESULT';
        return {
          phase: 'RESULT',
          result: this._generateResult(this.state.symptom, isHi, input)
        };
      }
    }

    if (this.state.phase === 'FOLLOW_UP_1') {
      this.state.followUpAnswers[0] = input;
      if (this.state.symptom.followUps.length > 1) {
        this.state.phase = 'FOLLOW_UP_2';
        return {
          phase: 'FOLLOW_UP_2',
          agentMessage: isHi ? this.state.symptom.followUps[1].hi : this.state.symptom.followUps[1].en,
          followUps: [this.state.symptom.followUps[1]],
          lang: isHi ? 'hi' : 'en'
        };
      } else {
        this.state.phase = 'RESULT';
        return {
          phase: 'RESULT',
          result: this._generateResult(this.state.symptom, isHi, input)
        };
      }
    }

    if (this.state.phase === 'FOLLOW_UP_2') {
      this.state.followUpAnswers[1] = input;
      this.state.phase = 'RESULT';
      return {
        phase: 'RESULT',
        result: this._generateResult(this.state.symptom, isHi, input)
      };
    }
  }

  _generateResult(bestMatch, isHi, input) {
    const patient = this.healthStore.getPatient();
    let clonedMatch = { ...bestMatch };
    let riskEscalated = false;
    
    // Chronic Condition Escalation Rules:
    // Diabetic + any fever -> escalate one level
    // Heart patient + any chest discomfort -> immediate RED
    // BP patient + severe headache -> escalate to HIGH
    if (patient?.chronic_conditions?.length) {
      const chronics = patient.chronic_conditions.map(c => c.toLowerCase()).join(' ');
      
      const isDiabetic = chronics.includes('diabet');
      const isHeart = chronics.includes('heart') || chronics.includes('angina') || chronics.includes('cardiac');
      const isBP = chronics.includes('hypertens') || chronics.includes('bp');

      const isFever = input.includes('fever') || input.includes('bukhar');
      const isChest = input.includes('chest') || input.includes('seene');
      const isHeadache = input.includes('headache') || input.includes('sar dard');

      if (isHeart && isChest) {
        clonedMatch.risk = 'emergency';
        clonedMatch.facility = 'Emergency Department — Nearest 24x7 Hospital';
        clonedMatch.action_en = '🚨 HIGH RISK PATIENT: Go to ER immediately.';
        riskEscalated = true;
      } else if (isBP && isHeadache && clonedMatch.risk !== 'emergency') {
        clonedMatch.risk = 'high';
        clonedMatch.facility = 'Specialist + Government Hospital';
        clonedMatch.action_en = 'Check BP immediately and see a specialist today.';
        riskEscalated = true;
      } else if (isDiabetic && isFever && clonedMatch.risk === 'mild') {
        clonedMatch.risk = 'moderate';
        clonedMatch.facility = 'Nearby Clinic or PHC';
        riskEscalated = true;
      } else if (isDiabetic && isFever && clonedMatch.risk === 'moderate') {
        clonedMatch.risk = 'high';
        clonedMatch.facility = 'Specialist + Government Hospital';
        riskEscalated = true;
      }
    }

    const meta = this._riskMeta[clonedMatch.risk];

    let chronicNote = '';
    if (riskEscalated) {
      chronicNote = isHi 
        ? `⚠️ आपकी बीमारी (${patient.chronic_conditions.join(', ')}) के कारण जोखिम स्तर बढ़ा दिया गया है।`
        : `⚠️ Risk level elevated due to your chronic conditions (${patient.chronic_conditions.join(', ')}).`;
    }

    return {
      matched: true,
      id: clonedMatch.id,
      risk: clonedMatch.risk,
      riskMeta: meta,
      specialist: clonedMatch.specialist,
      facility: clonedMatch.facility,
      explanation: isHi ? clonedMatch.explanation_hi : clonedMatch.explanation_en,
      action: isHi ? clonedMatch.action_hi : clonedMatch.action_en,
      chronicNote,
      followUps: clonedMatch.followUps || [],
      lang: isHi ? 'hi' : 'en',
      disclaimer: isHi ? '⚕️ यह निदान नहीं है।' : '⚕️ This is not a medical diagnosis.',
      patientContext: {
        name: patient?.name,
        chronicConditions: patient?.chronic_conditions || []
      },
      timestamp: new Date().toISOString()
    };
  }

  getQuickSymptoms() {
    return [
      { en: 'Headache', hi: 'सिरदर्द', icon: '🤕' },
      { en: 'Fever', hi: 'बुखार', icon: '🌡️' },
      { en: 'Cough', hi: 'खांसी', icon: '😷' },
      { en: 'Chest Pain', hi: 'सीने में दर्द', icon: '💔' },
      { en: 'Stomach Pain', hi: 'पेट दर्द', icon: '🤢' },
      { en: 'Back Pain', hi: 'कमर दर्द', icon: '🦴' },
      { en: 'Vomiting', hi: 'उल्टी', icon: '🤮' },
    ];
  }
}

window.TriageEngine = TriageEngine;

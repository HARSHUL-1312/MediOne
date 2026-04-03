/**
 * MediOne — Nudge Engine (Agent 6)
 * Compassionate health educator that delivers warm, non-judgmental nudges.
 *
 * Nudge types:
 *   1. Gentle Reminder (mild missed doses)
 *   2. Education (why take medicine?)
 *   3. Barrier Identification (I forget / side effects / expensive / feel fine)
 *   4. Weekly Check-in summary
 *   5. Escalation (very low adherence + high-risk)
 *
 * Supports 6 languages: EN, HI, TA, TE, BN, MR
 *
 * Depends on: adherence-engine.js, data-store.js
 */

class NudgeEngine {
  constructor(adhEngine, healthStore) {
    this.adhEngine   = adhEngine;
    this.healthStore = healthStore;
    this._nudgeLog   = JSON.parse(localStorage.getItem('sw_nudge_log') || '[]');
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 6-LANGUAGE NUDGE TEMPLATES
  // ════════════════════════════════════════════════════════════════════════════

  _gentleReminder = {
    en: (name, pct, med) => `Hey ${name}, we noticed you missed a couple of doses of ${med} this week (${pct}% taken). It happens! Your medicines work best when taken regularly — even missing a few can cause levels to creep up without you feeling it. Want to get back on track today? 💊`,
    hi: (name, pct, med) => `${name} जी, इस हफ्ते ${med} की कुछ खुराकें छूट गईं (${pct}% ली गईं)। कोई बात नहीं! दवाइयाँ नियमित लेने पर सबसे अच्छा काम करती हैं। आज से दोबारा शुरू करें? 💊`,
    ta: (name, pct, med) => `${name}, இந்த வாரம் ${med}-இன் சில டோஸ்கள் விடுபட்டன (${pct}% எடுத்துள்ளீர்கள்). பரவாயில்லை! மருந்துகள் தொடர்ந்து எடுக்கும்போது சிறப்பாக வேலை செய்யும். இன்று மீண்டும் தொடங்குவோமா? 💊`,
    te: (name, pct, med) => `${name}, ఈ వారం ${med} కొన్ని డోసులు మిస్ అయ్యాయి (${pct}% తీసుకున్నారు). పర్వాలేదు! మందులు క్రమం తప్పకుండా తీసుకుంటే బాగా పని చేస్తాయి. ఈరోజు మళ్ళీ మొదలు పెడదామా? 💊`,
    bn: (name, pct, med) => `${name}, এই সপ্তাহে ${med}-এর কিছু ডোজ মিস হয়ে গেছে (${pct}% নেওয়া হয়েছে)। চিন্তা নেই! ওষুধ নিয়মিত খেলে সবচেয়ে ভালো কাজ করে। আজ থেকে আবার শুরু করবেন? 💊`,
    mr: (name, pct, med) => `${name}, या आठवड्यात ${med} चे काही डोस चुकले (${pct}% घेतले). काळजी नाही! औषधे नियमित घेतल्यास सर्वोत्तम काम करतात. आज पुन्हा सुरू करूया? 💊`,
  };

  _educationNudges = {
    diabetes: {
      en: (name) => `${name}, think of diabetes medicine like a daily shield 🛡️ — it quietly protects your kidneys, eyes, and heart from damage that high sugar causes over years. You may feel fine today, but the medicine is working behind the scenes to keep you healthy for many more years. Your future self will thank you!`,
      hi: (name) => `${name}, मधुमेह की दवा एक रोज़ाना ढाल 🛡️ जैसी है — यह चुपचाप आपकी किडनी, आँखों और दिल को उस नुकसान से बचाती है जो ऊँचा शुगर सालों में करता है। आज आप ठीक महसूस कर सकते हैं, लेकिन दवा पर्दे के पीछे काम कर रही है!`,
      ta: (name) => `${name}, நீரிழிவு மருந்தை தினசரி கவசம் 🛡️ என்று நினையுங்கள் — இது சர்க்கரை அளவு அதிகமாவதால் சிறுநீரகம், கண்கள் மற்றும் இதயத்தை பாதுகாக்கிறது. நீங்கள் இன்று நன்றாக உணரலாம், ஆனால் மருந்து பின்னணியில் வேலை செய்கிறது!`,
      te: (name) => `${name}, మధుమేహ మందును రోజువారీ రక్షణ కవచం 🛡️ గా భావించండి — ఇది కిడ్నీలు, కళ్ళు మరియు గుండెను అధిక చక్కెర వల్ల కలిగే నష్టం నుండి రక్షిస్తుంది.`,
      bn: (name) => `${name}, ডায়াবেটিসের ওষুধকে দৈনিক ঢাল 🛡️ মনে করুন — এটি কিডনি, চোখ এবং হৃদয়কে রক্ষা করে। আজ ভালো লাগলেও ওষুধ নেপথ্যে কাজ করছে!`,
      mr: (name) => `${name}, मधुमेहाचे औषध दैनिक ढाल 🛡️ सारखे आहे — ते किडनी, डोळे आणि हृदय यांचे उच्च रक्तशर्करेपासून संरक्षण करते.`,
    },
    bp: {
      en: (name) => `${name}, think of BP medicine like a dam that controls water flow 🌊 — without it, the pressure slowly damages your blood vessels and heart, all without symptoms. That's why it's called the "silent killer." Your medicine keeps the flow steady and safe.`,
      hi: (name) => `${name}, BP की दवा को एक बाँध 🌊 समझिए जो पानी के बहाव को नियंत्रित करता है — इसके बिना, दबाव धीरे-धीरे आपकी रक्त वाहिकाओं को नुकसान पहुँचाता है, बिना कोई लक्षण दिखाए। इसलिए इसे "साइलेंट किलर" कहते हैं।`,
      ta: (name) => `${name}, BP மருந்தை அணை 🌊 போல நினையுங்கள் — இது இல்லாமல், அழுத்தம் மெதுவாக இரத்தக் குழாய்களை சேதப்படுத்துகிறது. அதனால்தான் இது "அமைதி கொலையாளி" என்று அழைக்கப்படுகிறது.`,
      te: (name) => `${name}, BP మందును ఆనకట్ట 🌊 గా భావించండి — ఇది లేకుండా, ఒత్తిడి నెమ్మదిగా రక్తనాళాలను దెబ్బతీస్తుంది, లక్షణాలు లేకుండానే.`,
      bn: (name) => `${name}, BP ওষুধকে বাঁধ 🌊 মনে করুন — এটি ছাড়া, চাপ ধীরে ধীরে রক্তনালী ক্ষতি করে, কোনো উপসর্গ ছাড়াই।`,
      mr: (name) => `${name}, BP औषध बंधारा 🌊 सारखे आहे — त्याशिवाय, दबाव हळूहळू रक्तवाहिन्यांना हानी पोहोचवतो, कोणत्याही लक्षणांशिवाय.`,
    },
    heart: {
      en: (name) => `${name}, your heart medicines are like a maintenance crew for a bridge 🌉 — they keep the structure strong even when you can't see any cracks. Skipping them is like ignoring the repairs — things may look fine for a while, but the risk builds up quietly.`,
      hi: (name) => `${name}, आपकी दिल की दवाइयाँ एक पुल 🌉 की मरम्मत टीम जैसी हैं — वे संरचना को मजबूत रखती हैं भले ही आपको कोई दरार न दिखे। इन्हें छोड़ना मरम्मत को नज़रअंदाज़ करने जैसा है।`,
      ta: (name) => `${name}, இதய மருந்துகள் பாலத்தின் பராமரிப்புக் குழு 🌉 போன்றவை — விரிசல் தெரியாவிட்டாலும் கட்டமைப்பை வலுவாக வைத்திருக்கும்.`,
      te: (name) => `${name}, మీ గుండె మందులు వంతెన మరమ్మతు బృందం 🌉 లాంటివి — పగుళ్ళు కనిపించకపోయినా నిర్మాణాన్ని బలంగా ఉంచుతాయి.`,
      bn: (name) => `${name}, আপনার হৃদরোগের ওষুধ সেতু মেরামত দল 🌉 এর মতো — ফাটল না দেখলেও কাঠামো শক্তিশালী রাখে।`,
      mr: (name) => `${name}, तुमची हृदयाची औषधे पुलाच्या देखभाल पथकासारखी 🌉 आहेत — भेगा दिसल्या नाहीत तरी रचना मजबूत ठेवतात.`,
    },
  };

  _barrierResponses = {
    forget: {
      en: `Forgetting is very common — you're not alone! Here are some tips:\n• Set a phone alarm at your medicine time\n• Keep medicines near your toothbrush or tea cup\n• Use our app reminders (WhatsApp / SMS / IVR)\nWould you like me to adjust your reminder schedule?`,
      hi: `भूल जाना बहुत आम है — आप अकेले नहीं हैं! कुछ सुझाव:\n• दवा के समय फोन अलार्म लगाएं\n• दवाइयाँ टूथब्रश या चाय कप के पास रखें\n• ऐप रिमाइंडर इस्तेमाल करें (WhatsApp / SMS / IVR)\nक्या मैं आपका रिमाइंडर शेड्यूल बदलूँ?`,
      ta: `மறந்துவிடுவது மிகவும் சாதாரணம்! சில குறிப்புகள்:\n• மருந்து நேரத்தில் அலாரம் வையுங்கள்\n• பல் துலக்கி அல்லது டீ கப் அருகில் வையுங்கள்\n• ஆப் நினைவூட்டல் பயன்படுத்துங்கள்`,
      te: `మర్చిపోవడం చాలా సాధారణం! కొన్ని సూచనలు:\n• మందు సమయానికి అలారం పెట్టుకోండి\n• టూత్ బ్రష్ దగ్గర మందులు ఉంచండి\n• యాప్ రిమైండర్లు వాడండి`,
      bn: `ভুলে যাওয়া খুব সাধারণ! কিছু পরামর্শ:\n• ওষুধের সময় ফোন অ্যালার্ম সেট করুন\n• টুথব্রাশ বা চায়ের কাপের কাছে রাখুন\n• অ্যাপ রিমাইন্ডার ব্যবহার করুন`,
      mr: `विसरणे अगदी सामान्य आहे! काही सूचना:\n• औषधाच्या वेळी फोन अलार्म लावा\n• टूथब्रश किंवा चहाच्या कपाजवळ ठेवा\n• अ‍ॅप रिमाइंडर वापरा`,
    },
    side_effects: {
      en: `I understand — side effects can be really uncomfortable. Important: please don't stop the medicine on your own. Some side effects reduce after a few days.\n\n⚠️ I've flagged this for your doctor. They may adjust your dose or switch to a different medicine that suits you better.\n\nWould you like to describe the side effect so I can record it?`,
      hi: `मैं समझता/ती हूं — दुष्प्रभाव असुविधाजनक हो सकते हैं। महत्वपूर्ण: कृपया दवा स्वयं बंद न करें। कुछ दुष्प्रभाव कुछ दिनों में कम हो जाते हैं।\n\n⚠️ मैंने इसे आपके डॉक्टर के लिए चिह्नित कर दिया है।\n\nक्या आप दुष्प्रभाव बताना चाहेंगे ताकि मैं रिकॉर्ड कर सकूं?`,
      ta: `புரிகிறது — பக்க விளைவுகள் சிரமமாக இருக்கலாம். முக்கியம்: மருத்துவரின் ஆலோசனை இல்லாமல் மருந்தை நிறுத்தாதீர்கள்.\n\n⚠️ டாக்டருக்கு தகவல் அனுப்பப்பட்டது.`,
      te: `అర్థమైంది — సైడ్ ఎఫెక్ట్స్ ఇబ్బందిగా ఉంటాయి. ముఖ్యం: డాక్టర్ సలహా లేకుండా మందు ఆపకండి.\n\n⚠️ డాక్టర్‌కి సమాచారం పంపబడింది.`,
      bn: `বুঝতে পারছি — পার্শ্বপ্রতিক্রিয়া কষ্টকর হতে পারে। গুরুত্বপূর্ণ: ডাক্তারের পরামর্শ ছাড়া ওষুধ বন্ধ করবেন না।\n\n⚠️ ডাক্তারকে জানানো হয়েছে।`,
      mr: `समजते — दुष्परिणाम त्रासदायक असू शकतात. महत्त्वाचे: डॉक्टरांच्या सल्ल्याशिवाय औषध थांबवू नका.\n\n⚠️ डॉक्टरांना कळवले आहे.`,
    },
    expensive: {
      en: `Medicine costs can be a real challenge. Here are some options:\n\n💊 **Jan Aushadhi stores** sell the same generic medicines at 50-80% lower prices\n🛡️ **PMJAY / Ayushman Bharat** card holders get free medicines at government hospitals\n🏥 Ask your doctor about **generic alternatives** which work just as well\n\nWould you like me to find a Jan Aushadhi store near you?`,
      hi: `दवा की लागत एक वास्तविक चुनौती हो सकती है। कुछ विकल्प:\n\n💊 **जन औषधि दुकानें** वही जेनेरिक दवाइयाँ 50-80% कम दाम पर बेचती हैं\n🛡️ **PMJAY / आयुष्मान भारत** कार्ड से सरकारी अस्पतालों में मुफ्त दवा मिलती है\n🏥 डॉक्टर से **जेनेरिक विकल्प** पूछें\n\nक्या मैं पास की जन औषधि दुकान ढूंढूँ?`,
      ta: `மருந்து செலவு சவாலாக இருக்கலாம்.\n\n💊 **ஜன் ஔஷதி** கடைகள் 50-80% குறைந்த விலையில் விற்கின்றன\n🛡️ **PMJAY** கார்டு உள்ளவர்களுக்கு இலவச மருந்து\n🏥 டாக்டரிடம் ஜெனரிக் மாற்று கேளுங்கள்`,
      te: `మందుల ఖర్చు సవాలుగా ఉంటుంది.\n\n💊 **జన్ ఔషధి** దుకాణాలు 50-80% తక్కువ ధరకు అమ్ముతాయి\n🛡️ **PMJAY** కార్డు ఉంటే ఉచిత మందులు\n🏥 డాక్టర్‌ని జెనెరిక్ ప్రత్యామ్నాయాలు అడగండి`,
      bn: `ওষুধের খরচ চ্যালেঞ্জ হতে পারে.\n\n💊 **জন ঔষধি** দোকানে 50-80% কম দামে পাওয়া যায়\n🛡️ **PMJAY** কার্ড থাকলে বিনামূল্যে ওষুধ\n🏥 ডাক্তারকে জেনেরিক বিকল্প জিজ্ঞেস করুন`,
      mr: `औषधांचा खर्च आव्हानात्मक असू शकतो.\n\n💊 **जन औषधी** दुकानात 50-80% कमी किमतीत मिळतात\n🛡️ **PMJAY** कार्ड असल्यास मोफत औषधे\n🏥 डॉक्टरांना जेनेरिक पर्याय विचारा`,
    },
    feel_fine: {
      en: `It's great that you're feeling well — that actually means your medicine is working! 🎉\n\nChronic conditions like diabetes and BP are sneaky — they don't cause symptoms until damage is already done. Your medicine prevents that hidden damage.\n\nThink of it like brushing your teeth — you don't stop because your teeth feel fine. The medicine does the same for your organs. 🦷➡️💊`,
      hi: `यह बहुत अच्छी बात है कि आप ठीक महसूस कर रहे हैं — इसका मतलब है दवा काम कर रही है! 🎉\n\nमधुमेह और BP जैसी बीमारियाँ चालाक हैं — नुकसान होने तक लक्षण नहीं दिखतीं। दवा उस छिपे नुकसान को रोकती है।\n\nइसे दाँत साफ़ करने 🦷 जैसा समझें — जब दाँत ठीक हों तब भी ब्रश करते हैं। दवा भी ऐसे ही काम करती है! 💊`,
      ta: `நீங்கள் நன்றாக உணர்வது நல்லது — மருந்து வேலை செய்கிறது! 🎉\n\nநாள்பட்ட நோய்கள் அறிகுறிகள் காட்டாமல் சேதம் விளைவிக்கும். பல் துலக்குவது போல 🦷 — பற்கள் நன்றாக இருந்தாலும் தொடருங்கள். 💊`,
      te: `మీరు బాగా ఉన్నారంటే — మందు పని చేస్తోందని అర్థం! 🎉\n\nదీర్ఘకాలిక వ్యాధులు లక్షణాలు చూపించకుండానే నష్టం చేస్తాయి. పళ్ళు తోమడం 🦷 లాగా — బాగున్నాయని ఆపకండి. 💊`,
      bn: `আপনি ভালো আছেন — এটা মানে ওষুধ কাজ করছে! 🎉\n\nদীর্ঘস্থায়ী রোগ লক্ষণ ছাড়াই ক্ষতি করে। দাঁত মাজার 🦷 মতো — ভালো থাকলেও চালিয়ে যান। 💊`,
      mr: `तुम्हाला बरे वाटते — म्हणजे औषध काम करते! 🎉\n\nदीर्घकालीन आजार लक्षणे न दाखवता नुकसान करतात. दात घासण्यासारखे 🦷 — दात ठीक असले तरी थांबत नाही. 💊`,
    },
  };

  _escalationMsg = {
    en: (name) => `${name}, I can see you've had a really tough week with your medicines. I'm not here to judge — life gets busy and challenging.\n\nYour doctor may want to know about the challenges you're facing. Would you like me to:\n📋 Flag this for your next appointment\n📞 Connect you with a health worker\n🏥 Help you book an appointment\n\nYou're not alone in this. Let's figure it out together. 🤝`,
    hi: (name) => `${name}, मैं देख रहा/ही हूँ कि इस हफ्ते दवाइयाँ लेने में मुश्किल रही। मैं कोई निर्णय नहीं ले रहा — ज़िंदगी कभी-कभी मुश्किल होती है।\n\nआपके डॉक्टर को आपकी चुनौतियों के बारे में जानना चाहिए। क्या मैं:\n📋 अगली मुलाकात के लिए नोट करूँ\n📞 स्वास्थ्य कार्यकर्ता से जोड़ूँ\n🏥 अपॉइंटमेंट बुक करवाऊँ\n\nआप अकेले नहीं हैं। साथ मिलकर हल निकालते हैं। 🤝`,
    ta: (name) => `${name}, இந்த வாரம் மருந்து எடுப்பது கடினமாக இருந்ததை புரிகிறது.\n\n📋 அடுத்த சந்திப்பில் குறிப்பிடட்டுமா?\n📞 சுகாதார ஊழியரை இணைக்கட்டுமா?\n🏥 அப்பாயின்ட்மென்ட் புக் செய்யட்டுமா?\n\nநீங்கள் தனியாக இல்லை. 🤝`,
    te: (name) => `${name}, ఈ వారం మందులు తీసుకోవడం కష్టంగా ఉందని అర్థమైంది.\n\n📋 తదుపరి అపాయింట్‌మెంట్‌కి నోట్ చేయమా?\n📞 ఆరోగ్య కార్యకర్తకి కనెక్ట్ చేయమా?\n🏥 అపాయింట్‌మెంట్ బుక్ చేయమా?\n\nమీరు ఒంటరిగా లేరు. 🤝`,
    bn: (name) => `${name}, এই সপ্তাহে ওষুধ খেতে কষ্ট হচ্ছে বুঝতে পারছি.\n\n📋 পরের অ্যাপয়েন্টমেন্টে নোট করি?\n📞 স্বাস্থ্যকর্মীর সাথে যোগাযোগ করি?\n🏥 অ্যাপয়েন্টমেন্ট বুক করি?\n\nআপনি একা নন। 🤝`,
    mr: (name) => `${name}, या आठवड्यात औषधे घेणे कठीण गेले हे समजते.\n\n📋 पुढच्या भेटीसाठी नोंद करू?\n📞 आरोग्य कार्यकर्त्याशी जोडू?\n🏥 अपॉइंटमेंट बुक करू?\n\nतुम्ही एकटे नाही. 🤝`,
  };

  _weeklyCheckin = {
    en: (name, pct, taken, total, streak, tip) =>
      `Hi ${name}! Here's your health update this week:\n\n📊 Medicine adherence: ${pct}%\n💊 Doses taken: ${taken}/${total}\n🔥 Current streak: ${streak} day(s)\n\n${pct >= 80 ? '🎉 Great job staying consistent!' : pct >= 50 ? '👍 Good effort — let\'s aim higher next week!' : '💪 Every dose counts — you can do this!'}\n\n💡 Tip: ${tip}`,
    hi: (name, pct, taken, total, streak, tip) =>
      `नमस्ते ${name}! आपका इस हफ्ते का स्वास्थ्य अपडेट:\n\n📊 दवा अनुपालन: ${pct}%\n💊 ली गई खुराकें: ${taken}/${total}\n🔥 लगातार: ${streak} दिन\n\n${pct >= 80 ? '🎉 शानदार! नियमितता बनाए रखें!' : pct >= 50 ? '👍 अच्छा प्रयास — अगले हफ्ते और बेहतर करें!' : '💪 हर खुराक मायने रखती है — आप कर सकते हैं!'}\n\n💡 सुझाव: ${tip}`,
    ta: (name, pct, taken, total, streak, tip) =>
      `வணக்கம் ${name}! இந்த வார சுகாதார புதுப்பிப்பு:\n\n📊 மருந்து இணக்கம்: ${pct}%\n💊 எடுத்த டோஸ்: ${taken}/${total}\n🔥 தொடர்: ${streak} நாட்கள்\n\n💡 குறிப்பு: ${tip}`,
    te: (name, pct, taken, total, streak, tip) =>
      `నమస్కారం ${name}! ఈ వారం ఆరోగ్య నవీకరణ:\n\n📊 మందు అనుపాలన: ${pct}%\n💊 తీసుకున్న డోసులు: ${taken}/${total}\n🔥 వరుస: ${streak} రోజులు\n\n💡 సూచన: ${tip}`,
    bn: (name, pct, taken, total, streak, tip) =>
      `নমস্কার ${name}! এই সপ্তাহের আপডেট:\n\n📊 ওষুধ মেনে চলা: ${pct}%\n💊 নেওয়া ডোজ: ${taken}/${total}\n🔥 ধারাবাহিক: ${streak} দিন\n\n💡 পরামর্শ: ${tip}`,
    mr: (name, pct, taken, total, streak, tip) =>
      `नमस्कार ${name}! या आठवड्याचे अपडेट:\n\n📊 औषध अनुपालन: ${pct}%\n💊 घेतले डोस: ${taken}/${total}\n🔥 सलग: ${streak} दिवस\n\n💡 सल्ला: ${tip}`,
  };

  _tips = {
    en: [
      'Set your medicines next to your morning tea/coffee — link it to a daily habit.',
      'Use a weekly pill organizer box to stay on track.',
      'Take your medicine at the same time every day — consistency is key.',
      'Drink a full glass of water with your medicine for better absorption.',
      'Keep a small backup of medicines in your bag for when you travel.',
    ],
    hi: [
      'अपनी दवाइयाँ सुबह की चाय के बगल में रखें — रोज़ की आदत से जोड़ें।',
      'हफ्ते भर की दवा की डिब्बी का इस्तेमाल करें।',
      'हर दिन एक ही समय पर दवा लें — नियमितता ज़रूरी है।',
      'बेहतर अवशोषण के लिए पूरा गिलास पानी पिएं।',
      'सफ़र के लिए बैग में दवा का बैकअप रखें।',
    ],
  };

  // ════════════════════════════════════════════════════════════════════════════
  // GENERATE NUDGE
  // ════════════════════════════════════════════════════════════════════════════

  generateGentleNudge(lang = 'en') {
    const patient = this.healthStore.getPatient();
    const name = patient?.name?.split(' ')[0] || 'there';
    const report = this.adhEngine.getWeeklyReport();
    const worstMed = report.escalations?.[0];
    const medName = worstMed?.medicine_name || 'your medicines';
    const pct = worstMed?.score ?? report.overall_score;

    const fn = this._gentleReminder[lang] || this._gentleReminder.en;
    const msg = fn(name, pct, medName);
    this._logNudge('gentle_reminder', msg, lang);
    return { type: 'gentle_reminder', message: msg, pct, medicine: medName };
  }

  generateEducationNudge(condition = 'diabetes', lang = 'en') {
    const patient = this.healthStore.getPatient();
    const name = patient?.name?.split(' ')[0] || 'there';
    const condKey = condition.toLowerCase().includes('diabetes') ? 'diabetes'
                  : condition.toLowerCase().includes('hypertension') || condition.toLowerCase().includes('bp') ? 'bp'
                  : 'heart';
    const templates = this._educationNudges[condKey] || this._educationNudges.diabetes;
    const fn = templates[lang] || templates.en;
    const msg = fn(name);
    this._logNudge('education', msg, lang);
    return { type: 'education', message: msg, condition: condKey };
  }

  generateBarrierResponse(barrier, lang = 'en') {
    const key = barrier.toLowerCase().includes('forget') ? 'forget'
              : barrier.toLowerCase().includes('side') ? 'side_effects'
              : barrier.toLowerCase().includes('expens') || barrier.toLowerCase().includes('cost') ? 'expensive'
              : 'feel_fine';
    const resp = this._barrierResponses[key];
    const msg = resp[lang] || resp.en;
    this._logNudge('barrier_' + key, msg, lang);
    return { type: 'barrier', barrier: key, message: msg };
  }

  generateWeeklyCheckin(lang = 'en') {
    const patient = this.healthStore.getPatient();
    const name = patient?.name?.split(' ')[0] || 'there';
    const report = this.adhEngine.getWeeklyReport();
    const tips = this._tips[lang] || this._tips.en;
    const tip = tips[Math.floor(Math.random() * tips.length)];

    const totalTaken = report.reports.reduce((a, r) => a + r.taken, 0);
    const totalDoses = report.reports.reduce((a, r) => a + r.total, 0);

    const fn = this._weeklyCheckin[lang] || this._weeklyCheckin.en;
    const msg = fn(name, report.overall_score, totalTaken, totalDoses, report.streak_days, tip);
    this._logNudge('weekly_checkin', msg, lang);
    return { type: 'weekly_checkin', message: msg, report };
  }

  generateEscalation(lang = 'en') {
    const patient = this.healthStore.getPatient();
    const name = patient?.name?.split(' ')[0] || 'there';
    const fn = this._escalationMsg[lang] || this._escalationMsg.en;
    const msg = fn(name);
    this._logNudge('escalation', msg, lang);
    return { type: 'escalation', message: msg };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // AUTOMATIC NUDGE DECISION
  // ════════════════════════════════════════════════════════════════════════════

  getAutoNudge(lang = 'en') {
    const esc = this.adhEngine.checkEscalation();
    if (esc.escalations_severe.length > 0) {
      return this.generateEscalation(lang);
    }
    if (esc.escalations_nudge.length > 0) {
      return this.generateGentleNudge(lang);
    }
    return null; // No nudge needed
  }

  // ════════════════════════════════════════════════════════════════════════════
  // NUDGE LOG
  // ════════════════════════════════════════════════════════════════════════════
  _logNudge(type, message, lang) {
    this._nudgeLog.push({
      type, message_preview: message.slice(0, 80),
      lang, timestamp: new Date().toISOString(),
    });
    // Keep last 50
    if (this._nudgeLog.length > 50) this._nudgeLog = this._nudgeLog.slice(-50);
    localStorage.setItem('sw_nudge_log', JSON.stringify(this._nudgeLog));
  }

  getNudgeLog() { return this._nudgeLog; }
}

window.NudgeEngine = NudgeEngine;

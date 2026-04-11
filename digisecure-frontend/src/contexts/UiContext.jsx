import { createContext, useContext, useEffect, useMemo, useState } from "react"

const LANGUAGE_STORAGE_KEY = "satyapramaan_language"
const THEME_STORAGE_KEY = "satyapramaan_theme"

export const APP_NAME = "SatyaPramaan"

export const PAGE_TITLES = {
  "/app/dashboard": "Dashboard",
  "/app/issue-document": "Issue Document",
  "/app/documents": "Documents",
  "/app/verification-activity": "Verification Activity",
  "/app/audit-logs": "Audit Logs",
  "/app/trust-score": "Trust Score",
  "/app/profile": "Institution Profile",
}

const LanguageContext = createContext({
  language: "en",
  setLanguage: () => {},
  t: (value) => value,
})

const ThemeContext = createContext({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
})

const HI_TRANSLATIONS = {
  Language: "भाषा",
  English: "English",
  Hindi: "हिंदी",
  "Switch to Dark Mode": "डार्क मोड पर स्विच करें",
  "Switch to Light Mode": "लाइट मोड पर स्विच करें",
  Dashboard: "डैशबोर्ड",
  "Issue Document": "दस्तावेज जारी करें",
  Documents: "दस्तावेज",
  "Verification Activity": "सत्यापन गतिविधि",
  "Audit Logs": "ऑडिट लॉग्स",
  "Trust Score": "ट्रस्ट स्कोर",
  "Institution Profile": "संस्था प्रोफाइल",
  "Document Detail": "दस्तावेज विवरण",
  "Institution Workspace": "संस्था कार्यक्षेत्र",
  "Institution Console": "संस्था कंसोल",
  "Institution navigation": "संस्था नेविगेशन",
  Menu: "मेनू",
  Search: "खोजें",
  "Search documents, IDs, recipients": "दस्तावेज, आईडी, प्राप्तकर्ता खोजें",
  Logout: "लॉगआउट",
  "Public Verify": "सार्वजनिक सत्यापन",
  "Close navigation": "नेविगेशन बंद करें",
  "Open navigation": "नेविगेशन खोलें",
  "Welcome to SatyaPramaan": "SatyaPramaan में आपका स्वागत है",
  "SatyaPramaan home": "SatyaPramaan होम",
  "Proof Looks Better Than Promises.": "सबूत वादों से बेहतर दिखता है।",
  "Every issued document carries visible trust, cryptographic certainty, and instant verification.": "हर जारी दस्तावेज दृश्य भरोसा, क्रिप्टोग्राफिक निश्चितता और त्वरित सत्यापन के साथ आता है।",
  "Public Verification": "सार्वजनिक सत्यापन",
  "Scan QR payloads or upload PDFs to verify authenticity.": "प्रमाणिकता सत्यापित करने के लिए QR स्कैन करें या PDF अपलोड करें।",
  "Open Verification": "सत्यापन खोलें",
  "Secure Access": "सुरक्षित प्रवेश",
  "Sign In": "साइन इन",
  "Register Institution": "संस्था पंजीकरण",
  "Access your institution workspace": "अपनी संस्था का कार्यक्षेत्र खोलें",
  "Create a trusted institution account": "विश्वसनीय संस्था खाता बनाएं",
  "Continue to dashboard, issuance, verification, and audit tools.": "डैशबोर्ड, जारीकरण, सत्यापन और ऑडिट टूल्स तक पहुंचें।",
  "Set up secure issuance roles and start publishing verifiable documents.": "सुरक्षित जारीकरण भूमिकाएँ सेट करें और सत्यापनीय दस्तावेज प्रकाशित करना शुरू करें।",
  "Firebase Config Missing": "Firebase कॉन्फ़िगरेशन उपलब्ध नहीं है",
  "Set VITE_FIREBASE_* values in frontend env before using sign-in or registration.": "साइन-इन या पंजीकरण से पहले frontend env में VITE_FIREBASE_* मान सेट करें।",
  "Work Email": "कार्य ईमेल",
  "Use your official institution domain email.": "अपना आधिकारिक संस्था डोमेन ईमेल उपयोग करें।",
  Password: "पासवर्ड",
  "Minimum 8 characters including one number.": "कम से कम 8 अक्षर, एक संख्या सहित।",
  Role: "भूमिका",
  "Institution Admin": "संस्था एडमिन",
  "Institution Operator": "संस्था ऑपरेटर",
  Verifier: "सत्यापनकर्ता",
  "Display Name": "डिस्प्ले नाम",
  "Institution Name": "संस्था का नाम",
  "Institution Code": "संस्था कोड",
  "Institution Type": "संस्था प्रकार",
  "Keep me signed in": "मुझे साइन-इन रखें",
  "Need help signing in?": "साइन-इन में मदद चाहिए?",
  "Authentication Error": "प्रमाणीकरण त्रुटि",
  "Please wait...": "कृपया प्रतीक्षा करें...",
  "Continue with Google": "Google के साथ जारी रखें",
  "Google OAuth uses your Firebase project and auto-creates backend profile if needed.": "Google OAuth आपके Firebase प्रोजेक्ट का उपयोग करता है और जरूरत पड़ने पर backend profile स्वतः बनाता है।",
  "or continue with email": "या ईमेल के साथ जारी रखें",
  "Create Account": "खाता बनाएं",
  "Operational Snapshot": "ऑपरेशनल स्नैपशॉट",
  "Trust-first operations, minus the noise.": "ट्रस्ट-केंद्रित संचालन, बिना अनावश्यक शोर के।",
  "Single-view confidence. Deep detail is already available in dedicated pages.": "एक नजर में भरोसा। विस्तृत विवरण समर्पित पेजों में पहले से उपलब्ध है।",
  "Issue New Document": "नया दस्तावेज जारी करें",
  "Current Trust Score": "वर्तमान ट्रस्ट स्कोर",
  "Band unavailable": "बैंड उपलब्ध नहीं",
  "Documents Issued": "जारी दस्तावेज",
  "Documents Verified": "सत्यापित दस्तावेज",
  "Tamper Alerts": "छेड़छाड़ अलर्ट",
  Audit: "ऑडिट",
  Trust: "ट्रस्ट",
  "Live from issuance records": "जारीकरण रिकॉर्ड से लाइव",
  "Live from verification activity": "सत्यापन गतिविधि से लाइव",
  "Derived from tamper signals": "छेड़छाड़ संकेतों से व्युत्पन्न",
  "Institution Health": "संस्था की स्थिति",
  "is connected with live issuance, verification, trust, and audit streams.": "लाइव जारीकरण, सत्यापन, ट्रस्ट और ऑडिट स्ट्रीम्स से जुड़ा है।",
  "Quick Platform Walkthrough": "प्लेटफॉर्म का त्वरित परिचय",
  "Watch the demo to learn issuance, verification, and audit flow in under two minutes.": "दो मिनट से कम में जारीकरण, सत्यापन और ऑडिट फ्लो समझने के लिए डेमो देखें।",
  "Start Here": "यहीं से शुरू करें",
  "Issue Flow": "जारीकरण प्रवाह",
  "Verify + Audit": "सत्यापन + ऑडिट",
  "SatyaPramaan Product Demo": "SatyaPramaan उत्पाद डेमो",
  "Real-time backend telemetry connected": "रियल-टाइम backend telemetry कनेक्टेड",
  "Open Documents, Verification Activity, or Audit Logs for full detail.": "पूर्ण विवरण के लिए Documents, Verification Activity या Audit Logs खोलें।",
  "Video slot is ready": "वीडियो स्लॉट तैयार है",
  "Share your link and I will wire it to play here.": "अपना लिंक साझा करें, मैं इसे यहां चलने के लिए जोड़ दूंगा।",
  "Recent Documents": "हाल के दस्तावेज",
  "View All": "सभी देखें",
  Title: "शीर्षक",
  Recipient: "प्राप्तकर्ता",
  Issued: "जारी",
  Status: "स्थिति",
  Verified: "सत्यापित",
  Tampered: "छेड़छाड़",
  Suspicious: "संदिग्ध",
  Revoked: "रद्द",
  Pending: "लंबित",
  Error: "त्रुटि",
  "Not Found": "नहीं मिला",
  Loading: "लोड हो रहा है",
}

function getInitialLanguage() {
  if (typeof window === "undefined") return "en"

  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (saved === "hi" || saved === "en") return saved

  return window.navigator.language?.toLowerCase().startsWith("hi") ? "hi" : "en"
}

function getInitialTheme() {
  if (typeof window === "undefined") return "light"

  const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (saved === "dark" || saved === "light") return saved

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme)

  const setTheme = (nextTheme) => {
    setThemeState(nextTheme)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    }
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = theme
      document.documentElement.style.colorScheme = theme
    }
  }, [theme])

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage)

  const setLanguage = (nextLanguage) => {
    setLanguageState(nextLanguage)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
    }
  }

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language
    }
  }, [language])

  const t = (value) => (language === "hi" ? HI_TRANSLATIONS[value] || value : value)

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}

export function useTheme() {
  return useContext(ThemeContext)
}

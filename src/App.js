import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Wallet,
  PieChart,
  Settings,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Filter,
  Menu,
  X,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Home,
  Landmark,
  CreditCard,
  FileText,
  Search,
  Download,
  Trash2,
  Building2,
  Package,
  Scale,
  Box,
  Pencil,
  Target,
  BarChart3,
  Check,
  Layers,
  Save,
  RefreshCw,
  Loader2,
  Percent,
  Hourglass,
  Sparkles,
  MessageSquareQuote,
  Hammer,
  Camera,
  UploadCloud,
  ShieldCheck,
  Coins,
  FileSpreadsheet,
  History,
  Calculator,
  PiggyBank,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";

// Firebase Imports
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
} from "firebase/firestore";

// --- GEMINI API CONFIGURATION ---
const apiKey = "";

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      const mimeType = reader.result.split(";")[0].split(":")[1];
      resolve({ base64, mimeType });
    };
    reader.onerror = (error) => reject(error);
  });
};

const callGeminiAPI = async (prompt, imageBase64 = null, mimeType = null) => {
  try {
    const parts = [{ text: prompt }];

    if (imageBase64 && mimeType) {
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: imageBase64,
        },
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: parts }],
          generationConfig: imageBase64
            ? { responseMimeType: "application/json" }
            : {},
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

// --- HELPER FORMATTAZIONE VALUTA ---
const formatCurrencyInput = (value) => {
  if (!value) return "";
  const number = Number(value.toString().replace(/[^0-9.-]+/g, ""));
  if (isNaN(number)) return "";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(number);
};

const CurrencyInput = ({
  name,
  defaultValue,
  className,
  required,
  placeholder,
}) => {
  const [displayValue, setDisplayValue] = useState(
    defaultValue ? formatCurrencyInput(defaultValue) : ""
  );
  const [realValue, setRealValue] = useState(defaultValue || "");

  useEffect(() => {
    if (defaultValue) {
      setDisplayValue(formatCurrencyInput(defaultValue));
      setRealValue(defaultValue);
    }
  }, [defaultValue]);

  const handleChange = (e) => {
    const inputValue = e.target.value;
    const rawValue = inputValue.replace(/[^0-9]/g, "");
    setRealValue(rawValue);
    if (rawValue) {
      const number = Number(rawValue);
      setDisplayValue(
        new Intl.NumberFormat("it-IT", {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        }).format(number)
      );
    } else {
      setDisplayValue("");
    }
  };

  return (
    <>
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        className={className}
        placeholder={placeholder || "€ 0"}
        required={required}
      />
      <input type="hidden" name={name} value={realValue} />
    </>
  );
};

// --- CONFIGURAZIONE ---
const INITIAL_EXPENSE_CATEGORIES = [
  "Mutuo",
  "Utenze (Luce/Gas)",
  "Internet",
  "Spese Condominiali",
  "Manutenzione Ordinaria",
  "Manutenzione Straordinaria",
  "Pulizie",
  "Lavanderia",
  "Commissioni Portali",
  "Tasse (IMU/Cedolare)",
  "Assicurazione",
  "Arredamento/Asset",
  "Altro",
];

const INITIAL_ASSET_CATEGORIES = [
  "Arredamento",
  "Elettrodomestici",
  "Elettronica",
  "Attrezzatura",
  "Ristrutturazione",
  "Altro",
];

const INCOME_CATEGORIES = [
  "Canone Affitto Breve",
  "Canone Affitto Lungo",
  "Rimborso Danni",
  "Extra (Pulizie/Servizi)",
];

// Default Properties with Tax Rates
const DEMO_PROPERTIES = [
  {
    title: "App. Lago (Porto Ceresio)",
    type: "Short Term",
    marketValue: 250000,
    purchaseCost: 180000,
    renovationCost: 40000,
    mortgageResidual: 180000,
    monthlyMortgage: 650,
    taxRate: 21,
  },
  {
    title: "Suite Centro (Varese)",
    type: "Short Term",
    marketValue: 180000,
    purchaseCost: 140000,
    renovationCost: 15000,
    mortgageResidual: 120000,
    monthlyMortgage: 580,
    taxRate: 26,
  },
  {
    title: "App. Residenziale (Milano)",
    type: "Long Term",
    marketValue: 350000,
    purchaseCost: 300000,
    renovationCost: 10000,
    mortgageResidual: 0,
    monthlyMortgage: 0,
    taxRate: 21,
  },
];

const BANK_ACCOUNTS = [
  {
    id: "Popolare Sondrio",
    name: "Popolare di Sondrio",
    owner: "Marco & Noemi",
    type: "Bank",
    isMain: true,
  },
  {
    id: "Intesa Marco",
    name: "Intesa San Paolo",
    owner: "Marco",
    type: "Bank",
    isMain: false,
  },
  {
    id: "Intesa Noemi",
    name: "Intesa San Paolo",
    owner: "Noemi",
    type: "Bank",
    isMain: false,
  },
  {
    id: "Contanti",
    name: "Cassa Piccola",
    owner: "Casa",
    type: "Cash",
    isMain: false,
  },
];

const HISTORICAL_DATA_MOCK = [
  { month: "Mag", income: 4100, expense: 2200 },
  { month: "Giu", income: 4500, expense: 1900 },
  { month: "Lug", income: 5200, expense: 2100 },
  { month: "Ago", income: 6100, expense: 2400 },
  { month: "Set", income: 4800, expense: 1800 },
];

const ProgressBar = ({ label, amount, total, color }) => {
  const percentage = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between items-center text-sm mb-1.5">
        <span className="font-semibold text-slate-700 truncate pr-2">
          {label}
        </span>
        <span className="text-slate-500 font-medium whitespace-nowrap">
          €{amount.toLocaleString()} ({Math.round(percentage)}%)
        </span>
      </div>
      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

// --- FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: "AIzaSyDLtqdEGIKXuxPPLb-MBVzfIHLLgAD0rM8",
  authDomain: "financehub-lello.firebaseapp.com",
  projectId: "financehub-lello",
  storageBucket: "financehub-lello.firebasestorage.app",
  messagingSenderId: "590662972464",
  appId: "1:590662972464:web:f4279ae2f97074805ca9f5",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "finance-hub-v1";

export default function FinanceManager() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Data State
  const [properties, setProperties] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [assets, setAssets] = useState([]);
  const [goals, setGoals] = useState({ income: 5000, expense: 2000 });
  const [filters, setFilters] = useState({
    propertyId: "all",
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });

  const [expenseCategories, setExpenseCategories] = useState(
    INITIAL_EXPENSE_CATEGORIES
  );
  const [assetCategories, setAssetCategories] = useState(
    INITIAL_ASSET_CATEGORIES
  );
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Modals
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState("expense");
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);

  // Tourist Tax Calculator State
  const [touristTaxCalc, setTouristTaxCalc] = useState({
    nights: 3,
    guests: 2,
    rate: 1.5,
  });

  // AI & Scan
  const [aiAdvice, setAiAdvice] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [financialInsight, setFinancialInsight] = useState("");
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [wealthAdvice, setWealthAdvice] = useState("");
  const [isWealthAiLoading, setIsWealthAiLoading] = useState(false);

  const [scannedData, setScannedData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const transactionFileRef = useRef(null);
  const assetFileRef = useRef(null);

  // --- MOBILE PWA CONFIGURATION (FORCE FULLSCREEN V2) ---
  useEffect(() => {
    // 1. Meta Tags Aggressivi per iOS e Android
    const metaTags = [
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
      { name: "apple-mobile-web-app-title", content: "FinanceHub" },
      { name: "theme-color", content: "#ffffff" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
      },
    ];

    metaTags.forEach((tagData) => {
      let meta = document.querySelector(`meta[name="${tagData.name}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = tagData.name;
        document.head.appendChild(meta);
      }
      meta.content = tagData.content;
    });

    // 2. Icona Dinamica (Importante per Android "Add to Home Screen")
    const iconLink = document.createElement("link");
    iconLink.rel = "apple-touch-icon";
    iconLink.href = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"; // Icona Dollaro
    document.head.appendChild(iconLink);

    // 3. Iniezione Manifest Dinamico
    const manifest = {
      name: "FinanceHub",
      short_name: "FinanceHub",
      start_url: ".", // PUNTO ESSENZIALE: usa il path relativo corrente
      display: "standalone", // COMANDO CHIAVE
      background_color: "#ffffff",
      theme_color: "#0f172a",
      orientation: "portrait",
      icons: [
        {
          src: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    };

    const stringManifest = JSON.stringify(manifest);
    const blob = new Blob([stringManifest], { type: "application/json" });
    const manifestURL = URL.createObjectURL(blob);

    const existingLink = document.querySelector('link[rel="manifest"]');
    if (existingLink) {
      existingLink.remove();
    }

    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = manifestURL;
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== "undefined" && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubProps = onSnapshot(
      collection(db, "artifacts", appId, "users", user.uid, "properties"),
      (snap) => setProperties(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubTrans = onSnapshot(
      collection(db, "artifacts", appId, "users", user.uid, "transactions"),
      (snap) =>
        setTransactions(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
        )
    );
    const unsubAssets = onSnapshot(
      collection(db, "artifacts", appId, "users", user.uid, "assets"),
      (snap) => {
        setAssets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setIsLoading(false);
      }
    );
    return () => {
      unsubProps();
      unsubTrans();
      unsubAssets();
    };
  }, [user?.uid]);

  const calculateCurrentAssetValue = (asset) => {
    if (!asset.date || !asset.value) return 0;
    const purchaseDate = new Date(asset.date);
    const now = new Date();
    const yearsElapsed = (now - purchaseDate) / (1000 * 60 * 60 * 24 * 365);
    const depreciationYears = asset.depreciationYears
      ? Number(asset.depreciationYears)
      : 5;
    if (yearsElapsed >= depreciationYears) return 0;
    const yearlyDepreciation = Number(asset.value) / depreciationYears;
    return Math.max(0, Number(asset.value) - yearlyDepreciation * yearsElapsed);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(
      (t) => filters.propertyId === "all" || t.propertyId === filters.propertyId
    );
  }, [transactions, filters]);

  const stats = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const expense = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const net = income - expense;

    const expenseByCategory = {};
    filteredTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        expenseByCategory[t.category] =
          (expenseByCategory[t.category] || 0) + Number(t.amount);
      });

    const pnlByProperty = {};
    let totalTaxProvision = 0;

    properties.forEach((p) => {
      pnlByProperty[p.id] = { income: 0, expense: 0, net: 0, tax: 0 };
    });
    pnlByProperty["0"] = { income: 0, expense: 0, net: 0, tax: 0 };

    transactions.forEach((t) => {
      const pid = t.propertyId || "0";
      const amt = Number(t.amount) || 0;
      if (pnlByProperty[pid]) {
        if (t.type === "income") {
          pnlByProperty[pid].income += amt;
          // Calcolo Tasse (Cedolare)
          const prop = properties.find((p) => p.id === pid);
          if (prop && prop.taxRate && t.category.includes("Affitto")) {
            // Applica solo su affitti
            const taxAmount = amt * (prop.taxRate / 100);
            pnlByProperty[pid].tax += taxAmount;
            totalTaxProvision += taxAmount;
          }
        } else {
          pnlByProperty[pid].expense += amt;
        }
      }
    });

    return {
      income,
      expense,
      net,
      expenseByCategory,
      pnlByProperty,
      totalTaxProvision,
    };
  }, [filteredTransactions, transactions, properties]);

  const wealthStats = useMemo(() => {
    const totalRealEstateValue = properties.reduce(
      (sum, p) => sum + (Number(p.marketValue) || 0),
      0
    );
    const totalMortgageResidual = properties.reduce(
      (sum, p) => sum + (Number(p.mortgageResidual) || 0),
      0
    );
    const totalAssetsValue = assets.reduce(
      (sum, a) => sum + calculateCurrentAssetValue(a),
      0
    );
    const totalEquity =
      totalRealEstateValue + totalAssetsValue - totalMortgageResidual;
    const annualNetProjection = stats.net * 12;
    const roi = totalEquity > 0 ? (annualNetProjection / totalEquity) * 100 : 0;
    const ltv =
      totalRealEstateValue > 0
        ? (totalMortgageResidual / totalRealEstateValue) * 100
        : 0;
    return {
      totalRealEstateValue,
      totalMortgageResidual,
      totalAssetsValue,
      totalEquity,
      roi,
      ltv,
    };
  }, [properties, assets, stats.net]);

  // Handlers
  const handleUpdateGoals = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setGoals({
      income: Number(fd.get("incomeGoal")),
      expense: Number(fd.get("expenseGoal")),
    });
    setIsGoalModalOpen(false);
  };
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.target);
    await addDoc(
      collection(db, "artifacts", appId, "users", user.uid, "transactions"),
      {
        type: transactionType,
        date: fd.get("date"),
        amount: Number(fd.get("amount")),
        category: fd.get("category"),
        propertyId: fd.get("propertyId"),
        note: fd.get("note"),
        paymentMethod: fd.get("paymentMethod"),
        createdAt: new Date().toISOString(),
      }
    );
    setIsTransactionModalOpen(false);
    setScannedData(null);
  };
  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.target);
    await addDoc(
      collection(db, "artifacts", appId, "users", user.uid, "assets"),
      {
        name: fd.get("name"),
        category: fd.get("category"),
        value: Number(fd.get("value")),
        date: fd.get("date"),
        depreciationYears: Number(fd.get("depreciationYears")),
        propertyId: fd.get("propertyId"),
        createdAt: new Date().toISOString(),
      }
    );
    setIsAssetModalOpen(false);
    setScannedData(null);
  };
  const handleSaveProperty = async (e) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.target);
    const pd = {
      title: fd.get("title"),
      type: fd.get("type"),
      marketValue: Number(fd.get("marketValue")),
      purchaseCost: Number(fd.get("purchaseCost")),
      renovationCost: Number(fd.get("renovationCost")),
      mortgageResidual: Number(fd.get("mortgageResidual")),
      monthlyMortgage: Number(fd.get("monthlyMortgage")),
      taxRate: Number(fd.get("taxRate")),
    };
    if (editingProperty) {
      await updateDoc(
        doc(
          db,
          "artifacts",
          appId,
          "users",
          user.uid,
          "properties",
          editingProperty.id
        ),
        pd
      );
    } else {
      await addDoc(
        collection(db, "artifacts", appId, "users", user.uid, "properties"),
        pd
      );
    }
    setIsPropertyModalOpen(false);
    setEditingProperty(null);
  };
  const deleteItem = async (col, id) => {
    if (user)
      await deleteDoc(doc(db, "artifacts", appId, "users", user.uid, col, id));
  };

  // AI
  const handleScanReceipt = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setIsScanning(true);
    try {
      const { base64, mimeType } = await fileToBase64(f);
      const res = await callGeminiAPI(
        `Analizza scontrino JSON: {"name": "oggetto", "amount": 0.00, "date": "YYYY-MM-DD", "category": "cat"}`,
        base64,
        mimeType
      );
      if (res)
        setScannedData(JSON.parse(res.replace(/```json|```/g, "").trim()));
    } catch (err) {
      console.error(err);
    }
    setIsScanning(false);
  };
  const handleGetFinancialInsight = async () => {
    setIsInsightLoading(true);
    setFinancialInsight(
      (await callGeminiAPI(
        `Analisi finanza immobiliare breve: Entrate ${stats.income}, Uscite ${stats.expense}, Tasse stimate ${stats.totalTaxProvision}.`
      )) || "Riprova."
    );
    setIsInsightLoading(false);
  };

  // Common UI Styles (MOBILE OPTIMIZED: 95% Width, Spaced, Scrollable)
  const modalOverlay =
    "fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4";
  const modalContent =
    "bg-white rounded-3xl shadow-2xl w-[95%] max-w-md mx-auto overflow-hidden transform transition-all scale-100 ring-1 ring-slate-900/5 max-h-[80vh] flex flex-col relative"; // Adjusted max-h and width
  const modalBody = "p-6 overflow-y-auto overscroll-contain"; // Added overscroll-contain
  const inputStyle =
    "w-full border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all outline-none";
  const labelStyle =
    "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1";
  const btnPrimary =
    "flex-1 py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-transform active:scale-95 shadow-lg shadow-slate-900/20";
  const btnSecondary =
    "flex-1 py-3.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors";

  // Modals
  const renderGoalModal = () =>
    isGoalModalOpen && (
      <div className={modalOverlay}>
        <div className={modalContent}>
          <div className="p-5 border-b border-slate-50 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-xl text-slate-900">Obiettivi</h3>
            <button
              onClick={() => setIsGoalModalOpen(false)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className={modalBody}>
            <form onSubmit={handleUpdateGoals} className="space-y-5">
              <div>
                <label className={labelStyle}>Target Entrate</label>
                <CurrencyInput
                  name="incomeGoal"
                  defaultValue={goals.income}
                  className={inputStyle}
                />
              </div>
              <div>
                <label className={labelStyle}>Budget Spese</label>
                <CurrencyInput
                  name="expenseGoal"
                  defaultValue={goals.expense}
                  className={inputStyle}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className={btnSecondary}
                >
                  Annulla
                </button>
                <button type="submit" className={btnPrimary}>
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );

  const renderTransactionModal = () =>
    isTransactionModalOpen && (
      <div className={modalOverlay}>
        <div className={modalContent}>
          <div className="flex border-b border-slate-100 shrink-0">
            <button
              className={`flex-1 py-4 font-bold text-sm uppercase tracking-wide transition-colors ${
                transactionType === "expense"
                  ? "bg-rose-50 text-rose-600 border-b-2 border-rose-500"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              onClick={() => setTransactionType("expense")}
            >
              Uscita
            </button>
            <button
              className={`flex-1 py-4 font-bold text-sm uppercase tracking-wide transition-colors ${
                transactionType === "income"
                  ? "bg-emerald-50 text-emerald-600 border-b-2 border-emerald-500"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              onClick={() => setTransactionType("income")}
            >
              Entrata
            </button>
          </div>
          <div className={modalBody}>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              {transactionType === "expense" && (
                <div className="flex justify-end">
                  <input
                    type="file"
                    className="hidden"
                    ref={transactionFileRef}
                    onChange={handleScanReceipt}
                  />
                  <button
                    type="button"
                    onClick={() => transactionFileRef.current.click()}
                    disabled={isScanning}
                    className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-4 py-2 rounded-full flex items-center transition-colors"
                  >
                    {isScanning ? (
                      <Loader2 size={14} className="animate-spin mr-1" />
                    ) : (
                      <Camera size={14} className="mr-1" />
                    )}{" "}
                    SCAN AI
                  </button>
                </div>
              )}
              <div>
                <label className={labelStyle}>Importo</label>
                <CurrencyInput
                  name="amount"
                  required
                  defaultValue={scannedData?.amount}
                  className={`${inputStyle} text-2xl font-bold text-slate-900 tracking-tight`}
                  placeholder="€ 0,00"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelStyle}>Data</label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={
                      scannedData?.date ||
                      new Date().toISOString().split("T")[0]
                    }
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelStyle}>Immobile</label>
                  <select name="propertyId" className={inputStyle}>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelStyle}>Categoria</label>
                <select
                  name="category"
                  className={inputStyle}
                  defaultValue={scannedData?.category}
                >
                  {(transactionType === "expense"
                    ? expenseCategories
                    : INCOME_CATEGORIES
                  ).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelStyle}>Conto</label>
                <select name="paymentMethod" className={inputStyle}>
                  {BANK_ACCOUNTS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelStyle}>Note</label>
                <input
                  name="note"
                  defaultValue={scannedData?.name}
                  className={inputStyle}
                  placeholder="Opzionale"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsTransactionModalOpen(false)}
                  className={btnSecondary}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-3.5 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 ${
                    transactionType === "expense"
                      ? "bg-rose-600 shadow-rose-200 hover:bg-rose-700"
                      : "bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700"
                  }`}
                >
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );

  const renderPropertyModal = () =>
    isPropertyModalOpen && (
      <div className={modalOverlay}>
        <div className={modalContent}>
          <div className="p-5 border-b border-slate-50 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-xl text-slate-900">
              Dettagli Proprietà
            </h3>
            <button
              onClick={() => setIsPropertyModalOpen(false)}
              className="p-2 hover:bg-slate-100 rounded-full"
            >
              <X size={20} />
            </button>
          </div>
          <div className={modalBody}>
            <form onSubmit={handleSaveProperty} className="space-y-4">
              <div>
                <label className={labelStyle}>Nome</label>
                <input
                  name="title"
                  defaultValue={editingProperty?.title}
                  required
                  className={inputStyle}
                />
              </div>
              <div>
                <label className={labelStyle}>Tipo</label>
                <select
                  name="type"
                  defaultValue={editingProperty?.type}
                  className={inputStyle}
                >
                  <option value="Short Term">Breve</option>
                  <option value="Long Term">Lungo</option>
                </select>
              </div>
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                <p className="text-xs text-indigo-600 font-extrabold mb-4 uppercase tracking-wider flex items-center">
                  <Coins size={14} className="mr-1" /> Setup Finanziario
                </p>
                <div>
                  <label className={labelStyle}>Valore Mercato</label>
                  <CurrencyInput
                    name="marketValue"
                    defaultValue={editingProperty?.marketValue}
                    required
                    className={`${inputStyle} bg-white`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className={labelStyle}>Costo Acquisto</label>
                    <CurrencyInput
                      name="purchaseCost"
                      defaultValue={editingProperty?.purchaseCost}
                      className={`${inputStyle} bg-white`}
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>Aliquota Tasse</label>
                    <select
                      name="taxRate"
                      defaultValue={editingProperty?.taxRate || 21}
                      className={`${inputStyle} bg-white`}
                    >
                      <option value="21">21%</option>
                      <option value="26">26%</option>
                      <option value="10">10%</option>
                      <option value="43">IRPEF</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className={labelStyle}>Mutuo Residuo</label>
                    <CurrencyInput
                      name="mortgageResidual"
                      defaultValue={editingProperty?.mortgageResidual}
                      className={`${inputStyle} bg-white`}
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>Rata Mensile</label>
                    <CurrencyInput
                      name="monthlyMortgage"
                      defaultValue={editingProperty?.monthlyMortgage}
                      className={`${inputStyle} bg-white`}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPropertyModalOpen(false)}
                  className={btnSecondary}
                >
                  Annulla
                </button>
                <button type="submit" className={btnPrimary}>
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 gap-4">
        <div>
          <p className="text-slate-500 font-medium mb-1">
            Panoramica Finanziaria
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            Dashboard
          </h2>
        </div>
        <button
          onClick={handleGetFinancialInsight}
          disabled={isInsightLoading}
          className="flex items-center px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full font-bold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all active:scale-95 text-sm"
        >
          {isInsightLoading ? (
            <Loader2 className="animate-spin mr-2" size={18} />
          ) : (
            <Sparkles className="mr-2" size={18} />
          )}{" "}
          Analisi AI
        </button>
      </div>

      {financialInsight && (
        <div className="bg-white border-l-4 border-indigo-500 p-6 rounded-2xl shadow-sm flex items-start gap-4">
          <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
            <MessageSquareQuote size={24} />
          </div>
          <div>
            <h4 className="font-bold text-indigo-950 mb-1 text-lg">
              L'opinione di Gemini
            </h4>
            <p className="text-slate-600 leading-relaxed">{financialInsight}</p>
          </div>
          <button
            onClick={() => setFinancialInsight("")}
            className="ml-auto text-slate-300 hover:text-slate-500"
          >
            <X size={20} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-100 transition-colors">
              <ArrowUpRight size={24} />
            </div>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
              +12%
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-6">
              Entrate
            </p>
            <h3 className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
              €{stats.income.toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:bg-rose-100 transition-colors">
              <ArrowDownRight size={24} />
            </div>
            <span className="text-xs font-bold bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full">
              +5%
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-6">
              Uscite
            </p>
            <h3 className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
              €{stats.expense.toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-orange-100 flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-50 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
              <PiggyBank size={24} />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-orange-400 uppercase tracking-wider mt-6">
              Tasse (Est.)
            </p>
            <h3 className="text-3xl font-black text-orange-500 mt-1 tracking-tight">
              €
              {stats.totalTaxProvision.toLocaleString("it-IT", {
                maximumFractionDigits: 0,
              })}
            </h3>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-900/20 text-white flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-indigo-500/30 transition-colors"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
              <Wallet className="text-white" size={24} />
            </div>
            <span className="text-xs font-bold bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-sm">
              Netto
            </span>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-400 mt-6">
              Saldo Reale
            </p>
            <h3 className="text-4xl font-black mt-1 tracking-tight">
              €{(stats.net - stats.totalTaxProvision).toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      {/* Graphs Section Placeholder style upgrade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-xl text-slate-900">Cash Flow</h3>
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
            </div>
          </div>
          <div className="h-48 flex items-end justify-between gap-4 px-2">
            {[40, 65, 50, 85, 60].map((h, i) => (
              <div
                key={i}
                className="flex-1 flex gap-1 h-full items-end justify-center"
              >
                <div
                  style={{ height: `${h}%` }}
                  className="w-full bg-emerald-100 rounded-t-xl relative group"
                >
                  <div
                    className="absolute bottom-0 w-full bg-emerald-500 rounded-t-xl transition-all duration-500"
                    style={{ height: "60%" }}
                  ></div>
                </div>
                <div
                  style={{ height: `${h * 0.6}%` }}
                  className="w-full bg-rose-100 rounded-t-xl relative group"
                >
                  <div
                    className="absolute bottom-0 w-full bg-rose-500 rounded-t-xl transition-all duration-500"
                    style={{ height: "60%" }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          <h3 className="font-bold text-xl text-slate-900 mb-6">Top Spese</h3>
          <div className="space-y-6">
            {Object.entries(stats.expenseByCategory)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 4)
              .map(([cat, amt]) => (
                <ProgressBar
                  key={cat}
                  label={cat}
                  amount={amt}
                  total={stats.expense}
                  color="bg-rose-500"
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTaxes = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <p className="text-slate-500 font-medium mb-1">Fiscalità</p>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Fisco & Tasse
        </h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <h3 className="font-bold text-xl mb-6 flex items-center text-slate-900">
            <Building2 className="mr-3 text-indigo-600" /> Riepilogo Cedolare
          </h3>
          <div className="space-y-4">
            {properties.map((p) => {
              const tax = stats.pnlByProperty[p.id].tax;
              const rate = p.taxRate || 21;
              return (
                <div
                  key={p.id}
                  className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100/50 hover:bg-slate-100 transition-colors"
                >
                  <div>
                    <p className="font-bold text-slate-900">{p.title}</p>
                    <div className="flex items-center mt-1">
                      <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        Rate: {rate}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-500 text-lg">
                      €
                      {tax.toLocaleString("it-IT", {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    <p className="text-xs text-slate-400 font-medium">
                      su €{stats.pnlByProperty[p.id].income.toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
            <div className="pt-6 border-t border-slate-100 flex justify-between items-center mt-4">
              <span className="font-bold text-slate-500">
                TOTALE ACCANTONAMENTO
              </span>
              <span className="font-black text-2xl text-orange-500">
                €{stats.totalTaxProvision.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <h3 className="font-bold text-xl mb-6 flex items-center text-slate-900">
            <Calculator className="mr-3 text-indigo-600" /> Soggiorno Calculator
          </h3>
          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 text-sm text-indigo-800 mb-6 leading-relaxed">
            Tariffa stimata Porto Ceresio: <strong>€1.00 - €2.00</strong>.
            Ricorda di verificare la delibera annuale.
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelStyle}>Notti</label>
                <input
                  type="number"
                  value={touristTaxCalc.nights}
                  onChange={(e) =>
                    setTouristTaxCalc({
                      ...touristTaxCalc,
                      nights: Number(e.target.value),
                    })
                  }
                  className={`${inputStyle} text-center font-bold text-lg`}
                />
              </div>
              <div>
                <label className={labelStyle}>Ospiti</label>
                <input
                  type="number"
                  value={touristTaxCalc.guests}
                  onChange={(e) =>
                    setTouristTaxCalc({
                      ...touristTaxCalc,
                      guests: Number(e.target.value),
                    })
                  }
                  className={`${inputStyle} text-center font-bold text-lg`}
                />
              </div>
              <div>
                <label className={labelStyle}>Tariffa</label>
                <input
                  type="number"
                  step="0.5"
                  value={touristTaxCalc.rate}
                  onChange={(e) =>
                    setTouristTaxCalc({
                      ...touristTaxCalc,
                      rate: Number(e.target.value),
                    })
                  }
                  className={`${inputStyle} text-center font-bold text-lg`}
                />
              </div>
            </div>
            <div className="p-6 bg-slate-900 text-white rounded-2xl flex justify-between items-center shadow-lg shadow-slate-900/10">
              <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                Totale Cash
              </span>
              <span className="text-3xl font-black">
                €
                {(
                  touristTaxCalc.nights *
                  touristTaxCalc.guests *
                  touristTaxCalc.rate
                ).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // --- RENDERING PRINCIPALE ---
  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {renderTransactionModal()}
      {/* Asset Modal Re-styled Inline for brevity but consistent with others */}
      {isAssetModalOpen && (
        <div className={modalOverlay}>
          <div className={modalContent}>
            <div className="p-5 border-b border-slate-50 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-xl">Nuovo Bene</h3>
              <button onClick={() => setIsAssetModalOpen(false)}>
                <X />
              </button>
            </div>
            <div className={modalBody}>
              <form
                id="asset-form"
                onSubmit={handleAddAsset}
                className="space-y-4"
              >
                <div className="flex justify-end">
                  <input
                    type="file"
                    className="hidden"
                    ref={assetFileRef}
                    onChange={handleScanReceipt}
                  />
                  <button
                    type="button"
                    onClick={() => assetFileRef.current.click()}
                    disabled={isScanning}
                    className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-bold flex items-center"
                  >
                    {isScanning ? (
                      <Loader2 size={14} className="animate-spin mr-1" />
                    ) : (
                      <Camera size={14} className="mr-1" />
                    )}{" "}
                    SCAN AI
                  </button>
                </div>
                <div>
                  <label className={labelStyle}>Nome</label>
                  <input
                    name="name"
                    required
                    defaultValue={scannedData?.name}
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelStyle}>Immobile</label>
                  <select name="propertyId" className={inputStyle}>
                    <option value="0">Generico</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelStyle}>Costo</label>
                    <CurrencyInput
                      name="value"
                      required
                      defaultValue={scannedData?.amount}
                      className={inputStyle}
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>Data</label>
                    <input
                      type="date"
                      name="date"
                      defaultValue={
                        scannedData?.date ||
                        new Date().toISOString().split("T")[0]
                      }
                      className={inputStyle}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelStyle}>Categoria</label>
                    <select
                      name="category"
                      className={inputStyle}
                      defaultValue={scannedData?.category}
                    >
                      {assetCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>Ammortamento (Anni)</label>
                    <input
                      type="number"
                      name="depreciationYears"
                      defaultValue="5"
                      className={inputStyle}
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAssetModalOpen(false)}
                    className={btnSecondary}
                  >
                    Annulla
                  </button>
                  <button type="submit" className={btnPrimary}>
                    Salva
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {renderPropertyModal()} {renderGoalModal()}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-72 bg-white border-r border-slate-100 transform lg:transform-none ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none`}
      >
        <div className="h-full flex flex-col p-6">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-slate-900 to-indigo-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <DollarSign size={24} />
              </div>
              <span className="text-xl font-black tracking-tight text-slate-900">
                FinanceHub
              </span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden text-slate-400"
            >
              <X size={24} />
            </button>
          </div>
          <nav className="flex-1 space-y-2">
            {[
              "dashboard",
              "wealth",
              "taxes",
              "inventory",
              "transactions",
              "properties",
            ].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                  activeTab === tab
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center space-x-3">
                  {tab === "dashboard" ? (
                    <LayoutDashboard size={20} />
                  ) : tab === "wealth" ? (
                    <Landmark size={20} />
                  ) : tab === "taxes" ? (
                    <Scale size={20} />
                  ) : tab === "inventory" ? (
                    <Package size={20} />
                  ) : tab === "transactions" ? (
                    <FileText size={20} />
                  ) : (
                    <Home size={20} />
                  )}
                  <span className="font-bold capitalize text-sm">
                    {tab === "taxes"
                      ? "Tasse"
                      : tab === "wealth"
                      ? "Patrimonio"
                      : tab === "inventory"
                      ? "Beni Mobili"
                      : tab === "transactions"
                      ? "Movimenti"
                      : tab === "properties"
                      ? "Appartamenti"
                      : tab}
                  </span>
                </div>
                {activeTab === tab && (
                  <ChevronRight size={16} className="opacity-50" />
                )}
              </button>
            ))}
          </nav>
          <div className="pt-6 border-t border-slate-100">
            <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-4 rounded-2xl border border-indigo-100">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">
                Status Conto
              </p>
              <p className="text-sm font-bold text-indigo-900">
                Popolare Sondrio
              </p>
              <div className="flex items-center mt-2 text-xs font-medium text-indigo-600">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>{" "}
                Attivo
              </div>
            </div>
            <div className="mt-4 text-center">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                Version 1.0.3
              </span>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 h-20 flex items-center justify-between px-6 lg:px-10 shrink-0 sticky top-0 z-10">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden text-slate-500"
          >
            <Menu size={24} />
          </button>
          <div className="hidden md:flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Benvenuto
            </span>
            <span className="text-sm font-bold text-slate-900">
              Marco Maccagnan
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:block h-8 w-px bg-slate-200 mx-2"></div>
            <button
              onClick={() => setIsTransactionModalOpen(true)}
              className="flex items-center px-5 py-2.5 bg-slate-900 text-white rounded-full font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 text-sm"
            >
              <Plus size={18} className="mr-2" /> Nuova Transazione
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 lg:p-10 scroll-smooth">
          <div className="max-w-7xl mx-auto pb-10">
            {activeTab === "dashboard" && renderDashboard()}
            {activeTab === "wealth" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-900/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
                    <div>
                      <p className="text-indigo-200 font-medium mb-2 text-lg">
                        Patrimonio Netto (Equity)
                      </p>
                      <h2 className="text-6xl md:text-7xl font-black tracking-tighter">
                        €{wealthStats.totalEquity.toLocaleString()}
                      </h2>
                    </div>
                    <div className="flex gap-3">
                      <span className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full font-bold text-sm border border-white/10">
                        LTV: {wealthStats.ltv.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-10 mt-10 border-t border-white/10">
                    <div>
                      <p className="text-indigo-300 text-sm font-bold uppercase tracking-wider mb-1">
                        Immobili
                      </p>
                      <p className="font-bold text-2xl">
                        €{wealthStats.totalRealEstateValue.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-indigo-300 text-sm font-bold uppercase tracking-wider mb-1">
                        Beni Mobili
                      </p>
                      <p className="font-bold text-2xl">
                        €
                        {wealthStats.totalAssetsValue.toLocaleString("it-IT", {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-rose-300 text-sm font-bold uppercase tracking-wider mb-1">
                        Debito
                      </p>
                      <p className="font-bold text-2xl">
                        -€{wealthStats.totalMortgageResidual.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-emerald-300 text-sm font-bold uppercase tracking-wider mb-1">
                        ROI
                      </p>
                      <p className="font-bold text-2xl">
                        {wealthStats.roi.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "taxes" && renderTaxes()}
            {activeTab === "inventory" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                    Inventario
                  </h2>
                  <button
                    onClick={() => setIsAssetModalOpen(true)}
                    className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-full font-bold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all active:scale-95 text-sm"
                  >
                    <Plus size={18} className="mr-2" /> Aggiungi
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-8">
                  {properties.map((p) => {
                    const pAssets = assets.filter((a) => a.propertyId === p.id);
                    const curVal = pAssets.reduce(
                      (s, a) => s + calculateCurrentAssetValue(a),
                      0
                    );
                    return (
                      <div
                        key={p.id}
                        className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden"
                      >
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                          <h3 className="font-bold text-xl text-slate-900">
                            {p.title}
                          </h3>
                          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">
                              Valore Attuale
                            </span>
                            <span className="font-black text-indigo-600 text-lg">
                              €
                              {curVal.toLocaleString("it-IT", {
                                maximumFractionDigits: 0,
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="p-2">
                          <table className="w-full text-sm text-left">
                            <tbody className="divide-y divide-slate-50">
                              {pAssets.map((a) => (
                                <tr
                                  key={a.id}
                                  className="group hover:bg-slate-50 transition-colors rounded-xl"
                                >
                                  <td className="px-6 py-4 font-medium text-slate-900">
                                    {a.name}
                                  </td>
                                  <td className="px-6 py-4 text-right font-bold text-slate-600">
                                    €
                                    {calculateCurrentAssetValue(
                                      a
                                    ).toLocaleString("it-IT", {
                                      maximumFractionDigits: 0,
                                    })}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button
                                      onClick={() => deleteItem("assets", a.id)}
                                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {activeTab === "transactions" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                    Movimenti
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {}}
                      className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-full font-bold text-slate-600 hover:bg-slate-50"
                    >
                      <FileSpreadsheet size={18} className="mr-2" />
                      Export
                    </button>
                  </div>
                </div>

                {/* --- SEZIONE GRAFICI REINSERITA (FinanceHub 2.0 Style) --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8">
                    <h3 className="font-bold text-xl text-slate-900 mb-6 flex items-center">
                      <PieChart className="mr-3 text-indigo-600" size={24} />{" "}
                      Spese per Categoria
                    </h3>
                    <div className="space-y-6 max-h-80 overflow-y-auto pr-2">
                      {Object.entries(stats.expenseByCategory)
                        .sort(([, a], [, b]) => b - a)
                        .map(([cat, amt]) => (
                          <ProgressBar
                            key={cat}
                            label={cat}
                            amount={amt}
                            total={stats.expense}
                            color="bg-rose-500"
                          />
                        ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8">
                    <h3 className="font-bold text-xl text-slate-900 mb-6 flex items-center">
                      <Home className="mr-3 text-indigo-600" size={24} /> Spese
                      per Immobile
                    </h3>
                    <div className="space-y-6">
                      {properties.map((p) => (
                        <ProgressBar
                          key={p.id}
                          label={p.title}
                          amount={stats.pnlByProperty[p.id].expense}
                          total={stats.expense}
                          color="bg-slate-800"
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {/* ----------------------------------------------------------- */}

                <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 font-bold text-slate-400 uppercase tracking-wider text-xs">
                      <tr>
                        <th className="px-8 py-5">Data</th>
                        <th className="px-8 py-5">Cat</th>
                        <th className="px-8 py-5">Immobile</th>
                        <th className="px-8 py-5 text-right">Importo</th>
                        <th className="px-8 py-5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.map((t) => (
                        <tr
                          key={t.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-8 py-5 font-medium text-slate-900">
                            {new Date(t.date).toLocaleDateString("it-IT", {
                              day: "numeric",
                              month: "short",
                            })}
                          </td>
                          <td className="px-8 py-5">
                            <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600">
                              {t.category}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-slate-500">
                            {properties.find((p) => p.id === t.propertyId)
                              ?.title || "-"}
                          </td>
                          <td
                            className={`px-8 py-5 text-right font-black text-base ${
                              t.type === "income"
                                ? "text-emerald-600"
                                : "text-slate-900"
                            }`}
                          >
                            {t.type === "income" ? "+" : "-"}€
                            {t.amount.toLocaleString()}
                          </td>
                          <td className="px-8 py-5 text-right">
                            <button
                              onClick={() => deleteItem("transactions", t.id)}
                              className="text-slate-300 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {activeTab === "properties" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                    Immobili
                  </h2>
                  <button
                    onClick={() => {
                      setEditingProperty(null);
                      setIsPropertyModalOpen(true);
                    }}
                    className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-full font-bold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all active:scale-95 text-sm"
                  >
                    <Plus size={18} className="mr-2" /> Aggiungi
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {properties.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white rounded-[2rem] border border-slate-100 p-8 relative group hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingProperty(p);
                            setIsPropertyModalOpen(true);
                          }}
                          className="p-2 bg-white border border-slate-100 rounded-full hover:bg-slate-50 shadow-sm"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => deleteItem("properties", p.id)}
                          className="p-2 bg-white border border-slate-100 rounded-full text-rose-500 hover:bg-rose-50 shadow-sm"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-slate-900/20">
                        <Home size={28} />
                      </div>
                      <h3 className="font-bold text-xl text-slate-900 mb-1">
                        {p.title}
                      </h3>
                      <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full uppercase tracking-wide">
                        {p.type}
                      </span>
                      <div className="mt-8 pt-6 border-t border-slate-100 space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">
                            Tasse (Est.)
                          </span>
                          <span className="font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md">
                            {p.taxRate || 21}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">
                            Valore
                          </span>
                          <span className="font-bold text-slate-900 text-lg">
                            €{p.marketValue.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

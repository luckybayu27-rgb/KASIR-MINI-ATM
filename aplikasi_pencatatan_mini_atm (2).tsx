import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  collection,
} from 'firebase/firestore';
import {
  Wallet,
  Building2,
  Smartphone,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  Plus,
  Trash2,
  Receipt,
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Settings,
  Copy,
  Check,
  TrendingUp,
  Info,
  X,
  Edit3,
  Cloud,
  CloudOff,
  Loader2,
  UserCheck
} from 'lucide-react';

// --- CLOUD INITIALIZATION ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- HELPER FORMATTERS ---
const formatRupiah = (number) => {
  if (number === null || number === undefined || isNaN(number)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
};

const formatNumberInput = (value) => {
  if (!value) return '';
  const numStr = value.toString().replace(/\D/g, '');
  if (!numStr) return '';
  return new Intl.NumberFormat('id-ID').format(parseInt(numStr, 10));
};

const parseRawNumber = (formattedValue) => {
  if (!formattedValue) return 0;
  const clean = formattedValue.toString().replace(/\D/g, '');
  return clean ? parseInt(clean, 10) : 0;
};

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentTimeString = () => {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
};

// --- INITIAL DEMO DATA ---
const INITIAL_ACCOUNTS = [
  { id: 'acc-cash', name: 'Kas Tunai (Laci)', type: 'cash', initialBalance: 10000000, color: 'emerald' },
  { id: 'acc-bri', name: 'Bank BRI', type: 'bank', initialBalance: 15000000, color: 'blue' },
  { id: 'acc-bca', name: 'Bank BCA', type: 'bank', initialBalance: 12000000, color: 'indigo' },
  { id: 'acc-mandiri', name: 'Bank Mandiri', type: 'bank', initialBalance: 8000000, color: 'amber' },
  { id: 'acc-dana', name: 'Saldo DANA / E-Wallet', type: 'ewallet', initialBalance: 3500000, color: 'sky' },
];

const INITIAL_TRANSACTIONS = [
  {
    id: 'trx-101',
    date: getTodayDateString(),
    time: '08:30',
    category: 'Transfer Tunai',
    accountOutId: 'acc-bri',
    accountInId: 'acc-cash',
    amount: 1000000,
    adminFee: 10000,
    adminAccountId: 'acc-cash',
    bankFee: 0,
    note: 'Transfer ke BRI a.n Budi (Admin Tunai)'
  },
  {
    id: 'trx-102',
    date: getTodayDateString(),
    time: '09:15',
    category: 'Tarik Tunai',
    accountOutId: 'acc-cash',
    accountInId: 'acc-bca',
    amount: 500000,
    adminFee: 5000,
    adminAccountId: 'acc-cash',
    bankFee: 0,
    note: 'Tarik Tunai BCA Ibu Siti (Admin Tunai)'
  },
  {
    id: 'trx-103',
    date: getTodayDateString(),
    time: '10:05',
    category: 'Tarik Tunai',
    accountOutId: 'acc-cash',
    accountInId: 'acc-bri',
    amount: 200000,
    adminFee: 5000,
    adminAccountId: 'acc-bri',
    bankFee: 0,
    note: 'Tarik Tunai BRI (Admin ikut ditransfer ke BRI)'
  },
  {
    id: 'trx-104',
    date: getTodayDateString(),
    time: '10:45',
    category: 'Top Up E-Wallet',
    accountOutId: 'acc-dana',
    accountInId: 'acc-cash',
    amount: 150000,
    adminFee: 3000,
    adminAccountId: 'acc-cash',
    bankFee: 0,
    note: 'Top Up DANA Pelanggan'
  }
];

export default function App() {
  // --- AUTH & CLOUD SYNC STATE ---
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState('connecting'); // 'connecting' | 'synced' | 'saving' | 'error'
  const [syncError, setSyncError] = useState(null);
  const [copiedUid, setCopiedUid] = useState(false);

  // --- STATE ---
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('transaksi'); // 'transaksi' | 'mutasi' | 'akun'

  // Form Input State
  const [category, setCategory] = useState('Transfer Tunai');
  const [accountOutId, setAccountOutId] = useState('acc-bri');
  const [accountInId, setAccountInId] = useState('acc-cash');
  const [amountInput, setAmountInput] = useState('');
  const [adminFeeInput, setAdminFeeInput] = useState('');
  const [adminAccountId, setAdminAccountId] = useState('acc-cash');
  const [bankFeeInput, setBankFeeInput] = useState('');
  const [showBankFee, setShowBankFee] = useState(false);
  const [note, setNote] = useState('');
  const [trxDate, setTrxDate] = useState(getTodayDateString());
  const [trxTime, setTrxTime] = useState(getCurrentTimeString());
  const [formFeedback, setFormFeedback] = useState(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAccount, setFilterAccount] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState('acc-cash');

  // Modals State
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [accountModal, setAccountModal] = useState(null); // null or { mode: 'add'|'edit', data: {...} }

  // --- 1. ONE-TIME AUTH INITIALIZATION ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setSyncStatus('error');
        setSyncError('Gagal mengautentikasi sesi penyimpanan awan.');
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. REAL-TIME CLOUD DATA FETCHING ---
  useEffect(() => {
    if (!user) return;

    setSyncStatus('connecting');
    const accountsCol = collection(db, 'artifacts', appId, 'public', 'data', 'mini_atm_accounts');
    const transactionsCol = collection(db, 'artifacts', appId, 'public', 'data', 'mini_atm_transactions');

    const unsubAccounts = onSnapshot(
      accountsCol,
      (snapshot) => {
        if (snapshot.empty) {
          // Inisialisasi akun bawaan pertama kali ke penyimpanan awan
          INITIAL_ACCOUNTS.forEach((acc, index) => {
            setDoc(
              doc(db, 'artifacts', appId, 'public', 'data', 'mini_atm_accounts', acc.id),
              { ...acc, order: index }
            ).catch((e) => console.error('Initial account seed error:', e));
          });
        } else {
          const loadedAccounts = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          loadedAccounts.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
          setAccounts(loadedAccounts);
        }
        setSyncStatus('synced');
        setSyncError(null);
      },
      (err) => {
        console.error('Accounts snapshot error:', err);
        setSyncStatus('error');
        setSyncError('Gagal memuat data akun dari penyimpanan awan.');
      }
    );

    const unsubTransactions = onSnapshot(
      transactionsCol,
      (snapshot) => {
        const loadedTrx = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        loadedTrx.sort((a, b) => {
          const dateCompare = (b.date || '').localeCompare(a.date || '');
          if (dateCompare !== 0) return dateCompare;
          const timeCompare = (b.time || '').localeCompare(a.time || '');
          if (timeCompare !== 0) return timeCompare;
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
        setTransactions(loadedTrx);
        setSyncStatus('synced');
      },
      (err) => {
        console.error('Transactions snapshot error:', err);
        setSyncStatus('error');
        setSyncError('Gagal memuat riwayat transaksi dari penyimpanan awan.');
      }
    );

    return () => {
      unsubAccounts();
      unsubTransactions();
    };
  }, [user]);

  // --- CALCULATE ACCOUNT BALANCES & MUTATIONS ---
  const accountStats = useMemo(() => {
    const stats = {};
    accounts.forEach((acc) => {
      stats[acc.id] = {
        ...acc,
        totalIn: 0,
        totalOut: 0,
        totalAdminIn: 0,
        totalBankFeeOut: 0,
        currentBalance: acc.initialBalance,
        trxCount: 0,
      };
    });

    transactions.forEach((trx) => {
      const amt = Number(trx.amount) || 0;
      const adm = Number(trx.adminFee) || 0;
      const bFee = Number(trx.bankFee) || 0;

      // Akun Keluar
      if (stats[trx.accountOutId]) {
        stats[trx.accountOutId].totalOut += amt;
        stats[trx.accountOutId].totalBankFeeOut += bFee;
        stats[trx.accountOutId].currentBalance -= (amt + bFee);
        stats[trx.accountOutId].trxCount += 1;
      }

      // Akun Masuk
      if (stats[trx.accountInId]) {
        stats[trx.accountInId].totalIn += amt;
        stats[trx.accountInId].currentBalance += amt;
        if (trx.accountInId !== trx.accountOutId) {
          stats[trx.accountInId].trxCount += 1;
        }
      }

      // Akun Penerima Admin
      if (adm > 0 && stats[trx.adminAccountId]) {
        stats[trx.adminAccountId].totalAdminIn += adm;
        stats[trx.adminAccountId].currentBalance += adm;
        if (
          trx.adminAccountId !== trx.accountInId &&
          trx.adminAccountId !== trx.accountOutId
        ) {
          stats[trx.adminAccountId].trxCount += 1;
        }
      }
    });

    return stats;
  }, [accounts, transactions]);

  const summaryTotals = useMemo(() => {
    let totalCash = 0;
    let totalNonCash = 0;
    let totalInitial = 0;

    Object.values(accountStats).forEach((acc) => {
      totalInitial += acc.initialBalance;
      if (acc.type === 'cash') {
        totalCash += acc.currentBalance;
      } else {
        totalNonCash += acc.currentBalance;
      }
    });

    let totalAdminGross = 0;
    let totalBankFee = 0;
    let totalVolume = 0;

    transactions.forEach((t) => {
      if (!filterDate || t.date === filterDate) {
        totalAdminGross += Number(t.adminFee) || 0;
        totalBankFee += Number(t.bankFee) || 0;
        totalVolume += Number(t.amount) || 0;
      }
    });

    return {
      totalCash,
      totalNonCash,
      totalAssets: totalCash + totalNonCash,
      totalInitial,
      totalAdminGross,
      totalBankFee,
      netProfit: totalAdminGross - totalBankFee,
      totalVolume,
    };
  }, [accountStats, transactions, filterDate]);

  // --- QUICK PRESET HANDLER ---
  const applyPreset = (presetType) => {
    setCategory(presetType);
    const cashAcc = accounts.find((a) => a.type === 'cash')?.id || accounts[0]?.id;
    const bankAcc = accounts.find((a) => a.type === 'bank')?.id || accounts[1]?.id || cashAcc;
    const ewalletAcc = accounts.find((a) => a.type === 'ewallet')?.id || bankAcc;

    if (presetType === 'Transfer Tunai') {
      // Pelanggan bawa uang tunai (Masuk Kas), agen transfer dari Bank (Keluar Bank), Admin masuk Kas
      setAccountOutId(bankAcc);
      setAccountInId(cashAcc);
      setAdminAccountId(cashAcc);
    } else if (presetType === 'Tarik Tunai') {
      // Pelanggan transfer ke Bank agen (Masuk Bank), agen kasih uang tunai (Keluar Kas), Admin masuk Kas/Bank
      setAccountOutId(cashAcc);
      setAccountInId(bankAcc);
      setAdminAccountId(cashAcc);
    } else if (presetType === 'Top Up E-Wallet') {
      // Saldo E-Wallet keluar, Kas Tunai masuk, Admin masuk Kas
      setAccountOutId(ewalletAcc);
      setAccountInId(cashAcc);
      setAdminAccountId(cashAcc);
    } else if (presetType === 'Sesama Rekening / Pindah Saldo') {
      setAccountOutId(bankAcc);
      setAccountInId(ewalletAcc);
      setAdminAccountId(cashAcc);
    }
  };

  // --- LIVE SIMULATION OF FORM INPUT ---
  const liveSimulation = useMemo(() => {
    const rawAmount = parseRawNumber(amountInput);
    const rawAdmin = parseRawNumber(adminFeeInput);
    const rawBankFee = showBankFee ? parseRawNumber(bankFeeInput) : 0;

    const effects = {};
    const touchAccount = (id) => {
      if (!id || !accountStats[id]) return null;
      if (!effects[id]) {
        effects[id] = {
          id,
          name: accountStats[id].name,
          before: accountStats[id].currentBalance,
          deltaPokok: 0,
          deltaAdmin: 0,
          deltaBankFee: 0,
        };
      }
      return effects[id];
    };

    const outAcc = touchAccount(accountOutId);
    if (outAcc) {
      outAcc.deltaPokok -= rawAmount;
      outAcc.deltaBankFee -= rawBankFee;
    }

    const inAcc = touchAccount(accountInId);
    if (inAcc) {
      inAcc.deltaPokok += rawAmount;
    }

    if (rawAdmin > 0) {
      const admAcc = touchAccount(adminAccountId);
      if (admAcc) {
        admAcc.deltaAdmin += rawAdmin;
      }
    }

    return Object.values(effects).map((item) => {
      const netDelta = item.deltaPokok + item.deltaAdmin + item.deltaBankFee;
      return {
        ...item,
        netDelta,
        after: item.before + netDelta,
      };
    });
  }, [
    amountInput,
    adminFeeInput,
    bankFeeInput,
    showBankFee,
    accountOutId,
    accountInId,
    adminAccountId,
    accountStats,
  ]);

  // --- SUBMIT TRANSACTION ---
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!user) {
      setFormFeedback({
        type: 'error',
        message: 'Sedang menghubungkan ke penyimpanan awan, silakan coba sesaat lagi.',
      });
      return;
    }

    const rawAmount = parseRawNumber(amountInput);
    const rawAdmin = parseRawNumber(adminFeeInput);
    const rawBankFee = showBankFee ? parseRawNumber(bankFeeInput) : 0;

    if (rawAmount <= 0 && rawAdmin <= 0) {
      setFormFeedback({
        type: 'error',
        message: 'Masukkan nominal transaksi atau nominal admin terlebih dahulu.',
      });
      return;
    }

    if (!accountOutId || !accountInId || !adminAccountId) {
      setFormFeedback({
        type: 'error',
        message: 'Pastikan Akun Keluar, Akun Masuk, dan Akun Penerima Admin sudah dipilih.',
      });
      return;
    }

    const trxId = `trx-${Date.now()}`;
    const newTrx = {
      id: trxId,
      createdAt: Date.now(),
      date: trxDate || getTodayDateString(),
      time: trxTime || getCurrentTimeString(),
      category,
      accountOutId,
      accountInId,
      amount: rawAmount,
      adminFee: rawAdmin,
      adminAccountId,
      bankFee: rawBankFee,
      note: note.trim() || `${category} (${accountStats[accountOutId]?.name} → ${accountStats[accountInId]?.name})`,
      createdBy: user.uid,
    };

    try {
      setSyncStatus('saving');
      await setDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'mini_atm_transactions', trxId),
        newTrx
      );
      setSyncStatus('synced');

      setAmountInput('');
      setAdminFeeInput('');
      setBankFeeInput('');
      setNote('');
      setTrxTime(getCurrentTimeString());

      setFormFeedback({
        type: 'success',
        message: 'Transaksi berhasil disimpan ke Cloud dan saldo akun diperbarui otomatis!',
      });

      setTimeout(() => {
        setFormFeedback(null);
      }, 3500);
    } catch (err) {
      console.error('Save transaction error:', err);
      setSyncStatus('error');
      setFormFeedback({
        type: 'error',
        message: 'Gagal menyimpan transaksi ke penyimpanan awan.',
      });
    }
  };

  // --- SEED DEMO TRANSACTIONS ---
  const handleLoadDemoTransactions = async () => {
    if (!user) return;
    try {
      setSyncStatus('saving');
      await Promise.all(
        INITIAL_TRANSACTIONS.map((trx, idx) =>
          setDoc(
            doc(db, 'artifacts', appId, 'public', 'data', 'mini_atm_transactions', trx.id),
            { ...trx, createdAt: Date.now() - idx * 1000, createdBy: user.uid }
          )
        )
      );
      setSyncStatus('synced');
    } catch (err) {
      console.error('Load demo error:', err);
      setSyncStatus('error');
    }
  };

  // --- SWAP ACCOUNTS ---
  const handleSwapAccounts = () => {
    const temp = accountOutId;
    setAccountOutId(accountInId);
    setAccountInId(temp);
  };

  // --- FILTERED TRANSACTIONS ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter((trx) => {
      const matchDate = !filterDate || trx.date === filterDate;
      const matchAccount =
        filterAccount === 'ALL' ||
        trx.accountOutId === filterAccount ||
        trx.accountInId === filterAccount ||
        (trx.adminFee > 0 && trx.adminAccountId === filterAccount);

      const q = searchQuery.toLowerCase();
      const outName = accountStats[trx.accountOutId]?.name.toLowerCase() || '';
      const inName = accountStats[trx.accountInId]?.name.toLowerCase() || '';
      const admName = accountStats[trx.adminAccountId]?.name.toLowerCase() || '';
      const matchSearch =
        !q ||
        trx.note.toLowerCase().includes(q) ||
        trx.category.toLowerCase().includes(q) ||
        outName.includes(q) ||
        inName.includes(q) ||
        admName.includes(q) ||
        trx.amount.toString().includes(q);

      return matchDate && matchAccount && matchSearch;
    });
  }, [transactions, filterDate, filterAccount, searchQuery, accountStats]);

  // --- LEDGER / MUTASI PER AKUN ---
  const accountLedgerEntries = useMemo(() => {
    if (!selectedLedgerAccount || !accountStats[selectedLedgerAccount]) return [];
    const targetAcc = accountStats[selectedLedgerAccount];
    let runningBalance = targetAcc.initialBalance;

    // Urutkan transaksi dari terlama ke terbaru untuk menghitung saldo berjalan
    const chronological = [...transactions].reverse();
    const entries = [];

    chronological.forEach((trx) => {
      const amt = Number(trx.amount) || 0;
      const adm = Number(trx.adminFee) || 0;
      const bFee = Number(trx.bankFee) || 0;

      // Cek apakah akun ini terlibat di transaksi ini
      let debit = 0; // Uang Masuk ke akun ini
      let credit = 0; // Uang Keluar dari akun ini
      const roles = [];

      if (trx.accountOutId === selectedLedgerAccount && amt > 0) {
        credit += amt;
        roles.push(`Keluar Pokok (${formatRupiah(amt)})`);
      }
      if (trx.accountOutId === selectedLedgerAccount && bFee > 0) {
        credit += bFee;
        roles.push(`Potongan Bank (${formatRupiah(bFee)})`);
      }
      if (trx.accountInId === selectedLedgerAccount && amt > 0) {
        debit += amt;
        roles.push(`Masuk Pokok (${formatRupiah(amt)})`);
      }
      if (trx.adminAccountId === selectedLedgerAccount && adm > 0) {
        debit += adm;
        roles.push(`Penerima Admin (+${formatRupiah(adm)})`);
      }

      if (roles.length > 0) {
        runningBalance = runningBalance + debit - credit;
        entries.push({
          id: trx.id,
          date: trx.date,
          time: trx.time,
          category: trx.category,
          note: trx.note,
          roles: roles.join(' • '),
          debit,
          credit,
          netChange: debit - credit,
          balanceAfter: runningBalance,
          rawTrx: trx,
        });
      }
    });

    return entries.reverse();
  }, [transactions, selectedLedgerAccount, accountStats]);

  // --- EXPORT CSV ---
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Tanggal',
      'Jam',
      'Kategori',
      'Keterangan',
      'Akun Keluar',
      'Akun Masuk',
      'Nominal Pokok',
      'Biaya Admin (Laba)',
      'Akun Penerima Admin',
      'Biaya Admin Bank',
    ];

    const rows = filteredTransactions.map((t) => [
      t.id,
      t.date,
      t.time,
      `"${t.category}"`,
      `"${t.note.replace(/"/g, '""')}"`,
      `"${accountStats[t.accountOutId]?.name || '-'}"`,
      `"${accountStats[t.accountInId]?.name || '-'}"`,
      t.amount,
      t.adminFee,
      `"${accountStats[t.adminAccountId]?.name || '-'}"`,
      t.bankFee || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Mini_ATM_${getTodayDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- COPY RECEIPT TEXT ---
  const handleCopyReceipt = (trx) => {
    const text = [
      `=== STRUK TRANSAKSI MINI ATM ===`,
      `Waktu     : ${trx.date} ${trx.time}`,
      `Layanan   : ${trx.category}`,
      `Keterangan: ${trx.note}`,
      `--------------------------------`,
      `Akun Keluar      : ${accountStats[trx.accountOutId]?.name || '-'}`,
      `Akun Masuk       : ${accountStats[trx.accountInId]?.name || '-'}`,
      `Nominal Pokok    : ${formatRupiah(trx.amount)}`,
      `Biaya Admin      : ${formatRupiah(trx.adminFee)}`,
      `Penerima Admin   : ${accountStats[trx.adminAccountId]?.name || '-'}`,
      `--------------------------------`,
      `Total Nominal + Admin: ${formatRupiah(Number(trx.amount) + Number(trx.adminFee))}`,
      `Terima kasih atas kepercayaan Anda.`,
    ].join('\n');

    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);

    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  // --- SAVE ACCOUNT (ADD / EDIT) ---
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!user) return;
    const { mode, data } = accountModal;
    if (!data.name.trim()) return;

    const parsedInit = parseRawNumber(data.initialBalanceInput);

    try {
      setSyncStatus('saving');
      if (mode === 'add') {
        const newAccId = `acc-${Date.now()}`;
        const newAcc = {
          id: newAccId,
          name: data.name.trim(),
          type: data.type,
          initialBalance: parsedInit,
          color: data.type === 'cash' ? 'emerald' : data.type === 'bank' ? 'blue' : 'sky',
          order: accounts.length,
        };
        await setDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'mini_atm_accounts', newAccId),
          newAcc
        );
      } else if (mode === 'edit') {
        const existingAcc = accounts.find((a) => a.id === data.id) || {};
        await setDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'mini_atm_accounts', data.id),
          {
            ...existingAcc,
            id: data.id,
            name: data.name.trim(),
            type: data.type,
            initialBalance: parsedInit,
          }
        );
      }
      setSyncStatus('synced');
      setAccountModal(null);
    } catch (err) {
      console.error('Save account error:', err);
      setSyncStatus('error');
    }
  };

  const handleCopyUserId = () => {
    if (!user?.uid) return;
    const textArea = document.createElement('textarea');
    textArea.value = user.uid;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const getAccountIcon = (type) => {
    if (type === 'cash') return <Wallet className="w-4 h-4 text-emerald-600" />;
    if (type === 'ewallet') return <Smartphone className="w-4 h-4 text-sky-600" />;
    return <Building2 className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12 font-sans">
      {/* TOP NAVBAR */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center shadow-md">
              <ArrowRightLeft className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">MiniATM Pro</h1>
                <span className="text-[11px] font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
                  Multi-Akun & Adm Terpisah
                </span>
                {/* CLOUD STATUS BADGE */}
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    syncStatus === 'synced'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                      : syncStatus === 'saving' || syncStatus === 'connecting'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                  }`}
                >
                  {syncStatus === 'synced' && <Cloud className="w-3.5 h-3.5" />}
                  {(syncStatus === 'connecting' || syncStatus === 'saving') && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {syncStatus === 'error' && <CloudOff className="w-3.5 h-3.5" />}
                  {syncStatus === 'synced'
                    ? 'Cloud Aktif & Tersinkronisasi'
                    : syncStatus === 'saving'
                    ? 'Menyimpan ke Cloud...'
                    : syncStatus === 'connecting'
                    ? 'Menghubungkan Cloud...'
                    : 'Gangguan Koneksi'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                <p className="text-xs text-slate-400">
                  Sistem Pembukuan Akun Masuk, Akun Keluar & Alokasi Penerima Admin
                </p>
                {user && (
                  <button
                    type="button"
                    onClick={handleCopyUserId}
                    title="Klik untuk menyalin ID Sesi Kasir"
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700 transition-colors"
                  >
                    <UserCheck className="w-3 h-3 text-emerald-400" />
                    <span>ID Kasir: {user.uid}</span>
                    {copiedUid ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 opacity-70" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* NAVIGATION TABS */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700/70 self-start md:self-auto">
            <button
              onClick={() => setActiveTab('transaksi')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'transaksi'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Input & Transaksi</span>
            </button>
            <button
              onClick={() => setActiveTab('mutasi')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'mutasi'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Buku Mutasi Akun</span>
            </button>
            <button
              onClick={() => setActiveTab('akun')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'akun'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Kelola Saldo & Akun</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {syncError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{syncError}</span>
            </div>
          </div>
        )}

        {/* SUMMARY METRICS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Aset (Kas + Rekening)
              </span>
              <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900">
                {formatRupiah(summaryTotals.totalAssets)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Modal Awal: {formatRupiah(summaryTotals.totalInitial)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Total Kas Tunai (Laci)
              </span>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-emerald-700">
                {formatRupiah(summaryTotals.totalCash)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Uang fisik siap tarik tunai
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-blue-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                Total Saldo Bank & E-Wallet
              </span>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-blue-700">
                {formatRupiah(summaryTotals.totalNonCash)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Saldo digital siap transfer/top-up
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-100">
                Laba Admin Terkumpul
              </span>
              <div className="p-2 bg-white/15 rounded-lg text-white">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold">
                {formatRupiah(summaryTotals.netProfit)}
              </div>
              <p className="text-xs text-amber-100 mt-1">
                Perputaran Pokok: {formatRupiah(summaryTotals.totalVolume)}
              </p>
            </div>
          </div>
        </section>

        {/* HORIZONTAL REAL-TIME ACCOUNT CARDS */}
        <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Posisi Saldo Per Akun Saat Ini
              </h2>
              <span className="text-xs text-slate-400 hidden sm:inline">
                (Klik kartu akun untuk melihat rincian mutasinya)
              </span>
            </div>
            <button
              onClick={() =>
                setAccountModal({
                  mode: 'add',
                  data: { name: '', type: 'bank', initialBalanceInput: '' },
                })
              }
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Akun
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {accounts.map((acc) => {
              const st = accountStats[acc.id];
              const isNegative = st.currentBalance < 0;
              return (
                <div
                  key={acc.id}
                  onClick={() => {
                    setSelectedLedgerAccount(acc.id);
                    setActiveTab('mutasi');
                  }}
                  className={`cursor-pointer group rounded-xl p-3.5 border transition-all hover:shadow-md ${
                    acc.type === 'cash'
                      ? 'bg-emerald-50/40 border-emerald-200/80 hover:border-emerald-400'
                      : 'bg-slate-50/70 border-slate-200/80 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-lg bg-white shadow-xs border border-slate-100">
                        {getAccountIcon(acc.type)}
                      </div>
                      <span className="font-semibold text-sm text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                        {acc.name}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`mt-2.5 text-lg font-bold tracking-tight ${
                      isNegative ? 'text-rose-600' : 'text-slate-900'
                    }`}
                  >
                    {formatRupiah(st.currentBalance)}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Adm Masuk:</span>
                    <span className="font-semibold text-amber-600">
                      +{formatRupiah(st.totalAdminIn)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================= TAB 1: INPUT & RIWAYAT TRANSAKSI ================= */}
        {activeTab === 'transaksi' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: FORM INPUT MINI ATM (5 COLS) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-base flex items-center gap-2">
                    <Plus className="w-5 h-5 text-emerald-400" />
                    Input Transaksi Mini ATM
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pilih akun keluar, akun masuk, dan akun penerima biaya admin
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddTransaction} className="p-5 space-y-4">
                {/* QUICK PRESET BUTTONS */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    1. Pilih Jenis Layanan (Otomatis Atur Arah Akun)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Transfer Tunai', desc: 'Bank Keluar → Kas Masuk' },
                      { label: 'Tarik Tunai', desc: 'Kas Keluar → Bank Masuk' },
                      { label: 'Top Up E-Wallet', desc: 'E-Wallet Keluar → Kas Masuk' },
                      { label: 'Sesama Rekening / Pindah Saldo', desc: 'Antar Akun' },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.label}
                        onClick={() => applyPreset(item.label)}
                        className={`text-left p-2.5 rounded-xl border transition-all ${
                          category === item.label
                            ? 'bg-blue-50/90 border-blue-500 text-blue-900 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-xs font-bold truncate">{item.label}</div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {item.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* AKUN KELUAR & AKUN MASUK */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      2. Alur Perpindahan Saldo Pokok
                    </span>
                    <button
                      type="button"
                      onClick={handleSwapAccounts}
                      title="Tukar Akun Keluar & Akun Masuk"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      Tukar Posisi
                    </button>
                  </div>

                  {/* AKUN KELUAR */}
                  <div>
                    <label className="flex items-center justify-between text-xs font-semibold text-rose-700 mb-1">
                      <span className="flex items-center gap-1">
                        <ArrowUpRight className="w-4 h-4" />
                        Akun Keluar (Saldo Berkurang)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Sisa: {formatRupiah(accountStats[accountOutId]?.currentBalance || 0)}
                      </span>
                    </label>
                    <select
                      value={accountOutId}
                      onChange={(e) => setAccountOutId(e.target.value)}
                      className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatRupiah(accountStats[acc.id]?.currentBalance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* AKUN MASUK */}
                  <div>
                    <label className="flex items-center justify-between text-xs font-semibold text-emerald-700 mb-1">
                      <span className="flex items-center gap-1">
                        <ArrowDownLeft className="w-4 h-4" />
                        Akun Masuk (Saldo Bertambah)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Sisa: {formatRupiah(accountStats[accountInId]?.currentBalance || 0)}
                      </span>
                    </label>
                    <select
                      value={accountInId}
                      onChange={(e) => setAccountInId(e.target.value)}
                      className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatRupiah(accountStats[acc.id]?.currentBalance)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* NOMINAL POKOK */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    3. Nominal Transaksi Pokok (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={amountInput}
                      onChange={(e) => setAmountInput(formatNumberInput(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {/* Quick Nominal Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[50000, 100000, 200000, 500000, 1000000].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setAmountInput(formatNumberInput(val))}
                        className="text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        {val >= 1000000 ? `${val / 1000000} Jt` : `${val / 1000} Rb`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* BIAYA ADMIN TERPISAH & AKUN PENERIMA ADMIN */}
                <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-amber-600" />
                      4. Pencatatan Admin (Terpisah)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Nominal Biaya Admin */}
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">
                        Nominal Admin / Jasa (Rp)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-600">
                          Rp
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={adminFeeInput}
                          onChange={(e) => setAdminFeeInput(formatNumberInput(e.target.value))}
                          className="w-full rounded-xl border border-amber-300 bg-white pl-8 pr-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    {/* Akun Penerima Admin */}
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">
                        Akun Penerima Admin
                      </label>
                      <select
                        value={adminAccountId}
                        onChange={(e) => setAdminAccountId(e.target.value)}
                        className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Quick Admin Fee Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-amber-800 mr-1">Cepat:</span>
                    {[2000, 3000, 5000, 7000, 10000, 15000].map((admVal) => (
                      <button
                        type="button"
                        key={admVal}
                        onClick={() => setAdminFeeInput(formatNumberInput(admVal))}
                        className="text-[11px] font-semibold bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md transition-colors"
                      >
                        +{admVal / 1000}rb
                      </button>
                    ))}
                  </div>

                  {/* Opsional Potongan Admin Bank */}
                  <div className="pt-1 border-t border-amber-200/60">
                    <button
                      type="button"
                      onClick={() => setShowBankFee(!showBankFee)}
                      className="text-[11px] font-semibold text-amber-800 hover:underline flex items-center gap-1"
                    >
                      {showBankFee
                        ? '− Sembunyikan Potongan Biaya Bank'
                        : '+ Ada Potongan Biaya Admin Bank dari Akun Keluar? (Opsional)'}
                    </button>
                    {showBankFee && (
                      <div className="mt-2">
                        <label className="block text-[11px] text-slate-600 mb-1">
                          Potongan Admin Bank (Otomatis memotong Akun Keluar):
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Contoh: 2.500 atau 6.500"
                          value={bankFeeInput}
                          onChange={(e) => setBankFeeInput(formatNumberInput(e.target.value))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* KETERANGAN & WAKTU */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Keterangan / Nama Pelanggan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Tarik Tunai Pak Ahmad / No. Rek..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Tanggal
                    </label>
                    <input
                      type="date"
                      value={trxDate}
                      onChange={(e) => setTrxDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-2.5 py-2 text-xs font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* LIVE PREVIEW PERUBAHAN SALDO */}
                {(parseRawNumber(amountInput) > 0 || parseRawNumber(adminFeeInput) > 0) && (
                  <div className="bg-slate-900 text-slate-100 rounded-xl p-3.5 space-y-2 border border-slate-800">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-blue-400" />
                        Simulasi Dampak ke Saldo Akun:
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {liveSimulation.map((sim) => (
                        <div
                          key={sim.id}
                          className="flex items-center justify-between bg-slate-800/90 px-2.5 py-1.5 rounded-lg"
                        >
                          <div className="truncate pr-2">
                            <span className="font-semibold text-white">{sim.name}</span>
                            <div className="text-[10px] text-slate-400">
                              {sim.deltaPokok !== 0 &&
                                `Pokok: ${sim.deltaPokok > 0 ? '+' : ''}${formatRupiah(sim.deltaPokok)} `}
                              {sim.deltaAdmin > 0 && `| Adm: +${formatRupiah(sim.deltaAdmin)} `}
                              {sim.deltaBankFee < 0 &&
                                `| Pot.Bank: ${formatRupiah(sim.deltaBankFee)}`}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`font-bold ${
                                sim.netDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {sim.netDelta >= 0 ? '+' : ''}
                              {formatRupiah(sim.netDelta)}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              Jadi: {formatRupiah(sim.after)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FEEDBACK MESSAGE */}
                {formFeedback && (
                  <div
                    className={`p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${
                      formFeedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {formFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{formFeedback.message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Simpan Transaksi Mini ATM
                </button>
              </form>
            </div>

            {/* RIGHT COLUMN: DAFTAR RIWAYAT TRANSAKSI (7 COLS) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-base text-slate-900">
                      Riwayat Pencatatan Transaksi
                    </h2>
                    <p className="text-xs text-slate-500">
                      Menampilkan {filteredTransactions.length} transaksi tercatat
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportCSV}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-xl transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Unduh CSV / Excel
                    </button>
                    {transactions.length === 0 ? (
                      <button
                        onClick={handleLoadDemoTransactions}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-2 rounded-xl transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Muat Contoh Transaksi
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          setConfirmModal({
                            title: 'Reset Semua Riwayat Transaksi di Cloud?',
                            message:
                              'Semua catatan transaksi akan dihapus dari penyimpanan awan dan saldo akun kembali ke modal awal. Tindakan ini tidak dapat dibatalkan.',
                            onConfirm: async () => {
                              try {
                                setSyncStatus('saving');
                                await Promise.all(
                                  transactions.map((t) =>
                                    deleteDoc(
                                      doc(
                                        db,
                                        'artifacts',
                                        appId,
                                        'public',
                                        'data',
                                        'mini_atm_transactions',
                                        t.id
                                      )
                                    )
                                  )
                                );
                                setSyncStatus('synced');
                              } catch (err) {
                                console.error('Reset error:', err);
                                setSyncStatus('error');
                              }
                              setConfirmModal(null);
                            },
                          })
                        }
                        className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 rounded-xl transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* FILTER BAR */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari keterangan, akun, nominal..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="relative">
                    <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={filterAccount}
                      onChange={(e) => setFilterAccount(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ALL">Semua Akun</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          Melibatkan: {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {filterDate && (
                      <button
                        onClick={() => setFilterDate('')}
                        title="Tampilkan Semua Tanggal"
                        className="p-2 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 rounded-xl"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* TRANSACTION LIST */}
              <div className="divide-y divide-slate-100 max-h-[680px] overflow-y-auto">
                {filteredTransactions.length === 0 ? (
                  <div className="p-12 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
                      Belum ada transaksi yang sesuai filter
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Silakan gunakan formulir di sebelah kiri untuk mencatat transaksi Transfer, Tarik Tunai, atau Top Up.
                    </p>
                  </div>
                ) : (
                  filteredTransactions.map((trx) => {
                    const outAcc = accountStats[trx.accountOutId];
                    const inAcc = accountStats[trx.accountInId];
                    const admAcc = accountStats[trx.adminAccountId];

                    return (
                      <div
                        key={trx.id}
                        className="p-4 hover:bg-slate-50/90 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
                              {trx.category}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              {trx.date} • {trx.time}
                            </span>
                          </div>

                          <div className="font-semibold text-sm text-slate-900 truncate">
                            {trx.note}
                          </div>

                          {/* ALUR AKUN BADGES */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/70 font-medium">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              Keluar: <strong>{outAcc?.name || 'Akun Terhapus'}</strong>
                            </span>

                            <span className="text-slate-400 font-bold">→</span>

                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-medium">
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              Masuk: <strong>{inAcc?.name || 'Akun Terhapus'}</strong>
                            </span>

                            {trx.adminFee > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/80 font-medium">
                                <Coins className="w-3.5 h-3.5 text-amber-600" />
                                Adm ke: <strong>{admAcc?.name || '-'}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* RIGHT SIDE NOMINAL & ACTIONS */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100">
                          <div className="text-left sm:text-right">
                            <div className="text-base font-bold text-slate-900">
                              {formatRupiah(trx.amount)}
                            </div>
                            <div className="text-xs font-semibold text-amber-600">
                              + Admin {formatRupiah(trx.adminFee)}
                            </div>
                            {trx.bankFee > 0 && (
                              <div className="text-[11px] text-rose-500">
                                Pot. Bank: -{formatRupiah(trx.bankFee)}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedReceipt(trx)}
                              title="Lihat Struk / Rincian"
                              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              Struk
                            </button>
                            <button
                              onClick={() =>
                                setConfirmModal({
                                  title: 'Hapus Transaksi Ini dari Cloud?',
                                  message: `Transaksi "${trx.note}" sebesar ${formatRupiah(trx.amount)} akan dihapus permanen dan saldo akun akan dikembalikan otomatis.`,
                                  onConfirm: async () => {
                                    try {
                                      setSyncStatus('saving');
                                      await deleteDoc(
                                        doc(
                                          db,
                                          'artifacts',
                                          appId,
                                          'public',
                                          'data',
                                          'mini_atm_transactions',
                                          trx.id
                                        )
                                      );
                                      setSyncStatus('synced');
                                    } catch (err) {
                                      console.error('Delete transaction error:', err);
                                      setSyncStatus('error');
                                    }
                                    setConfirmModal(null);
                                  },
                                })
                              }
                              title="Hapus Transaksi"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: BUKU MUTASI PER AKUN ================= */}
        {activeTab === 'mutasi' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  Buku Mutasi & Riwayat Saldo Per Akun
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pantau alur keluar-masuk pokok maupun penerimaan biaya admin pada masing-masing akun
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Pilih Akun:</span>
                <select
                  value={selectedLedgerAccount}
                  onChange={(e) => setSelectedLedgerAccount(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Saldo: {formatRupiah(accountStats[acc.id]?.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {accountStats[selectedLedgerAccount] && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-50 border-b border-slate-200/80 text-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                  <span className="text-slate-400 block">Saldo Awal</span>
                  <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                    {formatRupiah(accountStats[selectedLedgerAccount].initialBalance)}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                  <span className="text-slate-400 block">Total Pokok Masuk</span>
                  <span className="text-sm font-bold text-emerald-600 mt-0.5 block">
                    +{formatRupiah(accountStats[selectedLedgerAccount].totalIn)}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                  <span className="text-slate-400 block">Total Pokok Keluar</span>
                  <span className="text-sm font-bold text-rose-600 mt-0.5 block">
                    -{formatRupiah(accountStats[selectedLedgerAccount].totalOut)}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                  <span className="text-slate-400 block">Total Admin Diterima</span>
                  <span className="text-sm font-bold text-amber-600 mt-0.5 block">
                    +{formatRupiah(accountStats[selectedLedgerAccount].totalAdminIn)}
                  </span>
                </div>
                <div className="bg-slate-900 text-white p-3 rounded-xl col-span-2 sm:col-span-1">
                  <span className="text-slate-400 block">Saldo Akhir Saat Ini</span>
                  <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                    {formatRupiah(accountStats[selectedLedgerAccount].currentBalance)}
                  </span>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Keterangan Transaksi</th>
                    <th className="py-3 px-4">Peran Akun Ini</th>
                    <th className="py-3 px-4 text-right">Mutasi Masuk (+)</th>
                    <th className="py-3 px-4 text-right">Mutasi Keluar (-)</th>
                    <th className="py-3 px-4 text-right">Saldo Berjalan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {accountLedgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        Belum ada mutasi pada akun ini.
                      </td>
                    </tr>
                  ) : (
                    accountLedgerEntries.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500">
                          <div>{item.date}</div>
                          <div>{item.time}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{item.note}</div>
                          <div className="text-xs text-slate-400">{item.category}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                            {item.roles}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600 whitespace-nowrap">
                          {item.debit > 0 ? `+${formatRupiah(item.debit)}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-rose-600 whitespace-nowrap">
                          {item.credit > 0 ? `-${formatRupiah(item.credit)}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatRupiah(item.balanceAfter)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 3: KELOLA AKUN & MODAL AWAL ================= */}
        {activeTab === 'akun' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Pengaturan Akun Kas, Bank & E-Wallet
                </h2>
                <p className="text-xs text-slate-500">
                  Sesuaikan saldo modal awal atau tambahkan rekening/dompet digital baru
                </p>
              </div>
              <button
                onClick={() =>
                  setAccountModal({
                    mode: 'add',
                    data: { name: '', type: 'bank', initialBalanceInput: '' },
                  })
                }
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Tambah Akun Baru
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc) => {
                const st = accountStats[acc.id];
                return (
                  <div
                    key={acc.id}
                    className="rounded-2xl border border-slate-200 p-4 flex flex-col justify-between bg-slate-50/50"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                            {getAccountIcon(acc.type)}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm">{acc.name}</h3>
                            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                              {acc.type === 'cash'
                                ? 'Kas Tunai / Laci'
                                : acc.type === 'bank'
                                ? 'Rekening Bank'
                                : 'E-Wallet / Pulsa'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setAccountModal({
                                mode: 'edit',
                                data: {
                                  id: acc.id,
                                  name: acc.name,
                                  type: acc.type,
                                  initialBalanceInput: formatNumberInput(acc.initialBalance),
                                },
                              })
                            }
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                            title="Edit Akun / Modal Awal"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {accounts.length > 2 && (
                            <button
                              onClick={() =>
                                setConfirmModal({
                                  title: `Hapus Akun ${acc.name}?`,
                                  message:
                                    'Pastikan akun ini tidak sedang dipakai pada transaksi aktif.',
                                  onConfirm: async () => {
                                    try {
                                      setSyncStatus('saving');
                                      await deleteDoc(
                                        doc(
                                          db,
                                          'artifacts',
                                          appId,
                                          'public',
                                          'data',
                                          'mini_atm_accounts',
                                          acc.id
                                        )
                                      );
                                      setSyncStatus('synced');
                                    } catch (err) {
                                      console.error('Delete account error:', err);
                                      setSyncStatus('error');
                                    }
                                    setConfirmModal(null);
                                  },
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
                              title="Hapus Akun"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 space-y-1.5 bg-white p-3 rounded-xl border border-slate-200/70 text-xs">
                        <div className="flex justify-between text-slate-500">
                          <span>Modal / Saldo Awal:</span>
                          <span className="font-semibold text-slate-800">
                            {formatRupiah(acc.initialBalance)}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Akumulasi Pokok Masuk:</span>
                          <span className="font-semibold text-emerald-600">
                            +{formatRupiah(st.totalIn)}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Akumulasi Pokok Keluar:</span>
                          <span className="font-semibold text-rose-600">
                            -{formatRupiah(st.totalOut)}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Penerimaan Biaya Admin:</span>
                          <span className="font-semibold text-amber-600">
                            +{formatRupiah(st.totalAdminIn)}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-bold text-slate-900">
                          <span>Saldo Akhir:</span>
                          <span>{formatRupiah(st.currentBalance)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ================= MODAL: STRUK TRANSAKSI ================= */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">Rincian & Struk Transaksi</h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 font-mono text-xs space-y-2 text-slate-800">
              <div className="text-center font-bold text-sm border-b border-dashed border-slate-300 pb-2">
                BUKTI TRANSAKSI MINI ATM
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Waktu:</span>
                <span>
                  {selectedReceipt.date} {selectedReceipt.time}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kategori:</span>
                <span className="font-bold">{selectedReceipt.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Keterangan:</span>
                <span className="text-right max-w-[200px]">{selectedReceipt.note}</span>
              </div>
              <div className="border-t border-dashed border-slate-300 my-2 pt-2 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Akun Keluar (-):</span>
                  <span className="font-semibold text-rose-700">
                    {accountStats[selectedReceipt.accountOutId]?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Akun Masuk (+):</span>
                  <span className="font-semibold text-emerald-700">
                    {accountStats[selectedReceipt.accountInId]?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Penerima Admin (+):</span>
                  <span className="font-semibold text-amber-700">
                    {accountStats[selectedReceipt.adminAccountId]?.name}
                  </span>
                </div>
              </div>
              <div className="border-t border-dashed border-slate-300 my-2 pt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nominal Pokok:</span>
                  <span className="font-bold">{formatRupiah(selectedReceipt.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Biaya Admin:</span>
                  <span className="font-bold">{formatRupiah(selectedReceipt.adminFee)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-slate-300 pt-1.5 mt-1">
                  <span>TOTAL:</span>
                  <span>
                    {formatRupiah(
                      Number(selectedReceipt.amount) + Number(selectedReceipt.adminFee)
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopyReceipt(selectedReceipt)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedReceipt ? (
                  <>
                    <Check className="w-4 h-4" />
                    Teks Struk Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Salin Teks Struk (WA)
                  </>
                )}
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2.5 px-4 rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TAMBAH / EDIT AKUN ================= */}
      {accountModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {accountModal.mode === 'add' ? 'Tambah Akun Mini ATM' : 'Edit Akun & Saldo Awal'}
              </h3>
              <button
                onClick={() => setAccountModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Akun / Rekening / Kas
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bank BNI, Kas Laci 2, Gopay..."
                  value={accountModal.data.name}
                  onChange={(e) =>
                    setAccountModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, name: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kategori Akun
                </label>
                <select
                  value={accountModal.data.type}
                  onChange={(e) =>
                    setAccountModal((prev) => ({
                      ...prev,
                      data: { ...prev.data, type: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-900"
                >
                  <option value="cash">Kas Tunai (Uang Fisik / Laci)</option>
                  <option value="bank">Rekening Bank (BRI, BCA, Mandiri, dll)</option>
                  <option value="ewallet">E-Wallet / Server Pulsa (DANA, OVO, dll)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Saldo Awal (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={accountModal.data.initialBalanceInput}
                  onChange={(e) =>
                    setAccountModal((prev) => ({
                      ...prev,
                      data: {
                        ...prev.data,
                        initialBalanceInput: formatNumberInput(e.target.value),
                      },
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAccountModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: KONFIRMASI HAPUS / RESET ================= */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">{confirmModal.title}</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{confirmModal.message}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
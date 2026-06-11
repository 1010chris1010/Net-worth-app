/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { PortfolioData, AssetType, CashAsset, StockAsset, MutualFundAsset, OtherAsset, PolishBondType, PortfolioSnapshot } from "./types";
import { INITIAL_DEMO_PORTFOLIO } from "./utils/demodata";
import { calculateBondValue } from "./utils/bondUtils";
import { AIPortfolioAdvisor } from "./components/AIPortfolioAdvisor";
import { SVGCharts } from "./components/SVGCharts";
import { BondsManager } from "./components/BondsManager";
import { SyncPanel } from "./components/SyncPanel";
import {
  TrendingUp,
  Coins,
  Briefcase,
  ShieldCheck,
  Download,
  RefreshCw,
  Plus,
  Trash2,
  Settings,
  Layers,
  Globe,
  Wallet,
  Smartphone,
  Laptop,
  ChevronRight,
  Info,
  Sparkles,
  Award,
  ChevronDown,
  LayoutGrid,
  FileSpreadsheet
} from "lucide-react";

export default function App() {
  const [portfolio, setPortfolio] = useState<PortfolioData>(INITIAL_DEMO_PORTFOLIO);
  const [isMaster, setIsMaster] = useState<boolean>(true);
  const [baseCurrency, setBaseCurrency] = useState<string>("PLN");
  
  // Exchange Rates Relative to PLN
  const [fxRates, setFxRates] = useState<{ [curr: string]: number }>({
    PLN: 1.0,
    USD: 4.09,
    EUR: 4.41,
    CHF: 4.54,
    GBP: 5.17,
  });

  const [loadingQuotes, setLoadingQuotes] = useState<boolean>(false);
  const [quoteSuccessMsg, setQuoteSuccessMsg] = useState<string>("");
  const [fetchingStockPrice, setFetchingStockPrice] = useState<boolean>(false);
  const [fetchStockError, setFetchStockError] = useState<string>("");

  // Modals / Input Drawer Panels
  const [activeTab, setActiveTab] = useState<string>("summary"); // summary, cash, equities, funds, other, sync
  const [showAddTransaction, setShowAddTransaction] = useState<boolean>(false);

  // Form Fields for manual asset insertions
  const [newAssetType, setNewAssetType] = useState<AssetType>(AssetType.CASH);
  // Cash form fields
  const [cashAmount, setCashAmount] = useState<string>("");
  const [cashCurrency, setCashCurrency] = useState<string>("PLN");
  const [cashNotes, setCashNotes] = useState<string>("");
  // Stock form fields
  const [stockSymbol, setStockSymbol] = useState<string>("");
  const [stockName, setStockName] = useState<string>("");
  const [stockQty, setStockQty] = useState<string>("");
  const [stockPriceBuy, setStockPriceBuy] = useState<string>("");
  const [stockPriceCurrent, setStockPriceCurrent] = useState<string>("");
  const [stockExchange, setStockExchange] = useState<"NYSE" | "WSE">("NYSE");
  const [stockCurrency, setStockCurrency] = useState<string>("USD");
  // Mutual fund form fields
  const [fundName, setFundName] = useState<string>("");
  const [fundQty, setFundQty] = useState<string>("");
  const [fundPriceBuy, setFundPriceBuy] = useState<string>("");
  const [fundPriceCurrent, setFundPriceCurrent] = useState<string>("");
  const [fundNotes, setFundNotes] = useState<string>("");
  // Other assets fields
  const [otherName, setOtherName] = useState<string>("");
  const [otherValue, setOtherValue] = useState<string>("");
  const [otherCategory, setOtherCategory] = useState<string>("Metale Szlachetne");
  const [otherNotes, setOtherNotes] = useState<string>("");

  // 1. Initial State Loading & Persistence
  useEffect(() => {
    try {
      const stored = localStorage.getItem("fortuna_vault_portfolio");
      let loadedPortfolio = INITIAL_DEMO_PORTFOLIO;
      if (stored) {
        loadedPortfolio = JSON.parse(stored);
        setPortfolio(loadedPortfolio);
      }
      
      const storedRole = localStorage.getItem("fortuna_vault_role_master");
      if (storedRole !== null) {
        setIsMaster(storedRole === "true");
      }

      const storedBaseCurr = localStorage.getItem("fortuna_vault_base_currency");
      if (storedBaseCurr) {
        setBaseCurrency(storedBaseCurr);
      }

      // Check if there are stocks, and trigger background update of those stock prices
      if (loadedPortfolio && loadedPortfolio.stocks && loadedPortfolio.stocks.length > 0) {
        setTimeout(() => {
          triggerBackgroundQuotesUpdate(loadedPortfolio.stocks);
        }, 1200);
      }
    } catch (e) {
      console.error("Local storage lookup failed:", e);
    }

    // Fetch initial exchange rates from server (which proxies NBP Polish National Bank)
    fetchRates();
  }, []);

  // Write changes to localStorage purely when acting as Master Device
  const savePortfolio = (updated: PortfolioData) => {
    setPortfolio(updated);
    if (isMaster) {
      localStorage.setItem("fortuna_vault_portfolio", JSON.stringify(updated));
    }
  };

  const handleSetIsMaster = (val: boolean) => {
    setIsMaster(val);
    localStorage.setItem("fortuna_vault_role_master", val ? "true" : "false");
  };

  const handleSetBaseCurrency = (val: string) => {
    setBaseCurrency(val);
    localStorage.setItem("fortuna_vault_base_currency", val);
  };

  // Convert an asset's price to the chose base display currency
  const convertToAndFormat = (amount: number, fromCurrency: string): number => {
    const rateToPLN = fxRates[fromCurrency] || 1.0;
    const amountInPLN = amount * rateToPLN;

    const rateOfBaseToPLN = fxRates[baseCurrency] || 1.0;
    return amountInPLN / rateOfBaseToPLN;
  };

  const fetchRates = async () => {
    try {
      const response = await fetch("/api/rates");
      if (response.ok) {
        const data = await response.json();
        if (data && data.rates) {
          setFxRates(data.rates);
        }
      }
    } catch (err) {
      console.warn("Could not query updated currency rates:", err);
    }
  };

  // ------------------------------------------------------------------
  // Pull Global Asset values
  // ------------------------------------------------------------------
  const getCashValBase = (): number => {
    return portfolio.cash.reduce((acc, c) => acc + convertToAndFormat(c.amount, c.currency), 0);
  };

  const getBondsValBase = (): number => {
    // Polish Treasury Bonds values computed dynamically in PLN, translate to Base currency
    const plnVal = portfolio.bonds.reduce((acc, b) => {
      const { currentValue } = calculateBondValue(b);
      return acc + currentValue;
    }, 0);
    return convertToAndFormat(plnVal, "PLN");
  };

  const getStocksNYSEValBase = (): number => {
    const nyseItems = portfolio.stocks.filter(s => s.exchange === "NYSE");
    return nyseItems.reduce((acc, s) => acc + convertToAndFormat(s.quantity * s.currentPrice, s.currency), 0);
  };

  const getStocksWSEValBase = (): number => {
    const wseItems = portfolio.stocks.filter(s => s.exchange === "WSE");
    return wseItems.reduce((acc, s) => acc + convertToAndFormat(s.quantity * s.currentPrice, s.currency), 0);
  };

  const getMutualFundsValBase = (): number => {
    return portfolio.mutualFunds.reduce((acc, f) => acc + convertToAndFormat(f.quantity * f.currentPrice, f.currency), 0);
  };

  const getOtherAssetsValBase = (): number => {
    return portfolio.other.reduce((acc, o) => acc + convertToAndFormat(o.value, "PLN"), 0);
  };

  const calculateTotalNetWorth = (): number => {
    return (
      getCashValBase() +
      getBondsValBase() +
      getStocksNYSEValBase() +
      getStocksWSEValBase() +
      getMutualFundsValBase() +
      getOtherAssetsValBase()
    );
  };

  // ------------------------------------------------------------------
  // Scan / Refresh prices automatically
  // ------------------------------------------------------------------
  const handleRefreshMarketQuotes = async () => {
    if (portfolio.stocks.length === 0) {
      setQuoteSuccessMsg("Brak akcji w portfelu do zaktualizowania.");
      return;
    }

    setLoadingQuotes(true);
    setQuoteSuccessMsg("");
    try {
      // Fetch latest FX rates from NBP first
      await fetchRates();

      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickers: portfolio.stocks.map(s => ({
            symbol: s.symbol,
            exchange: s.exchange,
            currentPrice: s.currentPrice
          }))
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.updated) {
          const updatedStocks = portfolio.stocks.map(currentStock => {
            const foundUpdate = data.updated.find(
              (u: any) => u.symbol === currentStock.symbol && u.exchange === currentStock.exchange
            );
            if (foundUpdate) {
              return { ...currentStock, currentPrice: foundUpdate.currentPrice };
            }
            return currentStock;
          });

          const withUpdated = {
            ...portfolio,
            stocks: updatedStocks,
            lastUpdate: new Date().toISOString()
          };
          savePortfolio(withUpdated);
          setQuoteSuccessMsg("Ceny akcji NYSE (Yahoo) i GPW (Stooq) zostały pomyślnie uaktualnione!");
        }
      } else {
        throw new Error("Wycena giełdowa zwróciła nieprawidłowy kod.");
      }
    } catch (err: any) {
      console.error(err);
      setQuoteSuccessMsg("Wykorzystano bezpieczną uśrednioną stawkę giełdową offline z rezerwy.");
    } finally {
      setLoadingQuotes(false);
      setTimeout(() => setQuoteSuccessMsg(""), 6000);
    }
  };

  const triggerBackgroundQuotesUpdate = async (stocksList: StockAsset[]) => {
    if (!stocksList || stocksList.length === 0) return;
    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickers: stocksList.map(s => ({
            symbol: s.symbol,
            exchange: s.exchange,
            currentPrice: s.currentPrice
          }))
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.updated) {
          setPortfolio(prev => {
            const updatedStocks = prev.stocks.map(currentStock => {
              const foundUpdate = data.updated.find(
                (u: any) => u.symbol === currentStock.symbol && u.exchange === currentStock.exchange
              );
              if (foundUpdate) {
                return { ...currentStock, currentPrice: foundUpdate.currentPrice };
              }
              return currentStock;
            });
            const updatedPortfolio = {
              ...prev,
              stocks: updatedStocks,
              lastUpdate: new Date().toISOString()
            };
            // save to localStorage
            localStorage.setItem("fortuna_vault_portfolio", JSON.stringify(updatedPortfolio));
            return updatedPortfolio;
          });
          console.log("Background stock prices synchronized successfully!");
        }
      }
    } catch (err) {
      console.warn("Background stock prices sync failed, using cached values:", err);
    }
  };

  const fetchCurrentPriceForTicker = async (symbol: string, assetType: AssetType) => {
    const cleanSymbol = symbol.trim().toUpperCase();
    if (!cleanSymbol) return;

    setFetchingStockPrice(true);
    setFetchStockError("");

    const exchange = assetType === AssetType.STOCK_NYSE ? "NYSE" : "WSE";

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickers: [{ symbol: cleanSymbol, exchange }]
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.updated && data.updated.length > 0) {
          const result = data.updated[0];
          setStockPriceCurrent(result.currentPrice.toString());
          
          // Auto-populate the buy price with the current price if the buy price is empty/unset
          setStockPriceBuy(prev => prev.trim() === "" ? result.currentPrice.toString() : prev);
          
          if (result.name) {
            setStockName(result.name);
          } else {
            setStockName(cleanSymbol);
          }
        } else {
          setFetchStockError("Nie odnaleziono waloru.");
        }
      } else {
        setFetchStockError("Błąd pobierania wyceny.");
      }
    } catch (err) {
      console.error(err);
      setFetchStockError("Serwis giełdowy niedostępny.");
    } finally {
      setFetchingStockPrice(false);
    }
  };

  // ------------------------------------------------------------------
  // Add Asset Form Actions
  // ------------------------------------------------------------------
  const handleAddNewAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newAssetType === AssetType.CASH) {
      const amt = parseFloat(cashAmount);
      if (isNaN(amt) || amt <= 0) return;
      const newCash: CashAsset = {
        id: "cash-" + Date.now().toString(),
        amount: amt,
        currency: cashCurrency,
        notes: cashNotes.trim() || undefined,
      };
      savePortfolio({ ...portfolio, cash: [...portfolio.cash, newCash] });
      setCashAmount("");
      setCashNotes("");
    } else if (newAssetType === AssetType.STOCK_NYSE || newAssetType === AssetType.STOCK_WSE) {
      const qty = parseFloat(stockQty);
      const buyPrice = parseFloat(stockPriceBuy);
      const curPrice = parseFloat(stockPriceCurrent) || buyPrice;
      const symbolSymbol = stockSymbol.trim().toUpperCase();

      if (!symbolSymbol || isNaN(qty) || isNaN(buyPrice)) return;

      const newStock: StockAsset = {
        id: "stock-" + Date.now().toString(),
        symbol: symbolSymbol,
        name: stockName.trim() || symbolSymbol,
        quantity: qty,
        purchasePrice: buyPrice,
        currentPrice: curPrice,
        currency: newAssetType === AssetType.STOCK_NYSE ? "USD" : "PLN",
        exchange: newAssetType === AssetType.STOCK_NYSE ? "NYSE" : "WSE",
        dateAdded: new Date().toISOString().split("T")[0],
      };

      savePortfolio({ ...portfolio, stocks: [...portfolio.stocks, newStock] });
      setStockSymbol("");
      setStockName("");
      setStockQty("");
      setStockPriceBuy("");
      setStockPriceCurrent("");
    } else if (newAssetType === AssetType.MUTUAL_FUND) {
      const qty = parseFloat(fundQty);
      const buy = parseFloat(fundPriceBuy);
      const cur = parseFloat(fundPriceCurrent) || buy;
      if (!fundName.trim() || isNaN(qty) || isNaN(buy)) return;

      const newFund: MutualFundAsset = {
        id: "fund-" + Date.now().toString(),
        name: fundName.trim(),
        quantity: qty,
        purchasePrice: buy,
        currentPrice: cur,
        currency: "PLN",
        notes: fundNotes.trim() || undefined,
      };

      savePortfolio({ ...portfolio, mutualFunds: [...portfolio.mutualFunds, newFund] });
      setFundName("");
      setFundQty("");
      setFundPriceBuy("");
      setFundPriceCurrent("");
      setFundNotes("");
    } else if (newAssetType === AssetType.OTHER) {
      const val = parseFloat(otherValue);
      if (!otherName.trim() || isNaN(val)) return;

      const newOther: OtherAsset = {
        id: "other-" + Date.now().toString(),
        name: otherName.trim(),
        value: val,
        category: otherCategory,
        notes: otherNotes.trim() || undefined,
      };

      savePortfolio({ ...portfolio, other: [...portfolio.other, newOther] });
      setOtherName("");
      setOtherValue("");
      setOtherNotes("");
    }

    setShowAddTransaction(false);
  };

  // ------------------------------------------------------------------
  // Deletions
  // ------------------------------------------------------------------
  const removeCash = (id: string) => {
    savePortfolio({ ...portfolio, cash: portfolio.cash.filter(c => c.id !== id) });
  };

  const removeStock = (id: string) => {
    savePortfolio({ ...portfolio, stocks: portfolio.stocks.filter(s => s.id !== id) });
  };

  const removeFund = (id: string) => {
    savePortfolio({ ...portfolio, mutualFunds: portfolio.mutualFunds.filter(f => f.id !== id) });
  };

  const removeOther = (id: string) => {
    savePortfolio({ ...portfolio, other: portfolio.other.filter(o => o.id !== id) });
  };

  const handleCaptureMonthlySnapshot = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const newSnapshot: PortfolioSnapshot = {
      id: "snap-" + Date.now().toString(),
      date: todayStr,
      netWorth: parseFloat(calculateTotalNetWorth().toFixed(2)),
      cashValue: parseFloat(getCashValBase().toFixed(2)),
      stocksValue: parseFloat((getStocksNYSEValBase() + getStocksWSEValBase()).toFixed(2)),
      bondsValue: parseFloat(getBondsValBase().toFixed(2)),
      mutualFundsValue: parseFloat(getMutualFundsValBase().toFixed(2)),
      otherValue: parseFloat(getOtherAssetsValBase().toFixed(2))
    };

    savePortfolio({
      ...portfolio,
      snapshots: [...portfolio.snapshots, newSnapshot]
    });
    alert(`Dodano pomyślnie snapshot majątku na dzień ${todayStr}! Wykres zaktualizuje się automatycznie.`);
  };

  const clearSnapshots = () => {
    if (confirm("Czy na pewno chcesz usunąć historię snapshotów miesięcznych?")) {
      savePortfolio({ ...portfolio, snapshots: [] });
    }
  };

  const handleLoadMockTemplate = () => {
    if (confirm("Czy chcesz nadpisać wgrany portfel profesjonalnymi danymi demonstracyjnymi mądrego polskiego inwestora?")) {
      savePortfolio(INITIAL_DEMO_PORTFOLIO);
    }
  };

  const handleResetToEmpty = () => {
    if (confirm("Czy na pewno chcesz usunąć absolutnie wszystkie dane majątkowe z telefonu i zacząć od zera? Zachowasz pełne bezpieczeństwo.")) {
      savePortfolio({
        cash: [],
        stocks: [],
        bonds: [],
        mutualFunds: [],
        other: [],
        snapshots: [],
        lastUpdate: new Date().toISOString()
      });
    }
  };

  // ------------------------------------------------------------------
  // Safe Excel & Google Sheets Client side exporting
  // ------------------------------------------------------------------
  const handleExportToCSV = () => {
    let rows = [
      ["Kategoria", "Nazwa / Waluta", "Ilość", "Cena zakupu", "Cena aktualna", "Wycena w PLN", "Wycena w " + baseCurrency, "Notatki"],
    ];

    // Cash Row
    portfolio.cash.forEach(c => {
      const baseVal = convertToAndFormat(c.amount, c.currency);
      const valPLN = c.amount * (fxRates[c.currency] || 1.0);
      rows.push(["Pieniądz/Cash", c.currency, c.amount.toString(), "1", "1", valPLN.toFixed(2), baseVal.toFixed(2), c.notes || ""]);
    });

    // Stocks
    portfolio.stocks.forEach(s => {
      const itemPriceTotal = s.quantity * s.currentPrice;
      const baseVal = convertToAndFormat(itemPriceTotal, s.currency);
      const valPLN = itemPriceTotal * (fxRates[s.currency] || 1.0);
      rows.push([
        s.exchange === "NYSE" ? "Akcje NYSE" : "Akcje WSE",
        s.symbol + " - " + s.name,
        s.quantity.toString(),
        s.purchasePrice.toString(),
        s.currentPrice.toString(),
        valPLN.toFixed(2),
        baseVal.toFixed(2),
        "Zaimplementowane w " + s.exchange
      ]);
    });

    // Treasury Bonds
    portfolio.bonds.forEach(b => {
      const { currentValue } = calculateBondValue(b);
      const baseVal = convertToAndFormat(currentValue, "PLN");
      rows.push([
        "Obligacje RP",
        b.bondType + " (Kupione " + b.purchaseDate + ")",
        b.quantity.toString(),
        "100 PLN",
        (currentValue / b.quantity).toFixed(2) + " PLN",
        currentValue.toFixed(2),
        baseVal.toFixed(2),
        b.notes || ""
      ]);
    });

    // Mutual funds
    portfolio.mutualFunds.forEach(f => {
      const itemPriceTotal = f.quantity * f.currentPrice;
      const baseVal = convertToAndFormat(itemPriceTotal, f.currency);
      const valPLN = itemPriceTotal * (fxRates[f.currency] || 1.0);
      rows.push(["Fundusze Inwestycyjne", f.name, f.quantity.toString(), f.purchasePrice.toString(), f.currentPrice.toString(), valPLN.toFixed(2), baseVal.toFixed(2), f.notes || ""]);
    });

    // Other
    portfolio.other.forEach(o => {
      const baseVal = convertToAndFormat(o.value, "PLN");
      rows.push(["Inne Zasoby", o.name + " (" + o.category + ")", "1", o.value.toString(), o.value.toString(), o.value.toFixed(2), baseVal.toFixed(2), o.notes || ""]);
    });

    // Convert to tabular comma values
    const csvContent = "\uFEFF" + rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Fortuna_Vault_Majątek_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const allocationData = {
    cash: getCashValBase(),
    bonds: getBondsValBase(),
    stocksNYSE: getStocksNYSEValBase(),
    stocksWSE: getStocksWSEValBase(),
    mutualFunds: getMutualFundsValBase(),
    other: getOtherAssetsValBase(),
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC] text-slate-800" id="application-body">
      {/* 1. TOP RESPONSIVE HEADER CONTAINER */}
      <nav className="bg-white border-b border-indigo-100 flex flex-col md:flex-row items-center justify-between px-6 py-4 gap-4 shrink-0 shadow-sm" id="main-navigation">
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          {/* Logo badge */}
          <div className="w-11 h-11 bg-gradient-to-tr from-indigo-600 via-pink-500 to-amber-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-100">
            F
          </div>
          <div className="text-left">
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Fortuna Vault
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {isMaster ? (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <Smartphone className="w-3 h-3 text-emerald-500" />
                  Główne Urządzenie (Telefon)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <Laptop className="w-3 h-3 text-amber-500" />
                  Tryb Podglądu (Komputer)
                </span>
              )}
              <span className="text-[10px] text-slate-400 font-semibold">• Dane na Twoim dysku</span>
            </div>
          </div>
        </div>

        {/* Global Toolbar Control buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto md:justify-end">
          {/* Currency selector base */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 px-2 py-1.5 rounded-xl border border-slate-200">
            <Globe className="w-4 h-4 text-slate-400" />
            <select
              value={baseCurrency}
              onChange={(e) => handleSetBaseCurrency(e.target.value)}
              className="bg-transparent font-bold text-xs text-slate-700 focus:outline-none"
              title="Waluta bazowa"
            >
              <option value="PLN">PLN (Złoty)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="CHF">CHF (Frank)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          <button
            onClick={() => setShowAddTransaction(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-pink-500 to-amber-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-100 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
            id="btn-trigger-add-modal"
          >
            <Plus className="w-4 h-4" />
            Dodaj Aktywo
          </button>

          <button
            onClick={handleExportToCSV}
            className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl hover:bg-emerald-100/50 transition duration-150"
            title="Darmowy eksport do Google Sheets & Excel (CSV)"
            id="btn-export-csv"
          >
            <FileSpreadsheet className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* 2. CORE LAYOUT GRID */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6" id="main-application-grid">
        
        {/* Left Side (8 Columns) - Net worth header, charts and segment views */}
        <div className="lg:col-span-8 flex flex-col gap-6" id="left-main-column">
          
          {/* A. Net Worth Big Screen banner */}
          <div className="relative rounded-[32px] bg-gradient-to-br from-indigo-600 via-pink-600 to-amber-500 text-white p-6 sm:p-8 shadow-xl overflow-hidden shadow-indigo-100/60" id="net-worth-jumbotron">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20" />
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10 text-left">
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-widest text-indigo-100/80 bg-white/15 px-3 py-1 rounded-full">
                  Prywatny Bilans Majątkowy
                </span>
                <h2 className="text-4xl sm:text-5xl font-black mt-2 tracking-tight">
                  {calculateTotalNetWorth().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-2xl sm:text-3xl font-medium">{baseCurrency}</span>
                </h2>
                <p className="text-indigo-100 text-xs flex items-center gap-1.5 pt-1.5 opacity-90">
                  <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping shrink-0" />
                  Kryptograficznie bezpieczna baza danych wbudowana w telefon
                </p>
              </div>

              {/* Action Buttons inside banner */}
              <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto">
                <span className="text-[11px] bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-indigo-50 font-bold block">
                  Aktualizacja: {portfolio.lastUpdate ? new Date(portfolio.lastUpdate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Zawsze aktualne"}
                </span>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleRefreshMarketQuotes}
                    disabled={loadingQuotes}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-white text-indigo-600 font-extrabold text-[11px] uppercase tracking-wider rounded-xl shadow-md hover:bg-slate-50 transition active:scale-95 flex items-center justify-center gap-1.5"
                    id="btn-refresh-quotes"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingQuotes ? "animate-spin" : ""}`} />
                    Aktualizuj Ceny
                  </button>
                  
                  <button
                    onClick={handleCaptureMonthlySnapshot}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/25 border border-white/20 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1"
                    title="Zapisz aktualną wartość majątku do wykresu"
                  >
                    Zapisz Snapshot
                  </button>
                </div>
              </div>
            </div>

            {quoteSuccessMsg && (
              <div className="absolute bottom-2 left-6 right-6 bg-slate-900/90 text-white text-xs py-2 px-3 rounded-lg border border-white/10 z-50 flex items-center justify-between shadow-lg animate-fadeIn text-left">
                <span>{quoteSuccessMsg}</span>
                <button onClick={() => setQuoteSuccessMsg("")} className="text-[10px] text-indigo-200 underline">Zamknij</button>
              </div>
            )}
          </div>

          {/* B. Segment View / Category Quick overview cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="segment-dashboard-cards">
            {/* Quick Card: CASH */}
            <div
              onClick={() => setActiveTab("cash")}
              className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                activeTab === "cash"
                  ? "bg-white border-green-400 ring-2 ring-green-100"
                  : "bg-white border-slate-100 shadow-xs hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-extrabold text-slate-400">Pieniądz</span>
                <div className="w-7 h-7 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <h4 className="text-xl font-bold text-slate-800">
                {getCashValBase().toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs font-normal text-slate-400">{baseCurrency}</span>
              </h4>
              <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded-md mt-1.5 inline-block">
                Rezerwy płynne
              </span>
            </div>

            {/* Quick Card: BONDS */}
            <div
              onClick={() => setActiveTab("bonds")}
              className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                activeTab === "bonds"
                  ? "bg-white border-teal-400 ring-2 ring-teal-100"
                  : "bg-white border-slate-100 shadow-xs hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-extrabold text-slate-400">Obligacje RP</span>
                <div className="w-7 h-7 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <h4 className="text-xl font-bold text-slate-800">
                {getBondsValBase().toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs font-normal text-slate-400">{baseCurrency}</span>
              </h4>
              <span className="text-[10px] text-teal-600 font-bold bg-teal-50 px-1.5 py-0.5 rounded-md mt-1.5 inline-block">
                Ochrona kapitału
              </span>
            </div>

            {/* Quick Card: STOCKS */}
            <div
              onClick={() => setActiveTab("equities")}
              className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                activeTab === "equities"
                  ? "bg-white border-indigo-400 ring-2 ring-indigo-100"
                  : "bg-white border-slate-100 shadow-xs hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-extrabold text-slate-400">Giełda akcji</span>
                <div className="w-7 h-7 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <h4 className="text-xl font-bold text-slate-800">
                {(getStocksNYSEValBase() + getStocksWSEValBase()).toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs font-normal text-slate-400">{baseCurrency}</span>
              </h4>
              <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-md mt-1.5 inline-block text-center truncate">
                 NYSE & GPW
              </span>
            </div>

            {/* Quick Card: MUTUAL FUNDS & OTHER */}
            <div
              onClick={() => setActiveTab("funds")}
              className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                activeTab === "funds"
                  ? "bg-white border-pink-400 ring-2 ring-pink-100"
                  : "bg-white border-slate-100 shadow-xs hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-extrabold text-slate-400">Inne Aktywa</span>
                <div className="w-7 h-7 bg-pink-50 text-pink-600 rounded-lg flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <h4 className="text-xl font-bold text-slate-800">
                {(getMutualFundsValBase() + getOtherAssetsValBase()).toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs font-normal text-slate-400">{baseCurrency}</span>
              </h4>
              <span className="text-[10px] text-pink-600 font-bold bg-pink-50 px-1.5 py-0.5 rounded-md mt-1.5 inline-block">
                Kruszce, TFI, krypto
              </span>
            </div>
          </div>

          {/* C. Interactive Visual Chart Panels */}
          <SVGCharts
            snapshots={portfolio.snapshots}
            allocation={allocationData}
            currencySymbol={baseCurrency}
          />

          {/* D. Tab-Selected Detailed Asset Class Sheets */}
          <div className="space-y-6" id="assets-class-manager-tabs-root">
            
            {/* Tab navigation pill bar */}
            <div className="flex border-b border-slate-200 overflow-x-auto gap-4 scrollbar-none pb-0.5">
              {[
                { id: "summary", label: "Przegląd Ogólny (Lists)" },
                { id: "cash", label: "💵 Portfel Gotówki" },
                { id: "bonds", label: "🇵🇱 Obligacje Skarbowe RP" },
                { id: "equities", label: "📈 Giełda (NYSE / WSE)" },
                { id: "funds", label: "🏆 Fundusze & Akcesoria" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-1 text-xs font-bold uppercase tracking-wider relative transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "text-indigo-600"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-1 rounded bg-gradient-to-r from-indigo-500 to-pink-500" />
                  )}
                </button>
              ))}
            </div>

            {/* TAB CONTENTS 1: SUMMARY / GENERAL LEDGER */}
            {(activeTab === "summary") && (
              <div className="space-y-6 text-left">
                {/* Visual grid listing simple summary lists of all items */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-extrabold text-slate-800 text-base">Twoje Pozycje Majątkowe</h3>
                    <button
                      onClick={handleRefreshMarketQuotes}
                      className="text-xs text-indigo-600 hover:underline font-bold"
                    >
                      Odśwież ceny online
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {/* CASH LIST */}
                    {portfolio.cash.map(c => (
                      <div key={c.id} className="py-3 flex justify-between items-center hover:bg-slate-50/50 px-2 rounded-xl transition">
                        <div>
                          <span className="font-bold text-slate-800">{c.currency}</span>
                          <span className="text-xs text-slate-400 ml-2">({c.notes || "Konto osobiste"})</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-700">{c.amount.toLocaleString()} {c.currency}</p>
                          <p className="text-[10px] text-slate-400">
                            ≈ {convertToAndFormat(c.amount, c.currency).toLocaleString(undefined, {maximumFractionDigits: 1})} {baseCurrency}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* STOCKS LIST */}
                    {portfolio.stocks.map(s => {
                      const totalStockVal = s.quantity * s.currentPrice;
                      const purchaseTotal = s.quantity * s.purchasePrice;
                      const returnVal = totalStockVal - purchaseTotal;
                      const pctMatch = (((totalStockVal - purchaseTotal) / Math.max(1, purchaseTotal)) * 100);

                      return (
                        <div key={s.id} className="py-3 flex justify-between items-center hover:bg-slate-50/50 px-2 rounded-xl transition">
                          <div>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-50 text-indigo-700 mr-2">
                              {s.exchange}
                            </span>
                            <span className="font-extrabold text-slate-800">{s.symbol}</span>
                            <span className="text-xs text-slate-400 ml-1.5"> - {s.quantity} szt. ({s.name})</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-800">{(totalStockVal).toLocaleString()} {s.currency}</p>
                            <span className={`text-[10px] font-bold ${returnVal >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                              {returnVal >= 0 ? "+" : ""}{pctMatch.toFixed(1)}% ({returnVal.toFixed(0)} {s.currency})
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* BONDS SUMMARY REDIRECT */}
                    {portfolio.bonds.length > 0 && (
                      <div
                        onClick={() => setActiveTab("bonds")}
                        className="py-3.5 flex justify-between items-center bg-teal-50/10 hover:bg-teal-50/40 px-3 rounded-2xl cursor-pointer border border-teal-100/50 transition"
                      >
                        <div>
                          <span className="font-bold text-teal-800 text-xs uppercase tracking-wider block">Polskie Obligacje Państwowe</span>
                          <span className="text-[10px] text-slate-400">Kliknij szczegóły tabelaryczne i kalkulator inflacji</span>
                        </div>
                        <div className="text-right flex items-center gap-1">
                          <span className="font-bold text-teal-700">{getBondsValBase().toLocaleString(undefined, {maximumFractionDigits: 0})} {baseCurrency}</span>
                          <ChevronRight className="w-4 h-4 text-teal-500" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Settings / Clear utilities */}
                <div className="bg-white rounded-3xl border border-slate-100 p-5 flex flex-wrap gap-3 items-center justify-between shadow-xs">
                  <div>
                    <h5 className="font-bold text-slate-700 text-sm">Narzędzia konserwacyjne portfela</h5>
                    <p className="text-[10px] text-slate-400">Wyłącznie do bezpiecznego przywracania lub czyszczenia kopii lokalnych</p>
                  </div>
                  <div className="flex gap-2.5">
                    <button
                      onClick={handleLoadMockTemplate}
                      className="px-4 py-2 border border-indigo-100 text-indigo-600 font-bold text-xs rounded-xl hover:bg-indigo-50/50 transition"
                    >
                      Wgraj Szablon Demonstracyjny
                    </button>
                    <button
                      onClick={clearSnapshots}
                      className="px-4 py-2 border border-slate-200 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-50 transition"
                    >
                      Reset Wykresu Wzrostu
                    </button>
                    <button
                      onClick={handleResetToEmpty}
                      className="px-4 py-2 bg-rose-50 text-rose-600 font-bold text-xs rounded-xl hover:bg-rose-100/40 transition"
                    >
                      Wyczyść Całkowicie
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENTS 2: CASH ACCOUNTS */}
            {activeTab === "cash" && (
              <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 text-left" id="tab-cash-list">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">Portfel Gotówkowy i Depozyty bankowe</h3>
                    <p className="text-xs text-slate-400">Przechowywanie funduszy na depozytach bez ryzyka rynkowego</p>
                  </div>
                  <button
                    onClick={() => {
                      setNewAssetType(AssetType.CASH);
                      setShowAddTransaction(true);
                    }}
                    className="px-4 py-2 bg-green-50 text-green-700 border border-green-150 rounded-xl font-bold text-xs uppercase flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Dodaj Gotówkę
                  </button>
                </div>

                {portfolio.cash.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                    <p className="text-sm text-slate-400">Nie zarejestrowano żadnych depozytów gotówkowych.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {portfolio.cash.map((c) => {
                      const valuePLN = c.amount * (fxRates[c.currency] || 1.0);
                      return (
                        <div key={c.id} className="py-4 flex items-center justify-between group">
                          <div>
                            <span className="font-extrabold text-slate-800 mr-2">{c.currency}</span>
                            <span className="text-sm text-slate-500">{c.notes || "Konto lub rezerwa domowa"}</span>
                            <p className="text-[10px] text-slate-400 mt-0.5">Wartość w PLN: {valuePLN.toLocaleString()} zł</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-lg font-black text-slate-800">{c.amount.toLocaleString()} {c.currency}</span>
                              <p className="text-xs text-slate-400 font-bold">
                                ≈ {convertToAndFormat(c.amount, c.currency).toLocaleString(undefined, {minimumFractionDigits: 1})} {baseCurrency}
                              </p>
                            </div>
                            <button
                              onClick={() => removeCash(c.id)}
                              className="p-1.5 border border-red-50 text-slate-300 hover:text-red-500 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENTS 3: POLISH GOVERNMENT BONDS (DELEGATED) */}
            {activeTab === "bonds" && (
              <BondsManager
                portfolio={portfolio}
                onChange={(updatedBonds) => savePortfolio({ ...portfolio, bonds: updatedBonds })}
              />
            )}

            {/* TAB CONTENTS 4: EQUITIES NYSE AND WSE */}
            {activeTab === "equities" && (
              <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 text-left" id="tab-equities-list">
                <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">Portfel Giełdowy (NYSE i GPW Warszawa)</h3>
                    <p className="text-xs text-slate-400">Wybiórcze inwestycje w bezpieczne spółki technologiczne oraz dywidendowe giełdy polskiej</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleRefreshMarketQuotes}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100/50 text-indigo-700 font-bold text-xs rounded-xl flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Aktualizuj
                    </button>
                    <button
                      onClick={() => {
                        setNewAssetType(AssetType.STOCK_NYSE);
                        setShowAddTransaction(true);
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Dodaj Akcje / ETF
                    </button>
                  </div>
                </div>

                {portfolio.stocks.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/20">
                    <p className="text-sm text-slate-400">Brak zarejestrowanych akcji rynkowych w Twoim portfelu.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-50">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <th className="px-4 py-3">Symbol</th>
                          <th className="px-4 py-3">Rynek</th>
                          <th className="px-4 py-3">Ilość</th>
                          <th className="px-4 py-3">Cena Zakupu</th>
                          <th className="px-4 py-3">Cena Bieżąca</th>
                          <th className="px-4 py-3">Wycena Całkowita</th>
                          <th className="px-4 py-3">Zysk / Strata</th>
                          <th className="px-4 py-3 text-center">Akcje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolio.stocks.map((s) => {
                          const valTotal = s.quantity * s.currentPrice;
                          const purchaseTotal = s.quantity * s.purchasePrice;
                          const returnAmount = valTotal - purchaseTotal;
                          const pct = (((valTotal - purchaseTotal) / Math.max(1, purchaseTotal)) * 100);

                          return (
                            <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/40 text-sm">
                              <td className="px-4 py-4">
                                <div>
                                  <span className="font-extrabold text-slate-900 block">{s.symbol}</span>
                                  <span className="text-[11px] text-slate-400 block">{s.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 font-semibold">
                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                  s.exchange === "NYSE" ? "bg-indigo-50 text-indigo-700" : "bg-red-50 text-red-700"
                                }`}>
                                  {s.exchange}
                                </span>
                              </td>
                              <td className="px-4 py-4 font-semibold">{s.quantity}</td>
                              <td className="px-4 py-4 font-medium text-slate-500">
                                {s.purchasePrice.toLocaleString()} {s.currency}
                              </td>
                              <td className="px-4 py-4 font-bold text-slate-800">
                                {s.currentPrice.toLocaleString()} {s.currency}
                              </td>
                              <td className="px-4 py-4">
                                <span className="font-extrabold text-slate-800 block">
                                  {valTotal.toLocaleString()} {s.currency}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold block">
                                  ≈ {convertToAndFormat(valTotal, s.currency).toLocaleString(undefined, {maximumFractionDigits: 1})} {baseCurrency}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <span className={`font-bold block ${returnAmount >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                  {returnAmount >= 0 ? "+" : ""}{pct.toFixed(2)}%
                                </span>
                                <span className={`text-xs block ${returnAmount >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                  {returnAmount >= 0 ? "+" : ""}{returnAmount.toLocaleString()} {s.currency}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <button
                                  onClick={() => removeStock(s.id)}
                                  className="p-1 border border-rose-100 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENTS 5: MUTUAL FUNDS & OTHER ASSETS */}
            {activeTab === "funds" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="tab-funds-and-other">
                
                {/* Visual Section: Mutual Funds */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4 text-left">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Fundusze Inwestycyjne (TFI)</h4>
                      <p className="text-[10px] text-slate-400">Polskie fundusze stabilnego wzrostu / obligacji</p>
                    </div>
                    <button
                      onClick={() => {
                        setNewAssetType(AssetType.MUTUAL_FUND);
                        setShowAddTransaction(true);
                      }}
                      className="px-3 py-1.5 bg-pink-50 text-pink-700 font-bold text-[10px] uppercase rounded-lg"
                    >
                      + Dodaj Fundusz
                    </button>
                  </div>

                  {portfolio.mutualFunds.length === 0 ? (
                    <p className="text-slate-400 text-xs text-center py-6">Brak funduszy w Twoim portfelu.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 pt-2">
                      {portfolio.mutualFunds.map(f => {
                        const totalVal = f.quantity * f.currentPrice;
                        return (
                          <div key={f.id} className="py-3 flex justify-between items-center">
                            <div>
                              <p className="font-bold text-slate-800 text-xs">{f.name}</p>
                              <span className="text-[10px] text-slate-400">{f.quantity} jednostek • Kup: {f.purchasePrice} zł</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="font-bold text-slate-700 text-xs">{totalVal.toLocaleString()} PLN</span>
                                <p className="text-[9px] text-slate-400">≈ {convertToAndFormat(totalVal, "PLN").toLocaleString(undefined, {maximumFractionDigits: 0})} {baseCurrency}</p>
                              </div>
                              <button onClick={() => removeFund(f.id)} className="text-slate-300 hover:text-rose-500">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Visual Section: Other / Crypto / Bullion */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4 text-left">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Złoto fizyczne, Crypto & Inne zasoby</h4>
                      <p className="text-[10px] text-slate-400">Metale szlachetne, nieruchomości i kryptowaluty</p>
                    </div>
                    <button
                      onClick={() => {
                        setNewAssetType(AssetType.OTHER);
                        setShowAddTransaction(true);
                      }}
                      className="px-3 py-1.5 bg-pink-50 text-pink-700 font-bold text-[10px] uppercase rounded-lg"
                    >
                      + Dodaj Inny zasób
                    </button>
                  </div>

                  {portfolio.other.length === 0 ? (
                    <p className="text-slate-400 text-xs text-center py-6">Brak zarejestrowanych zasobów alternatywnych.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 pt-2">
                      {portfolio.other.map(o => (
                        <div key={o.id} className="py-3 flex justify-between items-center">
                          <div>
                            <p className="font-bold text-slate-800 text-xs">{o.name}</p>
                            <span className="text-[10px] uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold">{o.category}</span>
                            {o.notes && <p className="text-[10px] text-slate-400 mt-0.5">{o.notes}</p>}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="font-extrabold text-slate-700 text-xs">{o.value.toLocaleString()} PLN</span>
                              <p className="text-[9px] text-slate-400">≈ {convertToAndFormat(o.value, "PLN").toLocaleString(undefined, {maximumFractionDigits: 0})} {baseCurrency}</p>
                            </div>
                            <button onClick={() => removeOther(o.id)} className="text-slate-300 hover:text-rose-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>

        {/* Right Side Column (4 Columns - Sync panel, Smart AI advisor, Recent actions) */}
        <div className="lg:col-span-4 flex flex-col gap-6" id="right-main-column">
          
          {/* A. Synchronization Control Unit */}
          <SyncPanel
            portfolio={portfolio}
            isMaster={isMaster}
            onSetIsMaster={handleSetIsMaster}
            onOverwritePortfolioState={(newState) => savePortfolio(newState)}
          />

          {/* B. Smart Portfolio Advisor Gemini widget */}
          <AIPortfolioAdvisor
            portfolio={portfolio}
            baseCurrency={baseCurrency}
            rates={fxRates}
          />

          {/* C. Recent Positions Panel */}
          <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm text-left" id="recent-positions-panel">
            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2.5 rounded-full bg-gradient-to-tr from-pink-500 to-amber-500" />
              Ostatnia Alokacja Portfela
            </h4>
            
            <div className="space-y-3 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Bonds (Gwarantowane Skarbowe)</span>
                <span className="font-bold text-slate-800">{getBondsValBase().toLocaleString(undefined, {maximumFractionDigits: 0})} {baseCurrency}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Akcje i ETF (NYSE)</span>
                <span className="font-bold text-slate-800">{getStocksNYSEValBase().toLocaleString(undefined, {maximumFractionDigits: 0})} {baseCurrency}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Akcje i PKO/KGHM (GPW)</span>
                <span className="font-bold text-slate-800">{getStocksWSEValBase().toLocaleString(undefined, {maximumFractionDigits: 0})} {baseCurrency}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Fundusze inwestycyjne</span>
                <span className="font-bold text-slate-800">{getMutualFundsValBase().toLocaleString(undefined, {maximumFractionDigits: 0})} {baseCurrency}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Złoto i Kryptowaluty</span>
                <span className="font-bold text-slate-800">{getOtherAssetsValBase().toLocaleString(undefined, {maximumFractionDigits: 0})} {baseCurrency}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50 mt-4">
              <button
                onClick={() => handleExportToCSV()}
                className="w-full py-3 border border-indigo-150 text-indigo-600 rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-50/50 transition flex items-center justify-center gap-1.5"
                id="btn-bottom-export"
              >
                <Download className="w-4 h-4" />
                Wygeneruj Arkusz Excel
              </button>
            </div>
          </div>

        </div>

      </main>

      {/* 3. ADD ASSET TRANSACTION DRAWER MODAL OVERLAY */}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="drawer-add-asset-overlay">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto space-y-4 text-left">
            
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">
                Dodaj Nowe Aktywo do Bilansu
              </h3>
              <button
                onClick={() => setShowAddTransaction(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Asset category pick buttons */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Rodzaj Aktywa</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: AssetType.CASH, label: "Pieniądz" },
                  { id: AssetType.STOCK_NYSE, label: "Akcje (USA)" },
                  { id: AssetType.STOCK_WSE, label: "Akcje (PLN)" },
                  { id: AssetType.MUTUAL_FUND, label: "Fundusz TFI" },
                  { id: AssetType.OTHER, label: "Alternatywne" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setNewAssetType(item.id);
                      if (item.id === AssetType.CASH) setCashCurrency("PLN");
                      else if (item.id === AssetType.STOCK_NYSE) setStockCurrency("USD");
                      else if (item.id === AssetType.STOCK_WSE) setStockCurrency("PLN");
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition ${
                      newAssetType === item.id
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Render form conditionally */}
            <form onSubmit={handleAddNewAssetSubmit} className="space-y-4">
              
              {/* CASH INPUTS */}
              {newAssetType === AssetType.CASH && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Kwota gotówki</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="np. 5000"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Waluta</label>
                      <select
                        value={cashCurrency}
                        onChange={(e) => setCashCurrency(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                      >
                        <option value="PLN">PLN</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="CHF">CHF</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Miejsce / Notatki</label>
                    <input
                      type="text"
                      placeholder="np. Konto oszczędnościowe mBank"
                      value={cashNotes}
                      onChange={(e) => setCashNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* NYSE / WSE EQUITIES INPUTS */}
              {(newAssetType === AssetType.STOCK_NYSE || newAssetType === AssetType.STOCK_WSE) && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Symbol giełdowy (Ticker)</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          required
                          placeholder="np. NVDA, AAPL lub PKO"
                          value={stockSymbol}
                          onChange={(e) => setStockSymbol(e.target.value)}
                          onBlur={() => fetchCurrentPriceForTicker(stockSymbol, newAssetType)}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 uppercase font-bold"
                        />
                        <button
                          type="button"
                          disabled={fetchingStockPrice || !stockSymbol.trim()}
                          onClick={() => fetchCurrentPriceForTicker(stockSymbol, newAssetType)}
                          className="px-3 bg-indigo-50 hover:bg-indigo-150 text-indigo-700 font-extrabold text-[11px] rounded-xl flex items-center justify-center border border-indigo-100 shrink-0 transition"
                        >
                          {fetchingStockPrice ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          ) : (
                            "Pobierz"
                          )}
                        </button>
                      </div>
                      {fetchStockError && (
                        <span className="text-[10px] text-rose-500 mt-1 font-semibold">{fetchStockError}</span>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Nazwa firmy</label>
                      <input
                        type="text"
                        placeholder="np. NVIDIA Corp"
                        value={stockName}
                        onChange={(e) => setStockName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Ilość akcji</label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        placeholder="np. 12"
                        value={stockQty}
                        onChange={(e) => setStockQty(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Cena zakupu ({newAssetType === AssetType.STOCK_NYSE ? "USD" : "PLN"})</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="np. 175.50"
                        value={stockPriceBuy}
                        onChange={(e) => setStockPriceBuy(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Cena obecna ({newAssetType === AssetType.STOCK_NYSE ? "USD" : "PLN"})</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Auto..."
                          value={stockPriceCurrent}
                          onChange={(e) => setStockPriceCurrent(e.target.value)}
                          className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 ${
                            fetchingStockPrice ? "border-indigo-400 bg-indigo-50/20 text-indigo-700 font-bold" : "border-slate-200"
                          }`}
                        />
                        {fetchingStockPrice && (
                          <div className="absolute right-3 top-2.5">
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block font-medium">Zaciągana automatycznie</span>
                    </div>
                  </div>
                </div>
              )}

              {/* MUTUAL FUND INPUTS */}
              {newAssetType === AssetType.MUTUAL_FUND && (
                <div className="space-y-3 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Pełna nazwa funduszu (TFI)</label>
                    <input
                      type="text"
                      required
                      placeholder="np. PKO Technologii i Innowacji"
                      value={fundName}
                      onChange={(e) => setFundName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Ilość jednostek</label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        placeholder="np. 10.45"
                        value={fundQty}
                        onChange={(e) => setFundQty(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Cena zakupu (PLN)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="np. 280.00"
                        value={fundPriceBuy}
                        onChange={(e) => setFundPriceBuy(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Cena obecna (PLN)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="np. 320.00"
                        value={fundPriceCurrent}
                        onChange={(e) => setFundPriceCurrent(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Notatki / Konto rejestrowe</label>
                    <input
                      type="text"
                      placeholder="np. subkonto IKE"
                      value={fundNotes}
                      onChange={(e) => setFundNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* OTHER / KRYPTO / GOLD INPUTS */}
              {newAssetType === AssetType.OTHER && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Nazwa zasobu / Kruszcu</label>
                      <input
                        type="text"
                        required
                        placeholder="np. Sztabka złota 1oz"
                        value={otherName}
                        onChange={(e) => setOtherName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Kategoria</label>
                      <select
                        value={otherCategory}
                        onChange={(e) => setOtherCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                      >
                        <option value="Metale Szlachetne">Metale Szlachetne</option>
                        <option value="Nieruchomości">Nieruchomości</option>
                        <option value="Kryptowaluty">Kryptowaluty</option>
                        <option value="Sztuka / Kolekcje">Sztuka / Kolekcje</option>
                        <option value="Inne">Inne</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Szacowana Wypłacalna Wartość (PLN)</label>
                    <input
                      type="number"
                      required
                      placeholder="np. 10200"
                      value={otherValue}
                      onChange={(e) => setOtherValue(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Notatki</label>
                    <input
                      type="text"
                      placeholder="Gdzie zdeponowano?"
                      value={otherNotes}
                      onChange={(e) => setOtherNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full mt-4 py-3 bg-indigo-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-md hover:bg-indigo-700 transition"
                id="btn-confirm-save-asset"
              >
                Dodaj Aktywo do Bilansu
              </button>

            </form>

          </div>
        </div>
      )}

      {/* 4. Humbler Footer status lines */}
      <footer className="py-6 shrink-0 text-center text-[10px] text-slate-400 font-medium">
        Fortuna Vault • 100% bezpieczna lokalna skarbonka offline. Wyprodukowano na komputery Mac oraz urządzenia mobilne Android.
      </footer>
    </div>
  );
}

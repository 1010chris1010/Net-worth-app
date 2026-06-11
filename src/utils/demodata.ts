/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PortfolioData, PolishBondType, AssetType } from "../types";

export const INITIAL_DEMO_PORTFOLIO: PortfolioData = {
  cash: [
    { id: "cash-1", currency: "PLN", amount: 24500, notes: "Konto oszczędnościowe mBank" },
    { id: "cash-2", currency: "USD", amount: 6200, notes: "Gotówka w sejfie domowym" },
    { id: "cash-3", currency: "EUR", amount: 3500, notes: "Konto walutowe Revolut" }
  ],
  stocks: [
    {
      id: "stock-1",
      symbol: "AAPL",
      name: "Apple Inc.",
      quantity: 15,
      purchasePrice: 175.50,
      currentPrice: 224.30,
      currency: "USD",
      exchange: "NYSE",
      dateAdded: "2024-11-12",
    },
    {
      id: "stock-2",
      symbol: "MSFT",
      name: "Microsoft Corporation",
      quantity: 8,
      purchasePrice: 380.00,
      currentPrice: 415.80,
      currency: "USD",
      exchange: "NYSE",
      dateAdded: "2025-01-20",
    },
    {
      id: "stock-3",
      symbol: "PKO",
      name: "PKO Bank Polski S.A.",
      quantity: 250,
      purchasePrice: 42.10,
      currentPrice: 56.40,
      currency: "PLN",
      exchange: "WSE",
      dateAdded: "2023-09-15",
    },
    {
      id: "stock-4",
      symbol: "KGH",
      name: "KGHM Polska Miedź S.A.",
      quantity: 60,
      purchasePrice: 110.20,
      currentPrice: 134.80,
      currency: "PLN",
      exchange: "WSE",
      dateAdded: "2024-05-10",
    }
  ],
  bonds: [
    {
      id: "bond-1",
      bondType: PolishBondType.EDO, // 10-Year inflation-indexed
      quantity: 150, // 150 * 100 = 15,000 PLN principal
      purchaseDate: "2022-03-15", // ~4.2 years ago - completed 4 capitalization cycles!
      marginRate: 1.25,
      firstYearRate: 6.50,
      notes: "EDO0332 - Zabezpieczenie emerytalne"
    },
    {
      id: "bond-2",
      bondType: PolishBondType.COI, // 4-Year inflation indexed
      quantity: 100, // 10,000 PLN principal
      purchaseDate: "2024-06-10", // ~2.0 years ago - filled 2 capitalization cycles!
      marginRate: 1.00,
      firstYearRate: 7.00,
      notes: "COI0628 - Środki na wkład własny"
    },
    {
      id: "bond-3",
      bondType: PolishBondType.DOS, // 2-Year fixed
      quantity: 50, // 5,000 PLN principal
      purchaseDate: "2025-02-01", // ~1.3 years ago
      marginRate: 0.00,
      firstYearRate: 6.25,
      notes: "DOS0227 - Bezpieczna rezerwa"
    }
  ],
  mutualFunds: [
    {
      id: "mf-1",
      name: "PKO Technologii i Innowacji Globalny",
      quantity: 12.845,
      purchasePrice: 280.50,
      currentPrice: 324.95,
      currency: "PLN",
      notes: "Aktywne zarządzanie akcjami tech"
    },
    {
      id: "mf-2",
      name: "Generali Korona Dochodowy",
      quantity: 45.102,
      purchasePrice: 112.30,
      currentPrice: 118.42,
      currency: "PLN",
      notes: "Fundusz dłużny krótkoterminowy"
    }
  ],
  other: [
    {
      id: "other-1",
      name: "Fizyczna Sztabka Złota (1 uncja)",
      value: 10400,
      category: "Metale szlachetne",
      notes: "Sztabka C.Hafner, bezpieczne przechowywanie"
    },
    {
      id: "other-2",
      name: "Tokeny BTC (Bitcoin)",
      value: 12800,
      category: "Kryptowaluty",
      notes: "Zimny portfel sprzętowy Ledger"
    }
  ],
  snapshots: [
    { id: "snap-1", date: "2026-01-01", netWorth: 78500, cashValue: 21000, stocksValue: 24500, bondsValue: 18000, mutualFundsValue: 5000, otherValue: 10000 },
    { id: "snap-2", date: "2026-02-01", netWorth: 82100, cashValue: 22500, stocksValue: 25600, bondsValue: 18500, mutualFundsValue: 5500, otherValue: 10000 },
    { id: "snap-3", date: "2026-03-01", netWorth: 86400, cashValue: 24000, stocksValue: 26800, bondsValue: 19100, mutualFundsValue: 6500, otherValue: 10000 },
    { id: "snap-4", date: "2026-04-01", netWorth: 93800, cashValue: 25800, stocksValue: 29400, bondsValue: 21600, mutualFundsValue: 7000, otherValue: 10000 },
    { id: "snap-5", date: "2026-05-01", netWorth: 99400, cashValue: 26200, stocksValue: 32500, bondsValue: 22100, mutualFundsValue: 8600, otherValue: 10000 },
    { id: "snap-6", date: "2026-06-01", netWorth: 108300, cashValue: 27100, stocksValue: 35800, bondsValue: 23200, mutualFundsValue: 12200, otherValue: 10000 },
  ],
  lastUpdate: "2026-06-10T18:30:00.000Z"
};

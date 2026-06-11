/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum AssetType {
  CASH = "CASH",
  STOCK_NYSE = "STOCK_NYSE",
  STOCK_WSE = "STOCK_WSE",
  BOND_PL = "BOND_PL",
  MUTUAL_FUND = "MUTUAL_FUND",
  OTHER = "OTHER",
}

export enum PolishBondType {
  OTS = "OTS",  // 3-Month Fixed Rate (3-miesięczne oszczędnościowe)
  DOS = "DOS",  // 2-Year Fixed Rate (2-letnie oszczędnościowe)
  TOZ = "TOZ",  // 3-Year Floating Rate (3-letnie oszczędnościowe)
  COI = "COI",  // 4-Year Inflation Indexed (4-letnie indeksowane inflacją)
  EDO = "EDO",  // 10-Year Inflation Indexed (10-letnie indeksowane inflacją)
  ROS = "ROS",  // 6-Year Family Inflation Indexed (6-letnie rodzinne)
  SAN = "SAN",  // 12-Year Family Inflation Indexed (12-letnie rodzinne)
}

export interface CashAsset {
  id: string;
  currency: string; // PLN, USD, EUR, CHF, GBP, etc.
  amount: number;
  notes?: string;
}

export interface StockAsset {
  id: string;
  symbol: string; // e.g. AAPL, PKO
  name: string;
  quantity: number;
  purchasePrice: number; // in its local currency (USD/PLN depends on exchange)
  currentPrice: number;
  currency: string; // USD or PLN
  exchange: "NYSE" | "WSE";
  dateAdded: string;
}

export interface PolishBondAsset {
  id: string;
  bondType: PolishBondType;
  quantity: number;
  purchaseDate: string; // YYYY-MM-DD
  marginRate: number; // e.g., 1.25 for 1.25%
  firstYearRate: number; // e.g., 6.25 for 6.25%
  notes?: string;
}

export interface MutualFundAsset {
  id: string;
  name: string;
  quantity: number;
  purchasePrice: number; // in local currency
  currentPrice: number;
  currency: string;
  notes?: string;
}

export interface OtherAsset {
  id: string;
  name: string;
  value: number; // in base currency
  category: string; // Gold, Real Estate, Art, Crypto, etc.
  notes?: string;
}

export interface PortfolioData {
  cash: CashAsset[];
  stocks: StockAsset[];
  bonds: PolishBondAsset[];
  mutualFunds: MutualFundAsset[];
  other: OtherAsset[];
  snapshots: PortfolioSnapshot[];
  lastUpdate: string;
}

export interface PortfolioSnapshot {
  id: string;
  date: string; // YYYY-MM-DD (or YYYY-MM)
  netWorth: number; // in base currency
  cashValue: number;
  stocksValue: number;
  bondsValue: number;
  mutualFundsValue: number;
  otherValue: number;
}

export interface FXRates {
  [currency: string]: number; // relative to PLN
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PolishBondAsset, PolishBondType } from "../types";

/**
 * Accrued interest and current evaluation of Polish Government Savings Bonds (Obligacje Skarbowe).
 * Standard Face Value (Cena nominalna) = 100 PLN.
 */
export function calculateBondValue(bond: PolishBondAsset, currentYearInflation: number = 3.5): {
  currentValue: number;
  accruedInterest: number;
  yearsElapsed: number;
  isMatured: boolean;
} {
  const faceValue = 100;
  const initialPrincipal = bond.quantity * faceValue;

  const buyDate = new Date(bond.purchaseDate);
  const now = new Date();
  
  // Calculate exact time delta in years
  const diffTime = Math.max(0, now.getTime() - buyDate.getTime());
  const yearsElapsed = diffTime / (1000 * 60 * 60 * 24 * 365.25);

  let currentValue = initialPrincipal;
  let isMatured = false;

  // Standard rates & compounding depending on Polish Bond Type
  switch (bond.bondType) {
    case PolishBondType.OTS: {
      // 3-Month Fixed (e.g., OTS0926)
      const durationMonths = 3;
      const rateFraction = bond.firstYearRate / 100;
      const termFraction = durationMonths / 12; // 0.25 years
      
      if (yearsElapsed >= termFraction) {
        currentValue = initialPrincipal * (1 + rateFraction * termFraction);
        isMatured = true;
      } else {
        // Prorated interest accrual for current evaluation
        const progress = yearsElapsed / termFraction;
        currentValue = initialPrincipal * (1 + rateFraction * termFraction * progress);
      }
      break;
    }

    case PolishBondType.DOS: {
      // 2-Year Fixed compounding interest yearly (e.g., DOS0628)
      const durationYears = 2;
      const rate = bond.firstYearRate / 100;

      if (yearsElapsed >= durationYears) {
        currentValue = initialPrincipal * Math.pow(1 + rate, 2);
        isMatured = true;
      } else if (yearsElapsed >= 1) {
        // Year 1 completed, started Year 2
        const year1Value = initialPrincipal * (1 + rate);
        const year2Progress = yearsElapsed - 1;
        currentValue = year1Value * (1 + rate * year2Progress);
      } else {
        // Year 1 in progress
        currentValue = initialPrincipal * (1 + rate * yearsElapsed);
      }
      break;
    }

    case PolishBondType.COI: {
      // 4-Year Inflation Indexed Bonds (Interest paid out yearly, not compounded in base security value,
      // but value grows within the current year period until payout, then resets or stays at face value + current year)
      const durationYears = 4;
      const firstYearRate = bond.firstYearRate / 100;
      const subsequentMargin = bond.marginRate / 100;
      const inflation = currentYearInflation / 100;
      const inflationLinkedRate = subsequentMargin + inflation;

      if (yearsElapsed >= durationYears) {
        // Matured bond
        currentValue = initialPrincipal; // Face value returned, overall interest is accrued separately
        // For simple tracker valuation, let's include accrued interest of the finalized year
        const lastYearInterest = initialPrincipal * inflationLinkedRate;
        currentValue = initialPrincipal + lastYearInterest;
        isMatured = true;
      } else {
        const fullYears = Math.floor(yearsElapsed);
        const currentYearProgress = yearsElapsed - fullYears;
        
        let accruedSinceLastYear = 0;
        if (fullYears === 0) {
          accruedSinceLastYear = initialPrincipal * firstYearRate * currentYearProgress;
        } else {
          // Years 2, 3, 4 index against inflation
          accruedSinceLastYear = initialPrincipal * inflationLinkedRate * currentYearProgress;
        }
        currentValue = initialPrincipal + accruedSinceLastYear;
      }
      break;
    }

    case PolishBondType.EDO: {
      // 10-Year Inflation Indexed with full Year-on-Year COMPOUND INTEREST (Odsetki kapitalizowane)
      // Highly attractive! Value compound grows every year.
      const durationYears = 10;
      const firstYearRate = bond.firstYearRate / 100;
      const margin = bond.marginRate / 100;
      const inflation = currentYearInflation / 100;
      const inflationLinkedRate = margin + inflation;

      if (yearsElapsed >= durationYears) {
        // Compound interest calculated for 10 years
        let value = initialPrincipal * (1 + firstYearRate);
        for (let i = 1; i < 10; i++) {
          value = value * (1 + inflationLinkedRate);
        }
        currentValue = value;
        isMatured = true;
      } else {
        // Custom compounding step rate based on current age
        const fullYears = Math.floor(yearsElapsed);
        const fraction = yearsElapsed - fullYears;

        let accumulatedCapital = initialPrincipal;
        let currentRate = firstYearRate;

        // Simulate yearly capitalizations
        for (let i = 0; i < fullYears; i++) {
          if (i === 0) {
            accumulatedCapital = accumulatedCapital * (1 + firstYearRate);
          } else {
            accumulatedCapital = accumulatedCapital * (1 + inflationLinkedRate);
          }
        }

        // Add prorated progress for the current incomplete year
        if (fullYears > 0) {
          currentRate = inflationLinkedRate;
        }
        currentValue = accumulatedCapital * (1 + currentRate * fraction);
      }
      break;
    }

    default: {
      // Default fallback (e.g. OTS-like simple linear rate 5% per annum)
      const genericRate = 0.05;
      currentValue = initialPrincipal * (1 + genericRate * yearsElapsed);
      if (yearsElapsed > 3) isMatured = true;
      break;
    }
  }

  const accruedInterest = Math.max(0, currentValue - initialPrincipal);

  return {
    currentValue: parseFloat(currentValue.toFixed(2)),
    accruedInterest: parseFloat(accruedInterest.toFixed(2)),
    yearsElapsed: parseFloat(yearsElapsed.toFixed(2)),
    isMatured,
  };
}

/**
 * Formats standard Polish Savings Bond description with details
 */
export function getBondTypeDescription(type: PolishBondType): {
  fullName: string;
  duration: string;
  interestType: string;
} {
  switch (type) {
    case PolishBondType.OTS:
      return { fullName: "3-Miesięczne dłużne (OTS)", duration: "3 Months", interestType: "Stałe (Fixed)" };
    case PolishBondType.DOS:
      return { fullName: "2-Letnie dłużne (DOS)", duration: "2 Years", interestType: "Stałe roczne (Fixed compounded)" };
    case PolishBondType.TOZ:
      return { fullName: "3-Letnie dłużne (TOZ)", duration: "3 Years", interestType: "Zmienne wskaźnikowe (Floating)" };
    case PolishBondType.COI:
      return { fullName: "4-Letnie indeksowane inflacją (COI)", duration: "4 Years", interestType: "Indeksowane inflacją rocznie (Inflation linked)" };
    case PolishBondType.EDO:
      return { fullName: "10-Letnie emerytalne indeksowane inflacją (EDO)", duration: "10 Years", interestType: "Roczna kapitalizacja indeksowana inflacją" };
    case PolishBondType.ROS:
      return { fullName: "6-Letnie rodzinne indeksowane inflacją (ROS)", duration: "6 Years", interestType: "Rodzinne, indeksowane inflacją z dopłatami" };
    case PolishBondType.SAN:
      return { fullName: "12-Letnie rodzinne indeksowane inflacją (SAN)", duration: "12 Years", interestType: "Emerytalno-rodzinne z kapitalizacją" };
  }
}

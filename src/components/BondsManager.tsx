/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { PolishBondAsset, PolishBondType, PortfolioData } from "../types";
import { calculateBondValue, getBondTypeDescription } from "../utils/bondUtils";
import { Plus, Trash2, ShieldCheck, ChevronRight, Calculator, Calendar } from "lucide-react";

interface BondsManagerProps {
  portfolio: PortfolioData;
  onChange: (updatedBonds: PolishBondAsset[]) => void;
}

export function BondsManager({ portfolio, onChange }: BondsManagerProps) {
  const [inflationRate, setInflationRate] = useState<number>(3.5); // Poland's simulated inflation rate
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // Form Fields
  const [bondType, setBondType] = useState<PolishBondType>(PolishBondType.EDO);
  const [quantity, setQuantity] = useState<number>(10);
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [marginRate, setMarginRate] = useState<number>(1.25);
  const [firstYearRate, setFirstYearRate] = useState<number>(6.50);
  const [notes, setNotes] = useState<string>("");

  const handleAddBond = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) return;

    const newBond: PolishBondAsset = {
      id: "bond-" + Date.now().toString(),
      bondType,
      quantity,
      purchaseDate,
      marginRate,
      firstYearRate,
      notes: notes.trim() || undefined,
    };

    onChange([...portfolio.bonds, newBond]);
    setShowAddForm(false);
    // Reset form defaults 
    setNotes("");
  };

  const handleRemoveBond = (id: string) => {
    if (confirm("Czy na pewno chcesz usunąć te obligacje ze swojego portfela?")) {
      onChange(portfolio.bonds.filter(b => b.id !== id));
    }
  };

  // Helper when changing bondType to pre-populate typical Polish Treasury parameters
  const selectBondTypeAndAutofill = (type: PolishBondType) => {
    setBondType(type);
    switch (type) {
      case PolishBondType.OTS:
        setMarginRate(0.00);
        setFirstYearRate(5.00); // Typical 3-month rate 5%
        break;
      case PolishBondType.DOS:
        setMarginRate(0.00);
        setFirstYearRate(6.25); // Typical 2-year rate 6.25%
        break;
      case PolishBondType.COI:
        setMarginRate(1.25);
        setFirstYearRate(6.50); // Typical 4-year inflation rate
        break;
      case PolishBondType.EDO:
        setMarginRate(1.50);
        setFirstYearRate(6.80); // Typical 10-year inflation rate
        break;
      default:
        break;
    }
  };

  const calculateTotalBondsVal = () => {
    return portfolio.bonds.reduce((acc, b) => {
      const { currentValue } = calculateBondValue(b, inflationRate);
      return acc + currentValue;
    }, 0);
  };

  const calculateTotalBondsPrincipal = () => {
    return portfolio.bonds.reduce((acc, b) => acc + b.quantity * 100, 0);
  };

  return (
    <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm flex flex-col gap-6" id="bonds-manager-panel">
      {/* Visual Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center font-bold text-xl shadow-md">
            PL
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Obligacje Skarbowe Rzeczypospolitej Polskiej</h3>
            <p className="text-xs text-slate-400">Bezpieczna poduszka antyinflacyjna indeksowana inflacją GUS</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center gap-2 self-start sm:self-auto"
          id="btn-add-bond-toggle"
        >
          <Plus className="w-4 h-4" />
          Dodaj Obligacje
        </button>
      </div>

      {/* Polish treasury inflation simulator slider */}
      <div className="bg-slate-50 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calculator className="w-5 h-5 text-emerald-600" />
          <div className="text-left">
            <span className="text-xs font-bold text-slate-700">Symulator Inflacji GUS RP</span>
            <p className="text-[10px] text-slate-400">Modyfikuj stopę, by zobaczyć aktualny zysk zmienny COI/EDO</p>
          </div>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto flex-1 md:max-w-xs">
          <input
            type="range"
            min="0"
            max="15"
            step="0.1"
            value={inflationRate}
            onChange={(e) => setInflationRate(parseFloat(e.target.value))}
            className="flex-1 accent-emerald-500"
          />
          <span className="px-3 py-1.5 bg-white text-emerald-700 font-extrabold text-sm rounded-xl border border-emerald-100 min-w-[70px] text-center shadow-xs">
            {inflationRate.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Add Bond Form */}
      {showAddForm && (
        <form onSubmit={handleAddBond} className="p-5 border-2 border-dashed border-emerald-100 rounded-2xl bg-emerald-50/20 space-y-4 animate-fadeIn" id="form-add-bond">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h4 className="font-bold text-slate-700 text-sm">Nowe Obligacje Skarbowe</h4>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-xs text-slate-400 hover:text-slate-600">Anuluj</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Typ Obligacji</label>
              <select
                value={bondType}
                onChange={(e) => selectBondTypeAndAutofill(e.target.value as PolishBondType)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:border-emerald-500"
              >
                <option value={PolishBondType.OTS}>OTS - 3-Miesięczne stałe</option>
                <option value={PolishBondType.DOS}>DOS - 2-Letnie stałe roczne</option>
                <option value={PolishBondType.COI}>COI - 4-Letnie indeksowane</option>
                <option value={PolishBondType.EDO}>EDO - 10-Letnie emerytalne</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Ilość sztuk (Nominał: 100 PLN/szt.)</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Data zakupu</label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Oprocentowanie 1. roku (%)</label>
              <input
                type="number"
                step="0.01"
                value={firstYearRate}
                onChange={(e) => setFirstYearRate(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Marża GUS nad inflację (%)</label>
              <input
                type="number"
                step="0.01"
                value={marginRate}
                disabled={bondType === PolishBondType.OTS || bondType === PolishBondType.DOS}
                onChange={(e) => setMarginRate(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-semibold focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Własna notatka (seria, kody)</label>
              <input
                type="text"
                placeholder="np. EDO0332"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:bg-emerald-700 transition"
              id="btn-save-new-bond"
            >
              Dodaj do Portfela
            </button>
          </div>
        </form>
      )}

      {/* List of Bonds */}
      {portfolio.bonds.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/20">
          <p className="text-sm text-slate-400">Brak zarejestrowanych obligacji skarbowych w portfelu.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="text-xs text-emerald-600 font-bold underline mt-2"
          >
            Dodaj pierwsze obligacje RP
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse" id="bonds-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3">Typ & Seria</th>
                <th className="px-4 py-3">Ilość sztuk</th>
                <th className="px-4 py-3">Cena Zakupu</th>
                <th className="px-4 py-3">Szczegóły Oprocentowania</th>
                <th className="px-4 py-3">Wycena Dzisiejsza</th>
                <th className="px-4 py-3">Narosłe Odsetki</th>
                <th className="px-4 py-3 text-center">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.bonds.map((b) => {
                const desc = getBondTypeDescription(b.bondType);
                const { currentValue, accruedInterest, yearsElapsed, isMatured } = calculateBondValue(b, inflationRate);
                const principal = b.quantity * 100;

                return (
                  <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors text-sm text-slate-700">
                    <td className="px-4 py-4">
                      <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 mr-2">
                          {b.bondType}
                        </span>
                        <span className="font-bold text-slate-800">{desc.fullName}</span>
                        {b.notes && <p className="text-[10px] text-slate-400 mt-1">{b.notes}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-4 font-semibold">{b.quantity} szt.</td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-slate-500">{principal.toLocaleString()} PLN</span>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <div>
                        <p className="font-semibold text-slate-600">
                          Pierwszy rok: <span className="text-emerald-600 font-bold">{b.firstYearRate}%</span>
                        </p>
                        {b.bondType !== PolishBondType.OTS && b.bondType !== PolishBondType.DOS && (
                          <p className="text-slate-400">
                            Od 2. roku: Marża <span className="font-bold text-slate-600">{b.marginRate}%</span> + GUS
                          </p>
                        )}
                        <p className="text-slate-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Wiek: {yearsElapsed.toFixed(1)} lat / {desc.duration}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-800 text-base">{currentValue.toLocaleString()} PLN</span>
                        {isMatured && (
                          <span className="inline-flex items-center text-[10px] uppercase font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                            Wykupiony
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-emerald-600">+{accruedInterest.toLocaleString()} PLN</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleRemoveBond(b.id)}
                        className="p-1 border border-red-100 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                        title="Usuń pozycję"
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

      {/* Summary Summary banner for Treasury Bonds */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Podsumowanie Obligacji RP
          </span>
        </div>
        <div className="flex gap-6">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Zainwestowane</span>
            <span className="text-sm font-semibold text-slate-600">{calculateTotalBondsPrincipal().toLocaleString()} PLN</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-emerald-600 font-bold uppercase block">Zysk z odsetek</span>
            <span className="text-sm font-bold text-emerald-600">+{(calculateTotalBondsVal() - calculateTotalBondsPrincipal()).toLocaleString()} PLN</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Wycena dzisiejsza</span>
            <span className="text-base font-extrabold text-slate-800">{calculateTotalBondsVal().toLocaleString()} PLN</span>
          </div>
        </div>
      </div>
    </div>
  );
}

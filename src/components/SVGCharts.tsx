/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { PortfolioSnapshot } from "../types";
import { TrendingUp, PieChart, DollarSign } from "lucide-react";

interface SVGChartsProps {
  snapshots: PortfolioSnapshot[];
  allocation: {
    cash: number;
    stocksNYSE: number;
    stocksWSE: number;
    bonds: number;
    mutualFunds: number;
    other: number;
  };
  currencySymbol: string;
}

export function SVGCharts({ snapshots, allocation, currencySymbol }: SVGChartsProps) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const total =
    allocation.cash +
    allocation.stocksNYSE +
    allocation.stocksWSE +
    allocation.bonds +
    allocation.mutualFunds +
    allocation.other;

  const dataPoints = [
    { label: "Cash", value: allocation.cash, color: "#22C55E", gradientId: "grad-cash" },
    { label: "Bonds (PL)", value: allocation.bonds, color: "#10B981", gradientId: "grad-bonds" },
    { label: "NYSE Stock", value: allocation.stocksNYSE, color: "#6366F1", gradientId: "grad-nyse" },
    { label: "WSE Stock", value: allocation.stocksWSE, color: "#8B5CF6", gradientId: "grad-wse" },
    { label: "Mutual Funds", value: allocation.mutualFunds, color: "#F59E0B", gradientId: "grad-mf" },
    { label: "Other Assets", value: allocation.other, color: "#EC4899", gradientId: "grad-other" },
  ].filter(d => d.value > 0);

  // Growth Trend Chart
  const maxNetWorth = Math.max(...snapshots.map(s => s.netWorth), 1);
  const minNetWorth = Math.min(...snapshots.map(s => s.netWorth), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="portfolio-charts-container">
      {/* 1. Allocation Wheel */}
      <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm flex flex-col justify-between" id="chart-allocation">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Struktura Alokacji Aktywów</h4>
            <p className="text-[11px] text-slate-400">Procentowe udziały poszczególnych klas</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 my-auto">
          {/* Custom SVG Donut slice */}
          <div className="relative w-40 h-40 shrink-0">
            {total === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50 rounded-full border-2 border-dashed border-slate-200">
                <span className="text-xs text-slate-400 font-medium">Brak aktywów</span>
              </div>
            ) : (
              <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90">
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#F1F5F9" strokeWidth="6" />
                {(() => {
                  let accumulatedOffset = 0;
                  return dataPoints.map((dp, i) => {
                    const percentage = (dp.value / total) * 100;
                    const strokeDasharray = `${percentage} ${100 - percentage}`;
                    const strokeDashoffset = 100 - accumulatedOffset;
                    accumulatedOffset += percentage;

                    return (
                      <circle
                        key={i}
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke={dp.color}
                        strokeWidth="6"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-300 hover:stroke-[7]"
                        style={{ transformOrigin: "center" }}
                      />
                    );
                  });
                })()}
              </svg>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Suma</span>
              <span className="text-base font-extrabold text-slate-800">
                {total.toLocaleString()} {currencySymbol}
              </span>
            </div>
          </div>

          {/* Color Wheel Legends */}
          <div className="flex-1 w-full space-y-2">
            {dataPoints.map((dp, idx) => {
              const perc = total > 0 ? (dp.value / total) * 100 : 0;
              return (
                <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: dp.color }} />
                    <span className="text-xs font-semibold text-slate-600">{dp.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800 mr-2">
                      {dp.value.toLocaleString()} {currencySymbol}
                    </span>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md font-bold">
                      {perc.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Monthly Growth trend bar chart */}
      <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm flex flex-col justify-between" id="chart-growth">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Trendy Przyrostu Majątku</h4>
              <p className="text-[11px] text-slate-400">Rejestr historycznego wzrostu kapitału</p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            +{(snapshots.length > 1 ? (((snapshots[snapshots.length - 1].netWorth - snapshots[0].netWorth) / Math.max(1, snapshots[0].netWorth)) * 100).toFixed(1) : 0)}% Całkowity
          </span>
        </div>

        {snapshots.length === 0 ? (
          <div className="flex-1 h-36 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-xs">
            Skonfiguruj snapshoty miesięczne, aby ujrzeć wykres przyrostu.
          </div>
        ) : (
          <div className="relative flex-1 flex flex-col justify-end mt-4">
            {/* Horizontal Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40 py-2">
              <div className="border-t border-dashed border-slate-100 w-full" />
              <div className="border-t border-dashed border-slate-100 w-full" />
              <div className="border-t border-dashed border-slate-100 w-full" />
            </div>

            {/* Bars container */}
            <div className="relative h-32 flex items-end justify-between gap-2 px-2 z-10">
              {snapshots.map((snap, idx) => {
                // Height calculation
                const pct = maxNetWorth > 0 ? (snap.netWorth / maxNetWorth) * 100 : 0;
                const isHovered = hoveredBar === idx;

                return (
                  <div
                    key={snap.id}
                    className="flex-1 flex flex-col items-center group cursor-pointer relative"
                    onMouseEnter={() => setHoveredBar(idx)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {/* Tooltip on Hover */}
                    {isHovered && (
                      <div className="absolute -top-12 z-50 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap">
                        {snap.netWorth.toLocaleString()} {currencySymbol}
                      </div>
                    )}

                    <div
                      style={{ height: `${Math.max(10, pct)}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        idx === snapshots.length - 1
                          ? "bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:brightness-110"
                          : "bg-gradient-to-t from-indigo-400 to-purples-300 group-hover:from-purple-500 opacity-80 hover:opacity-100"
                      }`}
                    />

                    {/* Styled Bar label (Month / Date) */}
                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-tighter truncate max-w-full">
                      {snap.date.substring(5, 7) ? `M${snap.date.substring(5, 7)}` : snap.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

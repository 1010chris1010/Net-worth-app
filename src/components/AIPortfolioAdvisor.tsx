/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Sparkles, Brain, Loader2, ArrowRight, TrendingUp } from "lucide-react";
import { PortfolioData, FXRates } from "../types";

interface AIPortfolioAdvisorProps {
  portfolio: PortfolioData;
  baseCurrency: string;
  rates: FXRates;
}

export function AIPortfolioAdvisor({ portfolio, baseCurrency, rates }: AIPortfolioAdvisorProps) {
  const [advice, setAdvice] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const triggerAnalysis = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolio,
          baseCurrency,
          currentRates: rates,
        }),
      });

      if (!response.ok) {
        throw new Error("Błąd podczas generowania analizy portfolio.");
      }

      const data = await response.json();
      setAdvice(data.advice || "Brak wygenerowanych rekomendacji.");
    } catch (err: any) {
      console.error(err);
      setError("Wystąpił błąd komunikacji z serwerem doradcy AI. Spróbuj ponownie za chwilę.");
    } finally {
      setLoading(false);
    }
  };

  // Safe client-side markdown formatter that translates common tags (headers, bullet points, bold) 
  // into beautiful custom HTML nodes styled with Tailwind classes.
  const renderFormattedAdvice = (text: string) => {
    return text.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      
      if (trimmed.startsWith("###")) {
        return (
          <h4 key={idx} className="text-xl font-bold text-slate-800 mt-6 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
            <span className="w-1.5 h-6 rounded bg-gradient-to-r from-amber-500 to-rose-500"></span>
            {trimmed.replace("###", "").trim()}
          </h4>
        );
      }
      
      if (trimmed.startsWith("####")) {
        return (
          <h5 key={idx} className="text-lg font-bold text-slate-700 mt-4 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            {trimmed.replace("####", "").trim()}
          </h5>
        );
      }

      if (trimmed.startsWith("##")) {
        return (
          <h3 key={idx} className="text-2xl font-extrabold text-slate-900 mt-8 mb-4 border-b-2 border-amber-400 pb-2 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
            {trimmed.replace("##", "").trim()}
          </h3>
        );
      }

      if (trimmed.startsWith("*") || trimmed.startsWith("-")) {
        // Render bullet point nicely
        const cleanContent = trimmed.substring(1).trim();
        // Check for **bold**
        const parts = parseBoldText(cleanContent);
        return (
          <li key={idx} className="list-none pl-6 relative text-slate-600 mb-2 leading-relaxed">
            <span className="absolute left-1 top-2 w-2 h-2 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500"></span>
            {parts}
          </li>
        );
      }

      if (trimmed === "") {
        return <div key={idx} className="h-2"></div>;
      }

      // Check for bold in normal paragraph
      const parts = parseBoldText(trimmed);
      return (
        <p key={idx} className="text-slate-600 mb-3 leading-relaxed text-[15px]">
          {parts}
        </p>
      );
    });
  };

  const parseBoldText = (text: string) => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <strong key={match.index} className="font-semibold text-slate-900">
          {match[1]}
        </strong>
      );
      lastIndex = boldRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="relative rounded-3xl bg-white p-6 shadow-xl border border-rose-50 overflow-hidden" id="ai-advisor-panel">
      {/* Background soft color accent blobs */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-rose-50 opacity-50 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-amber-50 opacity-50 blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100">
            <Brain className="w-3.5 h-3.5" />
            Sztuczna Inteligencja
          </span>
          <h3 className="text-xl font-bold text-slate-800 mt-2">Prywatny Doradca Strategiczny AI</h3>
          <p className="text-xs text-slate-500 mt-1">
            Zaszyfrowana statystyczna analiza Twoich proporcji aktywów i odporności na inflację
          </p>
        </div>

        <button
          onClick={triggerAnalysis}
          disabled={loading}
          className="relative inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-white shadow-lg bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:brightness-110 active:scale-95 transition-all duration-200 disabled:opacity-50 group"
          id="btn-ai-analyze"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Obliczanie...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
              Generuj Analizę Portfolio
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2 mb-4">
          <span className="font-bold">⚠️</span> {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-rose-100 animate-ping opacity-40"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-rose-500 animate-spin"></div>
            <div className="absolute inset-4 rounded-full bg-rose-50 flex items-center justify-center">
              <Brain className="w-5 h-5 text-rose-500 animate-pulse" />
            </div>
          </div>
          <h4 className="font-semibold text-slate-700">Analizuję rozkład Twojej zamożności</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-[280px] text-center leading-relaxed">
            Dokonuję alokacji walutowej i waliduję warunki odsetkowe polskich obligacji skarbowych...
          </p>
        </div>
      ) : advice ? (
        <div className="rounded-2xl bg-slate-50/50 border border-slate-100 p-6 max-h-[500px] overflow-y-auto custom-scroll text-left">
          {renderFormattedAdvice(advice)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
          <TrendingUp className="w-12 h-12 text-slate-300 mb-3" />
          <h4 className="font-semibold text-slate-500 text-sm">Twój doradca jest gotowy</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-[320px] text-center leading-relaxed">
            Kliknij powyższy, tęczowy przycisk, aby bezpiecznie przesłać strukturę swojego portfela do inteligentnego doradcy i otrzymać strategię rozwoju majątku.
          </p>
        </div>
      )}
    </div>
  );
}

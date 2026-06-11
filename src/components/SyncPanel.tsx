/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { PortfolioData } from "../types";
import { Smartphone, Laptop, RefreshCw, Send, Download, ArrowRight, Loader2, CheckCircle, Wifi } from "lucide-react";

interface SyncPanelProps {
  portfolio: PortfolioData;
  isMaster: boolean;
  onSetIsMaster: (val: boolean) => void;
  onOverwritePortfolioState: (newState: PortfolioData) => void;
}

export function SyncPanel({ portfolio, isMaster, onSetIsMaster, onOverwritePortfolioState }: SyncPanelProps) {
  const [pinCode, setPinCode] = useState<string>("");
  const [hostedPin, setHostedPin] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleHostSync = async () => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const response = await fetch("/api/sync/host", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: JSON.stringify(portfolio) }),
      });

      if (!response.ok) {
        throw new Error("Nie udało się zatrzymać sesji synchronizacyjnej na serwerze.");
      }

      const data = await response.json();
      setHostedPin(data.pin);
      setSuccessMsg(`Sesja uruchomiona pomyślnie! Twój PIN wygaśnie za 10 minut.`);
    } catch (err: any) {
      setErrorMsg("Błąd serwera: brak połączenia sieciowego. Spróbuj powtórzyć.");
    } finally {
      setLoading(false);
    }
  };

  const handlePullSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCode.trim()) return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const response = await fetch(`/api/sync/pull/${pinCode.trim()}`);
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Wprowadzony kod PIN wygasł lub jest niepoprawny.");
      }

      const resData = await response.json();
      if (resData && resData.data) {
        onOverwritePortfolioState(resData.data);
        setSuccessMsg("Pomyślnie zaimportowano portfolio urządzenia nadrzędnego!");
        setPinCode("");
      } else {
        throw new Error("Otrzymano pusty lub wadliwy ładunek danych.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Błąd pobierania danych. Sprawdź PIN na telefonie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm flex flex-col gap-5" id="sync-control-panel">
      {/* Visual Header */}
      <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
          <Wifi className="w-5 h-5" />
        </div>
        <div className="text-left">
          <h4 className="font-bold text-slate-800 text-sm">Prywatna Synchronizacja Wi-Fi</h4>
          <p className="text-[10px] text-slate-400">Bezpieczne parowanie urządzeń bez chmury</p>
        </div>
      </div>

      {/* Role Toggle Selector (Master vs Viewer) */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
        <button
          onClick={() => {
            onSetIsMaster(true);
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
            isMaster
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
          id="btn-toggle-master"
        >
          <Smartphone className="w-4 h-4" />
          Telefon (Android)
        </button>

        <button
          onClick={() => {
            onSetIsMaster(false);
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
            !isMaster
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
          id="btn-toggle-viewer"
        >
          <Laptop className="w-4 h-4" />
          Komputer (Mac)
        </button>
      </div>

      {/* Conditional UI based on Device Mode */}
      {isMaster ? (
        <div className="space-y-4 text-left">
          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Nadrzędna baza (Master mode)
            </div>
            Wszystkie zmiany są zapisywane na Twoim telefonie. Kliknij poniższy przycisk, aby wygenerować jednorazowy kod PIN Wi-Fi i skopiować dane na komputer.
          </div>

          {!hostedPin ? (
            <button
              onClick={handleHostSync}
              disabled={loading}
              className="w-full py-3.5 bg-indigo-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-md hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
              id="btn-host-sync"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Inicjowanie...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Udostępnij Dane na Maca
                </>
              )}
            </button>
          ) : (
            <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl text-center space-y-3 animate-fadeIn">
              <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest block">
                Kod parowania Wi-Fi (Wpisz go na Macu):
              </span>
              <div className="text-4xl font-black text-indigo-700 tracking-wider letter-spacing-5 mx-auto bg-white py-3 rounded-2xl border border-indigo-200 shadow-sm max-w-[200px]">
                {hostedPin}
              </div>
              <p className="text-[10px] text-slate-400">
                Połącz oba urządzenia z tą samą siecią Wi-Fi (lub udostępnij hot-spot z komórki).
              </p>
              <button
                onClick={() => setHostedPin("")}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 underline"
              >
                Zamknij sesję
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 text-left">
          <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-800 font-bold mb-1">
              <Laptop className="w-4 h-4" />
              Tryb Odbiornika (Mac reader)
            </div>
            Pobierz całą bazę majątkową bezpośrednio ze swojego głównego telefonu przez sieć bezprzewodową. Wpisz wygenerowany na telefonie kod PIN poniżej.
          </div>

          <form onSubmit={handlePullSync} className="flex gap-2">
            <input
              type="text"
              placeholder="Wpisz 6 cyfrowy PIN"
              value={pinCode}
              maxLength={6}
              onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-center font-extrabold text-sm text-slate-800 tracking-wider focus:outline-none focus:border-indigo-500"
              required
            />
            <button
              type="submit"
              disabled={loading || pinCode.length < 6}
              className="px-5 bg-indigo-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl hover:bg-indigo-700 transition flex items-center gap-1.5 disabled:opacity-45"
              id="btn-pull-sync"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Pobierz
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Success or Error alert indicators */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 text-xs flex items-start gap-2 text-left animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 text-rose-700 rounded-2xl border border-rose-100 text-xs flex items-start gap-2 text-left animate-fadeIn">
          <span className="font-bold text-rose-600">⚠️</span>
          <p className="font-semibold">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}

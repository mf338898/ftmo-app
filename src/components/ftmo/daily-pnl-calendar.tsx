"use client";

import { useState, useEffect } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  getDay,
  addMonths,
  subMonths,
  isToday,
  isSameDay,
  startOfToday,
} from "date-fns";
import { fr } from "date-fns/locale";
import clsx from "clsx";
import { useDisplayMode, formatValue } from "./display-mode-context";
import type { MonthlyStats, DailyPnlEntry } from "./types";

const weekDays = ["LUN.", "MAR.", "MER.", "JEU.", "VEND.", "SAM", "DIM"];

export function DailyPnlCalendar({
  accountId,
  refreshKey = 0,
}: {
  accountId: string;
  refreshKey?: number;
}) {
  const { mode, baseCapital } = useDisplayMode();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [dailyPnl, setDailyPnl] = useState<DailyPnlEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const monthStr = format(currentMonth, "yyyy-MM");
        const res = await fetch(
          `/api/ftmo/monthly-stats?accountId=${accountId}&userId=demo-user&month=${monthStr}`,
        );
        if (!res.ok) {
          setStats({ totalPnl: 0, tradingDays: 0 });
          setDailyPnl([]);
          return;
        }
        const data = await res.json();
        setStats(data.stats ?? { totalPnl: 0, tradingDays: 0 });
        setDailyPnl(data.dailyPnl ?? []);
      } catch (error) {
        console.error("Error fetching monthly stats:", error);
        setStats({ totalPnl: 0, tradingDays: 0 });
        setDailyPnl([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [accountId, currentMonth, refreshKey]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const pnlByDate = new Map(dailyPnl.map((entry) => [entry.date, entry]));

  const getDayPnl = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return pnlByDate.get(dateStr);
  };

  const firstDayOfWeek = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1;
  const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  const nextMonthDays = 42 - (emptyDays.length + days.length);
  const nextMonthDates = Array.from(
    { length: nextMonthDays },
    (_, i) => new Date(monthEnd.getFullYear(), monthEnd.getMonth(), i + 1),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentMonth(startOfToday())}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Aujourd&apos;hui
          </button>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h3 className="text-lg font-semibold text-slate-900">
            {format(currentMonth, "MMMM yyyy", { locale: fr })}
          </h3>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-slate-500">Statistiques mensuelles:</p>
            {loading ? (
              <p className="text-sm text-slate-400">Chargement...</p>
            ) : (
              <>
                <div className="mt-1 rounded-lg bg-green-100 px-3 py-1.5 text-sm font-semibold text-green-700">
                  {formatValue(stats?.totalPnl ?? 0, mode, baseCapital, "EUR", true)}
                </div>
                <div className="mt-1 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
                  <span>Jours de trading: {stats?.tradingDays ?? 0}</span>
                  <button className="text-slate-500 hover:text-slate-700">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-semibold text-slate-600"
            >
              {day}
            </div>
          ))}

          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {days.map((day) => {
            const dayPnl = getDayPnl(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isCurrentDay = isToday(day);
            const hasTrading = dayPnl !== undefined;

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={clsx(
                  "aspect-square rounded-lg border-2 p-2 text-left transition-colors",
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : isCurrentDay
                      ? "border-blue-300 bg-blue-50/50"
                      : hasTrading
                        ? dayPnl.pnl >= 0
                          ? "border-green-200 bg-green-50"
                          : "border-red-200 bg-red-50"
                        : "border-transparent hover:bg-slate-50",
                )}
              >
                <div className="text-xs font-medium text-slate-700">
                  {format(day, "d")}
                </div>
                {hasTrading && (
                  <div className="mt-1 space-y-0.5">
                    <div
                      className={clsx(
                        "text-[10px] font-semibold",
                        dayPnl.pnl >= 0 ? "text-green-700" : "text-red-700",
                      )}
                    >
                      {formatValue(dayPnl.pnl, mode, baseCapital, "EUR", true)}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      Trades: {dayPnl.trades}
                    </div>
                  </div>
                )}
              </button>
            );
          })}

          {nextMonthDates.map((day) => (
            <div
              key={day.toISOString()}
              className="aspect-square rounded-lg p-2 text-left text-xs text-slate-400"
            >
              {format(day, "d")}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Les trades sont affichés à l&apos;heure de la plateforme ce qui peut différer
        du fuseau horaire CE(S)T
      </p>
    </div>
  );
}


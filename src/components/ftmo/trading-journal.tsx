"use client";

import { Tab } from "@headlessui/react";
import clsx from "clsx";
import { DailyPnlCalendar } from "./daily-pnl-calendar";
import { ClosedTradesTable } from "./closed-trades-table";
import { AnalyticsCharts } from "./analytics-charts";

export function TradingJournal({
  accountId,
  refreshKey = 0,
}: {
  accountId: string;
  refreshKey?: number;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-3xl font-bold text-slate-900">Journal de Trading</h2>
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500">
          i
        </div>
      </div>

      <Tab.Group>
        <Tab.List className="flex gap-1 border-b border-slate-200">
          {["PnL Journalier", "Trades clôturés", "Graphiques"].map((label) => (
            <Tab
              key={label}
              className={({ selected }) =>
                clsx(
                  "px-4 py-2 text-sm font-semibold transition-colors",
                  selected
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-slate-500 hover:text-slate-700",
                )
              }
            >
              {label}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className="mt-6">
          <Tab.Panel>
            <DailyPnlCalendar accountId={accountId} refreshKey={refreshKey} />
          </Tab.Panel>
          <Tab.Panel>
            <ClosedTradesTable accountId={accountId} refreshKey={refreshKey} />
          </Tab.Panel>
          <Tab.Panel>
            <AnalyticsCharts accountId={accountId} refreshKey={refreshKey} />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}


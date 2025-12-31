"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useDisplayMode, formatValue } from "./display-mode-context";
import type { EquityPoint, Account, Withdrawal } from "./types";

const teal = "#14b8a6";
const tealLight = "#5eead4";
const red = "#ef4444";
const blue = "#3b82f6";
const redLight = "#fecdd3";

type ChartPoint = EquityPoint & {
  performancePct: number;
  performancePositive: number;
  performanceNegative: number;
  performancePositiveLine: number | null;
  performanceNegativeLine: number | null;
  // Pour le mode absolute : gain/perte en euros (equity - equityStart)
  equityDelta: number;
  equityPositive: number;
  equityNegative: number;
  equityPositiveLine: number | null;
  equityNegativeLine: number | null;
};

const formatDate = (value: string) => {
  try {
    return format(new Date(value), "d MMM yyyy HH:mm", { locale: fr });
  } catch {
    return value;
  }
};

const formatPercentageValue = (value: number | undefined) => {
  const safeValue = typeof value === "number" ? value : 0;
  return `${safeValue >= 0 ? "+" : ""}${safeValue.toFixed(2)}%`;
};

const buildTicks = (min: number, max: number, count = 7) => {
  if (count <= 1 || min === max) {
    return [Number(min.toFixed(2))];
  }

  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) =>
    Number((min + step * i).toFixed(2)),
  );
};

const getPercentageDomain = (values: number[]) => {
  if (values.length === 0) {
    return { domain: [0, 5] as [number, number], ticks: buildTicks(0, 5) };
  }

  const maxVal = Math.max(...values, 0);
  const minVal = Math.min(...values, 0);

  if (minVal < 0) {
    const absMax = Math.max(Math.abs(minVal), Math.abs(maxVal));
    const padding = Math.max(absMax * 0.1, 1);
    const domain: [number, number] = [-(absMax + padding), absMax + padding];
    return { domain, ticks: buildTicks(domain[0], domain[1]) };
  }

  const padding = Math.max(maxVal * 0.1, 1);
  const top = maxVal === 0 ? 5 : maxVal + padding;
  const domain: [number, number] = [0, top];
  return { domain, ticks: buildTicks(domain[0], domain[1]) };
};

const getAbsoluteDomain = (values: number[]) => {
  if (values.length === 0) {
    return { domain: [0, 1] as [number, number], ticks: buildTicks(0, 1) };
  }

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || Math.abs(maxVal) || 1;
  const padding = range * 0.1;
  const domain: [number, number] = [minVal - padding, maxVal + padding];

  return { domain, ticks: buildTicks(domain[0], domain[1]) };
};

export function EquityChart({
  series,
  account,
  withdrawals = [],
}: {
  series: EquityPoint[];
  account: Account;
  withdrawals?: Withdrawal[];
  refreshKey?: number;
}) {
  const { mode, baseCapital } = useDisplayMode();
  const currentEquity = series.length > 0 ? series[series.length - 1]?.equity : account.equity ?? 0;
  const currentBalance = account.balance ?? currentEquity;

  // S'assurer que les données sont triées par date
  const sortedSeries = [...series].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );

  const validSeries = sortedSeries.filter(
    (p) => p.time && !Number.isNaN(new Date(p.time).getTime()),
  );

  const firstEquity =
    validSeries[0]?.equity ??
    series[0]?.equity ??
    account.balance ??
    account.equity ??
    baseCapital;
  const equityStart = firstEquity && firstEquity !== 0 ? firstEquity : baseCapital;

  const toChartPoint = (point: EquityPoint): ChartPoint => {
    const perf = ((point.equity / equityStart) - 1) * 100;
    const performancePct = Number.isFinite(perf) ? perf : 0;
    const isAboveStart = point.equity >= equityStart;
    
    // Pour le mode absolute : gain/perte en euros (equity - equityStart)
    const equityDelta = point.equity - equityStart;
    const isPositive = equityDelta >= 0;

    return {
      ...point,
      performancePct,
      performancePositive: performancePct > 0 ? performancePct : 0,
      performanceNegative: performancePct < 0 ? performancePct : 0,
      performancePositiveLine: performancePct >= 0 ? performancePct : null,
      performanceNegativeLine: performancePct < 0 ? performancePct : null,
      // Pour le mode absolute : gain/perte en euros
      equityDelta,
      equityPositive: isPositive ? equityDelta : 0,
      equityNegative: !isPositive ? equityDelta : 0,
      equityPositiveLine: isPositive ? equityDelta : null,
      equityNegativeLine: !isPositive ? equityDelta : null,
    };
  };

  const addZeroCrossings = (points: ChartPoint[]): ChartPoint[] => {
    if (points.length < 2) return points;

    const withCrossings: ChartPoint[] = [points[0]];

    for (let i = 1; i < points.length; i++) {
      const prev = withCrossings[withCrossings.length - 1];
      const curr = points[i];
      const prevVal = prev.performancePct;
      const currVal = curr.performancePct;

      const prevTime = new Date(prev.time).getTime();
      const currTime = new Date(curr.time).getTime();

      if (prevVal === 0 || currVal === 0 || prevVal * currVal > 0 || Number.isNaN(prevTime) || Number.isNaN(currTime)) {
        withCrossings.push(curr);
        continue;
      }

      const ratio = prevVal / (prevVal - currVal);
      const zeroTimestamp = prevTime + (currTime - prevTime) * ratio;
      const zeroTime = Number.isFinite(zeroTimestamp)
        ? new Date(zeroTimestamp).toISOString()
        : prev.time;

      const zeroEquity = prev.equity + (curr.equity - prev.equity) * ratio;
      const zeroDrawdown = prev.drawdownPct + (curr.drawdownPct - prev.drawdownPct) * ratio;

      const zeroPoint: ChartPoint = {
        time: zeroTime,
        equity: zeroEquity,
        drawdownPct: zeroDrawdown,
        performancePct: 0,
        performancePositive: 0,
        performanceNegative: 0,
        performancePositiveLine: 0,
        performanceNegativeLine: 0,
        equityDelta: 0,
        equityPositive: 0,
        equityNegative: 0,
        equityPositiveLine: 0,
        equityNegativeLine: 0,
      };

      withCrossings.push(zeroPoint, curr);
    }

    return withCrossings;
  };

  const addStartCrossings = (points: ChartPoint[]): ChartPoint[] => {
    if (points.length < 2) return points;

    const withCrossings: ChartPoint[] = [points[0]];

    for (let i = 1; i < points.length; i++) {
      const prev = withCrossings[withCrossings.length - 1];
      const curr = points[i];
      const prevDelta = prev.equityDelta;
      const currDelta = curr.equityDelta;

      const prevTime = new Date(prev.time).getTime();
      const currTime = new Date(curr.time).getTime();

      const prevIsPositive = prevDelta >= 0;
      const currIsPositive = currDelta >= 0;

      // Si pas de croisement, ajouter simplement le point
      if (prevIsPositive === currIsPositive || Number.isNaN(prevTime) || Number.isNaN(currTime)) {
        withCrossings.push(curr);
        continue;
      }

      // Calculer le point de croisement au niveau de 0 (gain/perte = 0)
      const ratio = (0 - prevDelta) / (currDelta - prevDelta);
      const crossingTimestamp = prevTime + (currTime - prevTime) * ratio;
      const crossingTime = Number.isFinite(crossingTimestamp)
        ? new Date(crossingTimestamp).toISOString()
        : prev.time;

      const crossingDrawdown = prev.drawdownPct + (curr.drawdownPct - prev.drawdownPct) * ratio;
      const crossingEquity = prev.equity + (curr.equity - prev.equity) * ratio;
      const perf = ((crossingEquity / equityStart) - 1) * 100;

      const crossingPoint: ChartPoint = {
        time: crossingTime,
        equity: crossingEquity,
        drawdownPct: crossingDrawdown,
        performancePct: perf,
        performancePositive: 0,
        performanceNegative: 0,
        performancePositiveLine: 0,
        performanceNegativeLine: 0,
        equityDelta: 0,
        equityPositive: 0,
        equityNegative: 0,
        equityPositiveLine: 0,
        equityNegativeLine: 0,
      };

      withCrossings.push(crossingPoint, curr);
    }

    return withCrossings;
  };

  let data: ChartPoint[] = mode === "percentage" 
    ? addZeroCrossings(validSeries.map(toChartPoint))
    : addStartCrossings(validSeries.map(toChartPoint));

  if (data.length === 0) {
    const fallbackPoint = toChartPoint({
      time: new Date().toISOString(),
      equity: currentEquity || equityStart,
      drawdownPct: 0,
    });
    data = [fallbackPoint];
  } else if (data.length === 1) {
    data = [
      data[0],
      {
        ...data[0],
        time: new Date().toISOString(),
      },
    ];
  }

  // Ajouter des points fantômes pour les retraits après le dernier point de la série
  if (data.length > 0 && withdrawals.length > 0) {
    const lastPoint = data[data.length - 1];
    const lastTime = new Date(lastPoint.time).getTime();
    
    for (const w of withdrawals) {
      const rawTime = w.date ?? w.createdAt ?? "";
      const withdrawalTime = new Date(rawTime).getTime();
      if (Number.isFinite(withdrawalTime) && withdrawalTime > lastTime) {
        // Créer un point fantôme à la date du retrait avec la même équité que le dernier point
        const ghostPoint = toChartPoint({
          time: new Date(withdrawalTime).toISOString(),
          equity: lastPoint.equity,
          drawdownPct: lastPoint.drawdownPct,
        });
        data.push(ghostPoint);
      }
    }
  }

  const chartValueKey = mode === "percentage" ? "performancePct" : "equityDelta";
  const chartValues =
    mode === "percentage"
      ? data.map((d) => d.performancePct)
      : data.map((d) => d.equityDelta);

  // Utiliser la même logique de domaine pour les deux modes
  const { domain: yDomain, ticks } = getPercentageDomain(chartValues);

  // Position de la ligne de référence (0 dans les deux modes) dans le gradient (0 = haut, 1 = bas)
  const referenceValue = 0;
  const zeroOffset =
    yDomain[1] === yDomain[0]
      ? 0.5
      : Math.min(
          1,
          Math.max(0, (yDomain[1] - referenceValue) / (yDomain[1] - yDomain[0])),
        );
  const blendPct = 0.8; // bande fine autour de la ligne de référence pour le fondu
  const lowerStop = Math.max(0, zeroOffset * 100 - blendPct);
  const upperStop = Math.min(100, zeroOffset * 100 + blendPct);

  const currentPerformancePct =
    ((currentEquity || equityStart) / equityStart - 1) * 100;
  const currentEquityDelta = (currentEquity || equityStart) - equityStart;
  const currentValue =
    mode === "percentage" ? currentPerformancePct : currentEquityDelta;

  // Formatter pour l'axe Y
  const yAxisFormatter = (v: number) => {
    if (mode === "percentage") {
      return `${v.toFixed(1)}%`;
    }
    // En mode absolute, afficher le gain/perte en euros avec signe
    const sign = v >= 0 ? "+" : "";
    const formatted = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: account.currency ?? "EUR",
      maximumFractionDigits: 0,
    }).format(v);
    return `${sign}${formatted}`;
  };

  const renderTooltip = (props: any) => {
    const { active, payload, label } = props;
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload as ChartPoint | undefined;
    if (!point) return null;
    
    const value = mode === "percentage" ? point.performancePct : point.equityDelta;
    const equityTotal = point.equity;

    return (
      <div
        style={{
          backgroundColor: "white",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          padding: "8px 12px",
        }}
      >
        <div style={{ fontSize: 12, color: "#64748b" }}>
          {formatDate(String(label))}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
          {mode === "percentage" ? (
            formatPercentageValue(value)
          ) : (
            <>
              {value >= 0 ? "+" : ""}
              {new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: account.currency ?? "EUR",
                maximumFractionDigits: 2,
              }).format(value)}
            </>
          )}
        </div>
        {mode === "absolute" && (
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            Équité: {formatValue(equityTotal, "absolute", baseCapital, account.currency ?? "EUR")}
          </div>
        )}
      </div>
    );
  };

  const getChartValueForPoint = (point: ChartPoint) =>
    mode === "percentage" ? point.performancePct : point.equityDelta;

  // Préparer les marqueurs de retraits - version simplifiée et robuste
  const withdrawalMarkers: Array<{ time: string; y: number; label: string; amount: number; dataIndex?: number }> = [];
  
  if (withdrawals.length > 0 && data.length > 0) {
    console.log("Processing withdrawals:", withdrawals.length, withdrawals);
    console.log("Data points:", data.length, data.map(d => ({ time: d.time, equity: d.equity })));
    
    for (const w of withdrawals) {
      const rawTime = w.date ?? w.createdAt ?? "";
      if (!rawTime) {
        console.warn("Withdrawal missing date:", w);
        continue;
      }
      
      const withdrawalTime = new Date(rawTime).getTime();
      if (!Number.isFinite(withdrawalTime)) {
        console.warn("Withdrawal invalid date:", rawTime, w);
        continue;
      }

      // Chercher un point exact dans data (y compris points fantômes)
      let targetPoint: ChartPoint | null = null;
      let targetIndex = -1;
      
      for (let i = 0; i < data.length; i++) {
        const p = data[i];
        const pTime = new Date(p.time).getTime();
        if (Math.abs(pTime - withdrawalTime) < 60000) { // tolérance 1 minute
          targetPoint = p;
          targetIndex = i;
          break;
        }
      }

      // Si pas de point exact, utiliser le dernier point (le retrait est probablement après)
      if (!targetPoint) {
        targetPoint = data[data.length - 1];
        targetIndex = data.length - 1;
        // Si le retrait est vraiment après, utiliser la date du retrait mais l'équité du dernier point
        if (withdrawalTime > new Date(targetPoint.time).getTime()) {
          targetPoint = {
            ...targetPoint,
            time: new Date(withdrawalTime).toISOString(),
          };
        }
      }

      withdrawalMarkers.push({
        time: targetPoint.time,
        y: getChartValueForPoint(targetPoint),
        label: w.type ?? "Retrait",
        amount: w.amount,
        dataIndex: targetIndex >= 0 ? targetIndex : undefined,
      });
    }
    
    console.log("Withdrawal markers created:", withdrawalMarkers.length, withdrawalMarkers);
  }

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="absolute left-6 top-6 z-10">
        <div className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white shadow-sm">
          {formatValue(currentBalance, "absolute", baseCapital, account.currency ?? "EUR")} Solde
        </div>
      </div>

      <div className="h-[500px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <defs>
              {mode === "percentage" ? (
                <linearGradient id="zeroBand" x1="0" x2="0" y1="0" y2="1">
                  <stop offset={`${Math.max(0, lowerStop - 0.2)}%`} stopColor={teal} />
                  <stop offset={`${lowerStop}%`} stopColor="#94a3b8" />
                  <stop offset={`${upperStop}%`} stopColor="#94a3b8" />
                  <stop offset={`${Math.min(100, upperStop + 0.2)}%`} stopColor={red} />
                </linearGradient>
              ) : (
                <linearGradient id="startBand" x1="0" x2="0" y1="0" y2="1">
                  <stop offset={`${Math.max(0, lowerStop - 0.2)}%`} stopColor={teal} />
                  <stop offset={`${lowerStop}%`} stopColor="#94a3b8" />
                  <stop offset={`${upperStop}%`} stopColor="#94a3b8" />
                  <stop offset={`${Math.min(100, upperStop + 0.2)}%`} stopColor={red} />
                </linearGradient>
              )}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="time"
              tickFormatter={formatDate}
              tickLine={false}
              stroke="#64748b"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tickFormatter={yAxisFormatter}
              tickLine={false}
              stroke="#64748b"
              fontSize={12}
              domain={yDomain}
              ticks={ticks}
            />
            <Tooltip content={renderTooltip} />

            {/* Ligne de base à 0 (0% en mode percentage, 0 € en mode absolute) */}
            <ReferenceLine
              y={0}
              stroke="#0f172a"
              strokeWidth={2.5}
              label={{
                value: mode === "percentage" ? "0%" : "0 €",
                position: "right",
                fill: "#0f172a",
                fontSize: 12,
                fontWeight: 700,
              }}
            />

            <ReferenceLine
              y={currentValue}
              stroke={blue}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />

            {mode === "percentage" ? (
              <>
                <Area
                  type="monotone"
                  dataKey="performancePositive"
                  fill={tealLight}
                  fillOpacity={0.35}
                  stroke="none"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="performanceNegative"
                  fill={redLight}
                  fillOpacity={0.35}
                  stroke="none"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="performancePositiveLine"
                  stroke={teal}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 6, fill: teal }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="performanceNegativeLine"
                  stroke={red}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={false}
                  connectNulls={false}
                />
              </>
            ) : (
              <>
                <Area
                  type="monotone"
                  dataKey="equityPositive"
                  fill={tealLight}
                  fillOpacity={0.35}
                  stroke="none"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="equityNegative"
                  fill={redLight}
                  fillOpacity={0.35}
                  stroke="none"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="equityPositiveLine"
                  stroke={teal}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 6, fill: teal }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="equityNegativeLine"
                  stroke={red}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={false}
                  connectNulls={false}
                />
              </>
            )}

            {withdrawalMarkers.map((m, idx) => {
              // Utiliser l'index si disponible, sinon la date string
              const xValue = m.dataIndex !== undefined ? m.dataIndex : m.time;
              
              return (
                <ReferenceDot
                  key={`wd-${idx}-${m.time}`}
                  x={xValue}
                  y={m.y}
                  r={6}
                  stroke={blue}
                  fill={blue}
                  strokeWidth={2}
                  ifOverflow="extendDomain"
                  label={{
                    value: `Retrait: ${
                      mode === "percentage"
                        ? `${Math.abs((m.amount / equityStart) * 100).toFixed(2)}%`
                        : formatValue(
                            Math.abs(m.amount),
                            "absolute",
                            baseCapital,
                            account.currency ?? "EUR",
                            false,
                          )
                    }`,
                    position: "top",
                    fill: blue,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


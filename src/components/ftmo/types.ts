export type Account = {
  id: string;
  name: string;
  accountType?: string;
  size?: number;
  platform?: string;
  startDate?: string;
  endDate?: string;
  currency?: string;
  balance?: number;
  equity?: number;
  unrealizedPnl?: number;
  drawdownPct?: number;
  profitFactor?: number;
  avgRrr?: number;
};

export type KpiSummary = {
  balance: number;
  equity: number;
  unrealizedPnl: number;
  drawdownPct: number;
  profitFactor: number;
  avgRrr: number;
  totalProfit: number;
  averageLot: number;
  averageDurationSeconds: number;
};

export type EquityPoint = {
  time: string;
  equity: number;
  drawdownPct: number;
};

export type TradeRow = {
  ticket: string;
  accountId: string;
  openTime: string;
  closeTime?: string;
  type: "buy" | "sell";
  volume: number;
  symbol: string;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  closePrice?: number;
  swap?: number;
  commission?: number;
  profit?: number;
  pips?: number;
  durationSeconds?: number;
  status: "open" | "closed";
  currentPnl?: number;
  mfe?: number;
  mae?: number;
  notes?: string;
  screenshotUrl?: string;
  tags?: string[];
};

export type StatisticsKpi = {
  equity: number;
  balance: number;
  successRate: number;
  averageProfit: number;
  averageLoss: number;
  totalTrades: number;
  totalLots: number;
  sharpeRatio: number;
  avgRrr: number;
  expectedValue: number;
  profitFactor: number;
};

export type DailySummary = {
  date: string;
  trades: number;
  lots: number;
  result: number;
};

export type MonthlyStats = {
  totalPnl: number;
  tradingDays: number;
};

export type DailyPnlEntry = {
  date: string;
  pnl: number;
  trades: number;
};

export type AnalyticsData = {
  byHour: Array<{ hour: number; pnl: number }>;
  byType: { buy: number; sell: number };
  byVolume: Array<{ volume: number; pnl: number }>;
  bySymbol: Array<{ symbol: string; pnl: number }>;
};

export type Withdrawal = {
  id?: string;
  accountId: string;
  userId: string;
  date: string; // ISO string
  amount: number;
  type?: string;
  note?: string;
  createdAt?: string;
};


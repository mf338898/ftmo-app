import { z } from "zod";

export type AccountType = "challenge" | "evaluation" | "funded" | "other";
export type PlatformType = "mt4" | "mt5" | "ctrader" | "other";

export type AccountDoc = {
  id?: string;
  userId: string;
  name: string;
  accountType?: AccountType;
  size?: number;
  platform?: PlatformType | string;
  startDate?: string;
  endDate?: string;
  currency?: string;
  initialBalance?: number;
  createdAt?: Date;
  updatedAt?: Date;
  balance?: number;
  equity?: number;
  unrealizedPnl?: number;
  drawdownPct?: number;
  profitFactor?: number;
  avgRrr?: number;
  totalProfit?: number;
  averageLot?: number;
  averageDurationSeconds?: number;
  lastImportId?: string;
};

export type TradeStatus = "open" | "closed";

export type TradeDoc = {
  ticket: string;
  userId: string;
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
  status: TradeStatus;
  currentPnl?: number;
  mfe?: number;
  mae?: number;
  notes?: string;
  screenshotUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ImportDoc = {
  id?: string;
  userId: string;
  accountId: string;
  filename: string;
  rows: number;
  inserted: number;
  skipped: number;
  mapping: FtmoMapping;
  createdAt?: Date;
};

export type FtmoMapping = {
  ticket: string;
  openTime: string;
  type: string;
  volume: string;
  symbol: string;
  entryPrice: string;
  stopLoss: string;
  takeProfit: string;
  closeTime: string;
  closePrice: string;
  swap: string;
  commission: string;
  profit: string;
  pips: string;
  durationSeconds: string;
};

export const defaultFtmoMapping: FtmoMapping = {
  ticket: "Ticket",
  openTime: "Ouvrir",
  type: "Type",
  volume: "Volume",
  symbol: "Symbole",
  entryPrice: "Prix",
  stopLoss: "SL",
  takeProfit: "TP",
  closeTime: "Fermeture",
  closePrice: "Prix_1", // PapaParse renomme la deuxième colonne "Prix" en "Prix_1"
  swap: "Swap",
  commission: "Commissions",
  profit: "Profit",
  pips: "Pips",
  durationSeconds: "Durée",
};

export const importSchema = z.object({
  accountId: z.string().min(1),
  userId: z.string().min(1).default("demo-user"),
  mapping: z
    .preprocess(
      (val) => {
        if (!val) return defaultFtmoMapping;
        if (typeof val === "string") return JSON.parse(val);
        return val;
      },
      z.object({
        ticket: z.string(),
        openTime: z.string(),
        type: z.string(),
        volume: z.string(),
        symbol: z.string(),
        entryPrice: z.string(),
        stopLoss: z.string(),
        takeProfit: z.string(),
        closeTime: z.string(),
        closePrice: z.string(),
        swap: z.string(),
        commission: z.string(),
        profit: z.string(),
        pips: z.string(),
        durationSeconds: z.string(),
      }),
    )
    .default(defaultFtmoMapping),
  accountName: z.string().default("FTMO Account"),
  accountType: z.enum(["challenge", "evaluation", "funded", "other"]).optional(),
  size: z.number().optional(),
  platform: z.string().optional(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  currency: z.string().optional(),
  initialBalance: z.number().optional(),
});

// Retraits (cash out / récompense)
export type WithdrawalDoc = {
  id?: string;
  userId: string;
  accountId: string;
  date: string; // ISO string
  amount: number;
  type?: string; // ex: "Récompense 80%"
  note?: string;
  createdAt?: Date;
};


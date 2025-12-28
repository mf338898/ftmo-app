import Papa from "papaparse";
import { read, utils } from "xlsx";
import {
  defaultFtmoMapping,
  type FtmoMapping,
  type TradeDoc,
} from "./firestoreSchemas";

type RawRow = Record<string, unknown>;

const parseNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const num = Number(
    typeof value === "string" ? value.replace(",", ".").trim() : value,
  );
  return Number.isFinite(num) ? num : undefined;
};

const parseDateValue = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const parsed = new Date(excelEpoch.getTime() + value * 86400000);
    return parsed.toISOString();
  }
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
};

const normalizeType = (value: unknown): "buy" | "sell" => {
  const v = String(value || "").toLowerCase();
  return v.startsWith("s") ? "sell" : "buy";
};

export function mapRowToTrade(
  row: RawRow,
  mapping: FtmoMapping,
  accountId: string,
  userId: string,
): TradeDoc | null {
  const ticketRaw = row[mapping.ticket];
  if (!ticketRaw) return null;

  const openTime = parseDateValue(row[mapping.openTime]);
  const closeTime = parseDateValue(row[mapping.closeTime]);

  const entryPrice = parseNumber(row[mapping.entryPrice]);
  const closePrice = parseNumber(row[mapping.closePrice]);
  const stopLoss = parseNumber(row[mapping.stopLoss]);
  const takeProfit = parseNumber(row[mapping.takeProfit]);
  const swap = parseNumber(row[mapping.swap]) ?? 0;
  const commission = parseNumber(row[mapping.commission]) ?? 0;
  const profit = parseNumber(row[mapping.profit]);
  const pips = parseNumber(row[mapping.pips]);
  const volume = parseNumber(row[mapping.volume]) ?? 0;
  const durationSeconds = parseNumber(row[mapping.durationSeconds]);

  const status =
    closeTime && closePrice !== undefined && profit !== undefined
      ? "closed"
      : "open";

  const derivedDuration =
    !durationSeconds && openTime && closeTime
      ? Math.max(
          0,
          Math.round(
            (new Date(closeTime).getTime() - new Date(openTime).getTime()) /
              1000,
          ),
        )
      : durationSeconds;

  return {
    ticket: String(ticketRaw),
    userId,
    accountId,
    openTime: openTime ?? new Date().toISOString(),
    closeTime: closeTime ?? undefined,
    type: normalizeType(row[mapping.type]),
    volume,
    symbol: String(row[mapping.symbol] ?? ""),
    entryPrice: entryPrice ?? 0,
    stopLoss,
    takeProfit,
    closePrice,
    swap,
    commission,
    profit,
    pips,
    durationSeconds: derivedDuration,
    status,
    currentPnl: status === "open" ? profit ?? 0 : undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function parseCsv(buffer: Buffer): RawRow[] {
  const text = buffer.toString("utf-8");
  const parsed = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    // PapaParse renomme automatiquement les colonnes dupliquées
    // "Prix" devient "Prix" et "Prix_1" (ou "Prix.1")
  });
  return parsed.data.filter(Boolean);
}

function parseXlsx(buffer: Buffer): RawRow[] {
  const workbook = read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return utils.sheet_to_json<RawRow>(sheet, { defval: null });
}

export async function parseFtmoFile(
  buffer: Buffer,
  mimeType: string,
  mapping: FtmoMapping = defaultFtmoMapping,
  accountId: string,
  userId: string,
): Promise<TradeDoc[]> {
  const rawRows =
    mimeType?.includes("spreadsheet") || mimeType?.includes("excel")
      ? parseXlsx(buffer)
      : parseCsv(buffer);

  return rawRows
    .map((row) => mapRowToTrade(row, mapping, accountId, userId))
    .filter(Boolean) as TradeDoc[];
}


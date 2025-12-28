import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import type { TradeDoc } from "@/lib/firestoreSchemas";
import type { AnalyticsData } from "@/components/ftmo/types";

export const runtime = "nodejs";

// Calculer le profit net (profit brut + swap + commission)
// Note: swap et commission sont déjà en négatif dans les fichiers FTMO
// Donc on les additionne (soustraire un négatif = additionner)
function getNetProfit(trade: TradeDoc): number {
  const profit = trade.profit ?? 0;
  const swap = trade.swap ?? 0;
  const commission = trade.commission ?? 0;
  // Le profit net = profit brut + swap + commission
  // (swap et commission sont déjà négatifs, donc on les additionne)
  return profit + swap + commission;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const userId = searchParams.get("userId") ?? "demo-user";

  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  try {
    const tradesSnap = await db
      .collection("trades")
      .where("accountId", "==", accountId)
      .where("userId", "==", userId)
      .where("status", "==", "closed")
      .get();

    const trades = tradesSnap.docs.map(
      (doc) => ({ ticket: doc.id, ...doc.data() } as TradeDoc),
    );

    const byHour = new Map<number, number>();
    const byType = { buy: 0, sell: 0 };
    const byVolume = new Map<number, number>();
    const bySymbol = new Map<string, number>();

    trades.forEach((trade) => {
      const netProfit = getNetProfit(trade);
      const openTime = new Date(trade.openTime);
      const hour = openTime.getHours();

      byHour.set(hour, (byHour.get(hour) ?? 0) + netProfit);
      byType[trade.type] += netProfit;
      byVolume.set(trade.volume, (byVolume.get(trade.volume) ?? 0) + netProfit);
      bySymbol.set(trade.symbol, (bySymbol.get(trade.symbol) ?? 0) + netProfit);
    });

    const analytics: AnalyticsData = {
      byHour: Array.from(byHour.entries())
        .map(([hour, pnl]) => ({ hour, pnl }))
        .sort((a, b) => a.hour - b.hour),
      byType,
      byVolume: Array.from(byVolume.entries())
        .map(([volume, pnl]) => ({ volume, pnl }))
        .sort((a, b) => a.volume - b.volume),
      bySymbol: Array.from(bySymbol.entries())
        .map(([symbol, pnl]) => ({ symbol, pnl }))
        .sort((a, b) => b.pnl - a.pnl),
    };

    return NextResponse.json({ analytics });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Firebase admin credentials")) {
      return NextResponse.json(
        {
          analytics: {
            byHour: [],
            byType: { buy: 0, sell: 0 },
            byVolume: [],
            bySymbol: [],
          },
        },
        { status: 200 },
      );
    }
    return NextResponse.json(
      {
        analytics: {
          byHour: [],
          byType: { buy: 0, sell: 0 },
          byVolume: [],
          bySymbol: [],
        },
      },
      { status: 200 },
    );
  }
}


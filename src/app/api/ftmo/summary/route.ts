import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import type { AccountDoc, TradeDoc } from "@/lib/firestoreSchemas";
import { computeAggregates } from "@/lib/stats";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const periodStart = searchParams.get("start");
  const periodEnd = searchParams.get("end");

  if (!accountId) {
    return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
  }

  try {
    const accountSnap = await db.collection("accounts").doc(accountId).get();
    const account = accountSnap.exists
      ? ({ id: accountSnap.id, ...accountSnap.data() } as AccountDoc)
      : null;

    const tradesQuery = db
      .collection("trades")
      .where("accountId", "==", accountId)
      .where("userId", "==", "demo-user");

    const tradesSnap = await tradesQuery.get();
    let trades = tradesSnap.docs.map(
      (doc) => ({ ticket: doc.id, ...doc.data() }) as TradeDoc,
    );

    if (periodStart) {
      const startDate = new Date(periodStart).getTime();
      trades = trades.filter(
        (t) =>
          new Date(t.openTime ?? t.closeTime ?? "").getTime() >= startDate,
      );
    }
    if (periodEnd) {
      const endDate = new Date(periodEnd).getTime();
      trades = trades.filter(
        (t) => new Date(t.openTime ?? t.closeTime ?? "").getTime() <= endDate,
      );
    }

    // Toujours utiliser 160000 comme capital de départ (standard FTMO)
    // Ignorer initialBalance du compte s'il est différent pour garantir la cohérence
    const initialBalance = 160000;
    
    const aggregates = computeAggregates(
      trades,
      initialBalance,
    );

    return NextResponse.json({
      account,
      kpis: aggregates.kpis,
      equitySeries: aggregates.equitySeries,
      counts: {
        open: trades.filter((t) => t.status === "open").length,
        closed: trades.filter((t) => t.status === "closed").length,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Firebase admin credentials")) {
      return NextResponse.json({
        account: null,
        kpis: null,
        equitySeries: [],
        counts: { open: 0, closed: 0 },
      }, { status: 200 });
    }
    return NextResponse.json({
      account: null,
      kpis: null,
      equitySeries: [],
      counts: { open: 0, closed: 0 },
    }, { status: 200 });
  }
}


import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import type { AccountDoc, TradeDoc, WithdrawalDoc } from "@/lib/firestoreSchemas";
import { computeAggregates } from "@/lib/stats";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const userId = searchParams.get("userId") ?? "demo-user";
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
      .where("userId", "==", userId);

    const tradesSnap = await tradesQuery.get();
    let trades = tradesSnap.docs.map(
      (doc) => ({ ticket: doc.id, ...doc.data() }) as TradeDoc,
    );

    // Récupérer les retraits de ce compte
    const withdrawalsSnap = await db
      .collection("withdrawals")
      .where("accountId", "==", accountId)
      .where("userId", "==", userId)
      .get();
    const withdrawals = withdrawalsSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as WithdrawalDoc,
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
    
    const aggregates = computeAggregates(trades, [], initialBalance);

    return NextResponse.json({
      account,
      kpis: aggregates.kpis,
      equitySeries: aggregates.equitySeries,
      withdrawals,
      counts: {
        open: trades.filter((t) => t.status === "open").length,
        closed: trades.filter((t) => t.status === "closed").length,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Firebase admin credentials")) {
      return NextResponse.json(
        {
          account: null,
          kpis: null,
          equitySeries: [],
          withdrawals: [],
          counts: { open: 0, closed: 0 },
        },
        { status: 200 },
      );
    }
    return NextResponse.json(
      {
        account: null,
        kpis: null,
        equitySeries: [],
        withdrawals: [],
        counts: { open: 0, closed: 0 },
      },
      { status: 200 },
    );
  }
}


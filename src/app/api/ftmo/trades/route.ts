import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import type { TradeDoc } from "@/lib/firestoreSchemas";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const status = searchParams.get("status");
  const symbolFilter = searchParams.get("symbol");
  const resultFilter = searchParams.get("result"); // winner | loser
  const sortBy = searchParams.get("sortBy") ?? "openTime";
  const sortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!accountId) {
    return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
  }

  try {
    let query = db.collection("trades").where("accountId", "==", accountId);
    if (status === "open" || status === "closed") {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.get();
    let trades = snapshot.docs.map(
      (doc) => ({ ticket: doc.id, ...doc.data() }) as TradeDoc,
    );

    if (symbolFilter) {
      trades = trades.filter(
        (t) => t.symbol.toLowerCase() === symbolFilter.toLowerCase(),
      );
    }
    if (resultFilter === "winner") {
      trades = trades.filter((t) => (t.profit ?? 0) > 0);
    } else if (resultFilter === "loser") {
      trades = trades.filter((t) => (t.profit ?? 0) < 0);
    }

    if (start) {
      const startDate = new Date(start).getTime();
      trades = trades.filter(
        (t) =>
          new Date(t.openTime ?? t.closeTime ?? "").getTime() >= startDate,
      );
    }
    if (end) {
      const endDate = new Date(end).getTime();
      trades = trades.filter(
        (t) => new Date(t.openTime ?? t.closeTime ?? "").getTime() <= endDate,
      );
    }

    trades = trades.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortBy];
      const bVal = (b as Record<string, unknown>)[sortBy];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aDate = new Date(String(aVal)).getTime();
      const bDate = new Date(String(bVal)).getTime();
      return sortDir === "asc" ? aDate - bDate : bDate - aDate;
    });

    return NextResponse.json({ trades });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Firebase admin credentials")) {
      return NextResponse.json({ trades: [] }, { status: 200 });
    }
    return NextResponse.json({ trades: [] }, { status: 200 });
  }
}


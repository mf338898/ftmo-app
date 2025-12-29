import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import type { TradeDoc } from "@/lib/firestoreSchemas";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const userId = searchParams.get("userId") ?? "demo-user";
  const status = searchParams.get("status");
  const symbolFilter = searchParams.get("symbol");
  const resultFilter = searchParams.get("result"); // winner | loser
  const sortBy = searchParams.get("sortBy") ?? "openTime";
  const sortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const tagsParam = searchParams.getAll("tag");
  const tagsCsv = searchParams.get("tags");
  const tagFilters = [
    ...tagsParam,
    ...(tagsCsv ? tagsCsv.split(",").map((t) => t.trim()).filter(Boolean) : []),
  ];

  if (!accountId) {
    return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
  }

  try {
    let query = db
      .collection("trades")
      .where("accountId", "==", accountId)
      .where("userId", "==", userId);
    if (status === "open" || status === "closed") {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.get();
    let trades = snapshot.docs.map(
      (doc) => ({ ticket: doc.id, ...doc.data() }) as TradeDoc,
    );

    // Utiliser closeTime pour le filtrage lorsqu'on cible des trades clôturés
    const getTime = (t: TradeDoc): number => {
      if (status === "closed" && t.closeTime) {
        return new Date(t.closeTime).getTime();
      }
      return new Date(t.closeTime ?? t.openTime ?? "").getTime();
    };

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
    if (tagFilters.length) {
      trades = trades.filter((t) =>
        tagFilters.every((tag) => t.tags?.includes(tag)),
      );
    }

    if (start) {
      const startDate = new Date(start).getTime();
      trades = trades.filter((t) => getTime(t) >= startDate);
    }
    if (end) {
      const endDate = new Date(end).getTime();
      trades = trades.filter((t) => getTime(t) <= endDate);
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

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { ticket, accountId, userId = "demo-user", tags } = body ?? {};

    if (!ticket || !accountId || !Array.isArray(tags)) {
      return NextResponse.json(
        { error: "ticket, accountId et tags sont requis" },
        { status: 400 },
      );
    }

    const uniqueTags = Array.from(
      new Set(
        tags
          .map((t) => String(t).trim())
          .filter((t) => t.length > 0)
          .slice(0, 20),
      ),
    );

    const ref = db.collection("trades").doc(ticket);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Trade introuvable" }, { status: 404 });
    }
    const data = snap.data() as TradeDoc;
    if (data.accountId !== accountId || data.userId !== userId) {
      return NextResponse.json({ error: "Accès refusé pour ce trade" }, { status: 403 });
    }

    await ref.update({
      tags: uniqueTags,
      updatedAt: new Date(),
    });

    return NextResponse.json({ ok: true, tags: uniqueTags });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur interne" },
      { status: 500 },
    );
  }
}


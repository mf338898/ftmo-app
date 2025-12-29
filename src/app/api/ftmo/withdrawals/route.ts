import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import type { WithdrawalDoc } from "@/lib/firestoreSchemas";

export const runtime = "nodejs";

const collectionName = "withdrawals";

// GET list
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const userId = searchParams.get("userId") ?? "demo-user";
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  try {
    let query = db
      .collection(collectionName)
      .where("accountId", "==", accountId)
      .where("userId", "==", userId);

    // Nota: si Firestore n'a pas d'index pour orderBy sur date, on filtre côté app
    const snap = await query.get();
    let withdrawals = snap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as WithdrawalDoc,
    );

    if (start) {
      const startTs = new Date(start).getTime();
      withdrawals = withdrawals.filter(
        (w) => new Date(w.date).getTime() >= startTs,
      );
    }
    if (end) {
      const endTs = new Date(end).getTime();
      withdrawals = withdrawals.filter((w) => new Date(w.date).getTime() <= endTs);
    }

    withdrawals.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return NextResponse.json({ withdrawals });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Firebase admin credentials")) {
      return NextResponse.json({ withdrawals: [] }, { status: 200 });
    }
    return NextResponse.json({ withdrawals: [] }, { status: 200 });
  }
}

// POST create
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const accountId = body.accountId as string | undefined;
    const userId = (body.userId as string | undefined) ?? "demo-user";
    const date = body.date as string | undefined;
    const amount = Number(body.amount);
    const type = (body.type as string | undefined) ?? "Retrait";
    const note = body.note as string | undefined;

    if (!accountId || !date || Number.isNaN(amount)) {
      return NextResponse.json(
        { error: "accountId, date et amount sont requis" },
        { status: 400 },
      );
    }

    // Helper pour nettoyer les valeurs undefined (Firestore ne les accepte pas)
    const cleanUndefined = <T extends Record<string, unknown>>(obj: T): T => {
      const cleaned: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = value;
        }
      }
      return cleaned as T;
    };

    const doc: WithdrawalDoc = {
      accountId,
      userId,
      // Conserver la date telle que saisie (format YYYY-MM-DD) pour éviter les décalages de fuseau
      date,
      amount,
      type,
      note,
      createdAt: new Date(),
    };

    // Nettoyer les valeurs undefined avant d'envoyer à Firestore
    const cleanedDoc = cleanUndefined(doc);
    const ref = await db.collection(collectionName).add(cleanedDoc);
    return NextResponse.json({ id: ref.id, ...doc }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Firebase admin credentials")) {
      return NextResponse.json(
        { error: "Firebase admin credentials manquantes" },
        { status: 200 },
      );
    }
    return NextResponse.json(
        { error: error instanceof Error ? error.message : "Internal error" },
        { status: 200 },
      );
  }
}

// DELETE one
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const accountId = searchParams.get("accountId");
  const userId = searchParams.get("userId") ?? "demo-user";

  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  try {
    const ref = db.collection(collectionName).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    const data = snap.data() as WithdrawalDoc | undefined;
    if (data && accountId && data.accountId !== accountId) {
      return NextResponse.json({ error: "Compte non correspondant" }, { status: 403 });
    }
    if (data && data.userId && data.userId !== userId) {
      return NextResponse.json({ error: "Utilisateur non correspondant" }, { status: 403 });
    }
    await ref.delete();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Firebase admin credentials")) {
      return NextResponse.json({ error: "Firebase non configuré" }, { status: 200 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 200 },
    );
  }
}


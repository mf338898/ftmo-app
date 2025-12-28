import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  const payload = await req.json();
  const { ticket, accountId, notes, screenshotUrl, mfe, mae } = payload ?? {};

  if (!ticket || !accountId) {
    return NextResponse.json(
      { error: "ticket and accountId are required" },
      { status: 400 },
    );
  }

  const ref = db.collection("trades").doc(ticket);
  await ref.set(
    {
      accountId,
      notes,
      screenshotUrl,
      mfe,
      mae,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return NextResponse.json({ ok: true });
}


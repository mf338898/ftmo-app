import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import {
  importSchema,
  type AccountDoc,
  type TradeDoc,
} from "@/lib/firestoreSchemas";
import { parseFtmoFile } from "@/lib/importParser";
import { computeAggregates, mergeAccountSnapshot } from "@/lib/stats";

export const runtime = "nodejs";
export const maxDuration = 60;

const chunkArray = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Missing file. Provide a CSV or XLSX export from FTMO." },
        { status: 400 },
      );
    }

  const parsedForm = importSchema.safeParse({
    accountId: formData.get("accountId"),
    userId: formData.get("userId") ?? "demo-user",
    mapping: formData.get("mapping"),
    accountName: formData.get("accountName") ?? "FTMO Account",
    accountType: formData.get("accountType"),
    size: formData.get("size")
      ? Number(formData.get("size"))
      : undefined,
    platform: formData.get("platform"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    currency: formData.get("currency"),
    initialBalance: formData.get("initialBalance")
      ? Number(formData.get("initialBalance"))
      : undefined,
  });

  if (!parsedForm.success) {
    return NextResponse.json(
      { error: parsedForm.error.flatten() },
      { status: 400 },
    );
  }

  const {
    accountId,
    userId,
    mapping,
    accountName,
    accountType,
    size,
    platform,
    startDate,
    endDate,
    currency,
    initialBalance,
  } = parsedForm.data;

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsedTrades = await parseFtmoFile(
    buffer,
    file.type,
    mapping,
    accountId,
    userId,
  );

  const tradesCollection = db.collection("trades");
  const docRefs = parsedTrades.map((t) => tradesCollection.doc(t.ticket));
  const existing = await db.getAll(...docRefs);
  const existingIds = new Set(existing.filter((d) => d.exists).map((d) => d.id));

  const newTrades = parsedTrades.filter(
    (trade) => !existingIds.has(trade.ticket),
  );

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

  const batches = chunkArray(newTrades, 400);
  for (const batchItems of batches) {
    const batch = db.batch();
    batchItems.forEach((trade) => {
      const ref = tradesCollection.doc(trade.ticket);
      const payload: TradeDoc = {
        ...cleanUndefined(trade),
        createdAt: FieldValue.serverTimestamp() as unknown as Date,
        updatedAt: FieldValue.serverTimestamp() as unknown as Date,
      };
      batch.set(ref, payload, { merge: true });
    });
    await batch.commit();
  }

  const accountRef = db.collection("accounts").doc(accountId);
  const accountSnap = await accountRef.get();
  const baseAccount: AccountDoc = accountSnap.exists
    ? ({
        id: accountSnap.id,
        ...accountSnap.data(),
      } as AccountDoc)
    : {
        id: accountId,
        userId,
        name: accountName,
      };

  const accountTradesSnap = await tradesCollection
    .where("accountId", "==", accountId)
    .get();
  const accountTrades = accountTradesSnap.docs.map((doc) => {
    return { ticket: doc.id, ...doc.data() } as TradeDoc;
  });

  // Toujours utiliser 160000 comme capital de départ (standard FTMO)
  // Ignorer initialBalance du compte ou du formulaire pour garantir la cohérence
  const finalInitialBalance = 160000;
  
  const aggregates = computeAggregates(
    accountTrades,
    finalInitialBalance,
  );

  const snapshot = mergeAccountSnapshot(
    {
      ...baseAccount,
      userId,
      name: accountName,
      accountType,
      size,
      platform,
      startDate,
      endDate,
      currency,
      initialBalance: 160000, // Toujours 160000 pour la cohérence
      lastImportId: undefined,
    },
    aggregates,
  );

  const importRef = db.collection("imports").doc();
  await accountRef.set(cleanUndefined(snapshot), { merge: true });
  await importRef.set({
    userId,
    accountId,
    filename: file.name,
    rows: parsedTrades.length,
    inserted: newTrades.length,
    skipped: parsedTrades.length - newTrades.length,
    mapping,
    createdAt: FieldValue.serverTimestamp(),
  });

    return NextResponse.json({
      ok: true,
      accountId,
      inserted: newTrades.length,
      skipped: parsedTrades.length - newTrades.length,
      aggregates,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Firebase admin credentials")) {
      return NextResponse.json(
        {
          error:
            "Firebase n'est pas configuré ou le serveur n'a pas été redémarré. Vérifiez que le fichier .env.local existe et REDÉMARREZ le serveur (Ctrl+C puis 'npm run dev').",
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'import. Vérifiez que Firebase est configuré et que le serveur a été redémarré.",
      },
      { status: 500 },
    );
  }
}


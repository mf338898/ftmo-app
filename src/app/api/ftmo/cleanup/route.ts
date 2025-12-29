import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import type { AccountDoc } from "@/lib/firestoreSchemas";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const userId = "demo-user";

    // Récupérer tous les comptes pour cet utilisateur
    const accountsSnap = await db
      .collection("accounts")
      .where("userId", "==", userId)
      .get();

    if (accountsSnap.empty) {
      return NextResponse.json({ message: "Aucun compte trouvé" }, { status: 200 });
    }

    const accounts = accountsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as AccountDoc[];

    // Trouver le compte à garder (celui avec le plus de trades ou le plus récent)
    let accountToKeep: AccountDoc = accounts[0];
    let maxTrades = 0;

    for (const account of accounts) {
      const tradesSnap = await db
        .collection("trades")
        .where("accountId", "==", account.id)
        .where("userId", "==", userId)
        .get();
      const tradeCount = tradesSnap.size;

      if (tradeCount > maxTrades) {
        maxTrades = tradeCount;
        accountToKeep = account;
      }
    }

    // Supprimer tous les autres comptes et leurs données associées
    const accountsToDelete = accounts.filter((acc) => acc.id !== accountToKeep.id);
    const deletePromises: Promise<unknown>[] = [];

    for (const account of accountsToDelete) {
      // Supprimer les trades associés
      const tradesSnap = await db
        .collection("trades")
        .where("accountId", "==", account.id)
        .where("userId", "==", userId)
        .get();
      
      tradesSnap.docs.forEach((doc) => {
        deletePromises.push(doc.ref.delete());
      });

      // Supprimer les retraits associés
      const withdrawalsSnap = await db
        .collection("withdrawals")
        .where("accountId", "==", account.id)
        .where("userId", "==", userId)
        .get();
      
      withdrawalsSnap.docs.forEach((doc) => {
        deletePromises.push(doc.ref.delete());
      });

      // Supprimer les imports associés
      const importsSnap = await db
        .collection("imports")
        .where("accountId", "==", account.id)
        .where("userId", "==", userId)
        .get();
      
      importsSnap.docs.forEach((doc) => {
        deletePromises.push(doc.ref.delete());
      });

      // Supprimer le compte lui-même
      if (account.id) {
        deletePromises.push(db.collection("accounts").doc(account.id).delete());
      }
    }

    await Promise.all(deletePromises);

    return NextResponse.json({
      message: `Nettoyage terminé. Compte conservé: ${accountToKeep.id ?? "N/A"} (${accountToKeep.name ?? "Sans nom"})`,
      keptAccount: {
        id: accountToKeep.id ?? "",
        name: accountToKeep.name ?? "Sans nom",
        tradesCount: maxTrades,
      },
      deletedAccounts: accountsToDelete.length,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    if (error instanceof Error && error.message.includes("Firebase admin credentials")) {
      return NextResponse.json(
        { error: "Firebase non configuré. Vérifiez les variables d'environnement." },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors du nettoyage" },
      { status: 500 },
    );
  }
}


import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import type { AccountDoc } from "@/lib/firestoreSchemas";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? "demo-user";

  try {
    // Récupérer tous les comptes sans orderBy pour éviter les erreurs d'index
    const snapshot = await db
      .collection("accounts")
      .where("userId", "==", userId)
      .get();

    const accounts: AccountDoc[] = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...(doc.data() as AccountDoc),
      }))
      // Trier manuellement par updatedAt si disponible, sinon par id
      .sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime; // Descendant
      });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    if (error instanceof Error && error.message.includes("Firebase admin credentials")) {
      return NextResponse.json({ accounts: [] }, { status: 200 });
    }
    return NextResponse.json({ accounts: [] }, { status: 200 });
  }
}


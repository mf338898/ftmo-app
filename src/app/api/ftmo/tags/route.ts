import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

type TagDoc = {
  accountId: string;
  userId: string;
  name: string;
  slug: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const toSlug = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 64);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const userId = searchParams.get("userId") ?? "demo-user";

  if (!accountId) {
    return NextResponse.json({ error: "accountId requis" }, { status: 400 });
  }

  try {
    const snap = await db
      .collection("tags")
      .where("accountId", "==", accountId)
      .where("userId", "==", userId)
      .get();

    const tags = snap.docs
      .map((doc) => (doc.data() as TagDoc).name)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "fr"));

    return NextResponse.json({ tags });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Firebase admin credentials")) {
      return NextResponse.json({ tags: [] }, { status: 200 });
    }
    return NextResponse.json({ tags: [] }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const accountId = body?.accountId as string | undefined;
    const userId = (body?.userId as string | undefined) ?? "demo-user";
    const name = String(body?.name ?? "").trim();

    if (!accountId || !name) {
      return NextResponse.json(
        { error: "accountId et name sont requis" },
        { status: 400 },
      );
    }

    const slug = toSlug(name);
    if (!slug) {
      return NextResponse.json({ error: "Tag invalide" }, { status: 400 });
    }

    const docId = `${userId}_${accountId}_${slug}`;
    const ref = db.collection("tags").doc(docId);
    await ref.set(
      {
        accountId,
        userId,
        name,
        slug,
        updatedAt: new Date(),
        createdAt: new Date(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true, tag: name });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur interne" },
      { status: 500 },
    );
  }
}


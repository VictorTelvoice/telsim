import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const activeLines = await prisma.slot.count({
      where: { 
        assignedTo: userId,
        status: 'ocupado'
      }
    });

    return NextResponse.json({ activeLines });
  } catch (error) {
    console.error("[API Stats] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

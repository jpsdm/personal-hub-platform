import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/user-session";
import type { Params } from "next/dist/server/request/params";
import { NextResponse } from "next/server";

export async function PUT(request: Request, context: { params: Params }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = (await context.params) as { id: string };
    const body = await request.json();
    const { name } = body;

    const existingTag = await prisma.tag.findFirst({
      where: { id: params.id, userId },
    });

    if (!existingTag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    const tag = await prisma.tag.update({
      where: { id: params.id },
      data: { name },
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error("Error updating tag:", error);
    return NextResponse.json(
      { error: "Failed to update tag" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: { params: Params }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = (await context.params) as { id: string };

    const existingTag = await prisma.tag.findFirst({
      where: { id: params.id, userId },
    });

    if (!existingTag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    await prisma.transactionOnTags.deleteMany({
      where: { tagId: params.id },
    });

    await prisma.tag.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 }
    );
  }
}

import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { TIMEZONES } from "@/lib/timezone";
import { NextResponse } from "next/server";

// Get user by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarColor: true,
        password: true,
        timezone: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...user,
      hasPassword: !!user.password,
      password: undefined,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// Update user by ID
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, avatarColor, password, timezone } = body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validate timezone if provided
    if (timezone && !TIMEZONES.some((tz) => tz.value === timezone)) {
      return NextResponse.json(
        { error: "Invalid timezone" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: {
      name?: string;
      avatarColor?: string;
      password?: string | null;
      timezone?: string;
    } = {};

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Name is required" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (avatarColor !== undefined) {
      updateData.avatarColor = avatarColor;
    }

    if (password !== undefined) {
      // If password is empty string or null, remove password
      if (password === "" || password === null) {
        updateData.password = null;
      } else {
        updateData.password = hashPassword(password);
      }
    }

    if (timezone !== undefined) {
      updateData.timezone = timezone;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        avatarColor: true,
        password: true,
        timezone: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ...updatedUser,
      hasPassword: !!updatedUser.password,
      password: undefined,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// Delete user by ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete user and all related data (cascading delete should handle this based on schema)
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}

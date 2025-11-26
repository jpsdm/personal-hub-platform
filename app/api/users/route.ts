import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { NextResponse } from "next/server";

// Get all users
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatarColor: true,
        password: true, // Only to check if password exists, not the actual password
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Map to hide actual password, just show if it exists
    const usersWithPasswordFlag = users.map((user) => ({
      ...user,
      hasPassword: !!user.password,
      password: undefined,
    }));

    return NextResponse.json(usersWithPasswordFlag);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// Create new user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, avatarColor } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }

    // Hash password if provided
    const hashedPassword = password ? hashPassword(password) : null;

    // Criar usuário e conta padrão em uma transação
    const user = await prisma.$transaction(async (tx) => {
      // Criar usuário
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          avatarColor: avatarColor || "#3B82F6",
        },
      });

      // Criar conta padrão para o usuário
      await tx.account.create({
        data: {
          userId: newUser.id,
          name: "Conta",
          isDefault: true,
          initialBalance: 0,
        },
      });

      return newUser;
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarColor: user.avatarColor,
      hasPassword: !!user.password,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

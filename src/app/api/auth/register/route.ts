import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { username, email, password } = body;

    // Validate required fields
    if (!username || !email || !password) {
      return Response.json(
        {
          success: false,
          message: "Username, email, and password are required.",
        },
        { status: 400 }
      );
    }

    // Basic validation
    if (typeof username !== "string" || username.trim().length < 3) {
      return Response.json(
        {
          success: false,
          message: "Username must be at least 3 characters long.",
        },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || !email.includes("@")) {
      return Response.json(
        {
          success: false,
          message: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 8) {
      return Response.json(
        {
          success: false,
          message: "Password must be at least 8 characters long.",
        },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Check whether username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanUsername },
          { email: cleanEmail },
        ],
      },
    });

    if (existingUser) {
      return Response.json(
        {
          success: false,
          message: "Username or email is already registered.",
        },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user and wallet together
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: cleanUsername,
          email: cleanEmail,
          passwordHash,
        },
      });

      const wallet = await tx.wallet.create({
        data: {
          userId: newUser.id,
          balance: 10000,
        },
      });

      await tx.transaction.create({
        data: {
          userId: newUser.id,
          type: "INITIAL_BALANCE",
          amount: 10000,
          balanceBefore: 0,
          balanceAfter: 10000,
          description: "Initial virtual balance",
        },
      });

      return {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        balance: wallet.balance.toString(),
      };
    });

    return Response.json(
      {
        success: true,
        message: "Account created successfully!",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    return Response.json(
      {
        success: false,
        message: "Could not create account.",
      },
      { status: 500 }
    );
  }
}
"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function registerUser(data: { name: string; email: string; pass: string }) {
  try {
    const { name, email, pass } = data;

    if (!name || !email || !pass) {
      throw new Error("Missing required fields");
    }

    if (pass.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(pass, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        // Optional default fields from Telsim model
        role: "USER"
      },
    });

    return { success: true, userId: newUser.id };
  } catch (error: any) {
    console.error("Register error:", error);
    return { success: false, error: error.message || "Failed to register user" };
  }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function DELETE() {
  cookies().set("autovault_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return NextResponse.json({ success: true });
}

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const accessCodeHash = process.env.ACCESS_CODE_HASH;
    const secretHash = process.env.SECRET_PASSWORD_HASH;

    if (!accessCodeHash && !secretHash) {
      console.error("No auth hashes configured.");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    let sessionValue: string | null = null;

    if (accessCodeHash && (await bcrypt.compare(password, accessCodeHash))) {
      sessionValue = "gallery";
    }

    if (secretHash && (await bcrypt.compare(password, secretHash))) {
      sessionValue = "full";
    }

    if (sessionValue) {
      cookies().set("autovault_session", sessionValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return NextResponse.json({ success: true, level: sessionValue });
    } else {
      return NextResponse.json({ error: "Invalid access code" }, { status: 401 });
    }
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

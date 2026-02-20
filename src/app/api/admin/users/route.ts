import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { authDb } from "@/lib/auth/db";
import {
  canManageUserPermissions,
  getSessionUser,
  getUserGrade,
  getUserRole,
} from "@/lib/auth/permissions";
import { user as userTable } from "@/lib/auth/schema";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  const sessionUser = getSessionUser(session);

  if (!sessionUser || !canManageUserPermissions(sessionUser)) {
    return NextResponse.json(
      { error: "No tienes permisos para administrar usuarios." },
      { status: 403 },
    );
  }

  const users = authDb
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      role: userTable.role,
      grade: userTable.grade,
      createdAt: userTable.createdAt,
      updatedAt: userTable.updatedAt,
    })
    .from(userTable)
    .orderBy(desc(userTable.createdAt))
    .all();

  return NextResponse.json({
    users: users.map((row) => ({
      ...row,
      role: getUserRole(row),
      grade: getUserGrade(row),
    })),
  });
}

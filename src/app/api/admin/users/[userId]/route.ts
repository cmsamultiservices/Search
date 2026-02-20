import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { authDb } from "@/lib/auth/db";
import {
  USER_ROLES,
  canManageUserPermissions,
  getSessionUser,
  getUserGrade,
  getUserRole,
} from "@/lib/auth/permissions";
import { user as userTable } from "@/lib/auth/schema";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  const sessionUser = getSessionUser(session);

  if (!sessionUser || !canManageUserPermissions(sessionUser)) {
    return NextResponse.json(
      { error: "No tienes permisos para actualizar usuarios." },
      { status: 403 },
    );
  }

  const { userId } = await context.params;

  if (!userId) {
    return NextResponse.json({ error: "ID de usuario inválido." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    role?: string;
    grade?: number | string;
  } | null;

  const role = typeof body?.role === "string" ? body.role.trim().toLowerCase() : "";
  if (!(USER_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
  }

  const parsedGrade =
    typeof body?.grade === "number" ? body.grade : Number(body?.grade ?? Number.NaN);

  if (!Number.isFinite(parsedGrade)) {
    return NextResponse.json({ error: "Grado inválido." }, { status: 400 });
  }

  const grade = Math.max(0, Math.min(100, Math.round(parsedGrade)));

  authDb
    .update(userTable)
    .set({
      role,
      grade,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, userId))
    .run();

  const updated = authDb
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
    .where(eq(userTable.id, userId))
    .get();

  if (!updated) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      ...updated,
      role: getUserRole(updated),
      grade: getUserGrade(updated),
    },
  });
}

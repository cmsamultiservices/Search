"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { authClient } from "@/lib/auth/client";
import {
  ADMIN_ROLE,
  USER_ROLES,
  getUserGrade,
  getUserRole,
} from "@/lib/auth/permissions";

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  grade: number | null;
  createdAt: string | number | Date;
  updatedAt: string | number | Date;
};

type EditableState = {
  role: string;
  grade: number;
};

function coerceGrade(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 1;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function coerceRole(value: unknown) {
  if (typeof value !== "string") return "user";
  const normalized = value.trim().toLowerCase();
  if ((USER_ROLES as readonly string[]).includes(normalized)) {
    return normalized;
  }
  return "user";
}

export function AdminUsersManager() {
  const { toast } = useToast();
  const { data: sessionData } = authClient.useSession();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, EditableState>>({});
  const managerRole = getUserRole(sessionData?.user);
  const managerGrade = getUserGrade(sessionData?.user);
  const isManagerAdmin = managerRole === ADMIN_ROLE;
  const maxAssignableGrade = isManagerAdmin ? 100 : Math.max(0, managerGrade - 1);
  const roleOptions = isManagerAdmin
    ? USER_ROLES
    : USER_ROLES.filter((role) => role !== ADMIN_ROLE);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => coerceGrade(b.grade) - coerceGrade(a.grade)),
    [users],
  );

  const canEditRow = (row: ManagedUser) => {
    const targetRole = coerceRole(row.role);
    const targetGrade = coerceGrade(row.grade);

    if (targetRole === ADMIN_ROLE) return false;
    if (isManagerAdmin) return true;
    return targetGrade < managerGrade;
  };

  const refreshUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "No se pudo cargar usuarios.");
      }

      const data = (await response.json()) as { users?: ManagedUser[] };
      const rows = Array.isArray(data.users) ? data.users : [];
      setUsers(rows);
      setDrafts(
        Object.fromEntries(
          rows.map((row) => [
            row.id,
            {
              role: row.role || "user",
              grade: coerceGrade(row.grade),
            },
          ]),
        ),
      );
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "No se pudo cargar usuarios.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const updateDraft = (userId: string, next: Partial<EditableState>) => {
    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        role: prev[userId]?.role || "user",
        grade: coerceGrade(prev[userId]?.grade),
        ...next,
      },
    }));
  };

  const saveUser = async (userId: string) => {
    const draft = drafts[userId];
    if (!draft) return;
    const currentUser = users.find((row) => row.id === userId);
    if (!currentUser) return;
    if (!canEditRow(currentUser)) {
      toast({
        title: "Accion bloqueada",
        description: "No tienes jerarquia para modificar este usuario.",
        variant: "destructive",
      });
      return;
    }

    const nextRole = coerceRole(draft.role);
    if (!isManagerAdmin && nextRole === ADMIN_ROLE) {
      toast({
        title: "Accion bloqueada",
        description: "No puedes asignar rol admin.",
        variant: "destructive",
      });
      return;
    }

    const nextGrade = coerceGrade(draft.grade);
    if (!isManagerAdmin && nextGrade >= managerGrade) {
      toast({
        title: "Accion bloqueada",
        description: "No puedes asignar un grado igual o superior al tuyo.",
        variant: "destructive",
      });
      return;
    }

    setSavingUserId(userId);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: nextRole,
          grade: nextGrade,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "No se pudo guardar el usuario.");
      }

      const data = (await response.json()) as { user?: ManagedUser };
      if (data.user) {
        setUsers((prev) =>
          prev.map((row) => (row.id === data.user!.id ? data.user! : row)),
        );
      }

      toast({
        title: "Permisos actualizados",
        description: "Se guardaron los cambios del usuario.",
      });
    } catch (error) {
      console.error("Failed to update user permissions:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "No se pudo guardar el usuario.",
        variant: "destructive",
      });
    } finally {
      setSavingUserId(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando usuarios...
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Gestion de Usuarios</h2>
        <p className="text-sm text-muted-foreground">
          Jerarquia activa: solo puedes editar usuarios por debajo de tu nivel.
        </p>
      </div>

      <div className="space-y-3">
        {sortedUsers.map((row) => {
          const draft = drafts[row.id] || {
            role: row.role || "user",
            grade: coerceGrade(row.grade),
          };
          const isSaving = savingUserId === row.id;
          const canEdit = canEditRow(row);

          return (
            <div
              key={row.id}
              className="grid grid-cols-1 gap-3 rounded-lg border p-3 md:grid-cols-[2fr_1fr_1fr_auto]"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{row.name || "Sin nombre"}</p>
                <p className="truncate text-xs text-muted-foreground">{row.email}</p>
              </div>

              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Rol</span>
                <select
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={draft.role}
                  onChange={(event) => updateDraft(row.id, { role: event.target.value })}
                  disabled={isSaving || !canEdit}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Grado (0-100)</span>
                <Input
                  type="number"
                  min={0}
                  max={maxAssignableGrade}
                  step={1}
                  value={draft.grade}
                  onChange={(event) =>
                    updateDraft(row.id, {
                      grade: Math.min(coerceGrade(event.target.value), maxAssignableGrade),
                    })
                  }
                  disabled={isSaving || !canEdit}
                />
              </label>

              <div className="flex items-end justify-end">
                <Button onClick={() => saveUser(row.id)} disabled={isSaving || !canEdit}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando
                    </>
                  ) : (
                    "Guardar"
                  )}
                </Button>
              </div>

              {!canEdit ? (
                <p className="text-xs text-muted-foreground md:col-span-4">
                  Bloqueado por jerarquia o proteccion de admin.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

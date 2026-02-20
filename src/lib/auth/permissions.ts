export const USER_ROLES = ["admin", "manager", "editor", "viewer", "user"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const DEFAULT_USER_ROLE: UserRole = "user";
export const DEFAULT_USER_GRADE = 1;
export const ADMIN_ROLE: UserRole = "admin";
export const ADMIN_GRADE = 100;
export const GLOBAL_SETTINGS_MIN_GRADE = 70;
export const USER_MANAGEMENT_MIN_GRADE = 90;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

export function getSessionUser(session: unknown): UnknownRecord | null {
  if (!isRecord(session)) return null;
  const user = session.user;
  if (!isRecord(user)) return null;
  return user;
}

export function getUserRole(user: unknown): UserRole {
  if (!isRecord(user)) return DEFAULT_USER_ROLE;
  const value = user.role;
  if (typeof value !== "string") return DEFAULT_USER_ROLE;

  const normalized = value.toLowerCase().trim();
  if ((USER_ROLES as readonly string[]).includes(normalized)) {
    return normalized as UserRole;
  }

  return DEFAULT_USER_ROLE;
}

export function getUserGrade(user: unknown): number {
  if (!isRecord(user)) return DEFAULT_USER_GRADE;
  const raw = user.grade;
  const parsed = typeof raw === "number" ? raw : Number(raw);

  if (!Number.isFinite(parsed)) return DEFAULT_USER_GRADE;
  const clamped = Math.max(0, Math.min(100, Math.round(parsed)));
  return clamped;
}

export function canAccessGlobalSettings(user: unknown): boolean {
  const role = getUserRole(user);
  const grade = getUserGrade(user);
  return role === ADMIN_ROLE || grade >= GLOBAL_SETTINGS_MIN_GRADE;
}

export function canManageUserPermissions(user: unknown): boolean {
  const role = getUserRole(user);
  const grade = getUserGrade(user);
  return role === ADMIN_ROLE || grade >= USER_MANAGEMENT_MIN_GRADE;
}

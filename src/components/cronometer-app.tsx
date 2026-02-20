"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type TimerSession = {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  cost: number;
};

type StoredTimerState = {
  elapsedTime: number;
  isRunning: boolean;
  startTime: string | null;
  sessionStartTime: string | null;
};

type TimerUser = {
  username: string;
  password: string;
  settings: {
    pricePerHour: number;
  };
  currentTimerState: StoredTimerState;
  history: TimerSession[];
};

type AppData = {
  users: TimerUser[];
  currentUser: string | null;
};

type ViewMode = "login" | "register" | "timer" | "config" | "history";

const STORAGE_KEY = "costTimerAppData";
const DEFAULT_PRICE_PER_HOUR = 100;

const DEFAULT_TIMER_STATE: StoredTimerState = {
  elapsedTime: 0,
  isRunning: false,
  startTime: null,
  sessionStartTime: null,
};

const DEFAULT_APP_DATA: AppData = {
  users: [],
  currentUser: null,
};

function asFiniteNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function asTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStoredTimerState(
  elapsedTime: number,
  isRunning: boolean,
  startMs: number | null,
  sessionStartMs: number | null
): StoredTimerState {
  return {
    elapsedTime: Math.max(0, Math.floor(elapsedTime)),
    isRunning,
    startTime: startMs !== null ? new Date(startMs).toISOString() : null,
    sessionStartTime: sessionStartMs !== null ? new Date(sessionStartMs).toISOString() : null,
  };
}

function normalizeAppData(raw: unknown): AppData {
  if (!raw || typeof raw !== "object") return DEFAULT_APP_DATA;
  const maybe = raw as Partial<AppData>;
  const users = Array.isArray(maybe.users) ? maybe.users : [];

  const normalizedUsers: TimerUser[] = users
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const user = entry as Partial<TimerUser>;
      if (typeof user.username !== "string" || !user.username.trim()) return null;

      const rawTimer = user.currentTimerState && typeof user.currentTimerState === "object"
        ? user.currentTimerState
        : DEFAULT_TIMER_STATE;

      const normalizedTimer: StoredTimerState = {
        elapsedTime: Math.max(0, Math.floor(asFiniteNumber(rawTimer.elapsedTime, 0))),
        isRunning: Boolean(rawTimer.isRunning) && Boolean(rawTimer.startTime),
        startTime: typeof rawTimer.startTime === "string" ? rawTimer.startTime : null,
        sessionStartTime: typeof rawTimer.sessionStartTime === "string" ? rawTimer.sessionStartTime : null,
      };

      const rawHistory = Array.isArray(user.history) ? user.history : [];
      const history: TimerSession[] = rawHistory
        .map((session) => {
          if (!session || typeof session !== "object") return null;
          const s = session as Partial<TimerSession>;
          const start = typeof s.startTime === "string" ? s.startTime : null;
          const end = typeof s.endTime === "string" ? s.endTime : null;
          if (!start || !end) return null;
          return {
            id: typeof s.id === "string" && s.id.trim() ? s.id : `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            startTime: start,
            endTime: end,
            duration: Math.max(0, asFiniteNumber(s.duration, 0)),
            cost: Math.max(0, asFiniteNumber(s.cost, 0)),
          };
        })
        .filter((value): value is TimerSession => value !== null);

      return {
        username: user.username.trim(),
        password: typeof user.password === "string" ? user.password : "",
        settings: {
          pricePerHour: Math.max(0, asFiniteNumber(user.settings?.pricePerHour, DEFAULT_PRICE_PER_HOUR)),
        },
        currentTimerState: normalizedTimer,
        history,
      };
    })
    .filter((value): value is TimerUser => value !== null);

  const currentUser =
    typeof maybe.currentUser === "string" && maybe.currentUser.trim()
      ? maybe.currentUser.trim()
      : null;

  return {
    users: normalizedUsers,
    currentUser:
      currentUser && normalizedUsers.some((user) => user.username === currentUser)
        ? currentUser
        : null,
  };
}

function formatTimer(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return "Fecha invalida";
  return new Date(parsed).toLocaleString("es-MX");
}

export function CronometerApp() {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<ViewMode>("login");
  const [appData, setAppData] = useState<AppData>(DEFAULT_APP_DATA);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [timerStartMs, setTimerStartMs] = useState<number | null>(null);
  const [sessionStartMs, setSessionStartMs] = useState<number | null>(null);

  const [pricePerHourInput, setPricePerHourInput] = useState(String(DEFAULT_PRICE_PER_HOUR));
  const [configError, setConfigError] = useState("");

  const currentUser = useMemo(() => {
    if (!appData.currentUser) return null;
    return appData.users.find((user) => user.username === appData.currentUser) ?? null;
  }, [appData.currentUser, appData.users]);

  const history = useMemo(() => {
    if (!currentUser) return [];
    return [...currentUser.history].sort((a, b) => {
      const aTs = Date.parse(a.startTime);
      const bTs = Date.parse(b.startTime);
      return (Number.isFinite(bTs) ? bTs : 0) - (Number.isFinite(aTs) ? aTs : 0);
    });
  }, [currentUser]);

  const pricePerHour = currentUser?.settings.pricePerHour ?? DEFAULT_PRICE_PER_HOUR;
  const currentCost = (elapsedTime / 3600000) * pricePerHour;

  const updateAppData = useCallback((updater: (prev: AppData) => AppData) => {
    setAppData((prev) => {
      const next = updater(prev);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const persistTimerState = useCallback(
    (nextElapsed: number, nextRunning: boolean, nextStartMs: number | null, nextSessionStartMs: number | null) => {
      if (!appData.currentUser) return;
      const activeUsername = appData.currentUser;
      const nextTimerState = toStoredTimerState(nextElapsed, nextRunning, nextStartMs, nextSessionStartMs);

      updateAppData((prev) => ({
        ...prev,
        users: prev.users.map((user) =>
          user.username === activeUsername ? { ...user, currentTimerState: nextTimerState } : user
        ),
      }));
    },
    [appData.currentUser, updateAppData]
  );

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setAppData(normalizeAppData(parsed));
        }
      }
    } catch {
      setAppData(DEFAULT_APP_DATA);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;

    if (!appData.currentUser) {
      if (view !== "register") {
        setView("login");
      }
      setElapsedTime(0);
      setIsRunning(false);
      setTimerStartMs(null);
      setSessionStartMs(null);
      setPricePerHourInput(String(DEFAULT_PRICE_PER_HOUR));
      return;
    }

    const active = appData.users.find((user) => user.username === appData.currentUser);
    if (!active) {
      updateAppData((prev) => ({ ...prev, currentUser: null }));
      return;
    }

    const nextElapsed = Math.max(0, active.currentTimerState.elapsedTime);
    const parsedStart = asTimestamp(active.currentTimerState.startTime);
    const parsedSession = asTimestamp(active.currentTimerState.sessionStartTime);

    setElapsedTime(nextElapsed);
    setTimerStartMs(parsedStart);
    setSessionStartMs(parsedSession);
    setIsRunning(Boolean(active.currentTimerState.isRunning && parsedStart !== null));
    setPricePerHourInput(String(active.settings.pricePerHour));
    setView("timer");
    setLoginError("");
    setRegisterError("");
    setRegisterSuccess("");
  }, [ready, appData.currentUser, updateAppData, view]);

  useEffect(() => {
    if (!isRunning || timerStartMs === null) return;

    const tick = () => {
      setElapsedTime(Math.max(0, Date.now() - timerStartMs));
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [isRunning, timerStartMs]);

  const handleLogin = (event: FormEvent) => {
    event.preventDefault();
    const username = loginUsername.trim();
    const password = loginPassword;
    const user = appData.users.find((entry) => entry.username === username);

    if (!user || user.password !== password) {
      setLoginError("Usuario o contrasena incorrectos.");
      return;
    }

    updateAppData((prev) => ({ ...prev, currentUser: username }));
    setLoginUsername("");
    setLoginPassword("");
    setLoginError("");
  };

  const handleRegister = (event: FormEvent) => {
    event.preventDefault();
    const username = registerUsername.trim();
    const password = registerPassword;

    if (!username || !password) {
      setRegisterError("Debes completar usuario y contrasena.");
      setRegisterSuccess("");
      return;
    }

    if (appData.users.some((user) => user.username === username)) {
      setRegisterError("El usuario ya existe.");
      setRegisterSuccess("");
      return;
    }

    const newUser: TimerUser = {
      username,
      password,
      settings: { pricePerHour: DEFAULT_PRICE_PER_HOUR },
      currentTimerState: DEFAULT_TIMER_STATE,
      history: [],
    };

    updateAppData((prev) => ({ ...prev, users: [...prev.users, newUser] }));
    setRegisterUsername("");
    setRegisterPassword("");
    setRegisterError("");
    setRegisterSuccess("Usuario creado. Ahora puedes iniciar sesion.");
  };

  const handleStart = () => {
    if (!currentUser || isRunning) return;
    const now = Date.now();
    const safeElapsed = Math.max(0, elapsedTime);
    const nextSessionStart = safeElapsed === 0 ? now : sessionStartMs ?? now - safeElapsed;
    const nextStart = now - safeElapsed;

    setSessionStartMs(nextSessionStart);
    setTimerStartMs(nextStart);
    setIsRunning(true);
    persistTimerState(safeElapsed, true, nextStart, nextSessionStart);
  };

  const handlePause = () => {
    if (!isRunning) return;
    const nextElapsed = timerStartMs !== null ? Math.max(0, Date.now() - timerStartMs) : elapsedTime;

    setElapsedTime(nextElapsed);
    setIsRunning(false);
    setTimerStartMs(null);
    persistTimerState(nextElapsed, false, null, sessionStartMs);
  };

  const handleStop = () => {
    if (!currentUser) return;
    const now = Date.now();
    const finalElapsed = isRunning && timerStartMs !== null ? Math.max(0, Date.now() - timerStartMs) : elapsedTime;
    const finalCost = (finalElapsed / 3600000) * pricePerHour;
    const safeStart = sessionStartMs ?? now - finalElapsed;
    const nextTimerState = DEFAULT_TIMER_STATE;

    updateAppData((prev) => {
      const activeUsername = prev.currentUser;
      if (!activeUsername) return prev;

      return {
        ...prev,
        users: prev.users.map((user) => {
          if (user.username !== activeUsername) return user;
          const nextHistory =
            finalElapsed > 0
              ? [
                  {
                    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
                    startTime: new Date(safeStart).toISOString(),
                    endTime: new Date(now).toISOString(),
                    duration: finalElapsed,
                    cost: finalCost,
                  },
                  ...user.history,
                ]
              : user.history;

          return {
            ...user,
            history: nextHistory,
            currentTimerState: nextTimerState,
          };
        }),
      };
    });

    setElapsedTime(0);
    setIsRunning(false);
    setTimerStartMs(null);
    setSessionStartMs(null);
  };

  const handleSaveConfig = (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;

    const parsed = Number(pricePerHourInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setConfigError("Ingresa un precio valido, mayor o igual a 0.");
      return;
    }

    updateAppData((prev) => ({
      ...prev,
      users: prev.users.map((user) =>
        user.username === currentUser.username
          ? { ...user, settings: { ...user.settings, pricePerHour: parsed } }
          : user
      ),
    }));

    setConfigError("");
    setView("timer");
  };

  const handleLogout = () => {
    const nextTimerState = DEFAULT_TIMER_STATE;

    updateAppData((prev) => {
      const activeUsername = prev.currentUser;
      if (!activeUsername) return prev;

      return {
        currentUser: null,
        users: prev.users.map((user) =>
          user.username === activeUsername ? { ...user, currentTimerState: nextTimerState } : user
        ),
      };
    });

    setElapsedTime(0);
    setIsRunning(false);
    setTimerStartMs(null);
    setSessionStartMs(null);
    setView("login");
    setLoginError("");
    setRegisterError("");
    setRegisterSuccess("");
    setConfigError("");
  };

  if (!ready) {
    return (
      <section className="container mx-auto px-4 py-8 md:px-6">
        <div className="mx-auto max-w-2xl rounded-2xl border bg-card/70 p-8 backdrop-blur-sm">
          <p className="text-sm text-muted-foreground">Cargando cronometro...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-8 md:px-6">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border bg-card/70 p-6 shadow-xl backdrop-blur-sm md:p-8">
        <h1 className="text-2xl font-bold md:text-3xl">Cronometro con costo</h1>

        {!currentUser && view === "login" && (
          <form className="mt-6 space-y-4" onSubmit={handleLogin}>
            <h2 className="text-lg font-semibold">Iniciar sesion</h2>
            <input
              type="text"
              placeholder="Usuario"
              value={loginUsername}
              onChange={(event) => setLoginUsername(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
            />
            <input
              type="password"
              placeholder="Contrasena"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
            />
            {loginError && <p className="text-sm text-destructive">{loginError}</p>}
            <button type="submit" className="w-full rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setView("register");
                setLoginError("");
              }}
              className="w-full rounded-md border px-4 py-2 font-semibold hover:bg-accent/20"
            >
              Registrarse
            </button>
          </form>
        )}

        {!currentUser && view === "register" && (
          <form className="mt-6 space-y-4" onSubmit={handleRegister}>
            <h2 className="text-lg font-semibold">Registrar usuario</h2>
            <input
              type="text"
              placeholder="Nuevo usuario"
              value={registerUsername}
              onChange={(event) => setRegisterUsername(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
            />
            <input
              type="password"
              placeholder="Nueva contrasena"
              value={registerPassword}
              onChange={(event) => setRegisterPassword(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
            />
            {registerError && <p className="text-sm text-destructive">{registerError}</p>}
            {registerSuccess && <p className="text-sm text-emerald-600">{registerSuccess}</p>}
            <button type="submit" className="w-full rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">
              Crear usuario
            </button>
            <button
              type="button"
              onClick={() => {
                setView("login");
                setRegisterError("");
              }}
              className="w-full rounded-md border px-4 py-2 font-semibold hover:bg-accent/20"
            >
              Volver a iniciar sesion
            </button>
          </form>
        )}

        {currentUser && view === "timer" && (
          <div className="mt-6 space-y-5">
            <p className="text-sm text-muted-foreground">
              Usuario activo: <span className="font-semibold text-foreground">{currentUser.username}</span>
            </p>
            <div className="rounded-xl border bg-background/80 p-5 text-center">
              <p className="text-5xl font-mono font-bold tracking-wide">{formatTimer(elapsedTime)}</p>
              <p className="mt-3 text-xl">
                Costo: <span className="font-semibold">${currentCost.toFixed(2)}</span>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleStart}
                disabled={isRunning}
                className="rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Inicio
              </button>
              <button
                type="button"
                onClick={handlePause}
                disabled={!isRunning}
                className="rounded-md bg-amber-500 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Pausa
              </button>
              <button
                type="button"
                onClick={handleStop}
                disabled={elapsedTime === 0}
                className="rounded-md bg-red-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Detener
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setPricePerHourInput(String(pricePerHour));
                  setConfigError("");
                  setView("config");
                }}
                className="rounded-md border px-4 py-2 font-semibold hover:bg-accent/20"
              >
                Configuracion
              </button>
              <button
                type="button"
                onClick={() => setView("history")}
                className="rounded-md border px-4 py-2 font-semibold hover:bg-accent/20"
              >
                Ver historial
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md border px-4 py-2 font-semibold hover:bg-accent/20"
              >
                Cerrar sesion
              </button>
            </div>
          </div>
        )}

        {currentUser && view === "config" && (
          <form className="mt-6 space-y-4" onSubmit={handleSaveConfig}>
            <h2 className="text-lg font-semibold">Configuracion</h2>
            <label className="block text-sm font-medium">Precio por hora (pesos)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={pricePerHourInput}
              onChange={(event) => setPricePerHourInput(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
            />
            {configError && <p className="text-sm text-destructive">{configError}</p>}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="submit" className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">
                Guardar configuracion
              </button>
              <button
                type="button"
                onClick={() => setView("timer")}
                className="rounded-md border px-4 py-2 font-semibold hover:bg-accent/20"
              >
                Volver al cronometro
              </button>
            </div>
          </form>
        )}

        {currentUser && view === "history" && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold">Historial de sesiones</h2>
            <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border bg-background/80 p-3">
              {history.length === 0 && <p className="text-sm text-muted-foreground">No hay historial disponible.</p>}
              {history.map((session) => (
                <div key={session.id} className="rounded-md border bg-card p-3">
                  <p className="text-sm">
                    <span className="font-semibold">Inicio:</span> {formatDate(session.startTime)}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Fin:</span> {formatDate(session.endTime)}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Duracion:</span> {formatTimer(session.duration)}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Costo:</span> ${session.cost.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setView("timer")}
              className="w-full rounded-md border px-4 py-2 font-semibold hover:bg-accent/20"
            >
              Volver al cronometro
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

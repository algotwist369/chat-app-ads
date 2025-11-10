import React from "react";
import apiClient from "../lib/apiClient";

const AuthContext = React.createContext(undefined);

const AUTH_STORAGE_KEY = "ad-chat-auth-state";

const defaultAuthState = {
  sessions: {
    manager: null,
    customer: null,
  },
  activeRole: null,
};

const sanitizeSession = (session) => {
  if (!session || typeof session !== "object") return null;
  const { user = null, token = null, userType = null } = session;
  if (!token || !userType) return null;
  return { user, token, userType };
};

const readStoredState = () => {
  if (typeof window === "undefined") {
    return defaultAuthState;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return defaultAuthState;
    }

    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return defaultAuthState;
    }

    const storedSessions = parsed.sessions ?? {};
    const sessions = {
      manager: sanitizeSession(storedSessions.manager),
      customer: sanitizeSession(storedSessions.customer),
    };

    const activeRole =
      parsed.activeRole && sessions[parsed.activeRole]
        ? parsed.activeRole
        : sessions.manager
          ? "manager"
          : sessions.customer
            ? "customer"
            : null;

    return {
      sessions,
      activeRole,
    };
  } catch (error) {
    console.warn("Unable to read auth state from storage", error);
    return defaultAuthState;
  }
};

const persistState = (state) => {
  if (typeof window === "undefined") return;

  const hasAnySession =
    Boolean(state?.sessions?.manager) || Boolean(state?.sessions?.customer);

  if (!hasAnySession) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  try {
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        sessions: {
          manager: sanitizeSession(state.sessions?.manager),
          customer: sanitizeSession(state.sessions?.customer),
        },
        activeRole: state.activeRole ?? null,
      }),
    );
  } catch (error) {
    console.warn("Unable to persist auth state", error);
  }
};

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = React.useState(readStoredState);

  const updateState = React.useCallback((updater) => {
    setAuthState((previous) => {
      const next = typeof updater === "function" ? updater(previous) : updater;
      persistState(next);
      return next;
    });
  }, []);

  const login = React.useCallback((payload) => {
    if (!payload || !payload.userType) {
      throw new Error("AuthProvider.login requires a payload with a userType");
    }

    const role = payload.userType;
    const token =
      payload.token ??
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `session-${Date.now()}`);

    updateState((previous) => {
      const sessions = {
        ...previous.sessions,
        [role]: {
          user: payload.user ?? null,
          token,
          userType: role,
        },
      };

      return {
        sessions,
        activeRole: role,
      };
    });
  }, [updateState]);

  const logout = React.useCallback(
    (role) => {
      updateState((previous) => {
        const targetRole = role ?? previous.activeRole;
        if (!targetRole) {
          return defaultAuthState;
        }

        const sessions = {
          ...previous.sessions,
          [targetRole]: null,
        };

        const nextActive =
          previous.activeRole === targetRole
            ? sessions.manager
              ? "manager"
              : sessions.customer
                ? "customer"
                : null
            : previous.activeRole;

        const nextState = {
          sessions,
          activeRole: nextActive,
        };

        if (!sessions.manager && !sessions.customer) {
          return defaultAuthState;
        }

        return nextState;
      });
    },
    [updateState],
  );

  const switchRole = React.useCallback(
    (role) => {
      updateState((previous) => {
        if (!role || !previous.sessions[role]) {
          return previous;
        }
        const next = {
          ...previous,
          activeRole: role,
        };
        return next;
      });
    },
    [updateState],
  );

  const updateSession = React.useCallback(
    (role, updater) => {
      if (!role) return;
      updateState((previous) => {
        const current = previous.sessions?.[role];
        if (!current) return previous;

        const draft = typeof updater === "function" ? updater({ ...current }) : updater;
        const next = {
          ...current,
          ...draft,
          userType: role,
          token: draft?.token ?? current.token,
        };

        const sanitizedNext = sanitizeSession(next);
        const nextSessions = {
          ...previous.sessions,
          [role]: sanitizedNext,
        };

        const nextActive =
          previous.activeRole && nextSessions[previous.activeRole]
            ? previous.activeRole
            : sanitizedNext
              ? role
              : nextSessions.manager
                ? "manager"
                : nextSessions.customer
                  ? "customer"
                  : null;

        return {
          sessions: nextSessions,
          activeRole: nextActive,
        };
      });
    },
    [updateState],
  );

  const getSession = React.useCallback(
    (role) => {
      if (!role) return null;
      return authState.sessions?.[role] ?? null;
    },
    [authState.sessions],
  );

  const hasSession = React.useCallback(
    (role) => {
      if (role) {
        return Boolean(authState.sessions?.[role]);
      }
      return Boolean(authState.sessions?.manager || authState.sessions?.customer);
    },
    [authState.sessions],
  );

  const activeSession = authState.activeRole ? authState.sessions?.[authState.activeRole] : null;

  React.useEffect(() => {
    const token = activeSession?.token ?? null;
    if (token) {
      apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete apiClient.defaults.headers.common.Authorization;
    }
  }, [activeSession?.token]);

  const value = React.useMemo(
    () => ({
      sessions: authState.sessions,
      activeRole: authState.activeRole,
      user: activeSession?.user ?? null,
      userType: activeSession?.userType ?? authState.activeRole,
      token: activeSession?.token ?? null,
      isAuthenticated: hasSession(),
      hasSession,
      login,
      logout,
      switchRole,
      getSession,
      updateSession,
    }),
    [
      authState.sessions,
      authState.activeRole,
      activeSession,
      hasSession,
      login,
      logout,
      switchRole,
      getSession,
      updateSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};



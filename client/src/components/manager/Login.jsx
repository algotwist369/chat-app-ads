import React from "react";
import { FiLogIn, FiMail, FiLock } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../common/Button";
import { cn } from "../common/utils";
import { useAuth } from "../../context/AuthContext";
import { buildCustomerInviteLink } from "../../lib/invite";
import { loginManager } from "../../lib/managers";

const EMAIL_STORAGE_KEY = "managerLoginEmail";
const REMEMBER_STORAGE_KEY = "managerLoginRemember";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = React.useState(() => {
    if (typeof window === "undefined") {
      return { email: "", password: "" };
    }

    const shouldRemember = window.localStorage.getItem(REMEMBER_STORAGE_KEY) === "true";
    const storedEmail = shouldRemember ? window.localStorage.getItem(EMAIL_STORAGE_KEY) ?? "" : "";

    return { email: storedEmail, password: "" };
  });
  const [rememberMe, setRememberMe] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(REMEMBER_STORAGE_KEY) === "true";
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!rememberMe) return;
    if (typeof window === "undefined") return;

    window.localStorage.setItem(EMAIL_STORAGE_KEY, form.email.trim());
  }, [form.email, rememberMe]);

  const handleChange = React.useCallback((event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }, []);

  const handleToggleRemember = React.useCallback(() => {
    setRememberMe((previous) => {
      const nextValue = !previous;

      if (typeof window !== "undefined") {
        if (nextValue) {
          window.localStorage.setItem(REMEMBER_STORAGE_KEY, "true");
          window.localStorage.setItem(EMAIL_STORAGE_KEY, form.email.trim());
        } else {
          window.localStorage.removeItem(REMEMBER_STORAGE_KEY);
          window.localStorage.removeItem(EMAIL_STORAGE_KEY);
        }
      }

      return nextValue;
    });
  }, [form.email]);

  const handleSubmit = React.useCallback(
    async (event) => {
      event.preventDefault();

      setLoading(true);
      setError(null);
      const payload = {
        email: form.email.trim(),
        password: form.password,
      };

      try {
        const { manager, token } = await loginManager(payload);
        if (typeof window !== "undefined") {
          if (rememberMe) {
            window.localStorage.setItem(REMEMBER_STORAGE_KEY, "true");
            window.localStorage.setItem(EMAIL_STORAGE_KEY, payload.email);
          } else {
            window.localStorage.removeItem(REMEMBER_STORAGE_KEY);
            window.localStorage.removeItem(EMAIL_STORAGE_KEY);
          }
        }

        const inviteLink = buildCustomerInviteLink(manager?.businessSlug);

        login({
          userType: "manager",
          user: { ...manager, inviteLink },
          token,
        });

        const fallbackPath = "/chat?role=manager";
        const redirectPath = location.state?.from ?? fallbackPath;
        navigate(redirectPath, { replace: true });
      } catch (requestError) {
        const apiMessage =
          requestError?.response?.data?.message ??
          requestError?.response?.data?.error ??
          requestError?.message ??
          "Unable to sign in right now.";
        setError(apiMessage);
      } finally {
        setLoading(false);
      }
    },
    [form.email, form.password, rememberMe, login, navigate, location],
  );

  const inputClasses =
    "h-12 w-full rounded-2xl border border-[#1f2c34] bg-[#0b141a]/60 px-4 text-sm text-[#e9edef] placeholder:text-[#667781] focus:border-[#25d366]/60 focus:outline-none focus:ring-1 focus:ring-[#25d366]/40";

  return (
    <section className="flex min-h-screen w-full items-center justify-center bg-[#0b141a] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-[#1f2c34] bg-[#111b21]/95 px-6 py-8 shadow-2xl shadow-black/50 sm:px-8 sm:py-10">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-[#e9edef] sm:text-3xl">Manager Login</h1>
          <p className="mt-2 text-sm text-[#8696a0] sm:text-base">
            Sign in to manage your business conversations and settings.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium text-[#c2cbce]">
              Email
            </label>
            <div className="relative">
              <FiMail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667781]" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="you@business.com"
                className={cn(inputClasses, "pl-11")}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-[#c2cbce]">
              Password
            </label>
            <div className="relative">
              <FiLock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667781]" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
                className={cn(inputClasses, "pl-11")}
                disabled={loading}
                minLength={8}
              />
            </div>
            <p className="text-xs text-[#667781]">Your password must be at least 8 characters long.</p>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <label className="flex items-center gap-2 text-[#c2cbce]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={handleToggleRemember}
                className="h-4 w-4 rounded border border-[#1f2c34] bg-[#0b141a]/70 text-[#25d366] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#25d366]"
              />
              Remember me
            </label>

            <a
              href="/manager/reset-password"
              className="text-sm font-medium text-[#25d366] transition hover:text-[#20c65a]"
            >
              Forgot password?
            </a>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-2xl border border-[#ff4d6d]/40 bg-[#40121f]/80 px-4 py-3 text-sm text-[#ffb3c1]"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            loading={loading}
            icon={<FiLogIn className="h-5 w-5" />}
            fullWidth
            className="h-12 text-base"
          >
            Sign In
          </Button>
        </form>

        <footer className="mt-8 text-center text-sm text-[#8696a0]">
          <span>Don&apos;t have an account?</span>{" "}
          <a href="/manager/sign-up" className="font-medium text-[#25d366] transition hover:text-[#20c65a]">
            Create one
          </a>
        </footer>
      </div>
    </section>
  );
};

export default Login;
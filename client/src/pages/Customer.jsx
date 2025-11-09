import React from "react";
import { FiPhone, FiUser } from "react-icons/fi";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Heading from "../components/common/Heading";
import Button from "../components/common/Button";
import { cn } from "../components/common/utils";
import { useAuth } from "../context/AuthContext";
import { addCustomer, findManagerBySlug } from "../lib/mockDb";
import { ensureConversation } from "../lib/chatStore";

const CustomerLogin = () => {
  const [formState, setFormState] = React.useState({
    name: "",
    phone: "",
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { businessSlug } = useParams();
  const { login } = useAuth();
  const managerRecord = React.useMemo(() => {
    if (!businessSlug) return null;
    const found = findManagerBySlug(businessSlug);
    if (!found) return null;
    const { password, ...rest } = found;
    return rest;
  }, [businessSlug]);

  const businessName = React.useMemo(() => {
    if (managerRecord?.businessName) {
      return managerRecord.businessName;
    }
    if (!businessSlug) return null;
    return businessSlug
      .split("-")
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  }, [managerRecord, businessSlug]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!businessSlug) {
      setError("Please use the invite link provided by your manager to join the chat.");
      setLoading(false);
      return;
    }

    const basePayload = {
      name: formState.name.trim(),
      phone: formState.phone.trim(),
    };

    try {
      let resolvedBusinessSlug = businessSlug ?? null;

      if (!managerRecord) {
        throw new Error("We couldn't find a workspace for this business link. Please check the URL.");
      }

      resolvedBusinessSlug = managerRecord.businessSlug ?? resolvedBusinessSlug;

      const customerRecord = addCustomer({
        ...basePayload,
        businessSlug: resolvedBusinessSlug,
        managerId: managerRecord.id,
      });

      ensureConversation(managerRecord.id, customerRecord.id, {
        managerName: managerRecord.managerName ?? managerRecord.businessName ?? "Manager",
        customerName: customerRecord.name,
      });

      login({
        userType: "customer",
        user: customerRecord,
        token: `customer-${customerRecord.id}`,
      });

      const fallbackPath = "/chat?role=customer";
      const redirectPath = location.state?.from ?? fallbackPath;
      navigate(redirectPath, { replace: true });
    } catch (requestError) {
      const message =
        requestError?.message ?? "Unable to start a chat right now.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const inputClasses =
    "h-12 w-full rounded-2xl border border-transparent bg-[#202c33] px-4 text-sm text-[#e9edef] placeholder:text-[#667781] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/40 focus-visible:border-[#25d366]/70";

  return (
    <section className="flex min-h-screen items-center justify-center bg-[#111b21] px-4 py-10">
      <div className="border-animate w-full max-w-xl">
        <form
          onSubmit={handleSubmit}
          className="flex w-full flex-col gap-6 rounded-3xl bg-[#0b141a] p-8 shadow-lg shadow-black/20"
          noValidate
        >
          <Heading
            level={3}
            subtitle={
              businessName
                ? `Enter your details to talk with ${businessName}.`
                : "Enter your details to join the conversation."
            }
          >
            {businessName ? `${businessName} — Customer Login` : "Customer Login"}
          </Heading>

          {businessSlug && !managerRecord ? (
            <p className="rounded-2xl border border-[#b26c17]/40 bg-[#33230d]/70 px-4 py-3 text-sm text-[#f6dca2]">
              We couldn&apos;t find an active workspace for <span className="font-semibold">{businessSlug}</span>. Double-check
              the link or ask the business to share their latest invite URL.
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm font-semibold uppercase tracking-wide text-[#8796a1]">
              Name
            </label>
            <div className="relative">
              <FiUser className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667781]" />
              <input
                id="name"
                name="name"
                type="text"
                value={formState.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className={cn(inputClasses, "pl-11")}
                disabled={loading}
                required
                autoComplete="name"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="phone" className="text-sm font-semibold uppercase tracking-wide text-[#8796a1]">
              Phone Number
            </label>
            <div className="relative">
              <FiPhone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667781]" />
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formState.phone}
                onChange={handleChange}
                placeholder="e.g. +1 555 123 4567"
                className={cn(inputClasses, "pl-11")}
                disabled={loading}
                required
                pattern="^\+?\d[\d\s-]{7,}$"
                autoComplete="tel"
              />
            </div>
            <p className="text-xs text-[#667781]">We&apos;ll use your number to notify you about responses.</p>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-2xl border border-[#ff4d6d]/40 bg-[#40121f]/80 px-4 py-3 text-sm text-[#ffb3c1]"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" loading={loading} fullWidth className="h-12 text-base">
            Join Chat
          </Button>

          <div className="flex flex-col items-center gap-2 text-center text-sm text-[#8696a0]">
            <p>
              Are you a manager?{" "}
              <Link to="/manager/login" className="font-medium text-[#25d366] transition hover:text-[#20c65a]">
                Sign in here
              </Link>
            </p>
            {businessName ? (
              <p className="text-xs text-[#667781]">
                You&apos;re joining the workspace for <span className="font-medium text-[#c2cbce]">{businessName}</span>.
              </p>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
};

export default CustomerLogin;
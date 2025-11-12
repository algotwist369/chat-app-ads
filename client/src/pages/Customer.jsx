import React from "react";
import { FiPhone, FiUser } from "react-icons/fi";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Heading from "../components/common/Heading";
import Button from "../components/common/Button";
import { cn } from "../components/common/utils";
import { useAuth } from "../context/AuthContext";
import { getWorkspaceBySlug, joinCustomer } from "../lib/customers";

const CustomerLogin = () => {
  const [formState, setFormState] = React.useState({
    name: "",
    phone: "",
  });
  const [fieldErrors, setFieldErrors] = React.useState({
    name: null,
    phone: null,
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { businessSlug } = useParams();
  const { login } = useAuth();
  const [workspaceState, setWorkspaceState] = React.useState({
    manager: null,
    loading: false,
    error: null,
  });

  React.useEffect(() => {
    if (!businessSlug) {
      setWorkspaceState({ manager: null, loading: false, error: null });
      return;
    }

    let cancelled = false;
    const fetchWorkspace = async () => {
      setWorkspaceState((previous) => ({ ...previous, loading: true, error: null }));
      try {
        const { manager } = await getWorkspaceBySlug(businessSlug);
        if (cancelled) return;
        setWorkspaceState({ manager, loading: false, error: null });
      } catch (fetchError) {
        if (cancelled) return;
        const message =
          fetchError?.response?.data?.message ??
          fetchError?.response?.data?.error ??
          fetchError?.message ??
          "Unable to find a workspace for this invite link.";
        setWorkspaceState({ manager: null, loading: false, error: message });
      }
    };

    fetchWorkspace();
    return () => {
      cancelled = true;
    };
  }, [businessSlug]);

  const managerRecord = workspaceState.manager;

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

  // Validate Indian phone number
  const validateIndianPhone = (phone) => {
    if (!phone || typeof phone !== "string") {
      return "Phone number is required";
    }
    
    // Remove spaces and common separators
    let cleaned = phone.trim().replace(/[\s\-\(\)]/g, "");
    
    // Remove +91 prefix if present
    if (cleaned.startsWith("+91")) {
      cleaned = cleaned.substring(3);
    }
    // Remove 91 prefix if present (without +)
    else if (cleaned.startsWith("91") && cleaned.length === 12) {
      cleaned = cleaned.substring(2);
    }
    // Remove leading 0 if present
    else if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }
    
    // Must be exactly 10 digits and all numeric
    if (!/^\d{10}$/.test(cleaned)) {
      if (cleaned.length === 0) {
        return "Phone number is required";
      }
      return "Please enter a valid 10-digit Indian mobile number";
    }
    
    // First digit should be 6-9 (valid Indian mobile number range)
    const firstDigit = cleaned[0];
    if (!["6", "7", "8", "9"].includes(firstDigit)) {
      return "Indian mobile numbers must start with 6, 7, 8, or 9";
    }
    
    return null;
  };

  // Validate name to prevent dummy entries
  const validateName = (name) => {
    if (!name || typeof name !== "string") {
      return "Name is required";
    }
    
    const trimmed = name.trim();
    
    // Minimum length check
    if (trimmed.length < 2) {
      if (trimmed.length === 0) {
        return "Name is required";
      }
      return "Name must be at least 2 characters long";
    }
    
    if (trimmed.length > 50) {
      return "Name must not exceed 50 characters";
    }
    
    // Should contain at least one letter (not just numbers or special chars)
    if (!/[a-zA-Z]/.test(trimmed)) {
      return "Name must contain at least one letter";
    }
    
    // Common dummy/test names to reject (case insensitive)
    const dummyNames = [
      "test",
      "dummy",
      "abc",
      "xyz",
      "123",
      "qwerty",
      "asdf",
      "user",
      "admin",
      "customer",
      "name",
      "temp",
      "temporary",
      "demo",
      "sample",
      "fake",
      "spam",
      "bot",
      "guest",
      "anonymous",
    ];
    
    const lowerName = trimmed.toLowerCase();
    for (const dummy of dummyNames) {
      if (lowerName === dummy || lowerName.startsWith(dummy + " ") || lowerName.endsWith(" " + dummy)) {
        return "Please enter a valid name";
      }
    }
    
    // Should not be just numbers
    if (/^\d+$/.test(trimmed.replace(/\s/g, ""))) {
      return "Name cannot be just numbers";
    }
    
    // Should not contain only special characters
    if (!/[a-zA-Z0-9]/.test(trimmed)) {
      return "Name must contain letters or numbers";
    }
    
    return null;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((previous) => ({
      ...previous,
      [name]: value,
    }));

    // Real-time validation while typing
    let error = null;
    if (name === "phone") {
      error = validateIndianPhone(value);
    } else if (name === "name") {
      error = validateName(value);
    }

    setFieldErrors((previous) => ({
      ...previous,
      [name]: error,
    }));

    // Clear general error when user starts typing
    if (error) {
      setError(null);
    }
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

    // Validate before submitting
    const nameError = validateName(formState.name);
    const phoneError = validateIndianPhone(formState.phone);
    
    if (nameError || phoneError) {
      setFieldErrors({
        name: nameError,
        phone: phoneError,
      });
      setError("Please fix the errors above");
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

      const { customer, manager, token } = await joinCustomer({
        businessSlug: resolvedBusinessSlug,
        name: basePayload.name,
        phone: basePayload.phone,
      });

      login({
        userType: "customer",
        user: { ...customer, manager },
        token,
      });

      const fallbackPath = "/chat?role=customer";
      const redirectPath = location.state?.from ?? fallbackPath;
      navigate(redirectPath, { replace: true });
    } catch (requestError) {
      // Handle validation errors from server
      if (requestError?.response?.status === 422 && requestError?.response?.data?.details) {
        const validationErrors = requestError.response.data.details;
        const newFieldErrors = { name: null, phone: null };
        
        validationErrors.forEach((err) => {
          if (err.path === "name") {
            newFieldErrors.name = err.msg || "Please enter a valid name";
          } else if (err.path === "phone") {
            newFieldErrors.phone = err.msg || "Please enter a valid 10-digit Indian mobile number";
          }
        });
        
        setFieldErrors(newFieldErrors);
        setError("Please fix the errors above");
      } else {
        const message =
          requestError?.response?.data?.message ??
          requestError?.response?.data?.error ??
          requestError?.message ??
          "Unable to start a chat right now.";
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const getInputClasses = (hasError) => {
    const baseClasses =
      "h-12 w-full rounded-2xl border bg-[#202c33] px-4 text-sm text-[#e9edef] placeholder:text-[#667781] focus-visible:outline-none focus-visible:ring-2";
    
    if (hasError) {
      return `${baseClasses} border-[#ff4d6d]/60 focus-visible:ring-[#ff4d6d]/40 focus-visible:border-[#ff4d6d]/80`;
    }
    
    return `${baseClasses} border-transparent focus-visible:ring-[#25d366]/40 focus-visible:border-[#25d366]/70`;
  };

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
            {businessName ? `${businessName} - Customer Login` : "Customer Login"}
          </Heading>

          {workspaceState.loading ? (
            <p className="rounded-2xl border border-[#1f2c34]/40 bg-[#0f1a21]/70 px-4 py-3 text-sm text-[#8696a0]">
              Checking workspace details…
            </p>
          ) : null}

          {businessSlug && workspaceState.error ? (
            <p className="rounded-2xl border border-[#b26c17]/40 bg-[#33230d]/70 px-4 py-3 text-sm text-[#f6dca2]">
              {workspaceState.error}
            </p>
          ) : null}

          {businessSlug && !workspaceState.loading && businessSlug && !managerRecord && !workspaceState.error ? (
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
                className={cn(getInputClasses(fieldErrors.name), "pl-11")}
                disabled={loading}
                required
                autoComplete="name"
              />
            </div>
            {fieldErrors.name && (
              <p className="text-xs text-[#ff4d6d] mt-1">{fieldErrors.name}</p>
            )}
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
                placeholder="e.g. 9876543210 or +919876543210"
                className={cn(getInputClasses(fieldErrors.phone), "pl-11")}
                disabled={loading}
                required
                autoComplete="tel"
              />
            </div>
            {fieldErrors.phone ? (
              <p className="text-xs text-[#ff4d6d] mt-1">{fieldErrors.phone}</p>
            ) : (
              <p className="text-xs text-[#667781]">Enter your 10-digit Indian mobile number (e.g., 9876543210)</p>
            )}
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
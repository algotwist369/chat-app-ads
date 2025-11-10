import React from "react";
import { FiUploadCloud } from "react-icons/fi";
import { cn } from "../common/utils";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { buildCustomerInviteLink } from "../../lib/invite";
import { toBusinessSlug } from "../../lib/slug";
import { registerManager } from "../../lib/managers";

const SignUp = () => {
  const fileInputRef = React.useRef(null);
  const [logoPreview, setLogoPreview] = React.useState(null);
  const [form, setForm] = React.useState({
    managerName: "",
    businessName: "",
    mobileNumber: "",
    email: "",
    password: "",
  });
  const [logoData, setLogoData] = React.useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleLogoSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return previewUrl;
    });

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setLogoData(result);
    };
    reader.readAsDataURL(file);
  };

  React.useEffect(
    () => () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    },
    [logoPreview],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const businessSlug = toBusinessSlug(form.businessName);
    const payload = {
      managerName: form.managerName.trim(),
      businessName: form.businessName.trim(),
      businessSlug,
      email: form.email.trim(),
      password: form.password,
      logo: logoData ?? undefined,
    };

    const trimmedMobile = form.mobileNumber.trim();
    if (trimmedMobile) {
      payload.mobileNumber = trimmedMobile;
    }

    try {
      const { manager, token } = await registerManager(payload);
      const effectiveSlug = manager?.businessSlug ?? businessSlug;
      const inviteLink = buildCustomerInviteLink(effectiveSlug);

      login({
        userType: "manager",
        user: { ...manager, inviteLink },
        token,
      });

      navigate("/chat?role=manager", { replace: true });
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ??
        requestError?.response?.data?.error ??
        requestError?.message ??
        "Unable to create account right now.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex min-h-screen w-full items-center justify-center bg-[#0b141a] px-4 py-10">
      <div className="w-full max-w-3xl rounded-3xl border border-[#1f2c34] bg-[#111b21]/95 px-6 py-8 shadow-2xl shadow-black/50 sm:px-10 sm:py-12">
        <header className="mb-8 text-center sm:mb-10">
          <h1 className="text-2xl font-semibold text-[#e9edef] sm:text-3xl">Create Manager Account</h1>
          <p className="mt-2 text-sm text-[#8696a0] sm:text-base">
            Provide business details to get started. You can update everything later in settings.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          <div>
            <label className="block text-sm font-medium text-[#c2cbce]">Business Logo</label>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#23323c] bg-[#0b141a]/70">
                {logoPreview ? (
                  <img src={logoPreview} alt="Business logo preview" className="h-full w-full object-cover" />
                ) : (
                  <FiUploadCloud className="h-8 w-8 text-[#25d366]" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center rounded-full border border-[#25d366]/40 px-4 py-2 text-sm font-medium text-[#25d366] transition-all duration-200 hover:border-[#25d366] hover:bg-[#25d366]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/40"
                >
                  Upload Logo
                </button>
                <p className="text-xs text-[#667781]">PNG or JPG, max 2MB recommended.</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleLogoSelect}
              className="hidden"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="managerName" className="text-sm font-medium text-[#c2cbce]">
                Manager Name
              </label>
              <input
                id="managerName"
                name="managerName"
                type="text"
                value={form.managerName}
                onChange={handleChange}
                placeholder="Alex Johnson"
                required
                disabled={loading}
                className="rounded-xl border border-[#1f2c34] bg-[#0b141a]/60 px-4 py-2 text-sm text-[#e9edef] placeholder:text-[#667781] focus:border-[#25d366]/60 focus:outline-none focus:ring-1 focus:ring-[#25d366]/40"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="businessName" className="text-sm font-medium text-[#c2cbce]">
                Business Name
              </label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                value={form.businessName}
                onChange={handleChange}
                placeholder="Acme Studios"
                required
                disabled={loading}
                className="rounded-xl border border-[#1f2c34] bg-[#0b141a]/60 px-4 py-2 text-sm text-[#e9edef] placeholder:text-[#667781] focus:border-[#25d366]/60 focus:outline-none focus:ring-1 focus:ring-[#25d366]/40"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="mobileNumber" className="text-sm font-medium text-[#c2cbce]">
                Mobile Number <span className="text-xs text-[#667781]">(optional)</span>
              </label>
              <input
                id="mobileNumber"
                name="mobileNumber"
                type="tel"
                value={form.mobileNumber}
                onChange={handleChange}
                placeholder="+1 (555) 123-4567"
                disabled={loading}
                className="rounded-xl border border-[#1f2c34] bg-[#0b141a]/60 px-4 py-2 text-sm text-[#e9edef] placeholder:text-[#667781] focus:border-[#25d366]/60 focus:outline-none focus:ring-1 focus:ring-[#25d366]/40"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-[#c2cbce]">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@business.com"
                required
                disabled={loading}
                className="rounded-xl border border-[#1f2c34] bg-[#0b141a]/60 px-4 py-2 text-sm text-[#e9edef] placeholder:text-[#667781] focus:border-[#25d366]/60 focus:outline-none focus:ring-1 focus:ring-[#25d366]/40"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-[#c2cbce]">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Create a strong password"
              required
              minLength={8}
              disabled={loading}
              className="rounded-xl border border-[#1f2c34] bg-[#0b141a]/60 px-4 py-2 text-sm text-[#e9edef] placeholder:text-[#667781] focus:border-[#25d366]/60 focus:outline-none focus:ring-1 focus:ring-[#25d366]/40"
            />
            <p className="text-xs text-[#667781]">Must be at least 8 characters long.</p>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-2xl border border-[#ff4d6d]/40 bg-[#40121f]/80 px-4 py-3 text-sm text-[#ffb3c1]"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "mt-2 inline-flex items-center justify-center rounded-full bg-[#25d366] px-6 py-3 text-sm font-semibold text-[#06100d] shadow-lg shadow-[#25d366]/40 transition-transform duration-200 hover:scale-[1.01] hover:bg-[#20c65a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/40 sm:text-base",
              loading && "cursor-wait opacity-70",
            )}
          >
            {loading ? "Creating Account…" : "Create Account"}
          </button>
        </form>

      </div>
    </section>
  );
};

export default SignUp;
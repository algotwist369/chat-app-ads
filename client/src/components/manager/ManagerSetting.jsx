import React from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiUploadCloud, FiTrash2, FiCopy } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import Button from "../common/Button";
import { updateManager } from "../../lib/mockDb";
import { buildCustomerInviteLink } from "../../lib/invite";
import { toBusinessSlug } from "../../lib/slug";

const ManagerSetting = () => {
  const navigate = useNavigate();
  const { sessions, updateSession, switchRole } = useAuth();
  const managerSession = sessions?.manager ?? null;
  const manager = managerSession?.user ?? null;

  React.useEffect(() => {
    if (!managerSession) {
      navigate("/manager/login", { replace: true });
      return;
    }
    switchRole?.("manager");
  }, [managerSession, navigate, switchRole]);

  const [form, setForm] = React.useState(() => ({
    managerName: manager?.managerName ?? "",
    businessName: manager?.businessName ?? "",
    email: manager?.email ?? "",
    mobileNumber: manager?.mobileNumber ?? "",
  }));
  const [logoPreview, setLogoPreview] = React.useState(manager?.logo ?? null);
  const [logoData, setLogoData] = React.useState(manager?.logo ?? null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);

  const currentSlug = React.useMemo(() => {
    const trimmed = form.businessName.trim();
    if (!trimmed) {
      return manager?.businessSlug ?? "";
    }
    if (manager?.businessName && trimmed === manager.businessName && manager.businessSlug) {
      return manager.businessSlug;
    }
    return toBusinessSlug(trimmed);
  }, [form.businessName, manager?.businessName, manager?.businessSlug]);

  const inviteLink = React.useMemo(
    () =>
      buildCustomerInviteLink(
        manager?.businessSlug && manager.businessSlug === currentSlug
          ? manager.businessSlug
          : currentSlug,
      ),
    [manager?.businessSlug, currentSlug],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoPreview(reader.result);
        setLogoData(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoRemove = () => {
    setLogoPreview(null);
    setLogoData(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!managerSession?.user?.id) return;

    setIsSaving(true);
    setSuccess(null);
    setError(null);

    const nextBusinessName = form.businessName.trim();
    const nextSlug = toBusinessSlug(nextBusinessName || manager?.businessName || "");

    const payload = {
      managerName: form.managerName.trim(),
      businessName: nextBusinessName,
      businessSlug: nextSlug,
      mobileNumber: form.mobileNumber.trim(),
      email: form.email.trim(),
      logo: logoData,
    };

    try {
      const updated = updateManager(managerSession.user.id, payload);
      const refreshedInviteLink = buildCustomerInviteLink(updated.businessSlug ?? nextSlug);

      updateSession?.("manager", (session) => ({
        ...session,
        user: {
          ...session.user,
          ...updated,
          inviteLink: refreshedInviteLink,
        },
      }));

      setSuccess("Business profile updated successfully.");
    } catch (updateError) {
      setError(updateError?.message ?? "Unable to update business details right now.");
    } finally {
      setIsSaving(false);
    }
  };

  const copyInviteLink = () => {
    if (!inviteLink) return;
    navigator.clipboard?.writeText?.(inviteLink).then(() => {
      setSuccess("Invite link copied to clipboard.");
    });
  };

  if (!managerSession) {
    return null;
  }

  return (
    <section className="flex min-h-screen w-full flex-col bg-[#0b141a] px-4 py-6 sm:px-8 sm:py-10">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/chat?role=manager")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#1f2c34] text-[#8696a0] transition hover:border-[#25d366]/60 hover:text-[#25d366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60"
          >
            <FiArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold text-[#e9edef] sm:text-2xl">Business Settings</h1>
            <p className="text-sm text-[#8696a0]">
              Update your business profile and customer invite link.
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 rounded-3xl border border-[#1f2c34] bg-[#111b21]/95 px-4 py-6 shadow-2xl shadow-black/40 sm:px-8 sm:py-10">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          <div>
            <label className="block text-sm font-medium text-[#c2cbce]">Business Logo</label>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-[#1f2c34] bg-[#0b141a]/60">
                {logoPreview ? (
                  <img src={logoPreview} alt="Business logo" className="h-full w-full object-cover" />
                ) : (
                  <FiUploadCloud className="h-8 w-8 text-[#25d366]" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => document.getElementById("managerLogoInput")?.click()}
                  >
                    Upload Logo
                  </Button>
                  {logoPreview ? (
                    <Button type="button" variant="ghost" onClick={handleLogoRemove}>
                      <FiTrash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-[#667781]">
                  Recommended square image (SVG, PNG, JPG). Max 2MB.
                </p>
              </div>
            </div>
            <input
              id="managerLogoInput"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={handleLogoChange}
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#c2cbce]">Business Name</label>
              <input
                name="businessName"
                type="text"
                value={form.businessName}
                onChange={handleChange}
                required
                className="rounded-2xl border border-[#1f2c34] bg-[#0b141a]/60 px-4 py-3 text-sm text-[#e9edef] placeholder:text-[#667781] focus:border-[#25d366]/60 focus:outline-none focus:ring-1 focus:ring-[#25d366]/40"
                placeholder="Acme Studios"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#c2cbce]">Manager Name</label>
              <input
                name="managerName"
                type="text"
                value={form.managerName}
                onChange={handleChange}
                required
                className="rounded-2xl border border-[#1f2c34] bg-[#0b141a]/60 px-4 py-3 text-sm text-[#e9edef] placeholder:text-[#667781] focus:border-[#25d366]/60 focus:outline-none focus:ring-1 focus:ring-[#25d366]/40"
                placeholder="Alex Johnson"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#c2cbce]">Contact Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                className="rounded-2xl border border-[#1f2c34] bg-[#0b141a]/60 px-4 py-3 text-sm text-[#e9edef] placeholder:text-[#667781] focus:border-[#25d366]/60 focus:outline-none focus:ring-1 focus:ring-[#25d366]/40"
                placeholder="you@business.com"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#c2cbce]">Mobile Number</label>
              <input
                name="mobileNumber"
                type="tel"
                value={form.mobileNumber}
                onChange={handleChange}
                className="rounded-2xl border border-[#1f2c34] bg-[#0b141a]/60 px-4 py-3 text-sm text-[#e9edef] placeholder:text-[#667781] focus:border-[#25d366]/60 focus:outline-none focus:ring-1 focus:ring-[#25d366]/40"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#c2cbce]">Customer Invite Link</label>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#1f2c34] bg-[#0b141a]/60 px-4 py-3">
              <code className="flex-1 break-all text-xs text-[#25d366] sm:text-sm">{inviteLink}</code>
              <Button type="button" variant="secondary" size="sm" onClick={copyInviteLink}>
                <FiCopy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
            <p className="text-xs text-[#667781]">
              Share this link with customers to let them join your dedicated chat workspace.
            </p>
          </div>

          {error ? (
            <div className="rounded-2xl border border-[#ff4d6d]/50 bg-[#40121f]/70 px-4 py-3 text-sm text-[#ffb3c1]">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-2xl border border-[#25d366]/50 bg-[#005c4b]/40 px-4 py-3 text-sm text-[#c2f8dc]">
              {success}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate("/chat?role=manager")}>
              Cancel
            </Button>
            <Button type="submit" loading={isSaving}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default ManagerSetting;

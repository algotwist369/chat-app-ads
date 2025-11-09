export const buildCustomerInviteLink = (businessSlug) => {
  const slug = (businessSlug ?? "").trim();
  const baseUrl =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin.replace(/\/$/, "")
      : "http://localhost:5173";

  if (!slug) {
    return `${baseUrl}/customer/login`;
  }

  return `${baseUrl}/${slug}/customer/login`;
};



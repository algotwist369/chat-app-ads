export const cn = (...classes) =>
  classes
    .flatMap((cls) => {
      if (!cls) return [];
      if (typeof cls === "string") return cls.trim().split(/\s+/);
      if (Array.isArray(cls)) return cls;
      if (typeof cls === "object") {
        return Object.entries(cls)
          .filter(([, value]) => Boolean(value))
          .map(([key]) => key);
      }
      return [];
    })
    .filter(Boolean)
    .join(" ");


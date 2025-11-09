import { toBusinessSlug } from "./slug";

const STORAGE_KEY = "ad-chat-mock-db";

const defaultData = {
  managers: [],
  customers: [],
};

const isBrowser = typeof window !== "undefined";

const safeParse = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn("Failed to parse mock DB from storage", error);
    return null;
  }
};

const loadData = () => {
  if (!isBrowser) {
    return { ...defaultData };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { ...defaultData };
  }

  const parsed = safeParse(raw);
  if (!parsed || typeof parsed !== "object") {
    return { ...defaultData };
  }

  return {
    managers: Array.isArray(parsed.managers) ? parsed.managers : [],
    customers: Array.isArray(parsed.customers) ? parsed.customers : [],
  };
};

const saveData = (data) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Failed to persist mock DB to storage", error);
  }
};

const cloneData = (data) => ({
  managers: data.managers.map((manager) => ({ ...manager })),
  customers: data.customers.map((customer) => ({ ...customer })),
});

export const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeEmail = (email) => email.trim().toLowerCase();

const normalizeSlug = (slug) => (slug ?? "").trim().toLowerCase();

export const getManagers = () => {
  const data = loadData();
  return data.managers;
};

export const getCustomers = () => {
  const data = loadData();
  return data.customers;
};

export const findManagerByEmail = (email) => {
  if (!email) return null;
  const normalized = normalizeEmail(email);
  return getManagers().find((manager) => normalizeEmail(manager.email) === normalized) ?? null;
};

export const findManagerBySlug = (slug) => {
  if (!slug) return null;
  const normalized = normalizeSlug(slug);
  return getManagers().find(
    (manager) => manager.businessSlug && normalizeSlug(manager.businessSlug) === normalized,
  ) ?? null;
};

export const addManager = (managerInput) => {
  const data = loadData();
  const dataDraft = cloneData(data);

  const email = normalizeEmail(managerInput.email);
  const slug = managerInput.businessSlug ? normalizeSlug(managerInput.businessSlug) : null;

  if (dataDraft.managers.some((manager) => normalizeEmail(manager.email) === email)) {
    const error = new Error("An account with this email already exists.");
    error.code = "MANAGER_EMAIL_TAKEN";
    throw error;
  }

  if (slug && dataDraft.managers.some((manager) => normalizeSlug(manager.businessSlug ?? "") === slug)) {
    const error = new Error("This business URL is already in use. Try a different business name.");
    error.code = "MANAGER_SLUG_TAKEN";
    throw error;
  }

  const record = {
    id: generateId(),
    managerName: managerInput.managerName,
    businessName: managerInput.businessName,
    businessSlug: slug,
    mobileNumber: managerInput.mobileNumber,
    email: managerInput.email,
    password: managerInput.password,
    logo: managerInput.logo ?? null,
    createdAt: Date.now(),
  };

  dataDraft.managers.push(record);
  saveData(dataDraft);

  const { password: _password, ...rest } = record;
  return rest;
};

export const updateManager = (managerId, updates) => {
  if (!managerId) {
    throw new Error("Manager account identifier is required.");
  }

  const data = loadData();
  const dataDraft = cloneData(data);

  const index = dataDraft.managers.findIndex((manager) => manager.id === managerId);
  if (index < 0) {
    throw new Error("Manager account not found.");
  }

  const existing = dataDraft.managers[index];

  const nextEmail = updates?.email ? normalizeEmail(updates.email) : normalizeEmail(existing.email);
  if (
    nextEmail !== normalizeEmail(existing.email) &&
    dataDraft.managers.some(
      (manager) => manager.id !== managerId && normalizeEmail(manager.email) === nextEmail,
    )
  ) {
    const error = new Error("Another account already uses this email address.");
    error.code = "MANAGER_EMAIL_TAKEN";
    throw error;
  }

  const desiredBusinessName = updates?.businessName ?? existing.businessName;
  let nextSlug =
    updates?.businessSlug ??
    (desiredBusinessName ? toBusinessSlug(desiredBusinessName) : existing.businessSlug) ??
    existing.businessSlug;

  nextSlug = normalizeSlug(nextSlug);
  const existingSlug = normalizeSlug(existing.businessSlug ?? "");

  if (
    nextSlug &&
    nextSlug !== existingSlug &&
    dataDraft.managers.some(
      (manager) =>
        manager.id !== managerId &&
        normalizeSlug(manager.businessSlug ?? "") === nextSlug,
    )
  ) {
    const error = new Error("This business URL is already in use. Try a different business name.");
    error.code = "MANAGER_SLUG_TAKEN";
    throw error;
  }

  const updatedRecord = {
    ...existing,
    ...updates,
    managerName: updates?.managerName ?? existing.managerName,
    businessName: desiredBusinessName ?? existing.businessName,
    mobileNumber: updates?.mobileNumber ?? existing.mobileNumber,
    email: updates?.email ? updates.email.trim() : existing.email,
    businessSlug: nextSlug,
    logo: updates?.logo !== undefined ? updates.logo : existing.logo ?? null,
  };

  dataDraft.managers[index] = updatedRecord;
  saveData(dataDraft);

  const { password: _password, ...rest } = updatedRecord;
  return rest;
};

export const verifyManagerCredentials = (email, password) => {
  const manager = findManagerByEmail(email ?? "");
  if (!manager) return null;
  if (manager.password !== password) return null;
  const { password: _password, ...rest } = manager;
  return rest;
};

export const addCustomer = (customerInput) => {
  const data = loadData();
  const dataDraft = cloneData(data);

  const record = {
    id: generateId(),
    name: customerInput.name,
    phone: customerInput.phone,
    businessSlug: customerInput.businessSlug ?? null,
    managerId: customerInput.managerId ?? null,
    createdAt: Date.now(),
  };

  dataDraft.customers.push(record);
  saveData(dataDraft);

  return record;
};

export const getCustomersForBusiness = (businessSlug) => {
  if (!businessSlug) return [];
  const normalized = normalizeSlug(businessSlug);
  return getCustomers().filter(
    (customer) => customer.businessSlug && normalizeSlug(customer.businessSlug) === normalized,
  );
};

export const getCustomersForManager = (managerId) => {
  if (!managerId) return [];
  return getCustomers().filter((customer) => customer.managerId === managerId);
};

export const getManagerById = (managerId) => {
  if (!managerId) return null;
  return getManagers().find((manager) => manager.id === managerId) ?? null;
};

export const getCustomerById = (customerId) => {
  if (!customerId) return null;
  return getCustomers().find((customer) => customer.id === customerId) ?? null;
};

export const resetMockDb = () => {
  saveData(defaultData);
};



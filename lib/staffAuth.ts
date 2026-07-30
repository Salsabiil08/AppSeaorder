export type StaffRole = "admin" | "kitchen";

export const STAFF_SESSION_KEY = "seaorder_staff_session";

type StaffAccount = {
  username: string;
  password: string;
  role: StaffRole;
  displayName: string;
};

const STAFF_ACCOUNTS: StaffAccount[] = [
  { username: "admin", password: "admin123", role: "admin", displayName: "Administrator" },
  { username: "kitchen", password: "kitchen123", role: "kitchen", displayName: "Tim Kitchen" },
];

export function authenticateStaff(username: string, password: string) {
  const normalizedUsername = username.trim().toLowerCase();
  const account = STAFF_ACCOUNTS.find(
    (staff) => staff.username === normalizedUsername && staff.password === password,
  );

  if (!account) return null;

  return {
    username: account.username,
    role: account.role,
    displayName: account.displayName,
  };
}

export function getStaffSession() {
  if (typeof window === "undefined") return null;

  try {
    const session = sessionStorage.getItem(STAFF_SESSION_KEY);
    if (!session) return null;
    const parsed = JSON.parse(session) as { role?: StaffRole; username?: string; displayName?: string };
    return parsed.role === "admin" || parsed.role === "kitchen" ? parsed : null;
  } catch {
    return null;
  }
}

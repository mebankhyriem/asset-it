import { type AssetStatus, type RequestStatus, type UserRole, ROLE_LABELS } from "@/lib/types";

type BadgeVariant = "gray" | "green" | "blue" | "yellow" | "red" | "orange" | "purple" | "indigo";

const variantClasses: Record<BadgeVariant, string> = {
  gray: "bg-gray-100 text-gray-700",
  green: "bg-green-100 text-green-700",
  blue: "bg-blue-100 text-blue-700",
  yellow: "bg-yellow-100 text-yellow-700",
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
  purple: "bg-purple-100 text-purple-700",
  indigo: "bg-indigo-100 text-indigo-700",
};

const assetStatusVariants: Record<AssetStatus, BadgeVariant> = {
  Available: "green",
  Assigned: "blue",
  Maintenance: "yellow",
  Returned: "purple",
  Condemned: "red",
  Disposed: "gray",
};

const requestStatusVariants: Record<RequestStatus, BadgeVariant> = {
  Pending: "orange",
  "IM Review": "yellow",
  "On Hold": "gray",
  "JIO Approved": "indigo",
  "SIO Approved": "purple",
  Forwarded: "blue",
  Issued: "green",
  Rejected: "red",
  Returned: "blue",
  "Under Repair": "yellow",
  Transferred: "green",
  Condemned: "red",
};

const roleVariants: Record<UserRole, BadgeVariant> = {
  INVENTORY_MANAGER: "blue",
  SIO: "purple",
  JIO: "indigo",
  DEPT_USER: "gray",
};

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  const variant = assetStatusVariants[status] ?? "gray";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
      {status}
    </span>
  );
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const variant = requestStatusVariants[status] ?? "gray";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
      {status}
    </span>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  const variant = roleVariants[role] ?? "gray";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

export function Badge({ label, variant = "gray" }: { label: string; variant?: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
      {label}
    </span>
  );
}

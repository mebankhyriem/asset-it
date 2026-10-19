export type UserRole = "INVENTORY_MANAGER" | "SIO" | "JIO" | "DEPT_USER";

export type AssetStatus = "Available" | "Assigned" | "Maintenance" | "Returned" | "Condemned" | "Disposed";

export type IctCategory = "I" | "II" | "III" | "IV";

export type RequestType = "New Asset" | "Transfer" | "Return" | "Repair" | "External Issuance" | "Condemnation";

export type RequestStatus =
  | "Pending"
  | "IM Review"
  | "On Hold"
  | "JIO Approved"
  | "SIO Approved"
  | "Forwarded"
  | "Issued"
  | "Rejected"
  | "Returned"
  | "Under Repair"
  | "Condemned"
  | "Transferred";

export type ApprovalStep =
  | "IM Initial Review"
  | "JIO Approval"
  | "SIO Approval"
  | "IM Final Processing"
  | "IM Service Processing";

export interface Department {
  id: number;
  name: string;
  created_at: string;
}

export interface User {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  role: UserRole;
  department_id: number | null;
  department_name?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: number;
  asset_id: string;
  asset_type: string;
  serial_number: string | null;
  specifications: string | null;
  description: string | null;
  status: AssetStatus;
  department_id: number | null;
  department_name?: string | null;
  room_number: string | null;
  issued_date: string | null;
  end_of_life_date: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface AssetRequest {
  id: number;
  request_number: string;
  requested_by: number;
  requested_by_name?: string;
  department_id: number | null;
  department_name?: string | null;
  asset_type: string;
  quantity: number;
  justification: string;
  status: RequestStatus;
  tentative_asset_id: number | null;
  im_notes: string | null;
  bypass_approved: number;
  bypass_reference: string | null;
  bypass_signed_file: string | null;
  allocated_asset_id: number | null;
  allocation_date: string | null;
  assigned_to_name: string | null;
  condition_on_issue: string | null;
  acknowledged: number;
  created_at: string;
  updated_at: string;
}

export interface Approval {
  id: number;
  request_id: number;
  step: ApprovalStep;
  status: "Pending" | "Approved" | "Rejected";
  reviewer_id: number | null;
  reviewer_name?: string | null;
  comments: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  INVENTORY_MANAGER: "Inventory Manager",
  SIO: "SIO (Senior Inspection Officer)",
  JIO: "JIO (Junior Inspection Officer)",
  DEPT_USER: "Department User",
};

// Maps each role to the approval steps they are responsible for
export const ROLE_STEPS: Record<string, ApprovalStep[]> = {
  INVENTORY_MANAGER: ["IM Initial Review", "IM Final Processing", "IM Service Processing"],
  JIO: ["JIO Approval"],
  SIO: ["SIO Approval"],
};

export const ASSET_TYPES = [
  // Category I — Consumables / Use-and-Throw
  "Printing Consumables (Ink/Toner/Cartridge)",
  "Storage Media (CD/DVD/Floppy)",
  "UPS Battery Pack",
  // Category II — Fast Obsolescence (5 yrs)
  "Laptop",
  "Tablet",
  "Mobile Phone / Smartphone",
  "Pen Drive / USB Drive",
  "External Storage (HDD/SSD)",
  // Category III — Medium Obsolescence (7 yrs)
  "Server",
  "Mainframe",
  "Desktop Computer",
  "Workstation",
  "Monitor / Display Unit",
  "Keyboard and Mouse",
  "Storage Device (Internal HDD/SSD)",
  "Printer (Laser)",
  "Printer (Inkjet/Dot Matrix)",
  "Scanner",
  "Photocopier / MFD",
  "Projector",
  "UPS (Uninterruptible Power Supply)",
  "Inverter",
  "GPS Device",
  "Video Conferencing Equipment",
  "Interactive Kiosk",
  "Camera / Webcam",
  "Router",
  "Switch",
  "Hub",
  "Modem",
  "Firewall / Security Appliance",
  "Network Attached Storage (NAS)",
  // Category IV — Slow Obsolescence (10 yrs)
  "LED TV / Digital Display",
  "FAX Machine",
  "EPABX System",
  "Biometric / Attendance System",
  "DVD Player",
  "Other",
];

// Short prefix code used to auto-generate asset IDs: {CODE}-{YEAR}-{seq}
export const ASSET_TYPE_CODE: Record<string, string> = {
  "Printing Consumables (Ink/Toner/Cartridge)": "INK",
  "Storage Media (CD/DVD/Floppy)": "STM",
  "UPS Battery Pack": "UBP",
  "Laptop": "LAP",
  "Tablet": "TAB",
  "Mobile Phone / Smartphone": "MOB",
  "Pen Drive / USB Drive": "USB",
  "External Storage (HDD/SSD)": "EXS",
  "Server": "SRV",
  "Mainframe": "MFR",
  "Desktop Computer": "DSK",
  "Workstation": "WKS",
  "Monitor / Display Unit": "MON",
  "Keyboard and Mouse": "KBM",
  "Storage Device (Internal HDD/SSD)": "STD",
  "Printer (Laser)": "PRL",
  "Printer (Inkjet/Dot Matrix)": "PRI",
  "Scanner": "SCN",
  "Photocopier / MFD": "PHC",
  "Projector": "PRJ",
  "UPS (Uninterruptible Power Supply)": "UPS",
  "Inverter": "INV",
  "GPS Device": "GPS",
  "Video Conferencing Equipment": "VCE",
  "Interactive Kiosk": "KSK",
  "Camera / Webcam": "CAM",
  "Router": "RTR",
  "Switch": "SWT",
  "Hub": "HUB",
  "Modem": "MDM",
  "Firewall / Security Appliance": "FWL",
  "Network Attached Storage (NAS)": "NAS",
  "LED TV / Digital Display": "LED",
  "FAX Machine": "FAX",
  "EPABX System": "EPX",
  "Biometric / Attendance System": "BIO",
  "DVD Player": "DVD",
  "Other": "OTH",
};

export const ASSET_TYPE_CATEGORY: Record<string, IctCategory> = {
  // Category I — Consumables
  "Printing Consumables (Ink/Toner/Cartridge)": "I",
  "Storage Media (CD/DVD/Floppy)": "I",
  "UPS Battery Pack": "I",
  // Category II — 5 years
  "Laptop": "II",
  "Tablet": "II",
  "Mobile Phone / Smartphone": "II",
  "Pen Drive / USB Drive": "II",
  "External Storage (HDD/SSD)": "II",
  // Category III — 7 years
  "Server": "III",
  "Mainframe": "III",
  "Desktop Computer": "III",
  "Workstation": "III",
  "Monitor / Display Unit": "III",
  "Keyboard and Mouse": "III",
  "Storage Device (Internal HDD/SSD)": "III",
  "Printer (Laser)": "III",
  "Printer (Inkjet/Dot Matrix)": "III",
  "Scanner": "III",
  "Photocopier / MFD": "III",
  "Projector": "III",
  "UPS (Uninterruptible Power Supply)": "III",
  "Inverter": "III",
  "GPS Device": "III",
  "Video Conferencing Equipment": "III",
  "Interactive Kiosk": "III",
  "Camera / Webcam": "III",
  "Router": "III",
  "Switch": "III",
  "Hub": "III",
  "Modem": "III",
  "Firewall / Security Appliance": "III",
  "Network Attached Storage (NAS)": "III",
  // Category IV — 10 years
  "LED TV / Digital Display": "IV",
  "FAX Machine": "IV",
  "EPABX System": "IV",
  "Biometric / Attendance System": "IV",
  "DVD Player": "IV",
};

export const CATEGORY_LIFESPAN_YEARS: Record<IctCategory, number> = {
  "I": 1,   // Consumables — use and throw, 1 yr for tracking
  "II": 5,
  "III": 7,
  "IV": 10,
};

export const CATEGORY_LABELS: Record<IctCategory, string> = {
  "I": "Category I — Consumables / Use-and-Throw (1 yr)",
  "II": "Category II — Fast Obsolescence: Laptops, Mobiles (5 yrs)",
  "III": "Category III — Medium Obsolescence: Servers, Desktops, Peripherals, Network (7 yrs)",
  "IV": "Category IV — Slow Obsolescence: TVs, FAX, EPABX (10 yrs)",
};

// Structured specs prompt on Add Asset (Laptop / Desktop Computer / Tablet / Mobile Phone
// only). These are the seed presets; the full pickable list also includes anything saved
// in the spec_options table (values IMs have typed in via "Other" previously) — see
// /api/spec-options. Shared between the client form and the createAsset server action so
// the "is this actually a new value?" check stays in sync.
export type SpecDeviceKind = "computer" | "mobile";

export const OS_OPTIONS: Record<SpecDeviceKind, string[]> = {
  computer: ["Windows", "macOS", "Linux", "Chrome OS"],
  mobile: ["Android", "iOS / iPadOS", "Windows", "HarmonyOS"],
};

export const RAM_OPTIONS = ["2 GB", "3 GB", "4 GB", "6 GB", "8 GB", "12 GB", "16 GB", "24 GB", "32 GB", "64 GB"];

export const PROCESSOR_OPTIONS: Record<SpecDeviceKind, string[]> = {
  computer: ["Intel Core i3", "Intel Core i5", "Intel Core i7", "Intel Core i9", "AMD Ryzen 3", "AMD Ryzen 5", "AMD Ryzen 7", "AMD Ryzen 9", "Apple M1", "Apple M2", "Apple M3"],
  mobile: ["Apple A-series (Bionic)", "Apple M-series", "Qualcomm Snapdragon", "MediaTek Dimensity", "Samsung Exynos", "Google Tensor"],
};

// lib/mockData.ts — Realistic Nigerian Identity Data for NINAuth

import type {
  UserIdentity,
  Institution,
  VerificationRequest,
  GovernanceAction,
  AccessLog,
  DashboardStats,
  PlatformStats,
  VerificationDataPoint,
} from "./types";

// ── Platform Stats ─────────────────────────────────────────────────────────

export const platformStats: PlatformStats = {
  totalIdentities: 4_280_194,
  totalVerifications: 18_743_600,
  activeInstitutions: 312,
  countriesSupported: 1,
};

// ── Institutions ───────────────────────────────────────────────────────────

export const institutions: Institution[] = [
  {
    id: "inst-001",
    name: "First Bank of Nigeria",
    shortName: "FirstBank",
    type: "bank",
    logo: "🏦",
    description: "Nigeria's premier financial institution providing KYC-verified banking services.",
    trustScore: 98,
    totalVerifications: 2_340_000,
    activeUsers: 12_400,
    isVerified: true,
    licenseNumber: "RC-11024-FBN",
    accessLevel: 3, // Level 3: Demographics
    dataScope: ["full_name", "dob", "phone"],
    location: "Lagos, Nigeria",
    joinedAt: "2023-01-15",
    website: "https://firstbanknigeria.com",
  },
  {
    id: "inst-002",
    name: "Lagos University Teaching Hospital",
    shortName: "LUTH",
    type: "hospital",
    logo: "🏥",
    description: "Federal medical centre providing healthcare identity verification for patient records.",
    trustScore: 95,
    totalVerifications: 890_000,
    activeUsers: 4_200,
    isVerified: true,
    licenseNumber: "FMOH-LUTH-2019",
    accessLevel: 2, // Level 2: Basic Identity
    dataScope: ["full_name", "dob"],
    location: "Lagos, Nigeria",
    joinedAt: "2023-03-10",
  },
  {
    id: "inst-003",
    name: "National Identity Management Commission",
    shortName: "NIMC",
    type: "government",
    logo: "🏛️",
    description: "Federal agency responsible for identity management and issuance of NIN.",
    trustScore: 100,
    totalVerifications: 8_900_000,
    activeUsers: 45_000,
    isVerified: true,
    licenseNumber: "FGN-NIMC-001",
    accessLevel: 5, // Level 5: Full Disclosure
    dataScope: ["all"],
    location: "Abuja, Nigeria",
    joinedAt: "2023-01-01",
    website: "https://nimc.gov.ng",
  },
  {
    id: "inst-004",
    name: "Zenith Bank Plc",
    shortName: "Zenith",
    type: "bank",
    logo: "🏦",
    description: "Commercial bank leveraging NINAuth for seamless customer onboarding.",
    trustScore: 97,
    totalVerifications: 1_890_000,
    activeUsers: 9_800,
    isVerified: true,
    licenseNumber: "RC-85781-ZBP",
    accessLevel: 4, // Level 4: Address & Identity
    dataScope: ["full_name", "dob", "address", "phone"],
    location: "Lagos, Nigeria",
    joinedAt: "2023-02-20",
  },
];

// ── Role-Specific Users ────────────────────────────────────────────────────

export const citizenUser: UserIdentity = {
  id: "user-001",
  role: "citizen",
  nin: "12345678901",
  ninMasked: "****-****-901",
  fullName: "Adebayo Chukwuemeka",
  firstName: "Adebayo",
  middleName: "",
  surname: "Chukwuemeka",
  dateOfBirth: "1992-07-14",
  sex: "Male",
  nationality: "Nigerian",
  stateOfOrigin: "Anambra",
  stateOfResidence: "Lagos",
  address: "14 Bode Thomas Street, Surulere, Lagos 100001",
  phone: "+234 803 456 7890",
  email: "adebayo.chukwuemeka@email.com",
  avatar: "",
  verificationStatus: "verified",
  verifiedAt: "2024-03-15",
  registeredAt: "2024-02-01",
  riskScore: 12,
  biometrics: [
    { type: "fingerprint", status: "enrolled", score: 97, enrolledAt: "2024-02-01", livenessCheck: true },
    { type: "face", status: "enrolled", score: 94, enrolledAt: "2024-02-01", livenessCheck: true },
  ],
  documents: [
    { id: "doc-001", type: "nin_slip", label: "NIN Slip", status: "verified", uploadedAt: "2024-02-01", verifiedAt: "2024-03-15", fileSize: "1.2 MB" },
    { id: "doc-002", type: "passport", label: "International Passport", status: "verified", uploadedAt: "2024-02-05", verifiedAt: "2024-03-15", expiryDate: "2029-05-20", fileSize: "2.4 MB" },
  ],
  attributes: [
    { key: "full_name", label: "Full Name", value: "Adebayo Chukwuemeka", verified: true, sensitive: false },
    { key: "dob", label: "Date of Birth", value: "14 July 1992", verified: true, sensitive: true },
    { key: "address", label: "Residential Address", value: "14 Bode Thomas Street, Surulere, Lagos", verified: true, sensitive: true },
    { key: "phone", label: "Phone Number", value: "+234 803 456 7890", verified: true, sensitive: false },
  ],
};

export const institutionUser: UserIdentity = {
  ...citizenUser,
  id: "user-inst-001",
  role: "institution",
  fullName: "First Bank Compliance",
  firstName: "FirstBank",
  surname: "Compliance",
};

export const governmentUser: UserIdentity = {
  ...citizenUser,
  id: "user-gov-001",
  role: "government",
  fullName: "NIMC Admin Officer",
  firstName: "NIMC",
  surname: "Admin",
};

// Default for app initial load
export const currentUser = citizenUser;

// ── Verification Requests ──────────────────────────────────────────────────

export const verificationRequests: VerificationRequest[] = [
  {
    id: "req-001",
    institutionId: "inst-001",
    institution: institutions[0],
    userId: "user-001",
    requestedLevel: 3,
    requestedScope: ["full_name", "dob", "phone"],
    purpose: "KYC verification for account opening",
    status: "pending",
    requestedAt: "2024-05-01T08:30:00Z",
    expiresAt: "2024-05-08T08:30:00Z",
    riskLevel: "low",
    blockchainTxHash: "0x4a3b2c1d...",
  },
  {
    id: "req-002",
    institutionId: "inst-002",
    institution: institutions[1],
    userId: "user-001",
    requestedLevel: 2,
    requestedScope: ["full_name", "dob"],
    purpose: "Patient registration for medical records",
    status: "approved",
    requestedAt: "2024-04-20T14:00:00Z",
    respondedAt: "2024-04-20T14:22:00Z",
    expiresAt: "2024-07-20T14:00:00Z",
    riskLevel: "low",
  },
  {
    id: "req-003",
    institutionId: "inst-003",
    institution: institutions[2],
    userId: "user-001",
    requestedLevel: 5,
    requestedScope: ["all"],
    purpose: "Identity record audit and verification",
    status: "approved",
    requestedAt: "2024-03-15T10:00:00Z",
    respondedAt: "2024-03-15T10:00:00Z",
    expiresAt: "2025-03-15T10:00:00Z",
    riskLevel: "low",
    blockchainTxHash: "0x2e3f4a5b...",
  },
];

// ── Access Logs ────────────────────────────────────────────────────────────

export const accessLogs: AccessLog[] = [
  { id: "log-001", institutionId: "inst-003", institutionName: "NIMC", action: "accessed", dataScope: ["all"], timestamp: "2024-03-15T10:00:00Z", blockchainRef: "0x2e3f4a5b", status: "success" },
  { id: "log-003", institutionId: "inst-002", institutionName: "LUTH", action: "approved", dataScope: ["full_name", "dob"], timestamp: "2024-04-20T14:22:00Z", status: "success" },
  { id: "log-005", institutionId: "inst-001", institutionName: "First Bank", action: "requested", dataScope: ["full_name", "dob", "phone"], timestamp: "2024-05-01T08:30:00Z", status: "pending" },
];

// ── Dashboard Stats ────────────────────────────────────────────────────────

export const dashboardStats: DashboardStats = {
  totalVerifications: 12,
  approvedRequests: 4,
  pendingApprovals: 3,
  deniedRequests: 2,
  riskScore: 12,
  documentsVaulted: 2,
  institutionsConnected: 3,
  lastActivity: "2024-05-01T10:00:00Z",
};

// ── Verification Analytics ─────────────────────────────────────────────────

export const verificationAnalytics: VerificationDataPoint[] = [
  { month: "Jan", verifications: 2, approvals: 1, denials: 1 },
  { month: "Feb", verifications: 3, approvals: 2, denials: 1 },
  { month: "Mar", verifications: 4, approvals: 4, denials: 0 },
  { month: "Apr", verifications: 5, approvals: 3, denials: 2 },
  { month: "May", verifications: 3, approvals: 0, denials: 0 },
];

// ── Additional Users (for verifications page) ──────────────────────────────

export const allUsers: Pick<UserIdentity, "id" | "fullName" | "ninMasked" | "verificationStatus" | "riskScore">[] = [
  { id: "user-001", fullName: "Adebayo Chukwuemeka", ninMasked: "****-****-901", verificationStatus: "verified", riskScore: 12 },
  { id: "user-002", fullName: "Ngozi Okafor", ninMasked: "****-****-442", verificationStatus: "verified", riskScore: 8 },
  { id: "user-003", fullName: "Emeka Nwachukwu", ninMasked: "****-****-773", verificationStatus: "pending", riskScore: 35 },
  { id: "user-004", fullName: "Fatima Aliyu", ninMasked: "****-****-128", verificationStatus: "verified", riskScore: 5 },
];

// ── Governance Actions ─────────────────────────────────────────────────────

export const governanceActions: GovernanceAction[] = [
  {
    id: "gov-001",
    type: "access_request",
    title: "Full Identity Disclosure Request",
    description: "NIMC requests full identity record access for annual audit and verification compliance.",
    institutionId: "inst-003",
    institution: institutions[2],
    requestedBy: "NIMC Compliance Officer",
    dataScope: ["full_name", "dob", "nin_full", "biometric_hash", "address"],
    expiryDate: "2025-03-15T10:00:00Z",
    riskLevel: "high",
    status: "pending",
    approvalProgress: 60,
    requiredApprovals: 3,
    currentApprovals: 2,
    createdAt: "2024-05-01T08:00:00Z",
  },
  {
    id: "gov-002",
    type: "access_request",
    title: "KYC Data Access — First Bank",
    description: "First Bank requests demographic data for account opening KYC.",
    institutionId: "inst-001",
    institution: institutions[0],
    requestedBy: "First Bank Compliance",
    dataScope: ["full_name", "dob", "phone"],
    expiryDate: "2024-06-01T00:00:00Z",
    riskLevel: "low",
    status: "approved",
    approvalProgress: 100,
    requiredApprovals: 1,
    currentApprovals: 1,
    createdAt: "2024-04-20T14:00:00Z",
    resolvedAt: "2024-04-20T14:22:00Z",
  },
  {
    id: "gov-003",
    type: "access_request",
    title: "Patient Identity Verification — LUTH",
    description: "Lagos University Teaching Hospital requests basic identity for patient registration.",
    institutionId: "inst-002",
    institution: institutions[1],
    requestedBy: "LUTH Medical Records",
    dataScope: ["full_name", "dob"],
    expiryDate: "2024-07-20T14:00:00Z",
    riskLevel: "low",
    status: "approved",
    approvalProgress: 100,
    requiredApprovals: 1,
    currentApprovals: 1,
    createdAt: "2024-04-18T10:00:00Z",
    resolvedAt: "2024-04-18T11:00:00Z",
  },
  {
    id: "gov-004",
    type: "revocation",
    title: "Revoke Zenith Bank Access",
    description: "Citizen-initiated revocation of Zenith Bank data access due to account closure.",
    institutionId: "inst-004",
    institution: institutions[3],
    requestedBy: "Adebayo Chukwuemeka",
    dataScope: ["full_name", "dob", "address", "phone"],
    expiryDate: "2024-05-15T00:00:00Z",
    riskLevel: "medium",
    status: "pending",
    approvalProgress: 0,
    requiredApprovals: 1,
    currentApprovals: 0,
    createdAt: "2024-05-05T09:30:00Z",
  },
];

// lib/types.ts — NINAuth Type Definitions

export type VerificationStatus = "unregistered" | "pending" | "verified" | "suspended" | "rejected";
export type DocumentStatus = "locked" | "unlocked" | "pending" | "verified";
export type RequestStatus = "pending" | "approved" | "denied" | "expired";
export type InstitutionType = "bank" | "hospital" | "government" | "education" | "telecom";
export type BiometricType = "fingerprint" | "face" | "iris";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type SystemRole = "citizen" | "institution" | "government";
export type AccessLevel = 1 | 2 | 3 | 4 | 5;

// ── Core Identity ──────────────────────────────────────────────────────────

export interface UserIdentity {
  id: string;
  role: SystemRole;
  nin: string;                      // 11-digit Nigerian NIN
  ninMasked: string;                // e.g. "****-****-901"
  fullName: string;
  firstName: string;
  middleName?: string;
  surname: string;
  dateOfBirth: string;              // ISO date string
  sex: "Male" | "Female";
  nationality: string;
  stateOfOrigin: string;
  stateOfResidence: string;
  address: string;
  phone: string;
  email: string;
  avatar: string;                   // URL or placeholder
  verificationStatus: VerificationStatus;
  verifiedAt?: string;
  registeredAt: string;
  riskScore: number;                // 0–100
  biometrics: BiometricData[];
  documents: Document[];
  attributes: IdentityAttribute[];
}

export interface IdentityAttribute {
  key: string;
  label: string;
  value: string;
  verified: boolean;
  sensitive: boolean;
}

// ── Biometric Data ──────────────────────────────────────────────────────────

export interface BiometricData {
  type: BiometricType;
  status: "enrolled" | "not_enrolled" | "failed";
  score: number;                    // Confidence 0–100
  enrolledAt?: string;
  livenessCheck: boolean;
  template?: string;                // Hashed template reference
}

// ── Documents ──────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  type: "nin_slip" | "passport" | "utility_bill" | "birth_certificate" | "drivers_license" | "voters_card";
  label: string;
  status: DocumentStatus;
  uploadedAt?: string;
  verifiedAt?: string;
  expiryDate?: string;
  fileSize?: string;
  thumbnailUrl?: string;
  ipfsHash?: string;                // IPFS CID for decentralised storage
}

// ── Institutions ───────────────────────────────────────────────────────────

export interface Institution {
  id: string;
  name: string;
  shortName: string;
  type: InstitutionType;
  logo: string;
  description: string;
  trustScore: number;               // 0–100
  totalVerifications: number;
  activeUsers: number;
  isVerified: boolean;
  licenseNumber: string;
  accessLevel: AccessLevel;         // Default/Assigned access level (1-5)
  dataScope: string[];              // e.g. ["name", "dob", "address"]
  location: string;
  joinedAt: string;
  website?: string;
}

// ── Verification Requests ──────────────────────────────────────────────────

export interface VerificationRequest {
  id: string;
  institutionId: string;
  institution: Institution;
  userId: string;
  requestedLevel: AccessLevel;      // Level 1-5
  requestedScope: string[];         // Data fields requested
  purpose: string;
  status: RequestStatus;
  requestedAt: string;
  respondedAt?: string;
  expiresAt: string;
  riskLevel: RiskLevel;
  blockchainTxHash?: string;        // On-chain reference
  notes?: string;
}

// ── Governance ─────────────────────────────────────────────────────────────

export interface GovernanceAction {
  id: string;
  type: "access_request" | "attribute_update" | "revocation" | "delegation";
  title: string;
  description: string;
  institutionId: string;
  institution: Institution;
  requestedBy: string;
  dataScope: string[];
  expiryDate: string;
  riskLevel: RiskLevel;
  status: RequestStatus;
  approvalProgress: number;         // 0–100 (for multi-party scenarios)
  requiredApprovals: number;
  currentApprovals: number;
  createdAt: string;
  resolvedAt?: string;
}

// ── Access Logs ────────────────────────────────────────────────────────────

export interface AccessLog {
  id: string;
  institutionId: string;
  institutionName: string;
  action: "accessed" | "requested" | "approved" | "denied" | "revoked";
  dataScope: string[];
  timestamp: string;
  ipAddress?: string;
  blockchainRef?: string;
  status: "success" | "failed" | "pending";
}

// ── Dashboard Stats ────────────────────────────────────────────────────────

export interface DashboardStats {
  totalVerifications: number;
  approvedRequests: number;
  pendingApprovals: number;
  deniedRequests: number;
  riskScore: number;
  documentsVaulted: number;
  institutionsConnected: number;
  lastActivity: string;
}

// ── Platform Stats (Landing Page) ─────────────────────────────────────────

export interface PlatformStats {
  totalIdentities: number;
  totalVerifications: number;
  activeInstitutions: number;
  countriesSupported: number;
}

// ── Verification Analytics ─────────────────────────────────────────────────

export interface VerificationDataPoint {
  month: string;
  verifications: number;
  approvals: number;
  denials: number;
}

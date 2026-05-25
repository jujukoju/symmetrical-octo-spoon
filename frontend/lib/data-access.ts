import { AccessLevel, UserIdentity } from "./types";

export interface DisclosedData {
  field: string;
  label: string;
  value: string;
  isMasked: boolean;
  levelRequired: AccessLevel;
}

export function getDisclosedFields(user: UserIdentity, level: AccessLevel): DisclosedData[] {
  const fields = [
    { field: "verification_status", label: "Verification Status", value: user.verificationStatus.toUpperCase(), level: 1 },
    { field: "full_name", label: "Full Name", value: user.fullName, level: 2 },
    { field: "photo", label: "Photo ID", value: "Enrolled", level: 2 },
    { field: "dob", label: "Date of Birth", value: user.dateOfBirth, level: 3 },
    { field: "sex", label: "Sex", value: user.sex, level: 3 },
    { field: "phone", label: "Phone Number", value: user.phone, level: 3 },
    { field: "address", label: "Residential Address", value: user.address, level: 4 },
    { field: "state_of_origin", label: "State of Origin", value: user.stateOfOrigin, level: 4 },
    { field: "nin_masked", label: "NIN (Masked)", value: user.ninMasked, level: 4 },
    { field: "nin_full", label: "NIN (Full)", value: user.nin, level: 5 }
  ];

  return fields.map(f => ({
    field: f.field,
    label: f.label,
    value: level >= f.level ? f.value : "●●●●●●●●●●",
    isMasked: level < f.level,
    levelRequired: f.level as AccessLevel
  }));
}

export function getLevelDescription(level: AccessLevel): string {
  switch (level) {
    case 1: return "Identity Confirmation (Boolean)";
    case 2: return "Basic Identity (Name & Photo)";
    case 3: return "Standard Demographics (Level 2 + DOB, Gender, Phone)";
    case 4: return "Full Residency (Level 3 + Address, State, Masked NIN)";
    case 5: return "Full Disclosure (All Data + Biometric Integrity Proofs)";
    default: return "No Access";
  }
}

// frontend/lib/webauthn.ts

export function bufferDecode(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64.padEnd(base64.length + padLen, "=");
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return buffer;
}

export function bufferEncode(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function userIdToBuffer(userId: string): Uint8Array {
  return new TextEncoder().encode(userId);
}

export async function captureBiometricCredential(userId: string, userEmail: string) {
  if (!window.PublicKeyCredential) {
    throw new Error(
      "Biometric scanning is not supported on this browser or device."
    );
  }

  const challengeRes = await fetch("/api/webauthn/challenge", { credentials: "include" });
  if (!challengeRes.ok) {
    throw new Error("Failed to obtain a security challenge from the server.");
  }
  const { challenge: challengeB64 } = await challengeRes.json();
  const challengeBuffer = bufferDecode(challengeB64);

  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    challenge: challengeBuffer,
    rp: {
      name: "NINAuth — Nigeria Identity Platform",
      id: window.location.hostname,
    },
    user: {
      id: userIdToBuffer(userId) as any,
      name: userEmail,
      displayName: userEmail,
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" },
      { alg: -257, type: "public-key" },
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
    },
    timeout: 60_000,
    attestation: "direct",
  };

  const credential = (await navigator.credentials.create({
    publicKey: publicKeyOptions,
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("Biometric capture was cancelled or failed.");
  }

  const response = credential.response as AuthenticatorAttestationResponse;

  return {
    credential_id: credential.id,
    public_key: bufferEncode(response.attestationObject),
    client_data: bufferEncode(response.clientDataJSON),
  };
}

/** Enroll via WebAuthn proxy (challenge verified server-side). */
export async function enrollWithWebAuthn(nin: string, userId: string, userEmail: string) {
  const cred = await captureBiometricCredential(userId, userEmail);
  const res = await fetch("/api/webauthn/enroll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      nin,
      credential_id: cred.credential_id,
      public_key: cred.public_key,
      client_data: cred.client_data,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.detail === "string" ? data.detail : "Enrolment failed."
    );
  }
  return data;
}

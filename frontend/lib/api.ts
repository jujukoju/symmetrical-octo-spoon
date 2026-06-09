// frontend/lib/api.ts — Browser client (proxied; no API keys in bundle)

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
  processTime?: string;
}

export interface EnrollResponse {
  nin: string;
  status: string;
  request_id: string;
  timestamp: string;
  ipfs_cid?: string | null;
}

export interface VerifyResponse {
  nin: string;
  similarity: number;
  distance: number;
  threshold: number;
  decision: "MATCH" | "NO_MATCH";
  request_id: string;
  timestamp: string;
}

export interface HealthResponse {
  status: string;
  db_ok: boolean;
  model_loaded: boolean;
  device: string;
  version: string;
  timestamp: string;
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(endpoint, {
      ...options,
      credentials: "include",
    });
    const requestId = response.headers.get("X-Request-ID") || undefined;
    const processTime = response.headers.get("X-Process-Time-Ms") || undefined;

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail = (data as { detail?: string | { message?: string } }).detail;
      const errorMsg =
        typeof detail === "string"
          ? detail
          : typeof detail === "object" && detail?.message
            ? detail.message
            : `Request failed with status ${response.status}`;
      return { success: false, error: errorMsg, requestId, processTime };
    }

    return { success: true, data: data as T, requestId, processTime };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export const api = {
  async checkHealth(): Promise<ApiResponse<HealthResponse>> {
    return apiFetch<HealthResponse>("/api/oracle/health");
  },

  async enroll(
    nin: string,
    userWalletAddress: string,
    fingerprintFile: File
  ): Promise<
    ApiResponse<{
      message: string;
      job_id: string;
      nin: string;
      status_url: string;
    }>
  > {
    const formData = new FormData();
    formData.append("nin", nin);
    formData.append("user_wallet_address", userWalletAddress);
    formData.append("fingerprint", fingerprintFile);

    return apiFetch<{
      message: string;
      job_id: string;
      nin: string;
      status_url: string;
    }>("/api/oracle/enroll", {
      method: "POST",
      body: formData,
    });
  },

  // ── Pre-Defense Compatibility Alias ─────────────────────────────────────────
  async enrollCitizen(
    nin: string,
    userWalletAddress: string,
    fingerprintFile: File
  ): Promise<any> {
    return this.enroll(nin, userWalletAddress, fingerprintFile);
  },

  async checkEnrollStatus(
    jobId: string
  ): Promise<
    ApiResponse<{
      job_id: string;
      status: "pending" | "processing" | "completed" | "failed";
      step: string;
      tx_hash?: string;
      error?: string;
      timestamp?: string;
    }>
  > {
    return apiFetch(`/api/oracle/enroll/status/${jobId}`);
  },

  async verify(nin: string, fingerprintFile: File): Promise<ApiResponse<VerifyResponse>> {
    const formData = new FormData();
    formData.append("nin", nin);
    formData.append("fingerprint", fingerprintFile);

    return apiFetch<VerifyResponse>("/api/oracle/verify", {
      method: "POST",
      body: formData,
    });
  },
};
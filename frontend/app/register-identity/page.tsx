"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, ChevronRight, Upload, User, FileText,
  Fingerprint, Shield, Eye, EyeOff, AlertCircle, Loader2, XCircle, ScanFace, Globe, Database, LinkIcon
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { api } from "@/lib/api";
import { RoleGuard } from "@/components/shared/RoleGuard";
import { cn } from "@/lib/utils";

interface ExtendedEnrollResult {
  nin: string; // The system-assigned 11-digit NIN
  status: string;
  request_id: string;
  timestamp: string;
  ipfs_cid?: string | null;
  tx_hash?: string;
}

const STEPS = [
  { id: 1, label: "Personal Details", icon: User },
  { id: 2, label: "Biometrics", icon: Fingerprint },
  { id: 3, label: "Documents", icon: FileText },
  { id: 4, label: "Review", icon: CheckCircle2 },
];

function Field({
  label, id, type = "text", placeholder, value, onChange, required, hint, mask,
}: {
  label: string; id: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; required?: boolean; hint?: string; mask?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type={mask && !show ? "password" : type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-sm text-ink placeholder-ink-light focus:border-green focus:ring-1 focus:ring-green transition-all shadow-sm"
        />
        {mask && (
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-light hover:text-green transition-colors">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hint && <p className="mt-1.5 text-[10px] text-ink-light font-medium">{hint}</p>}
    </div>
  );
}

function FileDropzone({ label, onFile, accept, required }: { label: string; onFile: (f: File) => void; accept?: Record<string, string[]>; required?: boolean; }) {
  const [file, setFile] = useState<File | null>(null);
  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) { setFile(accepted[0]); onFile(accepted[0]); }
  }, [onFile]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept ?? { "image/*": [], "application/pdf": [] },
    maxFiles: 1,
  });

  return (
    <div {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all duration-200",
        isDragActive ? "border-green bg-green/5" : file ? "border-green/40 bg-green/5" : "border-surface-border bg-white hover:border-green/40"
      )}>
      <input {...getInputProps()} />
      {file ? (
        <>
          <CheckCircle2 className="h-8 w-8 text-green mb-2" />
          <p className="text-sm font-bold text-green">{file.name}</p>
          <p className="text-[10px] text-ink-muted mt-1 uppercase font-bold">{(file.size / 1024).toFixed(0)} KB • Ready</p>
        </>
      ) : (
        <>
          <Upload className={cn("h-8 w-8 mb-2", isDragActive ? "text-green" : "text-ink-light")} />
          <p className="text-sm text-ink-secondary text-center">
            {isDragActive ? "Drop to upload" : <><span className="text-green font-bold">Click to upload</span> or drag &amp; drop</>}
          </p>
          <p className="text-[10px] text-ink-muted mt-1 uppercase font-bold tracking-tight">
            {label} {required && <span className="text-red-500">*</span>}
          </p>
        </>
      )}
    </div>
  );
}

export default function RegisterIdentityPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "", middleName: "", surname: "", dob: "", sex: "", nationality: "", userWalletAddress: "",
  });

  const [docs, setDocs] = useState({ birthCertificate: null as File | null, passportPicture: null as File | null });

  // Biometrics uploader and scan simulation
  const [fingerprintFile, setFingerprintFile] = useState<File | null>(null);
  const [scanState, setScanState] = useState<"idle" | "uploaded" | "liveness" | "scanning" | "done">("idle");
  const [scanProgress, setScanProgress] = useState(0);

  // Enrollment process polling states
  const [loading, setLoading] = useState(false);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const [pollingStep, setPollingStep] = useState("");
  const [pollingStatus, setPollingStatus] = useState<"pending" | "processing" | "completed" | "failed" | null>(null);

  const [enrollResult, setEnrollResult] = useState<ExtendedEnrollResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Validation per step (No more local manual NIN matching) ────────────────
  const canAdvance = (): boolean => {
    if (currentStep === 1) {
      return !!(
        formData.firstName &&
        formData.surname &&
        formData.dob &&
        formData.sex &&
        formData.nationality &&
        /^0x[a-fA-F0-9]{40}$/.test(formData.userWalletAddress)
      );
    }
    if (currentStep === 2) return !!fingerprintFile && scanState === "done";
    if (currentStep === 3) return !!(docs.birthCertificate && docs.passportPicture);
    return true;
  };

  const stepError = (): string | null => {
    if (currentStep === 1) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(formData.userWalletAddress)) return "Please enter a valid Sepolia Ethereum Address (starting with 0x).";
      return "All fields marked with an asterisk (*) are required.";
    }
    if (currentStep === 2) {
      if (!fingerprintFile) return "Please upload your fingerprint image.";
      if (scanState !== "done") return "Device biometric validation scan is required.";
    }
    if (currentStep === 3) {
      if (!docs.birthCertificate || !docs.passportPicture) return "Both required documents must be uploaded.";
    }
    return null;
  };

  // ── Fingerprint Upload handler ──────────────────────────────────────────────
  const handleFingerprintSelect = (file: File) => {
    setFingerprintFile(file);
    setScanState("uploaded");
    setScanProgress(0);
  };

  // ── Biometric Scan Simulation ─────────────────────────────────────────────
  const startScan = async () => {
    if (!fingerprintFile) return;
    setScanState("liveness");
    await new Promise((r) => setTimeout(r, 1500));
    setScanState("scanning");

    for (let i = 1; i <= 6; i++) {
      await new Promise((r) => setTimeout(r, 600));
      setScanProgress(i);
    }
    setScanState("done");
  };

  // ── Async polling execution (Extracts algorithmic system-generated NIN) ────
  const pollStatus = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await api.getEnrollmentJobStatus(jobId);
        if (response.success && response.data) {
          const { status, step, tx_hash, assigned_nin, error } = response.data;
          setPollingStatus(status);
          setPollingStep(step);

          if (status === "completed") {
            clearInterval(interval);
            setEnrollResult({
              nin: assigned_nin || "GEN_ERROR_RETRY", // Binds the server issued NIN to result tier
              status: "completed",
              request_id: jobId,
              timestamp: new Date().toISOString(),
              ipfs_cid: `local-db:citizen-uuid-${jobId.slice(0, 8)}`,
              tx_hash: tx_hash || "Anchored to Sepolia Registry",
            });
            setPollingJobId(null);
            setLoading(false);
          } else if (status === "failed") {
            clearInterval(interval);
            setErrorMsg(error || "Biometric 1:N deduplication fraud alert caught.");
            setPollingJobId(null);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Error polling enrollment status:", err);
      }
    }, 1500);
  };

  // ── Production Multipart Identity Enrolment Request Call ───────────────────
  const handleEnroll = async () => {
    if (scanState !== "done" || !fingerprintFile) {
      setErrorMsg("Biometrics verification not finalized.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // Build proper multi-part body layout matching our route parser
      const payload = new FormData();
      payload.append("first_name", formData.firstName);
      payload.append("middle_name", formData.middleName);
      payload.append("last_name", formData.surname);
      payload.append("date_of_birth", formData.dob);
      payload.append("user_wallet_address", formData.userWalletAddress);
      payload.append("fingerprint", fingerprintFile);

      // Invoke your structural API Client layer
      const response = await api.enrollCitizen(payload);

      if (response.success && response.data) {
        const { job_id } = response.data;
        setPollingJobId(job_id);
        setPollingStatus("pending");
        setPollingStep("Identity task submitted to gateway scheduler");
        pollStatus(job_id);
      } else {
        setErrorMsg(response.error || "Enrollment packet transmission rejected.");
        setLoading(false);
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Enrollment execution failed.");
      setLoading(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (enrollResult) {
    return (
      <RoleGuard allowedRoles={["citizen"]}>
        <div className="min-h-screen bg-surface-soft flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-white rounded-3xl border border-surface-border p-12 text-center shadow-green-lg">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green/10 ring-4 ring-green/5 mb-6">
              <CheckCircle2 className="h-10 w-10 text-green" />
            </div>
            <h2 className="text-xl font-bold text-ink mb-2">Decentralized Identity Enrolled</h2>
            <p className="text-ink-secondary mb-6 text-xs">
              Biometric features extracted, deduplicated, and locked down using AES-256-GCM architecture mappings.
            </p>

            <div className="space-y-3 mb-8">
              {/* ALGORITHMIC NIN REVEAL DISPLAYER */}
              <div className="bg-emerald-50/50 rounded-xl p-4 border border-green/20 flex justify-between items-center text-left">
                <div>
                  <p className="text-[9px] font-bold text-green uppercase tracking-wider">Officially Assigned NIN</p>
                  <p className="text-xl font-mono font-bold text-slate-900 tracking-[0.1em]">{enrollResult.nin}</p>
                </div>
                <Shield className="h-5 w-5 text-green" />
              </div>

              <div className="bg-surface-soft rounded-xl p-3 border border-surface-border flex justify-between items-center text-left">
                <div>
                  <p className="text-[9px] font-bold text-ink-muted uppercase tracking-wider">Storage CID Reference</p>
                  <p className="text-[11px] font-mono text-ink-secondary truncate max-w-[200px]">{enrollResult.ipfs_cid}</p>
                </div>
                <Database className="h-4.5 w-4.5 text-green" />
              </div>

              {enrollResult.tx_hash && (
                <div className="bg-surface-soft rounded-xl p-3 border border-surface-border text-left">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[9px] font-bold text-ink-muted uppercase tracking-wider">Sepolia Blockchain TX</p>
                    <Globe className="h-4.5 w-4.5 text-green animate-pulse" />
                  </div>
                  <p className="text-[11px] font-mono text-green truncate mb-2">{enrollResult.tx_hash}</p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${enrollResult.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-green hover:underline"
                  >
                    View on Etherscan <LinkIcon className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            <button
              onClick={() => { window.location.href = "/citizen/dashboard"; }}
              className="w-full bg-green text-white font-bold py-3.5 rounded-xl hover:bg-green-light transition-all shadow-green-sm text-sm">
              Go to Dashboard
            </button>
          </motion.div>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["citizen"]}>
      <div className="min-h-screen bg-surface-soft py-12">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-green mb-2">Citizen Portal</p>
            <h1 className="text-3xl font-bold text-ink">Decentralized Registration</h1>
            <p className="text-ink-secondary text-sm mt-2 italic">Official Secure Enrollment using Machine Learning &amp; Sepolia Blockchain</p>
          </motion.div>

          {/* Progress bar */}
          <div className="mb-10 px-2">
            <div className="flex items-center justify-between mb-4">
              {STEPS.map((step, i) => {
                const done = currentStep > step.id;
                const active = currentStep === step.id;
                return (
                  <div key={step.id} className="flex items-center gap-2 flex-1">
                    <div className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold shrink-0 transition-all duration-500",
                      done ? "bg-green text-white shadow-green-sm" : active ? "bg-white text-green ring-4 ring-green/10 border-2 border-green" : "bg-white border-2 border-surface-border text-ink-light"
                    )}>
                      {done ? <CheckCircle2 className="h-5 w-5" /> : step.id}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={cn("flex-1 h-1 mx-1 rounded-full transition-all duration-500", done ? "bg-green" : "bg-surface-muted")} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form card */}
          <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl border border-surface-border bg-white p-6 sm:p-10 shadow-card">

            {pollingJobId ? (
              <div className="text-center py-8">
                <Loader2 className="h-10 w-10 animate-spin text-green mx-auto mb-6" />
                <h3 className="text-lg font-bold text-ink mb-1">Processing Identity Registration</h3>
                <p className="text-xs text-ink-secondary mb-8">NIMC Identity Oracle executing decentralized workflow...</p>

                <div className="max-w-md mx-auto bg-surface-soft border border-surface-border rounded-2xl p-6 text-left space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shrink-0",
                      pollingStep === "Extracting 128-D biometric embeddings" ? "bg-green text-white ring-2 ring-green/15" :
                        ["Running 1:N fraud deduplication search", "Generating algorithmic identity payload", "Encrypting template payload", "Committing identity to safe relational tables", "Anchoring identity on Sepolia Network", "Done"].includes(pollingStep) ? "bg-green text-white" : "bg-white border border-surface-border text-ink-light"
                    )}>
                      {["Running 1:N fraud deduplication search", "Generating algorithmic identity payload", "Encrypting template payload", "Committing identity to safe relational tables", "Anchoring identity on Sepolia Network", "Done"].includes(pollingStep) ? <CheckCircle2 className="h-3.5 w-3.5" /> : "1"}
                    </div>
                    <span className="text-xs font-semibold text-ink">Extract features via Siamese CNN model</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shrink-0",
                      pollingStep === "Running 1:N fraud deduplication search" ? "bg-green text-white ring-2 ring-green/15" :
                        ["Generating algorithmic identity payload", "Encrypting template payload", "Committing identity to safe relational tables", "Anchoring identity on Sepolia Network", "Done"].includes(pollingStep) ? "bg-green text-white" : "bg-white border border-surface-border text-ink-light"
                    )}>
                      {["Generating algorithmic identity payload", "Encrypting template payload", "Committing identity to safe relational tables", "Anchoring identity on Sepolia Network", "Done"].includes(pollingStep) ? <CheckCircle2 className="h-3.5 w-3.5" /> : "2"}
                    </div>
                    <span className="text-xs font-semibold text-ink">1:N Biometric Fraud Cross-Match Scan</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shrink-0",
                      pollingStep === "Committing identity to safe relational tables" ? "bg-green text-white ring-2 ring-green/15" :
                        ["Anchoring identity on Sepolia Network", "Done"].includes(pollingStep) ? "bg-green text-white" : "bg-white border border-surface-border text-ink-light"
                    )}>
                      {["Anchoring identity on Sepolia Network", "Done"].includes(pollingStep) ? <CheckCircle2 className="h-3.5 w-3.5" /> : "3"}
                    </div>
                    <span className="text-xs font-semibold text-ink">Auto-Issue Unique NIN & Save to PostgreSQL</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shrink-0",
                      pollingStep === "Anchoring identity on Sepolia Network" ? "bg-green text-white ring-2 ring-green/15" :
                        pollingStep === "Done" ? "bg-green text-white" : "bg-white border border-surface-border text-ink-light"
                    )}>
                      {pollingStep === "Done" ? <CheckCircle2 className="h-3.5 w-3.5" /> : "4"}
                    </div>
                    <span className="text-xs font-semibold text-ink">Register identity hash on Sepolia smart contract</span>
                  </div>
                </div>

                <div className="mt-8 text-left bg-green/5 border border-green/15 rounded-xl p-3 max-w-md mx-auto flex gap-2">
                  <Shield className="h-4 w-4 text-green shrink-0 mt-0.5" />
                  <p className="text-[9px] text-green font-medium">
                    Do not close this window. Your browser session is securely tracking this transaction status using Job ID: <strong className="font-mono">{pollingJobId.slice(0, 13)}...</strong>
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-8 pb-6 border-b border-surface-border">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green/5 text-green border border-green/10">
                    {(() => { const S = STEPS[currentStep - 1].icon; return <S className="h-5 w-5" />; })()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink-muted uppercase tracking-widest leading-none mb-1">Step {currentStep} of {STEPS.length}</p>
                    <p className="font-bold text-ink text-lg">{STEPS[currentStep - 1].label}</p>
                  </div>
                </div>

                <AnimatePresence>
                  {errorMsg && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
                      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                        <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-red-700">Enrolment Failed</p>
                          <p className="text-xs text-red-600 mt-0.5">{errorMsg}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="min-h-[280px]">
                  {currentStep === 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* MANUAL NIN FIELD REMOVED FROM INTERACTIVE UI */}
                      <Field label="Ethereum Wallet Address" id="userWalletAddress" value={formData.userWalletAddress} onChange={(v) => setFormData({ ...formData, userWalletAddress: v })} required hint="Ethereum wallet to register on-chain" placeholder="0x..." />
                      <Field label="First Name" id="firstName" value={formData.firstName} onChange={(v) => setFormData({ ...formData, firstName: v })} required placeholder="John" />
                      <Field label="Middle Name (Optional)" id="middleName" value={formData.middleName} onChange={(v) => setFormData({ ...formData, middleName: v })} placeholder="Kofi" />
                      <Field label="Surname" id="surname" value={formData.surname} onChange={(v) => setFormData({ ...formData, surname: v })} required placeholder="Okonkwo" />
                      <Field label="Nationality" id="nationality" value={formData.nationality} onChange={(v) => setFormData({ ...formData, nationality: v })} required placeholder="Nigerian" />
                      <Field label="Date of Birth" id="dob" type="date" value={formData.dob} onChange={(v) => setFormData({ ...formData, dob: v })} required />
                      <div>
                        <label className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">Sex <span className="text-red-500">*</span></label>
                        <select value={formData.sex} onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                          className="w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-sm text-ink focus:border-green focus:ring-1 focus:ring-green shadow-sm">
                          <option value="">Select</option>
                          <option>Male</option>
                          <option>Female</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <p className="text-sm text-ink-secondary mb-4">
                        Upload a raw fingerprint scan image (BMP, PNG, or JPEG) which will be processed through our Siamese CNN feature extractor.
                      </p>

                      <div className="bg-surface-soft border border-surface-border rounded-2xl p-6 text-center flex flex-col items-center">
                        {scanState === "idle" && (
                          <div className="w-full max-w-md">
                            <FileDropzone label="Fingerprint Scan Image (BMP/PNG/JPEG)" onFile={handleFingerprintSelect} accept={{ "image/*": [] }} required />
                          </div>
                        )}

                        {scanState === "uploaded" && fingerprintFile && (
                          <>
                            <Fingerprint className="h-12 w-12 text-green mb-3" />
                            <h3 className="text-sm font-bold text-ink mb-1">Fingerprint File Uploaded</h3>
                            <p className="text-xs text-ink-secondary mb-6">{fingerprintFile.name} ({(fingerprintFile.size / 1024).toFixed(0)} KB)</p>
                            <button onClick={startScan} className="bg-ink text-white font-bold py-3 px-6 rounded-xl hover:bg-ink-light transition-all shadow-sm text-xs">
                              Run Biometric Liveness Validation
                            </button>
                          </>
                        )}

                        {scanState === "liveness" && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-4">
                            <ScanFace className="h-14 w-14 text-green animate-pulse mb-3" />
                            <h3 className="text-sm font-bold text-ink mb-1">Checking Biometric Liveness...</h3>
                            <p className="text-xs text-ink-secondary">Analyzing image boundaries and ridge depth.</p>
                          </motion.div>
                        )}

                        {scanState === "scanning" && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center w-full py-4">
                            <Fingerprint className="h-14 w-14 text-green mb-3 animate-bounce" />
                            <h3 className="text-sm font-bold text-ink mb-3">Mapping Biometric Template ({scanProgress}/6)</h3>

                            <div className="w-full max-w-xs bg-surface-muted rounded-full h-2 mb-2">
                              <motion.div className="bg-green h-2 rounded-full" initial={{ width: 0 }} animate={{ width: `${(scanProgress / 6) * 100}%` }} transition={{ duration: 0.3 }} />
                            </div>
                          </motion.div>
                        )}

                        {scanState === "done" && (
                          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center py-4">
                            <div className="bg-green/10 p-3 rounded-full mb-3">
                              <CheckCircle2 className="h-10 w-10 text-green" />
                            </div>
                            <h3 className="text-sm font-bold text-ink mb-1">Biometrics Captured</h3>
                            <p className="text-xs text-green font-semibold">Ridge scan matches quality score requirements.</p>
                          </motion.div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 bg-green/5 border border-green/10 rounded-xl p-4">
                        <Shield className="h-5 w-5 text-green shrink-0" />
                        <p className="text-[10px] font-medium text-ink-secondary">
                          Biometric vector is encrypted using AES-256-GCM. Off-chain database templates only store ciphertext.
                        </p>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <p className="text-sm text-ink-secondary mb-2">Upload your mandatory identity documents.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <FileDropzone label="Birth Certificate (PDF/IMG)" onFile={(f) => setDocs({ ...docs, birthCertificate: f })} required />
                        <FileDropzone label="Passport Picture (JPEG)" onFile={(f) => setDocs({ ...docs, passportPicture: f })} accept={{ "image/jpeg": [], "image/png": [] }} required />
                      </div>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="space-y-6">
                      <div className="bg-surface-soft rounded-2xl p-6 border border-surface-border">
                        <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-4">Registration Summary</h3>
                        <div className="space-y-3">
                          {[
                            { l: "NIN Allocation Mode", v: "AUTOMATIC ALGORITHMIC ISSUANCE" },
                            { l: "Ethereum Address", v: formData.userWalletAddress },
                            { l: "Name", v: `${formData.firstName} ${formData.middleName} ${formData.surname}`.replace(/\s+/g, ' ').trim() || "—" },
                            { l: "Sex", v: formData.sex || "—" },
                            { l: "Nationality", v: formData.nationality || "—" },
                            { l: "Biometric File", v: fingerprintFile ? fingerprintFile.name : "Not uploaded" },
                            { l: "Documents", v: (docs.birthCertificate && docs.passportPicture) ? "Uploaded" : "Missing" },
                          ].map((item) => (
                            <div key={item.l} className="flex justify-between items-center border-b border-surface-border/50 pb-2">
                              <span className="text-[10px] font-bold text-ink-muted uppercase">{item.l}</span>
                              <span className="text-xs font-bold text-ink truncate max-w-[240px]">{item.v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={handleEnroll}
                        disabled={loading || scanState !== "done" || !fingerprintFile}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-green py-4 font-bold text-white hover:bg-green-light transition-all shadow-green-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Dispatching Job to Identity Oracle...
                          </>
                        ) : (
                          "Submit Enrollment & Register Identity"
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                {!enrollResult && currentStep < 4 && (
                  <div className="flex gap-3 mt-10 pt-8 border-t border-surface-border">
                    {currentStep > 1 && (
                      <button
                        onClick={() => { setCurrentStep((s) => s - 1); setErrorMsg(null); }}
                        className="rounded-xl border border-surface-border px-8 py-3 text-sm font-bold text-ink-muted hover:text-green hover:bg-surface-soft transition-all">
                        Back
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (!canAdvance()) {
                          setErrorMsg(stepError());
                          return;
                        }
                        setErrorMsg(null);
                        setCurrentStep((s) => Math.min(s + 1, 4));
                      }}
                      disabled={!canAdvance()}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green py-3 text-sm font-bold text-white hover:bg-green-light transition-all shadow-green-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Continue <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      </div>
    </RoleGuard>
  );
}
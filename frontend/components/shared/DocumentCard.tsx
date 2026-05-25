"use client";
import { motion } from "framer-motion";
import { cn, formatDate } from "@/lib/utils";
import type { Document } from "@/lib/types";
import { FileText, Lock, Unlock, CheckCircle2, Clock, Download, Eye } from "lucide-react";

interface Props {
  document: Document;
  onView?: () => void;
  onDownload?: () => void;
}

const typeIcons: Record<string, string> = {
  nin_slip: "🪪",
  passport: "📘",
  utility_bill: "📄",
  birth_certificate: "📃",
  drivers_license: "🚗",
  voters_card: "🗳️",
};

export function DocumentCard({ document: doc, onView, onDownload }: Props) {
  const locked = doc.status === "locked";
  const verified = doc.status === "verified";

  return (
    <motion.div
      whileHover={!locked ? { y: -2, boxShadow: "0 0 0 1px rgba(201,168,76,0.2), 0 8px 20px rgba(0,0,0,0.3)" } : {}}
      className={cn(
        "relative rounded-xl border p-4 transition-all duration-300 overflow-hidden",
        locked ? "border-charcoal-border bg-charcoal-mid/50 opacity-70" : "border-gold/20 bg-charcoal-light cursor-pointer"
      )}
    >
      {/* Lock overlay for locked documents */}
      {locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-charcoal/60 backdrop-blur-[2px] rounded-xl z-10">
          <Lock className="h-6 w-6 text-slate-500 mb-2" />
          <p className="text-xs text-slate-500 font-medium">Not uploaded</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{typeIcons[doc.type] || "📄"}</span>
          <div>
            <p className="text-sm font-semibold text-white">{doc.label}</p>
            {doc.fileSize && <p className="text-xs text-slate-500">{doc.fileSize}</p>}
          </div>
        </div>
        <div className={cn("flex h-6 w-6 items-center justify-center rounded-full",
          verified ? "bg-emerald-400/15" : doc.status === "pending" ? "bg-yellow-400/15" : "bg-charcoal-mid")}>
          {verified ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> :
           doc.status === "pending" ? <Clock className="h-3.5 w-3.5 text-yellow-400" /> :
           <Unlock className="h-3.5 w-3.5 text-slate-500" />}
        </div>
      </div>

      {/* Status bar */}
      <div className={cn("mb-3 rounded-full px-2.5 py-0.5 inline-flex items-center gap-1.5 text-xs font-medium border",
        verified ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" :
        doc.status === "pending" ? "bg-yellow-400/10 text-yellow-400 border-yellow-400/20" :
        "bg-charcoal-mid text-slate-500 border-charcoal-border")}>
        {verified ? "Verified" : doc.status === "pending" ? "Under Review" : "Locked"}
      </div>

      {/* Dates */}
      {doc.uploadedAt && (
        <p className="text-xs text-slate-500">Uploaded {formatDate(doc.uploadedAt)}</p>
      )}
      {doc.expiryDate && (
        <p className="text-xs text-slate-500">Expires {formatDate(doc.expiryDate)}</p>
      )}

      {/* Actions */}
      {!locked && (
        <div className="mt-3 flex gap-2">
          <button onClick={onView}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-charcoal-border py-1.5 text-xs text-slate-400 hover:text-white hover:border-gold/40 transition-all">
            <Eye className="h-3.5 w-3.5" /> View
          </button>
          <button onClick={onDownload}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-charcoal-border py-1.5 text-xs text-slate-400 hover:text-white hover:border-gold/40 transition-all">
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        </div>
      )}
    </motion.div>
  );
}

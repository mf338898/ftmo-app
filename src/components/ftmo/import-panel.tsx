"use client";

import { useState } from "react";
import clsx from "clsx";

export function ImportPanel({
  onImport,
  accountName,
  disabled,
}: {
  onImport: (file: File) => Promise<void>;
  accountName: string;
  disabled: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

  const handleUpload = async () => {
    if (!file) {
      setMessage("Ajoutez un fichier CSV ou XLSX FTMO.");
      setMessageType("error");
      return;
    }
    setBusy(true);
    setMessage(null);
    setMessageType(null);
    try {
      await onImport(file);
      setMessage("Import terminé avec succès ! Les données sont en cours de mise à jour...");
      setMessageType("success");
      setFile(null);
      setTimeout(() => {
        setMessage(null);
        setMessageType(null);
      }, 5000);
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Échec de l'import. Vérifiez que Firebase est configuré.";
      setMessage(errorMsg);
      setMessageType("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-900">Import FTMO</p>
        <p className="text-xs text-slate-500">
          {accountName} — CSV ou XLSX, dédoublonné par Ticket.
        </p>
        {message && (
          <p
            className={clsx(
              "mt-1 text-xs font-medium",
              messageType === "success"
                ? "text-green-600"
                : messageType === "error"
                  ? "text-red-600"
                  : "text-slate-600",
            )}
          >
            {message}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile) {
              setFile(selectedFile);
              setMessage(null);
              setMessageType(null);
            }
          }}
          className="text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
          disabled={busy || disabled}
        />
        <button
          onClick={handleUpload}
          disabled={busy || disabled || !file}
          className={clsx(
            "rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition",
            busy || disabled || !file
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700",
          )}
        >
          {busy ? "Import en cours..." : "Importer"}
        </button>
      </div>
    </div>
  );
}


"use client";
import { useEffect, useId, useRef, useState } from "react";

interface ConfirmDialogProps {
  title: string;
  description: string;
  /** Mot à recopier pour valider (ex : « SUPPRIMER ») */
  expected: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Message affiché tant que la saisie ne correspond pas au mot attendu */
  mismatchMessage: (expected: string) => string;
  /** Action en cours : tout est bloqué et la fermeture est impossible */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation d'une action irréversible : on recopie un mot pour la valider.
 * Remplace prompt() : interface stylée, retour immédiat si la saisie est fausse, utilisable au clavier et au lecteur d'écran.
 */
export function ConfirmDialog({
  title, description, expected, confirmLabel, cancelLabel, mismatchMessage, busy = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  const [value, setValue] = useState("");
  const id = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const matches = value === expected;
  const showMismatch = value !== "" && !matches;

  // Échap ferme (sauf pendant l'action) ; Tab reste à l'intérieur de la fenêtre
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        onCancel();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("input, button:not([disabled])"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { if (!busy) onCancel() }} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-desc`}
        className="relative w-full max-w-md rounded-[32px] border border-white/10 bg-bg1 p-8 shadow-2xl"
      >
        <h2 id={`${id}-title`} className="text-xl font-black text-white mb-3">{title}</h2>
        <p id={`${id}-desc`} className="text3 text-sm leading-relaxed mb-5">{description}</p>

        <form onSubmit={(e) => { e.preventDefault(); if (matches && !busy) onConfirm(); }} className="flex flex-col gap-4">
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={busy}
            autoComplete="off"
            aria-label={description}
            aria-invalid={showMismatch}
            aria-describedby={showMismatch ? `${id}-hint` : undefined}
            placeholder={expected}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-rouge/60"
          />
          <p id={`${id}-hint`} role="status" className="min-h-4 text-[11px] text-rouge">
            {showMismatch ? mismatchMessage(expected) : ""}
          </p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-full border border-white/10 px-5 py-2 text-xs font-bold uppercase tracking-widest text-gray-300 hover:bg-white/5 disabled:opacity-50"
            >{cancelLabel}</button>
            <button
              type="submit"
              disabled={!matches || busy}
              className="rounded-full border border-rouge/40 bg-rouge px-5 py-2 text-xs font-bold uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40"
            >{confirmLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

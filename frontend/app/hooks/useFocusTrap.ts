import { RefObject, useEffect, useRef } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Piège le focus dans un conteneur (modale) tant que `active` est vrai :
 * focus initial sur le premier élément focalisable (ou le conteneur), Tab/Maj+Tab bouclent,
 * Échap appelle `onEscape`, et le focus est rendu à l'élément qui l'avait à l'ouverture.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, onEscape?: () => void) {
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const getFocusable = () => container ? Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
    if (container) {
      if (!container.hasAttribute("tabindex")) container.tabIndex = -1;
      (getFocusable()[0] ?? container).focus();
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { escapeRef.current?.(); return; }
      if (e.key !== "Tab" || !container) return;
      const items = getFocusable();
      if (items.length === 0) { e.preventDefault(); container.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && (current === first || current === container)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && current === last) { e.preventDefault(); first.focus(); }
      else if (current && !container.contains(current)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previous && previous.isConnected) previous.focus();
    };
  }, [active, ref]);
}

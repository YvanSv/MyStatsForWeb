import { DataInfo } from "@/app/data/DataInfos";

/** « grid » et « small » : artiste, puis album après un séparateur ; « list » : séparateur collé au texte. */
export type CellSubtitleVariant = "grid" | "small" | "list";

/** Sous-titre d'une cellule : rien pour un artiste, artiste (+ album pour une musique) sinon. */
export function renderCellSubtitle(element: DataInfo, variant: CellSubtitleVariant) {
  if (element.type === "artist") return null;
  if (element.type !== "track") return element.artist;

  if (variant === "list") {
    return (
      <>
        {element.artist}
        {element.album && (
          <>
            {" ●"}
            <span className="italic opacity-80"> {element.album}</span>
          </>
        )}
      </>
    );
  }

  const hide = variant === "grid" ? "hidden md:inline " : "";
  return (
    <>
      {element.artist}
      {element.album && (
        <>
          <span className={variant === "grid" ? "hidden md:inline" : undefined}> ● </span>
          <span className={`${hide}italic opacity-80`}>{element.album}</span>
        </>
      )}
    </>
  );
}

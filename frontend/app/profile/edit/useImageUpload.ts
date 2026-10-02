import toast from "react-hot-toast";
import { TOAST_ERROR_OPTIONS } from "@/app/constants/ui";
import { imageError } from "@/app/services/validation";

export type ImageKey = "avatar_url" | "banner_url";

// Gestionnaires de changement des champs fichier (avatar et bannière) : vérifie l'image, la lit en data URL et la transmet
export function useImageUpload(
  onLoaded: (key: ImageKey, dataUrl: string) => void,
  messages: { errorImageType: string; errorWeight: string },
) {
  // Retourne true si l'image est acceptable ; sinon prévient l'utilisateur (le serveur revérifie de toute façon)
  const checkImage = (file: File) => {
    const error = imageError(file);
    if (error === "type") toast.error(messages.errorImageType, TOAST_ERROR_OPTIONS);
    else if (error === "size") toast.error(messages.errorWeight, TOAST_ERROR_OPTIONS);
    return error === null;
  };

  return (key: ImageKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // On vide le champ pour pouvoir re-sélectionner le même fichier après un refus
    e.target.value = "";
    if (!file || !checkImage(file)) return;

    const reader = new FileReader();
    reader.onloadend = () => onLoaded(key, reader.result as string);
    reader.readAsDataURL(file);
  };
}

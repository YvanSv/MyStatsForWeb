// Limites de saisie partagées entre la page du compte et l'édition du profil
export const NAME_MIN = 3;
export const NAME_MAX = 20;
// Compteur du pseudo : orange à partir de NAME_WARN, rouge à partir de NAME_DANGER
export const NAME_WARN = 14;
export const NAME_DANGER = 17;

export const BIO_MAX = 500;
export const BIO_WARN = 400;
export const BIO_DANGER = 450;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const PASSWORD_WARN = 100;
export const PASSWORD_DANGER = 114;

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

// Édition du profil : mêmes règles que le serveur (jamais de SVG)
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const RESERVED_SLUGS = ["dashboard", "edit", "settings", "admin", "login", "api"];
// Seuils propres au slug (compteur : jaune, orange, rouge)
export const SLUG_WARN = 20;
export const SLUG_DANGER = 25;
export const SLUG_MAX = 30;

export const ALL_PERMS = { profile: true, stats: true, favorites: true, history: true, dashboard: true };
export type PermKey = keyof typeof ALL_PERMS;

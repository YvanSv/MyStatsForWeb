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

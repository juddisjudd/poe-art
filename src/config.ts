export type Game = "poe1" | "poe2";

export const GAMES: Game[] = ["poe1", "poe2"];

export const BUCKET = process.env.R2_BUCKET || "poe-art";
export const BASE_URL = (process.env.ART_BASE_URL || "https://art.pobredux.com").replace(/\/+$/, "");
export const EXPLORER = process.env.GGPK_EXPLORER || "ggpk-explorer";
export const SCHEMA = process.env.DAT_SCHEMA || null;

export const IMMUTABLE = "public, max-age=31536000, immutable";
export const SHORT = "public, max-age=300";

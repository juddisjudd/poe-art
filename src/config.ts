export type Game = "poe1" | "poe2";

export const GAMES: Game[] = ["poe1", "poe2"];

export const BUCKET = process.env.R2_BUCKET || "poe-art";
export const BASE_URL = (process.env.ART_BASE_URL || "https://art.pobredux.com").replace(/\/+$/, "");
export const EXPLORER = process.env.GGPK_EXPLORER || "ggpk-explorer";
export const SCHEMA = process.env.DAT_SCHEMA || null;

export const IMMUTABLE = "public, max-age=31536000, immutable";
export const SHORT = "public, max-age=300";

const UI = "Art/2DArt/UIImages/InGame";

export const SOCKETS: Record<Game, Record<string, string>> = {
  poe1: {
    red: `${UI}/4K/ItemsSocketRed`,
    green: `${UI}/4K/ItemsSocketGreen`,
    blue: `${UI}/4K/ItemsSocketBlue`,
    white: `${UI}/4K/ItemsSocketWhite`,
    abyss: `${UI}/AbyssSocket`,
    link: `${UI}/4K/ItemsSocketConnection`,
  },
  poe2: {
    red: `${UI}/4K/ItemsSocketRed`,
    green: `${UI}/4K/ItemsSocketGreen`,
    blue: `${UI}/4K/ItemsSocketBlue`,
    white: `${UI}/4K/ItemsSocketWhite`,
    link: `${UI}/4K/ItemsSocketConnection`,
    empty: `${UI}/4K/SoulCoresSocketEmpty`,
    rune: `${UI}/4K/RuneSocketFilled`,
    soulCore: `${UI}/4K/SoulCoresSocketFilled`,
  },
};

import "dotenv/config";

export const PORT = Number(process.env.PORT || 4000);
export const NODE_ENV = process.env.NODE_ENV || "development";
export const STORAGE_ROOT = process.env.STORAGE_ROOT || "storage";

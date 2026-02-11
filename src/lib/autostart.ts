import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";

export async function enableAutostart(): Promise<void> {
  await enable();
}

export async function disableAutostart(): Promise<void> {
  await disable();
}

export async function isAutoStartEnabled(): Promise<boolean> {
  return await isEnabled();
}

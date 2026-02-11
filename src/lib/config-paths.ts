import { invoke } from "@tauri-apps/api/core";

export async function getConfigDir(): Promise<string> {
  return await invoke<string>("get_config_dir");
}

export async function ensureConfigDir(): Promise<string> {
  return await invoke<string>("ensure_config_dir");
}

export async function getKanataBinaryPath(): Promise<string> {
  return await invoke<string>("get_kanata_binary_path");
}

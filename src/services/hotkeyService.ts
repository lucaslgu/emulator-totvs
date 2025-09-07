import { invoke } from "@tauri-apps/api/core";

/**
 * Starts the hotkey (Ctrl+Q) with the provided wallet number
 * @param walletNumber The wallet number to send when hotkey is pressed
 * @returns Promise resolving to true if successful
 */
export async function startHotkey(walletNumber: string): Promise<boolean> {
  try {
    return await invoke("start_hotkey", { textToSend: walletNumber });
  } catch (error) {
    console.error("Failed to start hotkey:", error);
    throw error;
  }
}

/**
 * Stops the currently active hotkey
 * @returns Promise resolving to true if successful
 */
export async function stopHotkey(): Promise<boolean> {
  try {
    return await invoke("stop_hotkey");
  } catch (error) {
    console.error("Failed to stop hotkey:", error);
    throw error;
  }
}

/**
 * Checks if the hotkey is currently active
 * @returns Promise resolving to true if hotkey is active
 */
export async function checkHotkeyStatus(): Promise<boolean> {
  try {
    return await invoke("check_hotkey_status");
  } catch (error) {
    console.error("Failed to check hotkey status:", error);
    return false;
  }
}

/**
 * Runs a comprehensive diagnostic of the hotkey system
 * @returns Promise resolving to diagnostic information
 */
export async function diagnoseHotkeySystem(): Promise<any> {
  try {
    return await invoke("diagnose_hotkey_system");
  } catch (error) {
    console.error("Failed to run hotkey diagnostics:", error);
    throw error;
  }
}
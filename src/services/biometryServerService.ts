import { invoke } from "@tauri-apps/api/core";

/**
 * Starts the local biometry server with the provided biometric data
 * @param host The host to bind the server to (e.g. "127.0.0.1")
 * @param port The port to bind the server to (e.g. 21004)
 * @param biometryData Array of base64 encoded biometric data
 * @returns Promise resolving to true if successful
 */
export async function startBiometryServer(
  host: string,
  port: number,
  biometryData: string[]
): Promise<boolean> {
  try {
    return await invoke("start_biometry_server", {
      host,
      port,
      biometryData,
      "match": true,
      "message": "Verificação simulada.",
      "success": true
    });
  } catch (error) {
    console.error("Failed to start biometry server:", error);
    throw error;
  }
}

/**
 * Stops the currently active biometry server
 * @param host The host the server is running on
 * @param port The port the server is running on
 * @returns Promise resolving to true if successful
 */
export async function stopBiometryServer(
  host: string,
  port: number
): Promise<boolean> {
  try {
    return await invoke("stop_biometry_server", { host, port });
  } catch (error) {
    console.error("Failed to stop biometry server:", error);
    throw error;
  }
}

/**
 * Checks if the biometry server is currently active
 * @returns Promise resolving to true if server is active
 */
export async function checkBiometryServerStatus(): Promise<boolean> {
  try {
    return await invoke("check_biometry_server_status");
  } catch (error) {
    console.error("Failed to check biometry server status:", error);
    return false;
  }
}
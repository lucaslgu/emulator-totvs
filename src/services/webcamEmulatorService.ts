import { invoke } from "@tauri-apps/api/core";

/**
 * Source type for the webcam emulator
 */
export type WebcamSourceType = "image" | "video" | "camera";

/**
 * Starts the webcam emulator with the specified source
 * @param sourceType Type of source to use (image, video, camera)
 * @param sourceData Data for the source:
 *                   - For image: base64 string
 *                   - For video: file path
 *                   - For camera: camera index as string
 * @returns Promise resolving to true if successful
 */
export async function startWebcamEmulator(
  sourceType: WebcamSourceType,
  sourceData: string
): Promise<boolean> {
  try {
    return await invoke("start_webcam_emulator", {
      sourceType,
      sourceData
    });
  } catch (error) {
    console.error("Failed to start webcam emulator:", error);
    throw error;
  }
}

/**
 * Stops the webcam emulator
 * @returns Promise resolving to true if successful
 */
export async function stopWebcamEmulator(): Promise<boolean> {
  try {
    return await invoke("stop_webcam_emulator");
  } catch (error) {
    console.error("Failed to stop webcam emulator:", error);
    throw error;
  }
}

/**
 * Checks if the webcam emulator is currently active
 * @returns Promise resolving to true if emulator is active
 */
export async function checkWebcamEmulatorStatus(): Promise<boolean> {
  try {
    return await invoke("check_webcam_emulator_status");
  } catch (error) {
    console.error("Failed to check webcam emulator status:", error);
    return false;
  }
}
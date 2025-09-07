import { invoke } from "@tauri-apps/api/core";
import { Patient } from "../types/patient";

export async function loadPatients(): Promise<Patient[]> {
  const raw = (await invoke("load_patients")) as any;
  // backend uses snake_case keys; map to camelCase
  return (raw as any[]).map(toPatientCamel);
}

export async function savePatients(patients: Patient[]): Promise<void> {
  // map back to snake_case
  const snake = patients.map(toPatientSnake);
  await invoke("save_patients", { patients: snake });
}

function toPatientCamel(raw: any): Patient {
  return {
    id: raw.id,
    // Tentar múltiplas chaves possíveis para nome
    name: (raw.name ?? raw.full_name ?? raw.fullName ?? raw.nome ?? "") as string,
    wallet: raw.wallet,
    facialBiometric: raw.facial_biometric ?? "",
    digitalBiometrics: (raw.digital_biometrics ?? []).map((d: any) => ({
      finger: d.finger,
      data: d.data,
    })),
    imported: !!raw.imported,
  } as Patient;
}

function toPatientSnake(p: Patient): any {
  return {
    id: p.id,
    name: p.name,
    wallet: p.wallet,
    facial_biometric: p.facialBiometric,
    digital_biometrics: p.digitalBiometrics.map(({ finger, data }) => ({ finger, data })),
    imported: p.imported,
  };
}
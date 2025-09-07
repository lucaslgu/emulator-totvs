export interface DigitalBiometric {
  finger: string; // “Polegar Direito”, etc.
  data: string;   // base64 PNG ou outro formato
}

export interface Patient {
  id: number;
  name: string;
  wallet: string;
  facialBiometric: string;
  digitalBiometrics: DigitalBiometric[];
  imported: boolean;
}
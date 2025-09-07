use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs;
use std::io::{self, Read};
use dirs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DigitalBiometric {
    pub finger: String,
    pub data: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Patient {
    pub id: u32,
    pub name: String,
    pub wallet: String,
    pub facial_biometric: String,
    pub digital_biometrics: Vec<DigitalBiometric>,
    pub imported: bool,
}

pub fn ensure_data_dir(_app_handle: &tauri::AppHandle) -> io::Result<PathBuf> {
    let mut dir = dirs::data_dir().ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "data dir not found"))?;
    dir.push("VirtualIOHub");
    if !dir.exists() {
        fs::create_dir_all(&dir)?;
    }
    Ok(dir)
}

pub fn patients_file_path(app_handle: &tauri::AppHandle) -> io::Result<PathBuf> {
    let mut dir = ensure_data_dir(app_handle)?;
    dir.push("patients.json");
    Ok(dir)
}

pub fn config_file_path(app_handle: &tauri::AppHandle) -> io::Result<PathBuf> {
    let mut dir = ensure_data_dir(app_handle)?;
    dir.push("app_config.json");
    Ok(dir)
}

pub fn load_patients_from_disk(app_handle: &tauri::AppHandle) -> io::Result<Vec<Patient>> {
    let path = patients_file_path(app_handle)?;
    if !path.exists() {
        // create with defaults
        let default = default_patients();
        save_patients_to_disk(app_handle, &default)?;
        return Ok(default);
    }
    let mut file = fs::File::open(path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    let patients: Vec<Patient> = serde_json::from_str(&contents)?;
    Ok(patients)
}

pub fn save_patients_to_disk(app_handle: &tauri::AppHandle, patients: &Vec<Patient>) -> io::Result<()> {
    let path = patients_file_path(app_handle)?;
    let json = serde_json::to_string_pretty(patients)?;
    fs::write(path, json)
}

pub fn load_config_from_disk(app_handle: &tauri::AppHandle) -> io::Result<serde_json::Value> {
    let path = config_file_path(app_handle)?;
    if !path.exists() {
        let empty = serde_json::json!({});
        save_config_to_disk(app_handle, &empty)?;
        return Ok(empty);
    }
    let mut file = fs::File::open(path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    let value: serde_json::Value = serde_json::from_str(&contents)?;
    Ok(value)
}

pub fn save_config_to_disk(app_handle: &tauri::AppHandle, value: &serde_json::Value) -> io::Result<()> {
    let path = config_file_path(app_handle)?;
    let json = serde_json::to_string_pretty(value)?;
    fs::write(path, json)
}

fn default_patients() -> Vec<Patient> {
    vec![
        Patient {
            id: 1,
            name: "Ana Silva".into(),
            wallet: "9876543210123456".into(),
            facial_biometric: String::new(),
            digital_biometrics: Vec::new(),
            imported: false,
        },
        Patient {
            id: 2,
            name: "Bruno Costa".into(),
            wallet: "1234567890654321".into(),
            facial_biometric: String::new(),
            digital_biometrics: Vec::new(),
            imported: false,
        },
    ]
}
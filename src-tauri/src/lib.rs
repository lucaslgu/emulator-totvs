// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::AppHandle;
use serde_json;
use std::sync::{Mutex, Arc};
use serde::{Deserialize};
use reqwest;
use base64::{engine::general_purpose as b64, Engine};
use image::{DynamicImage, ImageEncoder, ColorType};

mod patient;
mod hotkey;
mod biometry_server;
mod webcam_emulator;

// Remove greet command as we don't need it

#[derive(Debug, Deserialize)]
struct BeneficiarySearchParams {
    guarantor: String,
    modality: Option<String>,
    proposal: Option<String>,
    contract: Option<String>,
}

// helper to obtain config section
fn get_cfg<'a>(root: &'a serde_json::Value) -> Result<&'a serde_json::Value, String> {
    if let Some(imp) = root.get("importer_config") {
        Ok(imp)
    } else {
        Ok(root)
    }
}

// WSQ decoding temporarily disabled due to crate API mismatch
fn wsq_to_png_base64(wsq_b64: &str) -> Result<String,String> {
    Err("WSQ conversion not supported in current build".into())
}

#[tauri::command]
fn load_patients(app_handle: AppHandle) -> Result<Vec<patient::Patient>, String> {
    patient::load_patients_from_disk(&app_handle).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_patients(app_handle: AppHandle, patients: Vec<patient::Patient>) -> Result<(), String> {
    patient::save_patients_to_disk(&app_handle, &patients).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_config(app_handle: AppHandle) -> Result<serde_json::Value, String> {
    patient::load_config_from_disk(&app_handle).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_config(app_handle: AppHandle, value: serde_json::Value) -> Result<(), String> {
    patient::save_config_to_disk(&app_handle, &value).map_err(|e| e.to_string())
}

#[tauri::command]
async fn search_beneficiaries(app_handle: AppHandle, params: BeneficiarySearchParams) -> Result<serde_json::Value, String> {
    // Carrega configurações salvas (contendo base_url, user, password)
    let config_value = patient::load_config_from_disk(&app_handle)
        .map_err(|e| format!("Falha ao ler configurações: {e}"))?;

    let importer_cfg = get_cfg(&config_value)?;

    let base_url = importer_cfg.get("base_url").and_then(|v| v.as_str())
        .ok_or("Base URL não definida nas configurações.")?;
    let user = importer_cfg.get("user").and_then(|v| v.as_str())
        .ok_or("Usuário não definido nas configurações.")?;
    let password = importer_cfg.get("password").and_then(|v| v.as_str())
        .ok_or("Senha não definida nas configurações.")?;

    let search_endpoint = "/dts/datasul-rest/resources/prg/hvp/v2/beneficiaries/subscriber";
    let url = format!("{}{}", base_url.trim_end_matches('/'), search_endpoint);

    // Monta parâmetros da query conforme implementação Python
    let mut query_params = vec![
        ("includeActive", "true"),
        ("includeInactive", "false"),
        ("includePending", "true"),
        ("guarantor", params.guarantor.as_str()),
        ("page", "1"),
        ("expand", "person,dependents,dependents.person,cancellationReason,dependents.cancellationReason"),
    ];

    if let Some(modality) = params.modality.as_deref() {
        query_params.push(("modality", modality));
    }
    if let Some(proposal) = params.proposal.as_deref() {
        query_params.push(("proposal", proposal));
    }
    if let Some(contract) = params.contract.as_deref() {
        query_params.push(("contract", contract));
    }

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .basic_auth(user, Some(password))
        .query(&query_params)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("Erro na requisição: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("Falha na requisição: {}", response.status()));
    }

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Falha ao decodificar JSON: {e}"))?;

    // Retorna o array "items" ou lista vazia se não existir
    Ok(json.get("items").cloned().unwrap_or_else(|| serde_json::Value::Array(vec![])))
}

#[tauri::command]
async fn get_beneficiary_details(app_handle: AppHandle, card_number: String) -> Result<serde_json::Value, String> {
    // Carrega configurações salvas (contendo base_url, user, password)
    let config_value = patient::load_config_from_disk(&app_handle)
        .map_err(|e| format!("Falha ao ler configurações: {e}"))?;

    let importer_cfg = get_cfg(&config_value)?;

    let base_url = importer_cfg.get("base_url").and_then(|v| v.as_str())
        .ok_or("Base URL não definida nas configurações.")?;
    let user = importer_cfg.get("user").and_then(|v| v.as_str())
        .ok_or("Usuário não definido nas configurações.")?;
    let password = importer_cfg.get("password").and_then(|v| v.as_str())
        .ok_or("Senha não definida nas configurações.")?;
    let clinic = importer_cfg.get("clinic").and_then(|v| v.as_str())
        .ok_or("Clínica não definida nas configurações.")?;
    let provider_code = importer_cfg.get("provider_code").and_then(|v| v.as_str())
        .ok_or("Código do prestador não definido nas configurações.")?;
    let health_insurer_code = importer_cfg.get("health_insurer_code").and_then(|v| v.as_str())
        .ok_or("Código da operadora não definido nas configurações.")?;

    let details_endpoint = format!("/dts/datasul-rest/resources/prg/portprest/v1/checkin/beneficiaries/{}", card_number);
    let url = format!("{}{}", base_url.trim_end_matches('/'), details_endpoint);

    // Monta parâmetros da query conforme implementação Python
    let query_params = vec![
        ("provider", provider_code),
        ("providerHealthInsurer", health_insurer_code),
        ("clinic", clinic),
    ];

    println!("URL Detalhes: {}", url);
    println!("Query params: {:?}", query_params);
    println!("Header clinic: {}", clinic);

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .basic_auth(user, Some(password))
        .query(&query_params)
        .header("Accept", "application/json")
        .header("x-totvs-hgp-portal-prestador-clinic", clinic)
        .send()
        .await
        .map_err(|e| format!("Erro na requisição: {e}"))?;

    if !response.status().is_success() {
        let status_code = response.status();
        let txt = response.text().await.unwrap_or_default();
        println!("Erro detalhes status={} body={}", status_code, txt);
        return Err(format!("Falha na requisição: {}", status_code));
    }

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Falha ao decodificar JSON: {e}"))?;

    Ok(json)
}

#[tauri::command]
async fn get_fingerprints(app_handle: AppHandle, card_number: String) -> Result<serde_json::Value, String> {
    // Carrega configurações salvas (contendo base_url, user, password)
    let config_value = patient::load_config_from_disk(&app_handle)
        .map_err(|e| format!("Falha ao ler configurações: {e}"))?;

    let importer_cfg = get_cfg(&config_value)?;

    let base_url = importer_cfg.get("base_url").and_then(|v| v.as_str())
        .ok_or("Base URL não definida nas configurações.")?;
    let user = importer_cfg.get("user").and_then(|v| v.as_str())
        .ok_or("Usuário não definido nas configurações.")?;
    let password = importer_cfg.get("password").and_then(|v| v.as_str())
        .ok_or("Senha não definida nas configurações.")?;
    let clinic = importer_cfg.get("clinic").and_then(|v| v.as_str())
        .ok_or("Clínica não definida nas configurações.")?;

    let fingerprint_endpoint = format!("/dts/datasul-rest/resources/prg/portprest/v1/checkin/beneficiaries/{}/fingerPrints", card_number);
    let url = format!("{}{}", base_url.trim_end_matches('/'), fingerprint_endpoint);
    
    // Obter query params necessários
    let provider_code = importer_cfg.get("provider_code").and_then(|v| v.as_str())
        .ok_or("Código do prestador não definido nas configurações.")?;
    let health_insurer_code = importer_cfg.get("health_insurer_code").and_then(|v| v.as_str())
        .ok_or("Código da operadora não definido nas configurações.")?;
    
    // Monta parâmetros da query conforme implementação Python
    let query_params = vec![
        ("provider", provider_code),
        ("providerHealthInsurer", health_insurer_code),
        ("clinic", clinic),
    ];
    
    println!("URL Digitais: {}", url);
    println!("Query params digitais: {:?}", query_params);

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .basic_auth(user, Some(password))
        .query(&query_params)
        .header("Accept", "application/json")
        .header("x-totvs-hgp-portal-prestador-clinic", clinic)
        .send()
        .await
        .map_err(|e| format!("Erro na requisição: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("Falha na requisição: {}", response.status()));
    }

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Falha ao decodificar JSON: {e}"))?;

    println!("Resposta JSON de digitais: {:?}", json);
    
    // Retorna o array "items" ou lista vazia se não existir
    let items_arr = json.get("items").and_then(|v| v.as_array()).cloned().unwrap_or_default();
    Ok(serde_json::Value::Array(items_arr))
}

#[tauri::command]
async fn get_facial_biometry(app_handle: AppHandle, card_number: String) -> Result<String, String> {
    // Carrega configurações salvas (contendo base_url, user, password)
    let config_value = patient::load_config_from_disk(&app_handle)
        .map_err(|e| format!("Falha ao ler configurações: {e}"))?;

    let importer_cfg = get_cfg(&config_value)?;

    let base_url = importer_cfg.get("base_url").and_then(|v| v.as_str())
        .ok_or("Base URL não definida nas configurações.")?;
    let user = importer_cfg.get("user").and_then(|v| v.as_str())
        .ok_or("Usuário não definido nas configurações.")?;
    let password = importer_cfg.get("password").and_then(|v| v.as_str())
        .ok_or("Senha não definida nas configurações.")?;
    let clinic = importer_cfg.get("clinic").and_then(|v| v.as_str())
        .ok_or("Clínica não definida nas configurações.")?;
    let provider_code = importer_cfg.get("provider_code").and_then(|v| v.as_str())
        .ok_or("Código do prestador não definido nas configurações.")?;
    let health_insurer_code = importer_cfg.get("health_insurer_code").and_then(|v| v.as_str())
        .ok_or("Código da operadora não definido nas configurações.")?;

    // Monta parâmetros da query conforme implementação Python
    let query_params = vec![
        ("provider", provider_code),
        ("providerHealthInsurer", health_insurer_code),
        ("clinic", clinic),
    ];
    
    let photo_endpoint = format!("/dts/datasul-rest/resources/prg/portprest/v1/checkin/beneficiaries/{}/photo", card_number);
    let url = format!("{}{}", base_url.trim_end_matches('/'), photo_endpoint);
    
    println!("URL Foto: {}", url);
    println!("Query params foto: {:?}", query_params);

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .basic_auth(user, Some(password))
        .query(&query_params)
        .header("Accept", "application/json")
        .header("x-totvs-hgp-portal-prestador-clinic", clinic)
        .send()
        .await
        .map_err(|e| format!("Erro na requisição: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("Falha na requisição: {}", response.status()));
    }

    // A resposta deve ser um base64 da imagem
    let photo_base64: String = response
        .text()
        .await
        .map_err(|e| format!("Falha ao obter dados da foto: {e}"))?;

    Ok(photo_base64)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize the managers
    let hotkey_manager = Mutex::new(hotkey::HotkeyManager::new());
    let biometry_server_state = Arc::new(Mutex::new(biometry_server::BiometryServerState::new()));
    let webcam_emulator = Arc::new(Mutex::new(webcam_emulator::WebcamEmulator::new()));
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(hotkey_manager)
        .manage(biometry_server_state)
        .manage(webcam_emulator)
        .invoke_handler(tauri::generate_handler![
            load_patients,
            save_patients,
            load_config,
            save_config,
            hotkey::start_hotkey,
            hotkey::stop_hotkey,
            hotkey::check_hotkey_status,
            hotkey::diagnose_hotkey_system,
            biometry_server::start_biometry_server,
            biometry_server::stop_biometry_server,
            biometry_server::check_biometry_server_status,
            webcam_emulator::start_webcam_emulator,
            webcam_emulator::stop_webcam_emulator,
            webcam_emulator::check_webcam_emulator_status,
            search_beneficiaries,
            get_beneficiary_details,
            get_fingerprints,
            get_facial_biometry
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use std::path::PathBuf;
use std::process::{Child, Command};
use std::io;
use std::fs;
use tauri::{AppHandle, Manager};
use serde_json;
use std::env;
use std::path::Path;
use std::io::Write;

pub struct HotkeyManager {
    ahk_process: Option<Child>,
    temp_script_path: Option<PathBuf>,
}

impl HotkeyManager {
    pub fn new() -> Self {
        Self {
            ahk_process: None,
            temp_script_path: None,
        }
    }

    pub fn start(&mut self, app_handle: &AppHandle, text_to_send: &str) -> Result<bool, String> {
        if text_to_send.is_empty() {
            return Err("Texto para enviar não pode estar vazio".into());
        }

        println!("Starting hotkey with text: {}", text_to_send);
        self.stop()?;

        let ahk_exe_path = Self::find_ahk_path(app_handle)?;
        println!("Using AutoHotkey executable: {}", ahk_exe_path.display());
        
        let full_text_to_emulate = format!(";{text_to_send}=011903=004105713104?");
        let script_content = format!(
            "#Requires AutoHotkey v2.0\n#SingleInstance force\n\n^q::\n{{\n    SendInput \"{full_text_to_emulate}\"\n    return\n}}\n"
        );

        println!("Creating temporary directory...");
        let temp_dir = tempfile::Builder::new()
            .prefix("virtual_io_hub")
            .tempdir()
            .map_err(|e| format!("Falha ao criar diretório temporário: {}", e))?;

        let script_path = temp_dir.path().join("hotkey_script.ahk");
        println!("Writing script to: {}", script_path.display());
        
        fs::write(&script_path, script_content)
            .map_err(|e| format!("Falha ao escrever script temporário: {}", e))?;

        println!("Starting AutoHotkey process...");
        let process = Command::new(&ahk_exe_path)
            .arg(&script_path)
            .spawn()
            .map_err(|e| format!("Falha ao iniciar AutoHotkey: {}", e))?;

        println!("AutoHotkey process started successfully with PID: {}", process.id());
        self.ahk_process = Some(process);
        self.temp_script_path = Some(script_path);
        
        // Prevent tempdir from being deleted while we need the script
        std::mem::forget(temp_dir);

        Ok(true)
    }

    pub fn stop(&mut self) -> Result<bool, String> {
        if let Some(mut process) = self.ahk_process.take() {
            match process.kill() {
                Ok(_) => {},
                Err(e) if e.kind() == io::ErrorKind::InvalidInput => {
                    // Process already exited, which is fine
                },
                Err(e) => {
                    return Err(format!("Falha ao matar processo AutoHotkey: {}", e));
                }
            }
        }

        if let Some(path) = self.temp_script_path.take() {
            if path.exists() {
                if let Err(e) = fs::remove_file(&path) {
                    return Err(format!("Falha ao remover script temporário: {}", e));
                }
            }
        }

        Ok(true)
    }

    fn find_ahk_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
        // Try to find AutoHotkey in the resources directory
        let resource_dir = app_handle.path().resource_dir()
            .map_err(|e| format!("Falha ao obter diretório de recursos: {}", e))?;

        let ahk_paths = [
            resource_dir.join("AutoHotkey").join("v2").join("AutoHotkey64.exe"),
            resource_dir.join("resources").join("AutoHotkey").join("v2").join("AutoHotkey64.exe"),
            PathBuf::from(r"C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe"),
            PathBuf::from(r"C:\Program Files (x86)\AutoHotkey\v2\AutoHotkey64.exe"),
        ];

        // Log the paths we're checking for debugging
        println!("Checking for AutoHotkey in the following paths:");
        for (i, path) in ahk_paths.iter().enumerate() {
            println!("  {}: {} (exists: {})", i, path.display(), path.exists());
        }

        for path in &ahk_paths {
            if path.exists() {
                println!("Found AutoHotkey at: {}", path.display());
                return Ok(path.clone());
            }
        }

        // AutoHotkey not found, try to install it automatically
        println!("AutoHotkey V2 not found. Attempting automatic installation...");
        match Self::install_autohotkey_v2(app_handle) {
            Ok(installed_path) => {
                println!("AutoHotkey V2 installed successfully at: {}", installed_path.display());
                Ok(installed_path)
            },
            Err(e) => {
                // Provide more detailed error information
                let error_msg = format!(
                    "AutoHotkey V2 não encontrado e falha na instalação automática.\n\nVerificados os seguintes caminhos:\n{}\n\nErro de instalação: {}\n\nPor favor, instale manualmente o AutoHotkey V2 ou verifique as permissões de administrador.",
                    ahk_paths.iter()
                        .map(|p| format!("  - {}", p.display()))
                        .collect::<Vec<_>>()
                        .join("\n"),
                    e
                );
                
                Err(error_msg)
            }
        }
    }

    fn install_autohotkey_v2(app_handle: &AppHandle) -> Result<PathBuf, String> {
        println!("Starting AutoHotkey V2 automatic installation...");
        
        // Get the resource directory for installation
        let resource_dir = app_handle.path().resource_dir()
            .map_err(|e| format!("Falha ao obter diretório de recursos: {}", e))?;
        
        let ahk_install_dir = resource_dir.join("AutoHotkey").join("v2");
        
        // Create the directory structure
        fs::create_dir_all(&ahk_install_dir)
            .map_err(|e| format!("Falha ao criar diretório de instalação: {}", e))?;
        
        // Check if we already have a portable version in resources
        let portable_exe = ahk_install_dir.join("AutoHotkey64.exe");
        if portable_exe.exists() {
            println!("Found existing portable AutoHotkey V2 in resources");
            return Ok(portable_exe);
        }
        
        // Try to download and install from official website
        println!("Attempting to download and install AutoHotkey V2...");
        match Self::download_autohotkey_portable(&ahk_install_dir) {
            Ok(_) => {
                if portable_exe.exists() {
                    println!("Installation completed successfully");
                    Ok(portable_exe)
                } else {
                    // Try alternative method - copy from system installation
                    println!("Download installation failed, trying to copy from system...");
                    Self::find_and_copy_autohotkey(&ahk_install_dir)
                }
            },
            Err(e) => {
                println!("Download and installation failed: {}. Trying alternative method...", e);
                
                // Try to find and copy from system PATH or other locations
                Self::find_and_copy_autohotkey(&ahk_install_dir)
            }
        }
    }

    fn download_autohotkey_portable(install_dir: &Path) -> Result<(), String> {
        println!("Downloading AutoHotkey V2 installer from official website...");
        
        // Create a temporary file for the installer
        let temp_installer = tempfile::Builder::new()
            .prefix("ahk_v2_installer")
            .suffix(".exe")
            .tempfile()
            .map_err(|e| format!("Falha ao criar arquivo temporário para download: {}", e))?;
        
        let temp_installer_path = temp_installer.path();
        println!("Downloading to temporary file: {}", temp_installer_path.display());
        
        // Download the installer using reqwest (blocking) - synchronous approach
        let client = reqwest::blocking::Client::new();
        let response = client
            .get("https://www.autohotkey.com/download/ahk-v2.exe")
            .send()
            .map_err(|e| format!("Falha na requisição HTTP: {}", e))?;
        
        if !response.status().is_success() {
            return Err(format!("Falha no download: Status HTTP {}", response.status()));
        }
        
        let bytes = response.bytes()
            .map_err(|e| format!("Falha ao ler dados da resposta: {}", e))?;
        
        let data_vec: Vec<u8> = bytes.to_vec();
        let mut file = std::fs::File::create(temp_installer_path)
            .map_err(|e| format!("Falha ao criar arquivo: {}", e))?;
        file.write_all(&data_vec)
            .map_err(|e| format!("Falha ao escrever arquivo: {}", e))?;
        
        println!("Download completed successfully. Installing AutoHotkey V2...");
        
        // Now run the installer silently
        let install_result = Command::new(temp_installer_path)
            .args(&["/S", "/D=", &install_dir.to_string_lossy()])
            .output();
        
        match install_result {
            Ok(output) => {
                if output.status.success() {
                    println!("AutoHotkey V2 installed successfully");
                    
                    // Check if the executable was created
                    let exe_path = install_dir.join("AutoHotkey64.exe");
                    if exe_path.exists() {
                        println!("Executable found at: {}", exe_path.display());
                        return Ok(());
                    } else {
                        // Try to find the executable in subdirectories
                        if let Ok(entries) = fs::read_dir(install_dir) {
                            for entry in entries {
                                if let Ok(entry) = entry {
                                    let path = entry.path();
                                    if path.is_dir() {
                                        let potential_exe = path.join("AutoHotkey64.exe");
                                        if potential_exe.exists() {
                                            // Copy to our target location
                                            let target_exe = install_dir.join("AutoHotkey64.exe");
                                            if let Ok(_) = fs::copy(&potential_exe, &target_exe) {
                                                println!("Executable copied to: {}", target_exe.display());
                                                return Ok(());
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                        Err("Instalação concluída mas executável não encontrado".to_string())
                    }
                } else {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    Err(format!("Falha na instalação: {}", stderr))
                }
            },
            Err(e) => Err(format!("Falha ao executar instalador: {}", e))
        }
    }

    fn find_and_copy_autohotkey(install_dir: &Path) -> Result<PathBuf, String> {
        // Try to find AutoHotkey in PATH or other locations
        println!("Searching for AutoHotkey in PATH and other locations...");
        
        // Check PATH environment variable
        if let Ok(path_var) = env::var("PATH") {
            for path_str in path_var.split(';') {
                let path = PathBuf::from(path_str);
                let ahk_path = path.join("AutoHotkey64.exe");
                if ahk_path.exists() {
                    println!("Found AutoHotkey in PATH: {}", ahk_path.display());
                    
                    let target_path = install_dir.join("AutoHotkey64.exe");
                    match fs::copy(&ahk_path, &target_path) {
                        Ok(_) => {
                            println!("Successfully copied AutoHotkey to: {}", target_path.display());
                            return Ok(target_path);
                        },
                        Err(e) => {
                            println!("Failed to copy from PATH: {}", e);
                        }
                    }
                }
            }
        }
        
        Err("AutoHotkey not found in PATH or other locations".to_string())
    }
}

impl Drop for HotkeyManager {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}

#[tauri::command]
pub fn start_hotkey(app_handle: AppHandle, text_to_send: &str, hotkey_manager: tauri::State<'_, std::sync::Mutex<HotkeyManager>>) -> Result<bool, String> {
    let mut manager = hotkey_manager.lock().map_err(|_| "Falha ao obter lock do HotkeyManager".to_string())?;
    manager.start(&app_handle, text_to_send)
}

#[tauri::command]
pub fn stop_hotkey(hotkey_manager: tauri::State<'_, std::sync::Mutex<HotkeyManager>>) -> Result<bool, String> {
    let mut manager = hotkey_manager.lock().map_err(|_| "Falha ao obter lock do HotkeyManager".to_string())?;
    manager.stop()
}

#[tauri::command]
pub fn check_hotkey_status(hotkey_manager: tauri::State<'_, std::sync::Mutex<HotkeyManager>>) -> Result<bool, String> {
    let manager = hotkey_manager.lock().map_err(|_| "Falha ao obter lock do HotkeyManager".to_string())?;
    Ok(manager.ahk_process.is_some())
}

#[tauri::command]
pub fn diagnose_hotkey_system(app_handle: AppHandle) -> Result<serde_json::Value, String> {
    let mut diagnostics = serde_json::Map::new();
    
    // Check if we can access the resource directory
    match app_handle.path().resource_dir() {
        Ok(resource_dir) => {
            diagnostics.insert("resource_dir_accessible".to_string(), serde_json::Value::Bool(true));
            diagnostics.insert("resource_dir_path".to_string(), serde_json::Value::String(resource_dir.display().to_string()));
            
            // Check if we have AutoHotkey in our resources
            let ahk_resource_path = resource_dir.join("AutoHotkey").join("v2").join("AutoHotkey64.exe");
            diagnostics.insert("ahk_in_resources".to_string(), serde_json::Value::Bool(ahk_resource_path.exists()));
            diagnostics.insert("ahk_resource_path".to_string(), serde_json::Value::String(ahk_resource_path.display().to_string()));
        },
        Err(e) => {
            diagnostics.insert("resource_dir_accessible".to_string(), serde_json::Value::Bool(false));
            diagnostics.insert("resource_dir_error".to_string(), serde_json::Value::String(e.to_string()));
        }
    }
    
    // Check for AutoHotkey in common locations
    let ahk_paths = [
        PathBuf::from(r"C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe"),
        PathBuf::from(r"C:\Program Files (x86)\AutoHotkey\v2\AutoHotkey64.exe"),
    ];
    
    let mut ahk_status = serde_json::Map::new();
    for (i, path) in ahk_paths.iter().enumerate() {
        let exists = path.exists();
        ahk_status.insert(format!("path_{}", i), serde_json::Value::String(path.display().to_string()));
        ahk_status.insert(format!("exists_{}", i), serde_json::Value::Bool(exists));
        
        if exists {
            // Try to get file info
            if let Ok(metadata) = std::fs::metadata(path) {
                ahk_status.insert(format!("size_{}", i), serde_json::Value::Number(serde_json::Number::from(metadata.len())));
                ahk_status.insert(format!("readable_{}", i), serde_json::Value::Bool(true));
            } else {
                ahk_status.insert(format!("readable_{}", i), serde_json::Value::Bool(false));
            }
        }
    }
    
    diagnostics.insert("autohotkey_paths".to_string(), serde_json::Value::Object(ahk_status));
    
    // Check if we can create temporary files
    match tempfile::Builder::new().prefix("test").tempdir() {
        Ok(temp_dir) => {
            diagnostics.insert("temp_file_creation".to_string(), serde_json::Value::Bool(true));
            diagnostics.insert("temp_dir_path".to_string(), serde_json::Value::String(temp_dir.path().display().to_string()));
            
            // Try to write a test file
            let test_file = temp_dir.path().join("test.txt");
            match fs::write(&test_file, "test") {
                Ok(_) => {
                    diagnostics.insert("temp_file_writing".to_string(), serde_json::Value::Bool(true));
                    let _ = fs::remove_file(test_file);
                },
                Err(e) => {
                    diagnostics.insert("temp_file_writing".to_string(), serde_json::Value::Bool(false));
                    diagnostics.insert("temp_file_error".to_string(), serde_json::Value::String(e.to_string()));
                }
            }
        },
        Err(e) => {
            diagnostics.insert("temp_file_creation".to_string(), serde_json::Value::Bool(false));
            diagnostics.insert("temp_file_error".to_string(), serde_json::Value::String(e.to_string()));
        }
    }
    
    // Add installation recommendations
    let mut recommendations = serde_json::Map::new();
    recommendations.insert("auto_install_available".to_string(), serde_json::Value::Bool(true));
    recommendations.insert("download_url".to_string(), serde_json::Value::String(
        "https://www.autohotkey.com/download/ahk-v2.exe".to_string()
    ));
    recommendations.insert("message".to_string(), serde_json::Value::String(
        "O sistema tentará baixar e instalar automaticamente o AutoHotkey V2 do site oficial. \
         Se a instalação automática falhar, você pode baixar manualmente o instalador e executá-lo."
    .to_string()));
    
    diagnostics.insert("recommendations".to_string(), serde_json::Value::Object(recommendations));
    
    Ok(serde_json::Value::Object(diagnostics))
}
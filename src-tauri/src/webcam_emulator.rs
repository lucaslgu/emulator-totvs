use std::sync::{Arc, Mutex};
use std::path::PathBuf;
use std::process::{Command, Child};
use std::io;
use serde::{Serialize, Deserialize};


#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WebcamSource {
    Image(String),     // base64 string
    Video(PathBuf),    // file path
    Camera(i32),       // physical camera index
}

pub struct WebcamEmulator {
    process: Option<Child>,
    current_source: Option<WebcamSource>,
}

impl WebcamEmulator {
    pub fn new() -> Self {
        Self {
            process: None,
            current_source: None,
        }
    }

    pub fn start(&mut self, source: WebcamSource) -> Result<bool, String> {
        self.stop()?;

        match &source {
            WebcamSource::Image(base64_data) => {
                if base64_data.is_empty() {
                    return Err("Dados de imagem vazios".into());
                }
                // Base64 data will be passed to Python script
            }
            WebcamSource::Video(path) => {
                if !path.exists() {
                    return Err(format!("Arquivo não encontrado: {:?}", path));
                }
            }
            WebcamSource::Camera(index) => {
                if *index < 0 {
                    return Err("Índice de câmera inválido".into());
                }
            }
        }

        // Create a temporary script to run the Python webcam emulator
        let script_content = match self.create_python_script() {
            Ok(content) => content,
            Err(e) => return Err(format!("Erro ao criar script Python: {}", e)),
        };

        let temp_dir = tempfile::Builder::new()
            .prefix("webcam_emulator")
            .tempdir()
            .map_err(|e| format!("Erro ao criar diretório temporário: {}", e))?;

        let script_path = temp_dir.path().join("webcam_emulator.py");
        std::fs::write(&script_path, script_content)
            .map_err(|e| format!("Erro ao escrever script Python: {}", e))?;

        // Prepare arguments based on source type
        let mut args = vec![script_path.to_string_lossy().to_string()];
        
        match &source {
            WebcamSource::Image(base64_data) => {
                args.push("--image".to_string());
                args.push(base64_data.clone());
            }
            WebcamSource::Video(path) => {
                args.push("--video".to_string());
                args.push(path.to_string_lossy().to_string());
            }
            WebcamSource::Camera(index) => {
                args.push("--camera".to_string());
                args.push(index.to_string());
            }
        }

        // Start Python process
        let process = Command::new("python")
            .args(&args)
            .spawn()
            .map_err(|e| format!("Erro ao iniciar o processo Python: {}", e))?;

        self.process = Some(process);
        self.current_source = Some(source);

        // Prevent tempdir from being deleted while we need the script
        std::mem::forget(temp_dir);

        Ok(true)
    }

    pub fn stop(&mut self) -> Result<bool, String> {
        if let Some(mut process) = self.process.take() {
            match process.kill() {
                Ok(_) => {},
                Err(e) if e.kind() == io::ErrorKind::InvalidInput => {
                    // Process already exited, which is fine
                },
                Err(e) => {
                    return Err(format!("Falha ao encerrar o processo Python: {}", e));
                }
            }
        }

        self.current_source = None;
        Ok(true)
    }

    pub fn is_running(&self) -> bool {
        // Simply check if we have a process handle
        // The process might have exited but we still have the handle
        self.process.is_some()
    }

    fn create_python_script(&self) -> Result<String, io::Error> {
        // This Python script will use pyvirtualcam to create a virtual camera
        // and stream the specified source (image, video, or physical camera)
        Ok(r#"
import sys
import argparse
import base64
import time
import numpy as np
from io import BytesIO
import cv2
import pyvirtualcam

def main():
    parser = argparse.ArgumentParser(description='Webcam Emulator')
    parser.add_argument('--image', type=str, help='Base64 encoded image data')
    parser.add_argument('--video', type=str, help='Path to video file')
    parser.add_argument('--camera', type=int, help='Physical camera index')
    args = parser.parse_args()

    # Default frame size and rate
    width, height, fps = 640, 480, 30
    
    # Prepare the source
    if args.image:
        try:
            # Decode base64 image
            img_data = base64.b64decode(args.image)
            nparr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is None:
                raise ValueError("Invalid image data")
            height, width = frame.shape[:2]
            is_video = False
        except Exception as e:
            print(f"Error loading image: {e}")
            return 1
            
    elif args.video:
        try:
            cap = cv2.VideoCapture(args.video)
            if not cap.isOpened():
                raise ValueError(f"Could not open video file: {args.video}")
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            if fps <= 0:
                fps = 30
            is_video = True
        except Exception as e:
            print(f"Error opening video: {e}")
            return 1
            
    elif args.camera is not None:
        try:
            cap = cv2.VideoCapture(args.camera)
            if not cap.isOpened():
                raise ValueError(f"Could not open camera {args.camera}")
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            if fps <= 0:
                fps = 30
            is_video = True
        except Exception as e:
            print(f"Error opening camera: {e}")
            return 1
    else:
        print("No source specified")
        return 1

    # Create virtual camera
    try:
        with pyvirtualcam.Camera(width=width, height=height, fps=fps) as cam:
            print(f"Virtual camera created: {cam.device}")
            
            # Main loop
            while True:
                if is_video:
                    ret, current_frame = cap.read()
                    if not ret:
                        if args.video:  # If it's a video file, loop it
                            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                            continue
                        else:  # If it's a camera and we lost the frame, exit
                            break
                else:
                    current_frame = frame.copy()
                
                # Convert to RGB (pyvirtualcam expects RGB)
                frame_rgb = cv2.cvtColor(current_frame, cv2.COLOR_BGR2RGB)
                
                # Send to virtual camera
                cam.send(frame_rgb)
                cam.sleep_until_next_frame()
                
    except Exception as e:
        print(f"Error in virtual camera: {e}")
        return 1
    finally:
        if is_video and 'cap' in locals():
            cap.release()
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
"#.to_string())
    }
}

#[tauri::command]
pub fn start_webcam_emulator(
    source_type: &str,
    source_data: &str,
    webcam_emulator: tauri::State<'_, Arc<Mutex<WebcamEmulator>>>
) -> Result<bool, String> {
    let source = match source_type {
        "image" => WebcamSource::Image(source_data.to_string()),
        "video" => WebcamSource::Video(PathBuf::from(source_data)),
        "camera" => {
            let index = source_data.parse::<i32>()
                .map_err(|_| "Índice de câmera inválido".to_string())?;
            WebcamSource::Camera(index)
        },
        _ => return Err("Tipo de fonte desconhecido".into()),
    };

    let mut emulator = webcam_emulator.lock().map_err(|_| "Falha ao obter lock do WebcamEmulator".to_string())?;
    emulator.start(source)
}

#[tauri::command]
pub fn stop_webcam_emulator(
    webcam_emulator: tauri::State<'_, Arc<Mutex<WebcamEmulator>>>
) -> Result<bool, String> {
    let mut emulator = webcam_emulator.lock().map_err(|_| "Falha ao obter lock do WebcamEmulator".to_string())?;
    emulator.stop()
}

#[tauri::command]
pub fn check_webcam_emulator_status(
    webcam_emulator: tauri::State<'_, Arc<Mutex<WebcamEmulator>>>
) -> Result<bool, String> {
    let emulator = webcam_emulator.lock().map_err(|_| "Falha ao obter lock do WebcamEmulator".to_string())?;
    Ok(emulator.is_running())
}
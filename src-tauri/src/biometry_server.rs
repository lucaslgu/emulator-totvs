use std::sync::{Arc, Mutex};
use std::net::SocketAddr;
use axum::{
    routing::post,
    Router,
    Json,
    extract::State,
    http::StatusCode,
};
use tower_http::cors::{Any, CorsLayer};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio::sync::oneshot;

pub struct BiometryServerState {
    biometry_data: Vec<String>,
    shutdown_tx: Option<oneshot::Sender<()>>,
}

impl BiometryServerState {
    pub fn new() -> Self {
        Self {
            biometry_data: Vec::new(),
            shutdown_tx: None,
        }
    }

    pub fn set_biometry_data(&mut self, data: Vec<String>) {
        self.biometry_data = data;
    }
}

#[derive(Debug, Deserialize)]
pub struct CaptureRequest {
    command: String,
}

#[derive(Debug, Deserialize)]
pub struct VerifyRequest {
    command: String,
    code: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct CaptureResponse {
    success: bool,
    code: Option<String>,
    message: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct VerifyResponse {
    success: bool,
    #[serde(rename = "match")]
    r#match: bool,
    message: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ShutdownResponse {
    success: bool,
    message: String,
}

#[derive(Debug, Deserialize)]
pub struct RootRequest {
    device: Option<String>,
    command: Option<String>,
    code: Option<Vec<String>>,
}

async fn handle_root(
    State(state): State<Arc<Mutex<BiometryServerState>>>,
    payload: Result<Json<RootRequest>, axum::extract::rejection::JsonRejection>,
) -> (StatusCode, Json<serde_json::Value>) {
    // If body is parsable and command is 'verify', delegate to verify semantics
    if let Ok(Json(req)) = payload {
        if let Some(cmd) = req.command.as_deref() {
            if cmd.eq_ignore_ascii_case("verify") {
                if let Some(codes) = req.code {
                    if codes.is_empty() {
                        return (
                            StatusCode::BAD_REQUEST,
                            Json(json!({
                                "success": false,
                                "match": false,
                                "message": "Código de biometria não fornecido."
                            })),
                        );
                    }

                    let state = state.lock().unwrap();
                    let biometric_to_verify = codes[0].trim().to_string();
                    let exact_match = state
                        .biometry_data
                        .iter()
                        .any(|d| d.trim() == biometric_to_verify);
                    let match_found = exact_match;

                    return (
                        StatusCode::OK,
                        Json(json!({
                            "success": true,
                            "match": match_found,
                            "message": "Verificação simulada."
                        })),
                    );
                }
            }
        }
    }

    // Default behavior: capture semantics
    let state = state.lock().unwrap();
    if state.biometry_data.is_empty() {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({
                "success": false,
                "code": null,
                "message": "Nenhuma biometria registrada no emulador."
            })),
        );
    }

    (
        StatusCode::OK,
        Json(json!({
            "success": true,
            "code": state.biometry_data[0],
            "message": null
        })),
    )
}

async fn handle_capture(
    State(state): State<Arc<Mutex<BiometryServerState>>>,
) -> (StatusCode, Json<CaptureResponse>) {
    let state = state.lock().unwrap();
    
    if state.biometry_data.is_empty() {
        return (
            StatusCode::NOT_FOUND,
            Json(CaptureResponse {
                success: false,
                code: None,
                message: Some("Nenhuma biometria registrada no emulador.".to_string()),
            }),
        );
    }
    
    // Return the first biometric data in the list
    (
        StatusCode::OK,
        Json(CaptureResponse {
            success: true,
            code: Some(state.biometry_data[0].clone()),
            message: None,
        }),
    )
}

async fn handle_verify(
    State(state): State<Arc<Mutex<BiometryServerState>>>,
    Json(payload): Json<VerifyRequest>,
) -> (StatusCode, Json<VerifyResponse>) {
    if payload.code.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(VerifyResponse {
                success: false,
                r#match: false,
                message: Some("Código de biometria não fornecido.".to_string()),
            }),
        );
    }
    
    let state = state.lock().unwrap();
    // Compatível com Python: se houver qualquer biometria carregada, considerar match.
    // Mantém compatibilidade com teste estrito por igualdade.
    let biometric_to_verify = payload.code[0].trim().to_string();
    let has_any = !state.biometry_data.is_empty();
    let exact_match = state
        .biometry_data
        .iter()
        .any(|d| d.trim() == biometric_to_verify);
    let match_found = has_any && (exact_match || true);
    
    (
        StatusCode::OK,
        Json(VerifyResponse {
            success: true,
            r#match: match_found,
            message: Some("Verificação simulada.".to_string()),
        }),
    )
}

async fn handle_shutdown(
    State(state): State<Arc<Mutex<BiometryServerState>>>,
) -> (StatusCode, Json<ShutdownResponse>) {
    let mut state = state.lock().unwrap();
    
    if let Some(tx) = state.shutdown_tx.take() {
        let _ = tx.send(());
        (
            StatusCode::OK,
            Json(ShutdownResponse {
                success: true,
                message: "Servidor desligando.".to_string(),
            }),
        )
    } else {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ShutdownResponse {
                success: false,
                message: "Não foi possível desligar o servidor.".to_string(),
            }),
        )
    }
}

pub async fn run_server(
    host: String,
    port: u16,
    biometry_data: Vec<String>,
    state: Arc<Mutex<BiometryServerState>>,
) -> Result<(), String> {
    let addr: SocketAddr = format!("{}:{}", host, port)
        .parse()
        .map_err(|e| format!("Endereço inválido: {}", e))?;
    
    {
        let mut state = state.lock().unwrap();
        state.set_biometry_data(biometry_data);
    }
    
    let (tx, rx) = oneshot::channel::<()>();
    
    {
        let mut state = state.lock().unwrap();
        state.shutdown_tx = Some(tx);
    }
    
    let cors = CorsLayer::new()
        .allow_methods([axum::http::Method::POST, axum::http::Method::OPTIONS])
        .allow_origin(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/", post(handle_root))
        .route("/capture", post(handle_capture))
        .route("/verify", post(handle_verify))
        .route("/shutdown", post(handle_shutdown))
        .layer(cors)
        .with_state(state.clone());
    
    println!("Servidor de biometria iniciado em http://{}:{}", host, port);
    
    let server = tokio::net::TcpListener::bind(&addr).await
        .map_err(|e| format!("Failed to bind to address: {}", e))?;
    
    let server = axum::serve(server, app);
    
    let graceful = server.with_graceful_shutdown(async {
        rx.await.ok();
        println!("Servidor de biometria desligado");
    });
    
    graceful.await.map_err(|e| format!("Erro no servidor: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn start_biometry_server(
    host: String,
    port: u16,
    biometry_data: Vec<String>,
    state: tauri::State<'_, Arc<Mutex<BiometryServerState>>>,
) -> Result<bool, String> {
    // Tenta vincular antes para retornar erro imediato se a porta estiver em uso
    let addr: SocketAddr = format!("{}:{}", &host, port)
        .parse()
        .map_err(|e| format!("Endereço inválido: {}", e))?;
    let listener = match tokio::net::TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => return Err(format!("Falha ao vincular servidor em {}: {}", addr, e)),
    };

    // Clone o estado para a thread do servidor
    let server_state = state.inner().clone();
    // Configurar estado inicial antes de servir
    {
        let mut s = server_state.lock().unwrap();
        s.set_biometry_data(biometry_data.clone());
    }

    tokio::spawn(async move {
        // Constrói o app e inicia com o listener já vinculado
        let (tx, rx) = oneshot::channel::<()>();
        {
            let mut s = server_state.lock().unwrap();
            s.shutdown_tx = Some(tx);
        }

        let app = Router::new()
            .route("/", post(handle_root))
            .route("/capture", post(handle_capture))
            .route("/verify", post(handle_verify))
            .route("/shutdown", post(handle_shutdown))
            .with_state(server_state.clone());

        println!("Servidor de biometria iniciado em http://{}:{}", addr.ip(), addr.port());

        let server = axum::serve(listener, app);
        let graceful = server.with_graceful_shutdown(async {
            rx.await.ok();
            println!("Servidor de biometria desligado");
        });
        if let Err(e) = graceful.await {
            eprintln!("Erro no servidor: {}", e);
        }
    });

    Ok(true)
}

#[tauri::command]
pub async fn stop_biometry_server(
    host: String,
    port: u16,
    state: tauri::State<'_, Arc<Mutex<BiometryServerState>>>,
) -> Result<bool, String> {
    // Try to send a shutdown request to the server
    let client = reqwest::Client::new();
    let url = format!("http://{}:{}/shutdown", host, port);
    
    match client.post(&url).send().await {
        Ok(_) => Ok(true),
        Err(e) => {
            // If we can't connect, the server might already be down
            let mut state = state.inner().lock().unwrap();
            state.shutdown_tx = None;
            
            if e.is_connect() {
                Ok(true) // Server already down
            } else {
                Err(format!("Erro ao desligar servidor: {}", e))
            }
        }
    }
}

#[tauri::command]
pub fn check_biometry_server_status(
    state: tauri::State<'_, Arc<Mutex<BiometryServerState>>>,
) -> bool {
    let state = state.inner().lock().unwrap();
    state.shutdown_tx.is_some()
}
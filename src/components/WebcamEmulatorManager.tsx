import { useEffect, useState, useRef } from "react";
import { 
  startWebcamEmulator, 
  stopWebcamEmulator, 
  checkWebcamEmulatorStatus,
  WebcamSourceType 
} from "../services/webcamEmulatorService";
import { Patient } from "../types/patient";

interface WebcamEmulatorManagerProps {
  patients: Patient[];
}

export default function WebcamEmulatorManager({ patients }: WebcamEmulatorManagerProps) {
  const [isEmulatorActive, setIsEmulatorActive] = useState(false);
  const [sourceType, setSourceType] = useState<WebcamSourceType>("image");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [videoFilePath, setVideoFilePath] = useState("");
  const [cameraIndex, setCameraIndex] = useState<number>(0);
  const [availableCameras, setAvailableCameras] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<{text: string, isError: boolean}>({
    text: "Status: Inativo",
    isError: false
  });

  const previewRef = useRef<HTMLDivElement>(null);

  // Check initial status on component mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const isActive = await checkWebcamEmulatorStatus();
        setIsEmulatorActive(isActive);
        if (isActive) {
          setStatusMessage({
            text: "Status: Ativo (fonte desconhecida)",
            isError: false
          });
        }
      } catch (error) {
        console.error("Error checking emulator status:", error);
      }
    };
    
    checkStatus();
    detectCameras();
  }, []);

  const detectCameras = async () => {
    // This is a placeholder - in a real app, you would use a native API
    // to detect available cameras. For now, we'll just show some dummy options.
    setAvailableCameras(["Câmera 0", "Câmera 1"]);
  };

  const handlePatientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedPatientId(value ? parseInt(value, 10) : null);
    setSourceType("image");
  };

  const handleVideoFileSelect = async () => {
    try {
      // In a real app, we would use the dialog API to select a file
      // For now, we'll just use a fake path for demonstration
      const fakePath = "C:\\videos\\sample.mp4";
      setVideoFilePath(fakePath);
      setSourceType("video");
    } catch (error) {
      console.error("Error selecting video file:", error);
    }
  };

  const handleCameraSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const index = parseInt(e.target.value, 10);
    setCameraIndex(index);
    setSourceType("camera");
  };

  const toggleEmulator = async () => {
    try {
      if (isEmulatorActive) {
        await stopWebcamEmulator();
        setIsEmulatorActive(false);
        setStatusMessage({
          text: "Status: Inativo",
          isError: false
        });
      } else {
        let sourceData = "";
        
        switch (sourceType) {
          case "image":
            if (!selectedPatientId) {
              setStatusMessage({
                text: "Erro: Selecione um paciente com biometria facial",
                isError: true
              });
              return;
            }
            
            const patient = patients.find(p => p.id === selectedPatientId);
            if (!patient || !patient.facialBiometric) {
              setStatusMessage({
                text: "Erro: O paciente selecionado não possui biometria facial",
                isError: true
              });
              return;
            }
            
            sourceData = patient.facialBiometric;
            break;
            
          case "video":
            if (!videoFilePath) {
              setStatusMessage({
                text: "Erro: Selecione um arquivo de vídeo",
                isError: true
              });
              return;
            }
            
            sourceData = videoFilePath;
            break;
            
          case "camera":
            sourceData = cameraIndex.toString();
            break;
        }
        
        await startWebcamEmulator(sourceType, sourceData);
        setIsEmulatorActive(true);
        
        let sourceName = "";
        if (sourceType === "image") {
          const patient = patients.find(p => p.id === selectedPatientId);
          sourceName = patient ? patient.name.split(' ')[0] : "desconhecido";
        } else if (sourceType === "video") {
          sourceName = videoFilePath.split(/[/\\]/).pop() || "vídeo";
        } else {
          sourceName = `câmera ${cameraIndex}`;
        }
        
        setStatusMessage({
          text: `Status: Ativo (${sourceName})`,
          isError: false
        });
      }
    } catch (error: any) {
      setStatusMessage({
        text: `Erro: ${error.message || "Falha ao controlar emulador"}`,
        isError: true
      });
      console.error("Webcam emulator error:", error);
    }
  };

  return (
    <div className="webcam-emulator-manager bg-surface" style={{ padding: 24 }}>
      <h2 className="text-title" style={{ marginTop: 0 }}>Emulador de Webcam</h2>
      
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ 
          flex: 1,
          backgroundColor: "var(--surface-alt)", 
          padding: 24, 
          borderRadius: 8,
          marginBottom: 24
        }}>
          <div style={{ 
            fontSize: "1.1rem", 
            fontWeight: "bold",
            color: statusMessage.isError ? "var(--color-error)" : "var(--color-primary)",
            marginBottom: 24,
            textAlign: "center"
          }}>
            {statusMessage.text}
          </div>
          
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ color: "var(--text-title)", fontSize: "1rem", marginBottom: 12 }}>Fonte da Transmissão</h3>
            
            <div style={{ marginBottom: 16 }}>
              <label className="radio-container">
                <input 
                  type="radio" 
                  name="sourceType" 
                  checked={sourceType === "image"} 
                  onChange={() => setSourceType("image")} 
                />
                <span style={{ marginLeft: 8 }}>Biometria Facial do Paciente</span>
              </label>
              
              {sourceType === "image" && (
                <div style={{ marginLeft: 24, marginTop: 8 }}>
                  <select
                    value={selectedPatientId || ""}
                    onChange={handlePatientSelect}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      backgroundColor: "var(--bg-main-alt)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--bg-main)",
                      borderRadius: 4
                    }}
                  >
                    <option value="">-- Selecione um paciente --</option>
                    {patients
                      .filter(p => p.facialBiometric)
                      .map(patient => (
                        <option key={patient.id} value={patient.id}>
                          {patient.name}
                        </option>
                      ))
                    }
                  </select>
                </div>
              )}
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label className="radio-container">
                <input 
                  type="radio" 
                  name="sourceType" 
                  checked={sourceType === "video"} 
                  onChange={() => setSourceType("video")} 
                />
                <span style={{ marginLeft: 8 }}>Arquivo de Vídeo</span>
              </label>
              
              {sourceType === "video" && (
                <div style={{ marginLeft: 24, marginTop: 8, display: "flex" }}>
                  <input
                    type="text"
                    value={videoFilePath}
                    readOnly
                    placeholder="Nenhum arquivo selecionado"
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      backgroundColor: "var(--bg-main-alt)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--bg-main)",
                      borderRadius: 4
                    }}
                  />
                  <button 
                    className="btn btn-secondary" 
                    onClick={handleVideoFileSelect}
                    style={{ marginLeft: 8 }}
                  >
                    Selecionar
                  </button>
                </div>
              )}
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label className="radio-container">
                <input 
                  type="radio" 
                  name="sourceType" 
                  checked={sourceType === "camera"} 
                  onChange={() => setSourceType("camera")} 
                />
                <span style={{ marginLeft: 8 }}>Câmera Física</span>
              </label>
              
              {sourceType === "camera" && (
                <div style={{ marginLeft: 24, marginTop: 8 }}>
                  <select
                    value={cameraIndex}
                    onChange={handleCameraSelect}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      backgroundColor: "var(--bg-main-alt)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--bg-main)",
                      borderRadius: 4
                    }}
                  >
                    {availableCameras.map((camera, index) => (
                      <option key={index} value={index}>
                        {camera}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
          
          <button 
            className={`btn ${isEmulatorActive ? "btn-danger" : "btn-primary"}`}
            onClick={toggleEmulator}
            style={{ width: "100%" }}
          >
            {isEmulatorActive ? "Parar Emulador" : "Iniciar Emulador"}
          </button>
        </div>
        
        <div style={{ 
          flex: 1,
          backgroundColor: "var(--surface-alt)", 
          padding: 10, 
          borderRadius: 8,
          marginBottom: 24,
          display: "flex",
          flexDirection: "column"
        }}>
          <h3 style={{ color: "var(--text-title)", fontSize: "1rem", margin: "8px 0 16px 8px" }}>Preview</h3>
          
          <div 
            ref={previewRef}
            style={{ 
              flex: 1, 
              backgroundColor: "var(--bg-main)", 
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
              fontSize: "0.9rem"
            }}
          >
            {isEmulatorActive ? (
              "Emulador ativo - verifique em seus aplicativos de webcam"
            ) : (
              "Emulador inativo"
            )}
          </div>
        </div>
      </div>
      
      <div style={{ 
        backgroundColor: "var(--surface-alt)", 
        padding: 16, 
        borderRadius: 8,
        fontSize: "0.9rem",
        color: "var(--text-secondary)",
        lineHeight: 1.5
      }}>
        <p>
          Este emulador cria uma webcam virtual usando pyvirtualcam que pode ser usada em qualquer aplicativo
          que aceite webcams (como navegadores, aplicativos de videoconferência, etc).
        </p>
        <p>
          <strong>Requisitos:</strong> Python 3.6+ com as bibliotecas pyvirtualcam, opencv-python e numpy instaladas.
          Também é necessário um driver de câmera virtual como OBS Virtual Camera.
        </p>
        <p style={{ marginBottom: 0 }}>
          <strong>Dica:</strong> Para verificar se o emulador está funcionando, abra um aplicativo que use webcam
          e selecione "OBS Virtual Camera" ou similar na lista de dispositivos.
        </p>
      </div>
    </div>
  );
}
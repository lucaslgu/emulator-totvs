import { useState, useEffect } from "react";
import "./App.css";
import PatientManager from "./components/PatientManager";
import HotkeyManager from "./components/HotkeyManager";
import BiometryServerManager from "./components/BiometryServerManager";
import WebcamEmulatorManager from "./components/WebcamEmulatorManager";
import AppSettings from "./components/AppSettings";
import { loadPatients } from "./services/patientsService";
import { Patient } from "./types/patient";

function App() {
  const [activeTab, setActiveTab] = useState<"patients" | "hotkey" | "biometry" | "webcam" | "settings">("patients");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    async function init() {
      try {
        const data = await loadPatients();
        if (isMounted) setPatients(data);
      } catch (err: any) {
        if (isMounted) setError(err.message ?? "Erro ao carregar pacientes");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    init();
    
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="app-root" style={{ minHeight: "100vh", background: "var(--bg-main)", color: "var(--text-primary)" }}>
      <div className="app-tabs" style={{ 
        display: "flex", 
        borderBottom: "1px solid var(--surface)",
        backgroundColor: "var(--bg-main-alt)"
      }}>
        <div 
          className={`tab ${activeTab === "patients" ? "active" : ""}`}
          onClick={() => setActiveTab("patients")}
          style={{ 
            padding: "16px 24px", 
            cursor: "pointer",
            borderBottom: activeTab === "patients" ? "3px solid var(--color-primary)" : "none",
            color: activeTab === "patients" ? "var(--text-title)" : "var(--text-secondary)",
            fontWeight: activeTab === "patients" ? "bold" : "normal",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <span style={{ fontSize: "18px" }}>👥</span>
          Gerenciador de Pacientes
        </div>
        <div 
          className={`tab ${activeTab === "hotkey" ? "active" : ""}`}
          onClick={() => setActiveTab("hotkey")}
          style={{ 
            padding: "16px 24px", 
            cursor: "pointer",
            borderBottom: activeTab === "hotkey" ? "3px solid var(--color-primary)" : "none",
            color: activeTab === "hotkey" ? "var(--text-title)" : "var(--text-secondary)",
            fontWeight: activeTab === "hotkey" ? "bold" : "normal",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <span style={{ fontSize: "18px" }}>🔑</span>
          Cartão Magnético
        </div>
        <div 
          className={`tab ${activeTab === "biometry" ? "active" : ""}`}
          onClick={() => setActiveTab("biometry")}
          style={{ 
            padding: "16px 24px", 
            cursor: "pointer",
            borderBottom: activeTab === "biometry" ? "3px solid var(--color-primary)" : "none",
            color: activeTab === "biometry" ? "var(--text-title)" : "var(--text-secondary)",
            fontWeight: activeTab === "biometry" ? "bold" : "normal",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <span style={{ fontSize: "18px" }}>🔐</span>
          Biometria Digital
        </div>
        <div 
          className={`tab ${activeTab === "webcam" ? "active" : ""}`}
          onClick={() => setActiveTab("webcam")}
          style={{ 
            padding: "16px 24px", 
            cursor: "pointer",
            borderBottom: activeTab === "webcam" ? "3px solid var(--color-primary)" : "none",
            color: activeTab === "webcam" ? "var(--text-title)" : "var(--text-secondary)",
            fontWeight: activeTab === "webcam" ? "bold" : "normal",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <span style={{ fontSize: "18px" }}>📷</span>
          Webcam Virtual
        </div>
        <div 
          className={`tab ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
          style={{ 
            padding: "16px 24px", 
            cursor: "pointer",
            borderBottom: activeTab === "settings" ? "3px solid var(--color-primary)" : "none",
            color: activeTab === "settings" ? "var(--text-title)" : "var(--text-secondary)",
            fontWeight: activeTab === "settings" ? "bold" : "normal",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <span style={{ fontSize: "18px" }}>⚙️</span>
          Configurações
        </div>
      </div>
      
      <div className="app-content">
        {loading ? (
          <div style={{ padding: 24 }}>Carregando dados...</div>
        ) : error ? (
          <div style={{ padding: 24, color: "var(--color-error)" }}>
            Erro: {error}
          </div>
        ) : (
          <>
            {activeTab === "patients" && (
              <PatientManager onPatientsChanged={setPatients} />
            )}
            {activeTab === "hotkey" && <HotkeyManager patients={patients} />}
            {activeTab === "biometry" && <BiometryServerManager patients={patients} />}
            {activeTab === "webcam" && <WebcamEmulatorManager patients={patients} />}
            {activeTab === "settings" && <AppSettings />}
          </>
        )}
      </div>
    </div>
  );
}

export default App;

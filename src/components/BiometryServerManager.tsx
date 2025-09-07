import { useEffect, useState } from "react";
import { startBiometryServer, stopBiometryServer, checkBiometryServerStatus } from "../services/biometryServerService";
import { Patient } from "../types/patient";

interface BiometryServerManagerProps {
  patients: Patient[];
}

export default function BiometryServerManager({ patients }: BiometryServerManagerProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [isServerActive, setIsServerActive] = useState(false);
  const [serverHost, setServerHost] = useState("127.0.0.1");
  const [serverPort, setServerPort] = useState(21004);
  const [statusMessage, setStatusMessage] = useState<{text: string, isError: boolean}>({
    text: "Servidor Local: Desativado",
    isError: false
  });

  // Check initial status on component mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const isActive = await checkBiometryServerStatus();
        setIsServerActive(isActive);
        if (isActive) {
          setStatusMessage({
            text: "Servidor Local: Ativo (paciente desconhecido)",
            isError: false
          });
        }
      } catch (error) {
        console.error("Error checking server status:", error);
      }
    };
    
    checkStatus();
  }, []);

  const handlePatientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedPatientId(value ? parseInt(value, 10) : null);
  };

  const toggleServer = async () => {
    try {
      if (isServerActive) {
        await stopBiometryServer(serverHost, serverPort);
        setIsServerActive(false);
        setStatusMessage({
          text: "Servidor Local: Desativado",
          isError: false
        });
      } else {
        const selectedPatient = patients.find(p => p.id === selectedPatientId);
        if (!selectedPatient) {
          setStatusMessage({
            text: "Erro: Selecione um paciente primeiro",
            isError: true
          });
          return;
        }

        // Extract biometric data from the selected patient
        const biometricData = selectedPatient.digitalBiometrics.map(b => b.data);
        
        if (biometricData.length === 0) {
          setStatusMessage({
            text: "Erro: O paciente selecionado não possui biometrias digitais",
            isError: true
          });
          return;
        }

        await startBiometryServer(serverHost, serverPort, biometricData);
        setIsServerActive(true);
        setStatusMessage({
          text: `Servidor Local: Ativo para ${selectedPatient.name.split(' ')[0]}`,
          isError: false
        });
      }
    } catch (error: any) {
      setStatusMessage({
        text: `Erro: ${error.message || "Falha ao controlar servidor"}`,
        isError: true
      });
      console.error("Server error:", error);
    }
  };

  return (
    <div className="biometry-server-manager bg-surface" style={{ padding: 24 }}>
      <h2 className="text-title" style={{ marginTop: 0 }}>Servidor de Biometria Digital</h2>
      
      <div style={{ 
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
        
        <div style={{ marginBottom: 16 }}>
          <label 
            htmlFor="patient-select" 
            style={{ 
              display: "block", 
              marginBottom: 8,
              color: "var(--text-secondary)"
            }}
          >
            Selecione um paciente:
          </label>
          <select
            id="patient-select"
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
            <option value="">-- Selecione --</option>
            {patients.map(patient => (
              <option key={patient.id} value={patient.id}>
                {patient.name} ({patient.digitalBiometrics.length} biometrias)
              </option>
            ))}
          </select>
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <label 
                htmlFor="server-host" 
                style={{ 
                  display: "block", 
                  marginBottom: 8,
                  color: "var(--text-secondary)"
                }}
              >
                Host:
              </label>
              <input
                id="server-host"
                type="text"
                value={serverHost}
                onChange={(e) => setServerHost(e.target.value)}
                disabled={isServerActive}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  backgroundColor: "var(--bg-main-alt)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--bg-main)",
                  borderRadius: 4
                }}
              />
            </div>
            <div>
              <label 
                htmlFor="server-port" 
                style={{ 
                  display: "block", 
                  marginBottom: 8,
                  color: "var(--text-secondary)"
                }}
              >
                Porta:
              </label>
              <input
                id="server-port"
                type="number"
                value={serverPort}
                onChange={(e) => setServerPort(parseInt(e.target.value, 10))}
                disabled={isServerActive}
                style={{
                  width: "100px",
                  padding: "8px 12px",
                  backgroundColor: "var(--bg-main-alt)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--bg-main)",
                  borderRadius: 4
                }}
              />
            </div>
          </div>
        </div>
        
        <button 
          className={`btn ${isServerActive ? "btn-danger" : "btn-primary"}`}
          onClick={toggleServer}
          style={{ width: "99%", height: 36, margin: "0 auto", marginBottom: 16 }}
        >
          {isServerActive ? "Desativar Servidor Local" : "Ativar Servidor Local"}
        </button>
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
          Quando ativado, o servidor local responderá às requisições de captura e verificação
          de biometria digital na porta especificada.
        </p>
        <p>
          As biometrias digitais do paciente selecionado serão usadas para simular um
          dispositivo de captura de digitais real.
        </p>
        <p style={{ marginBottom: 0 }}>
          <strong>Endpoints:</strong> POST / (captura), POST /verify (verificação), POST /shutdown (desligar)
        </p>
      </div>
    </div>
  );
}
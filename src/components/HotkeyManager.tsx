import { useEffect, useState } from "react";
import { startHotkey, stopHotkey, checkHotkeyStatus, diagnoseHotkeySystem } from "../services/hotkeyService";
import { Patient } from "../types/patient";

interface HotkeyManagerProps {
  patients: Patient[];
}

export default function HotkeyManager({ patients }: HotkeyManagerProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [isHotkeyActive, setIsHotkeyActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{text: string, isError: boolean}>({
    text: "Hotkey Ctrl+Q: Desativado",
    isError: false
  });
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  // Check initial status on component mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const isActive = await checkHotkeyStatus();
        setIsHotkeyActive(isActive);
        if (isActive) {
          setStatusMessage({
            text: "Hotkey Ctrl+Q: Ativo (paciente desconhecido)",
            isError: false
          });
        }
      } catch (error) {
        console.error("Error checking hotkey status:", error);
      }
    };
    
    checkStatus();
  }, []);

  const handlePatientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedPatientId(value ? parseInt(value, 10) : null);
  };

  const toggleHotkey = async () => {
    try {
      if (isHotkeyActive) {
        await stopHotkey();
        setIsHotkeyActive(false);
        setStatusMessage({
          text: "Hotkey Ctrl+Q: Desativado",
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

        // Show installation message if needed
        setStatusMessage({
          text: "Verificando AutoHotkey V2...",
          isError: false
        });

        await startHotkey(selectedPatient.wallet);
        setIsHotkeyActive(true);
        setStatusMessage({
          text: `Hotkey Ctrl+Q: Ativo para ${selectedPatient.name.split(' ')[0]}`,
          isError: false
        });
      }
    } catch (error: any) {
      console.error("Hotkey error details:", error);
      
      // Provide more specific error messages based on the error
      let errorMessage = "Falha ao controlar hotkey";
      
      if (error.message) {
        if (error.message.includes("AutoHotkey V2 não encontrado e falha na instalação automática")) {
          errorMessage = "AutoHotkey V2 não encontrado e a instalação automática falhou. Clique em 'Executar Diagnóstico' para mais informações.";
        } else if (error.message.includes("AutoHotkey não encontrado")) {
          errorMessage = "AutoHotkey V2 não está instalado. O sistema tentará instalar automaticamente...";
        } else if (error.message.includes("Falha no download")) {
          errorMessage = "Falha no download do AutoHotkey V2. Verifique sua conexão com a internet.";
        } else if (error.message.includes("Falha na instalação")) {
          errorMessage = "Download concluído mas falha na instalação. Verifique as permissões de administrador.";
        } else if (error.message.includes("Falha ao criar diretório temporário")) {
          errorMessage = "Erro de permissão: Não foi possível criar arquivos temporários.";
        } else if (error.message.includes("Falha ao iniciar AutoHotkey")) {
          errorMessage = "Erro ao iniciar AutoHotkey. Verifique se o executável está acessível.";
        } else if (error.message.includes("Falha ao obter lock")) {
          errorMessage = "Erro interno: Falha na sincronização do sistema.";
        } else {
          errorMessage = error.message;
        }
      }
      
      setStatusMessage({
        text: `Erro: ${errorMessage}`,
        isError: true
      });
    }
  };

  const runDiagnostics = async () => {
    try {
      setIsRunningDiagnostics(true);
      const diagnostics = await diagnoseHotkeySystem();
      setDiagnosticInfo(diagnostics);
      console.log("Diagnostic results:", diagnostics);
    } catch (error) {
      console.error("Diagnostic failed:", error);
      setDiagnosticInfo({ error: "Falha ao executar diagnóstico" });
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  return (
    <div className="hotkey-manager bg-surface" style={{ padding: 24 }}>
      <h2 className="text-title" style={{ marginTop: 0 }}>Controle do Cartão Magnético</h2>
      
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
                {patient.name} ({patient.wallet})
              </option>
            ))}
          </select>
        </div>
        
        <button 
          className={`btn ${isHotkeyActive ? "btn-danger" : "btn-primary"}`}
          onClick={toggleHotkey}
          style={{ width: "100%" }}
        >
          {isHotkeyActive ? "Desativar Hotkey Ctrl+Q" : "Ativar Hotkey Ctrl+Q"}
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={runDiagnostics}
          disabled={isRunningDiagnostics}
          style={{ 
            width: "100%", 
            marginTop: 12,
            backgroundColor: "var(--surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--bg-main)"
          }}
        >
          {isRunningDiagnostics ? "Executando Diagnóstico..." : "Executar Diagnóstico do Sistema"}
        </button>
      </div>
      
      {diagnosticInfo && (
        <div style={{ 
          backgroundColor: "var(--surface-alt)", 
          padding: 16, 
          borderRadius: 8,
          marginBottom: 24,
          fontSize: "0.9rem"
        }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, color: "var(--text-primary)" }}>
            Resultados do Diagnóstico
          </h3>
          
          {/* AutoHotkey Status Summary */}
          {diagnosticInfo.autohotkey_paths && (
            <div style={{ 
              backgroundColor: "var(--bg-main-alt)", 
              padding: 12, 
              borderRadius: 4,
              marginBottom: 16
            }}>
              <h4 style={{ marginTop: 0, marginBottom: 8, color: "var(--text-primary)" }}>
                Status do AutoHotkey V2
              </h4>
              
              {diagnosticInfo.ahk_in_resources ? (
                <div style={{ color: "var(--color-success)", fontWeight: "bold" }}>
                  ✅ AutoHotkey V2 encontrado nos recursos do aplicativo
                </div>
              ) : (
                <div style={{ color: "var(--color-warning)", fontWeight: "bold" }}>
                  ⚠️ AutoHotkey V2 não encontrado - será instalado automaticamente
                </div>
              )}
              
              {diagnosticInfo.recommendations && (
                <div style={{ 
                  marginTop: 8, 
                  padding: 8, 
                  backgroundColor: "var(--surface)", 
                  borderRadius: 4,
                  fontSize: "0.85rem"
                }}>
                  <strong>Recomendação:</strong> {diagnosticInfo.recommendations.message}
                  {diagnosticInfo.recommendations.download_url && (
                    <div style={{ marginTop: 4 }}>
                      <strong>Link de download:</strong>{" "}
                      <a 
                        href={diagnosticInfo.recommendations.download_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: "var(--color-primary)" }}
                      >
                        {diagnosticInfo.recommendations.download_url}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Full Diagnostic Data */}
          <details style={{ marginTop: 16 }}>
            <summary style={{ 
              cursor: "pointer", 
              color: "var(--text-secondary)",
              fontWeight: "bold"
            }}>
              Ver dados técnicos completos
            </summary>
            <pre style={{ 
              backgroundColor: "var(--bg-main-alt)", 
              padding: 12, 
              borderRadius: 4,
              overflow: "auto",
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              marginTop: 8
            }}>
              {JSON.stringify(diagnosticInfo, null, 2)}
            </pre>
          </details>
        </div>
      )}
      
      <div style={{ 
        backgroundColor: "var(--surface-alt)", 
        padding: 16, 
        borderRadius: 8,
        fontSize: "0.9rem",
        color: "var(--text-secondary)",
        lineHeight: 1.5
      }}>
        <p>
          Quando ativado, o atalho <strong>Ctrl+Q</strong> enviará os dados do paciente selecionado
          para qualquer campo de texto ativo no seu computador.
        </p>
        <p>
          Isso simula a leitura de um cartão magnético, facilitando o processo de identificação
          do paciente em sistemas que suportam leitura de cartões.
        </p>
        <p style={{ marginBottom: 0 }}>
          <strong>Nota:</strong> Requer que o AutoHotkey V2 esteja instalado e acessível pelo aplicativo.
        </p>
        <p style={{ 
          marginTop: 12, 
          marginBottom: 0, 
          padding: 12, 
          backgroundColor: "var(--color-info-bg)", 
          borderRadius: 4,
          border: "1px solid var(--color-info-border)",
          color: "var(--color-info-text)"
        }}>
          <strong>💡 Instalação Automática:</strong> Se o AutoHotkey V2 não estiver instalado, 
          o sistema baixará e instalará automaticamente o instalador oficial do site da AutoHotkey. 
          Isso pode levar alguns minutos dependendo da sua conexão com a internet.
        </p>
      </div>
    </div>
  );
}
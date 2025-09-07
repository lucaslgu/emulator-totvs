import { useState } from "react";
import { Patient, DigitalBiometric } from "../types/patient";
import BiometricUploader from "./BiometricUploader";

interface AddEditPatientProps {
  patient?: Patient;
  onSave: (patient: Patient) => void;
  onCancel: () => void;
}

export default function AddEditPatient({ patient, onSave, onCancel }: AddEditPatientProps) {
  const [name, setName] = useState(patient?.name || "");
  const [wallet, setWallet] = useState(patient?.wallet || "");
  const [facialBiometric, setFacialBiometric] = useState(patient?.facialBiometric || "");
  const [digitalBiometrics, setDigitalBiometrics] = useState<DigitalBiometric[]>(
    patient?.digitalBiometrics || []
  );
  const [activeTab, setActiveTab] = useState<"facial" | "digital">("facial");
  const [errors, setErrors] = useState<{name?: string; wallet?: string}>({});

  const validateForm = (): boolean => {
    const newErrors: {name?: string; wallet?: string} = {};
    
    if (!name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }
    
    if (!wallet.trim()) {
      newErrors.wallet = "Número da carteira é obrigatório";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    
    onSave({
      id: patient?.id || 0,
      name: name.trim(),
      wallet: wallet.trim(),
      facialBiometric,
      digitalBiometrics,
      imported: patient?.imported || false
    });
  };

  const handleAddDigitalBiometric = () => {
    setDigitalBiometrics([...digitalBiometrics, { finger: "Polegar Direito", data: "" }]);
  };

  const handleRemoveDigitalBiometric = (index: number) => {
    setDigitalBiometrics(digitalBiometrics.filter((_, i) => i !== index));
  };

  const handleUpdateDigitalBiometric = (index: number, field: keyof DigitalBiometric, value: string) => {
    const updated = [...digitalBiometrics];
    updated[index] = { ...updated[index], [field]: value };
    setDigitalBiometrics(updated);
  };

  return (
    <div className="modal-overlay" style={{ 
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: "rgba(0,0,0,0.7)", 
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000
    }}>
      <div className="modal-content" style={{ 
        backgroundColor: "var(--surface)", 
        borderRadius: "12px",
        width: "90%",
        maxWidth: "700px",
        maxHeight: "90vh",
        overflow: "auto",
        padding: "24px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
      }}>
        <h2 style={{ color: "var(--text-title)", marginTop: 0, marginBottom: "24px" }}>
          {patient ? "Editar Paciente" : "Adicionar Paciente"}
        </h2>
        
        <div className="form-group" style={{ marginBottom: "20px" }}>
          <label htmlFor="name" className="form-label">
            Nome:
          </label>
          <input
            id="name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ 
              border: errors.name ? "1px solid var(--color-error)" : "1px solid var(--border-color)"
            }}
          />
          {errors.name && (
            <div style={{ color: "var(--color-error)", fontSize: "0.875rem", marginTop: "4px" }}>
              {errors.name}
            </div>
          )}
        </div>
        
        <div className="form-group" style={{ marginBottom: "24px" }}>
          <label htmlFor="wallet" className="form-label">
            Nº Carteira:
          </label>
          <input
            id="wallet"
            type="text"
            className="form-input"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            style={{ 
              border: errors.wallet ? "1px solid var(--color-error)" : "1px solid var(--border-color)"
            }}
          />
          {errors.wallet && (
            <div style={{ color: "var(--color-error)", fontSize: "0.875rem", marginTop: "4px" }}>
              {errors.wallet}
            </div>
          )}
        </div>
        
        {/* Tabs */}
        <div className="tabs" style={{ 
          display: "flex", 
          backgroundColor: "var(--surface-alt)", 
          borderRadius: "8px", 
          padding: "4px", 
          marginBottom: "20px" 
        }}>
          <div 
            className={`tab ${activeTab === "facial" ? "active" : ""}`}
            onClick={() => setActiveTab("facial")}
            style={{ 
              flex: 1,
              padding: "12px 16px", 
              cursor: "pointer",
              backgroundColor: activeTab === "facial" ? "var(--color-primary)" : "transparent",
              color: activeTab === "facial" ? "#000" : "var(--text-secondary)",
              fontWeight: activeTab === "facial" ? "600" : "normal",
              borderRadius: "6px",
              textAlign: "center",
              transition: "all 0.2s ease"
            }}
          >
            Biometria Facial
          </div>
          <div 
            className={`tab ${activeTab === "digital" ? "active" : ""}`}
            onClick={() => setActiveTab("digital")}
            style={{ 
              flex: 1,
              padding: "12px 16px", 
              cursor: "pointer",
              backgroundColor: activeTab === "digital" ? "var(--color-primary)" : "transparent",
              color: activeTab === "digital" ? "#000" : "var(--text-secondary)",
              fontWeight: activeTab === "digital" ? "600" : "normal",
              borderRadius: "6px",
              textAlign: "center",
              transition: "all 0.2s ease"
            }}
          >
            Biometrias Digitais
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="tab-content" style={{ marginBottom: "24px" }}>
          {activeTab === "facial" && (
            <div className="facial-tab">
              <div className="form-group">
                <BiometricUploader
                  initialValue={facialBiometric}
                  onBiometricChange={setFacialBiometric}
                  type="facial"
                />
              </div>
            </div>
          )}
          
          {activeTab === "digital" && (
            <div className="digital-tab">
              <button 
                className="btn btn-primary" 
                style={{ marginBottom: "16px" }}
                onClick={handleAddDigitalBiometric}
                disabled={digitalBiometrics.length >= 10}
              >
                Adicionar Biometria Digital
              </button>
              
              <div className="biometrics-list" style={{ maxHeight: "400px", overflowY: "auto" }}>
                {digitalBiometrics.length === 0 && (
                  <div style={{ color: "var(--text-secondary)", padding: "16px 0", textAlign: "center" }}>
                    Nenhuma biometria digital cadastrada.
                  </div>
                )}
                
                {digitalBiometrics.map((biometric, index) => (
                  <div 
                    key={index} 
                    className="biometric-item" 
                    style={{ 
                      backgroundColor: "var(--surface-alt)",
                      padding: "16px",
                      borderRadius: "8px",
                      marginBottom: "12px",
                      border: "1px solid var(--border-color)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
                      <select
                        value={biometric.finger}
                        onChange={(e) => handleUpdateDigitalBiometric(index, "finger", e.target.value)}
                        style={{ 
                          padding: "8px 12px", 
                          backgroundColor: "var(--bg-main-alt)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "6px",
                          color: "var(--text-primary)",
                          marginRight: "12px",
                          fontSize: "0.9rem"
                        }}
                      >
                        <option value="Polegar Direito">Polegar Direito</option>
                        <option value="Indicador Direito">Indicador Direito</option>
                        <option value="Médio Direito">Médio Direito</option>
                        <option value="Anelar Direito">Anelar Direito</option>
                        <option value="Mínimo Direito">Mínimo Direito</option>
                        <option value="Polegar Esquerdo">Polegar Esquerdo</option>
                        <option value="Indicador Esquerdo">Indicador Esquerdo</option>
                        <option value="Médio Esquerdo">Médio Esquerdo</option>
                        <option value="Anelar Esquerdo">Anelar Esquerdo</option>
                        <option value="Mínimo Esquerdo">Mínimo Esquerdo</option>
                      </select>
                      
                      <button 
                        className="btn btn-danger" 
                        style={{ fontSize: "0.875rem", marginLeft: "auto" }}
                        onClick={() => handleRemoveDigitalBiometric(index)}
                      >
                        Remover
                      </button>
                    </div>
                    
                    <BiometricUploader
                      initialValue={biometric.data}
                      onBiometricChange={(value) => handleUpdateDigitalBiometric(index, "data", value)}
                      type="digital"
                      fingerName={biometric.finger}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="dialog-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
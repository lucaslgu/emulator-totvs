import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Patient } from "../types/patient";
import { patientSyncService, Beneficiary, BeneficiarySearchParams } from "../services/patientSyncService";

interface ImportPatientDialogProps {
  onImport: (patient: Patient) => void;
  onCancel: () => void;
}

export default function ImportPatientDialog({ onImport, onCancel }: ImportPatientDialogProps) {
  const [, setConfig] = useState<any>({});
  const [searchMode, setSearchMode] = useState<"card" | "advanced">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [guarantor, setGuarantor] = useState("");
  const [modality, setModality] = useState("");
  const [contract, setContract] = useState("");
  const [proposal, setProposal] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "info" | "success" | "error" } | null>(null);
  const [searchResults, setSearchResults] = useState<Beneficiary[]>([]);
  const [showResults, setShowResults] = useState(false);

  function getFingerNameByCode(fingerCode: number): string {
    // Ordem correta da biometria da TOTVS:
    // 1 = Mínimo Esquerdo
    // 2 = Anelar Esquerdo
    // 3 = Médio Esquerdo
    // 4 = Indicador Esquerdo
    // 5 = Polegar Esquerdo
    // 6 = Polegar Direito
    // 7 = Indicador Direito
    // 8 = Médio Direito
    // 9 = Anelar Direito
    // 10 = Mínimo Direito
    
    // Mapeamento customizado para os códigos retornados pela API
    switch (fingerCode) {
      case 1: return "Mínimo Esquerdo";
      case 2: return "Anelar Esquerdo";
      case 3: return "Médio Esquerdo";
      case 4: return "Indicador Esquerdo";
      case 5: return "Polegar Esquerdo";
      case 6: return "Polegar Direito";
      case 7: return "Indicador Direito";
      case 8: return "Médio Direito";
      case 9: return "Anelar Direito";
      case 10: return "Mínimo Direito";
      default: return `Dedo ${fingerCode}`;
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const data = await invoke("load_config");
      setConfig(data);
      await patientSyncService.loadConfig();
    } catch (err: any) {
      setMessage({ text: `Erro ao carregar configurações: ${err.message}`, type: "error" });
    }
  }

  function updateMessage(text: string, type: "info" | "success" | "error" = "info") {
    setMessage({ text, type });
    if (type === "success") {
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function searchBeneficiaries() {
    if (!guarantor.trim()) {
      updateMessage("O campo 'Contratante (Guarantor)' é obrigatório para a busca avançada.", "error");
      return;
    }

    setLoading(true);
    updateMessage("Buscando beneficiários...", "info");

    try {
      const params: BeneficiarySearchParams = {
        guarantor: guarantor.trim(),
        modality: modality.trim() || undefined,
        proposal: proposal.trim() || undefined,
        contract: contract.trim() || undefined
      };

      const results = await patientSyncService.searchBeneficiaries(params);
      
      if (results.length > 0) {
        setSearchResults(results);
        setShowResults(true);
        updateMessage(`${results.length} beneficiário(s) encontrado(s). Selecione um para continuar.`, "success");
      } else {
        updateMessage("Nenhum beneficiário encontrado com os filtros informados.", "error");
        setShowResults(false);
      }
    } catch (err: any) {
      updateMessage(`Erro na busca: ${err.message}`, "error");
      setShowResults(false);
    } finally {
      setLoading(false);
    }
  }

  async function importPatient(beneficiary: Beneficiary) {
    setLoading(true);
    updateMessage("Importando paciente...", "info");

    try {
      // A API pode retornar o nome como 'name', 'fullName' ou 'nome'
      const resolvedName = (beneficiary.name || beneficiary.fullName || (beneficiary as any).nome || "").trim();
      const resolvedWallet = beneficiary.completeCardNumber || `${beneficiary.healthInsurer.padStart(4, '0')}${beneficiary.cardNumber.padStart(13, '0')}`;

      // Buscar biometrias digitais e facial no momento da importação
      const [fingerprints, facialBiometry] = await Promise.all([
        patientSyncService.getFingerprints(resolvedWallet),
        patientSyncService.getFacialBiometry(resolvedWallet)
      ]);

      console.log("Digitais importadas:", fingerprints?.length || 0);
      console.log("Facial importada:", facialBiometry ? "Sim" : "Não");

      const digitalBiometrics = (fingerprints || []).map(fp => ({
        finger: (fp && typeof fp.fingerCode === 'number') ? getFingerNameByCode(fp.fingerCode) : `Dedo`,
        data: fp?.biometry || ""
      })).filter(b => b.data);

      const newPatient: Patient = {
        id: 0, // Será definido pelo sistema
        name: resolvedName,
        wallet: resolvedWallet,
        facialBiometric: facialBiometry || "",
        digitalBiometrics,
        imported: true
      };

      onImport(newPatient);
      updateMessage("Paciente importado com sucesso!", "success");
    } catch (err: any) {
      updateMessage(`Erro ao importar: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCardSearch() {
    if (!cardNumber.trim()) {
      updateMessage("Digite o número da carteira para buscar.", "error");
      return;
    }

    setLoading(true);
    updateMessage("Buscando paciente...", "info");

    try {
      const beneficiary = await patientSyncService.getBeneficiaryDetails(cardNumber.trim());
      
      // A API pode retornar o nome como 'name', 'fullName' ou 'nome'
      const resolvedName = (beneficiary.name || beneficiary.fullName || (beneficiary as any).nome || "").trim();
      const resolvedWallet = beneficiary.completeCardNumber || cardNumber.trim();

      // Buscar biometrias digitais e facial no momento da importação
      const [fingerprints, facialBiometry] = await Promise.all([
        patientSyncService.getFingerprints(resolvedWallet),
        patientSyncService.getFacialBiometry(resolvedWallet)
      ]);
      
      console.log("Digitais importadas por carteira:", fingerprints?.length || 0);
      console.log("Facial importada por carteira:", facialBiometry ? "Sim" : "Não");
      
      const digitalBiometrics = (fingerprints || []).map(fp => ({
        finger: (fp && typeof fp.fingerCode === 'number') ? getFingerNameByCode(fp.fingerCode) : `Dedo`,
        data: fp?.biometry || ""
      })).filter(b => b.data);

      const newPatient: Patient = {
        id: 0,
        name: resolvedName,
        wallet: resolvedWallet,
        facialBiometric: facialBiometry || "",
        digitalBiometrics,
        imported: true
      };

      onImport(newPatient);
      updateMessage("Paciente importado com sucesso!", "success");
    } catch (err: any) {
      updateMessage(`Erro ao buscar paciente: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000
    }}>
      <div className="modal-content" style={{
        backgroundColor: "var(--surface)",
        borderRadius: "12px",
        padding: "24px",
        maxWidth: "600px",
        width: "90%",
        maxHeight: "80vh",
        overflow: "auto",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        border: "1px solid var(--border-color)"
      }}>
        <header style={{ marginBottom: "24px" }}>
          <h2 className="text-title" style={{ margin: 0 }}>Importar Paciente da API</h2>
          <p className="text-secondary" style={{ margin: "8px 0 0 0" }}>
            Busque e importe pacientes da base de dados
          </p>
        </header>

        {message && (
          <div 
            className={`alert ${message.type === "success" ? "alert-success" : message.type === "error" ? "alert-error" : "alert-info"}`}
            style={{ 
              padding: "12px 16px", 
              borderRadius: "8px", 
              marginBottom: "24px",
              backgroundColor: message.type === "success" ? "var(--color-success)" : 
                            message.type === "error" ? "var(--color-error)" : "var(--color-primary)",
              color: "white"
            }}
          >
            {message.text}
          </div>
        )}

        {/* Search Mode Toggle */}
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "var(--text-title)" }}>Modo de Busca</h3>
          <div style={{ 
            display: "flex", 
            gap: "0", 
            marginBottom: "16px",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            overflow: "hidden"
          }}>
            <label style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "8px", 
              padding: "12px 16px",
              cursor: "pointer",
              backgroundColor: searchMode === "card" ? "var(--color-primary)" : "var(--surface-alt)",
              color: searchMode === "card" ? "#000" : "var(--text-secondary)",
              flex: 1,
              justifyContent: "center",
              borderRight: "1px solid var(--border-color)",
              transition: "all 0.2s ease"
            }}>
              <input
                type="radio"
                checked={searchMode === "card"}
                onChange={() => setSearchMode("card")}
                style={{ margin: 0 }}
              />
              Por Nº Carteira
            </label>
            <label style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "8px", 
              padding: "12px 16px",
              cursor: "pointer",
              backgroundColor: searchMode === "advanced" ? "var(--color-primary)" : "var(--surface-alt)",
              color: searchMode === "advanced" ? "#000" : "var(--text-secondary)",
              flex: 1,
              justifyContent: "center",
              transition: "all 0.2s ease"
            }}>
              <input
                type="radio"
                checked={searchMode === "advanced"}
                onChange={() => setSearchMode("advanced")}
                style={{ margin: 0 }}
              />
              Busca Avançada
            </label>
          </div>
        </div>

        {/* Card Search Mode */}
        {searchMode === "card" && (
          <div style={{ marginBottom: "24px" }}>
            <label className="form-label">Nº da Carteira</label>
            <div style={{ display: "flex", gap: "12px" }}>
              <input
                type="text"
                className="form-input"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="Digite o número da carteira"
                style={{ flex: 1 }}
              />
              <button 
                className="btn btn-primary"
                onClick={handleCardSearch}
                disabled={loading || !cardNumber.trim()}
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  gap: "8px",
                  minHeight: "44px"
                }}
              >
                {loading ? (
                  <>
                    <div style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid transparent",
                      borderTop: "2px solid currentColor",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite"
                    }}></div>
                    Buscando...
                  </>
                ) : (
                  "Buscar"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Advanced Search Mode */}
        {searchMode === "advanced" && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "grid", gap: "16px" }}>
              <div>
                <label className="form-label">Contratante (Guarantor) *</label>
                <input
                  type="text"
                  className="form-input"
                  value={guarantor}
                  onChange={(e) => setGuarantor(e.target.value)}
                  placeholder="Código do contratante"
                />
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label className="form-label">Modalidade</label>
                  <input
                    type="text"
                    className="form-input"
                    value={modality}
                    onChange={(e) => setModality(e.target.value)}
                    placeholder="Modalidade"
                  />
                </div>
                <div>
                  <label className="form-label">Contrato</label>
                  <input
                    type="text"
                    className="form-input"
                    value={contract}
                    onChange={(e) => setContract(e.target.value)}
                    placeholder="Número do contrato"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Proposta</label>
                <input
                  type="text"
                  className="form-input"
                  value={proposal}
                  onChange={(e) => setProposal(e.target.value)}
                  placeholder="Número da proposta"
                />
              </div>

              <button 
                className="btn btn-primary"
                onClick={searchBeneficiaries}
                disabled={loading || !guarantor.trim()}
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  gap: "8px",
                  minHeight: "44px"
                }}
              >
                {loading ? (
                  <>
                    <div style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid transparent",
                      borderTop: "2px solid currentColor",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite"
                    }}></div>
                    Buscando...
                  </>
                ) : (
                  "Buscar Beneficiários"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Search Results */}
        {showResults && searchResults.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "var(--text-title)" }}>Resultados da Busca</h3>
            <div style={{ display: "grid", gap: "12px" }}>
              {searchResults.map((beneficiary, index) => (
                <div 
                  key={index}
                  style={{
                    padding: "16px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "var(--surface-alt)",
                    transition: "all 0.2s ease"
                  }}
                >
                  <div>
                    <div style={{ 
                      fontWeight: "bold", 
                      color: "var(--text-title)",
                      marginBottom: "4px"
                    }}>
                      {(beneficiary.name || beneficiary.fullName || (beneficiary as any).nome || "").trim() || "Sem nome"}
                    </div>
                    <div style={{ 
                      fontSize: "14px", 
                      color: "var(--text-secondary)",
                      display: "flex",
                      gap: "16px"
                    }}>
                      <span>Operadora: {beneficiary.healthInsurer}</span>
                      <span>Carteira: {beneficiary.completeCardNumber || `${beneficiary.healthInsurer.padStart(4, '0')}${beneficiary.cardNumber.padStart(13, '0')}`}</span>
                    </div>
                  </div>
                  <button 
                    className="btn btn-primary"
                    onClick={() => importPatient(beneficiary)}
                    disabled={loading}
                    style={{ minWidth: "100px" }}
                  >
                    Importar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "16px", justifyContent: "flex-end" }}>
          <button 
            className="btn btn-secondary" 
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
} 
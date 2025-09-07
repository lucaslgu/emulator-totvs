import { useEffect, useState } from "react";
import { loadPatients, savePatients } from "../services/patientsService";
import { Patient } from "../types/patient";
import AddEditPatient from "./AddEditPatient";
import PatientImporter from "./PatientImporter";
import { patientSyncService } from "../services/patientSyncService";

interface PatientManagerProps {
  onPatientsChanged?: (patients: Patient[]) => void;
}

export default function PatientManager({ onPatientsChanged }: PatientManagerProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | undefined>(undefined);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);

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

  async function handleSavePatient(patient: Patient) {
    try {
      let updatedPatients: Patient[];
      
      if (patient.id === 0) {
        // New patient
        const maxId = patients.reduce((max, p) => Math.max(max, p.id), 0);
        const newPatient = { ...patient, id: maxId + 1 };
        updatedPatients = [...patients, newPatient];
      } else {
        // Edit existing patient
        updatedPatients = patients.map(p => 
          p.id === patient.id ? patient : p
        );
      }
      
      await savePatients(updatedPatients);
      setPatients(updatedPatients);
      onPatientsChanged?.(updatedPatients);
      setIsAddEditOpen(false);
      setEditingPatient(undefined);
    } catch (err: any) {
      alert(`Erro ao salvar paciente: ${err.message}`);
    }
  }

  async function handleImportPatient(patient: Patient) {
    try {
      const maxId = patients.reduce((max, p) => Math.max(max, p.id), 0);
      const newPatient = { ...patient, id: maxId + 1 };
      const updatedPatients = [...patients, newPatient];
      
      await savePatients(updatedPatients);
      setPatients(updatedPatients);
      onPatientsChanged?.(updatedPatients);
      setIsImportOpen(false);
    } catch (err: any) {
      alert(`Erro ao importar paciente: ${err.message}`);
    }
  }

  async function handleDeletePatient(patient: Patient) {
    if (!confirm(`Tem certeza que deseja remover o paciente "${patient.name}"?`)) {
      return;
    }

    try {
      const updatedPatients = patients.filter(p => p.id !== patient.id);
      await savePatients(updatedPatients);
      setPatients(updatedPatients);
      onPatientsChanged?.(updatedPatients);
      setSelectedPatient(null);
    } catch (err: any) {
      alert(`Erro ao remover paciente: ${err.message}`);
    }
  }

  async function handleSyncPatient(patient: Patient) {
    if (!patient.imported) {
      alert("Apenas pacientes importados podem ser sincronizados.");
      return;
    }

    setSyncLoading(true);
    try {
      const result = await patientSyncService.syncPatient(patient);
      
      if (result.success && result.updatedPatient) {
        // Atualizar dados do paciente
        const updatedPatients = patients.map(p => 
          p.id === patient.id ? result.updatedPatient! : p
        );
        
        await savePatients(updatedPatients);
        setPatients(updatedPatients);
        onPatientsChanged?.(updatedPatients);
        alert(result.message);
      } else {
        alert(result.message);
      }
    } catch (err: any) {
      alert(`Erro ao sincronizar paciente: ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
  }

  async function handleSyncAllPatients() {
    const importedPatients = patients.filter(p => p.imported);
    if (importedPatients.length === 0) {
      alert("Nenhum paciente importado para sincronizar.");
      return;
    }

    if (!confirm(`Sincronizar ${importedPatients.length} paciente(s) importado(s)?`)) {
      return;
    }

    setSyncLoading(true);
    try {
      const results = await patientSyncService.syncAllPatients(patients);
      
      // Processar resultados e atualizar pacientes
      let updatedCount = 0;
      let errorCount = 0;
      
      for (const result of results) {
        if (result.success && result.updatedPatient) {
          const updatedPatients = patients.map(p => 
            p.id === result.updatedPatient!.id ? result.updatedPatient! : p
          );
          await savePatients(updatedPatients);
          setPatients(updatedPatients);
          onPatientsChanged?.(updatedPatients);
          updatedCount++;
        } else {
          errorCount++;
        }
      }
      
      const message = `Sincronização concluída.\n\nPacientes atualizados: ${updatedCount}\nFalhas: ${errorCount}`;
      alert(message);
    } catch (err: any) {
      alert(`Erro ao sincronizar pacientes: ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Carregando pacientes...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: "red" }}>
        Erro: {error}
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }} className="bg-surface">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 className="text-title" style={{ margin: 0 }}>
          Gerenciador de Pacientes
        </h1>
        <div style={{ display: "flex", gap: "12px" }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setIsImportOpen(true)}
          >
            📥 Importar
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setEditingPatient(undefined);
              setIsAddEditOpen(true);
            }}
          >
            ＋ Adicionar
          </button>
        </div>
      </header>

      {patients.length === 0 ? (
        <p>Nenhum paciente cadastrado.</p>
      ) : (
        <>
          <div className="table-container">
            <table className="patient-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Nº Carteira</th>
                  <th>Bio. Digital</th>
                  <th>Bio. Facial</th>
                  <th>Origem</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr 
                    key={p.id} 
                    style={{ 
                      textAlign: "center",
                      backgroundColor: selectedPatient?.id === p.id ? "var(--color-primary-light)" : "transparent",
                      cursor: "pointer"
                    }}
                    onClick={() => setSelectedPatient(p)}
                    onDoubleClick={() => {
                      setEditingPatient(p);
                      setIsAddEditOpen(true);
                    }}
                  >
                    <td>{p.id}</td>
                    <td style={{ textAlign: "left" }}>{p.name}</td>
                    <td>{p.wallet}</td>
                    <td>{p.digitalBiometrics.length ? "Sim" : "Não"}</td>
                    <td>{p.facialBiometric ? "Sim" : "Não"}</td>
                    <td>{p.imported ? "Importado" : "Local"}</td>
                    <td>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPatient(p);
                            setIsAddEditOpen(true);
                          }}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        {p.imported && (
                          <button 
                            className="btn btn-sm btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSyncPatient(p);
                            }}
                            disabled={syncLoading}
                            title="Sincronizar"
                          >
                            {syncLoading ? '⏳' : '🔄'}
                          </button>
                        )}
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePatient(p);
                          }}
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Panel */}
          <div style={{ 
            marginTop: "24px", 
            padding: "16px", 
            backgroundColor: "var(--bg-main-alt)", 
            borderRadius: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div>
              {selectedPatient ? (
                <span>Paciente selecionado: <strong>{selectedPatient.name}</strong></span>
              ) : (
                <span>Selecione um paciente para ver as ações disponíveis</span>
              )}
            </div>
            
            <div style={{ display: "flex", gap: "12px" }}>
              {selectedPatient && (
                <>
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      setEditingPatient(selectedPatient);
                      setIsAddEditOpen(true);
                    }}
                  >
                    ✏️ Editar
                  </button>
                  {selectedPatient.imported && (
                    <button 
                      className="btn btn-secondary"
                      onClick={() => handleSyncPatient(selectedPatient)}
                      disabled={syncLoading}
                    >
                      {syncLoading ? '⏳ Sincronizando...' : '🔄 Sincronizar'}
                    </button>
                  )}
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleDeletePatient(selectedPatient)}
                  >
                    🗑️ Excluir
                  </button>
                </>
              )}
              
              {patients.some(p => p.imported) && (
                <button 
                  className="btn btn-secondary"
                  onClick={handleSyncAllPatients}
                  disabled={syncLoading}
                >
                  {syncLoading ? '⏳ Sincronizando...' : '🔄 Sincronizar Todos'}
                </button>
              )}
            </div>
          </div>
        </>
      )}
      
      {/* Add/Edit Patient Modal */}
      {isAddEditOpen && (
        <AddEditPatient
          patient={editingPatient}
          onSave={handleSavePatient}
          onCancel={() => {
            setIsAddEditOpen(false);
            setEditingPatient(undefined);
          }}
        />
      )}

      {/* Import Patient Modal */}
      {isImportOpen && (
        <PatientImporter
          onImport={handleImportPatient}
          onCancel={() => setIsImportOpen(false)}
        />
      )}
    </div>
  );
}
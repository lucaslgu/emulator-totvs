import { useState, useRef, DragEvent, ChangeEvent, useEffect, useMemo } from "react";

interface BiometricUploaderProps {
  initialValue?: string;
  onBiometricChange: (base64Value: string) => void;
  type: "facial" | "digital";
  fingerName?: string;
}

export default function BiometricUploader({ 
  initialValue, 
  onBiometricChange, 
  type,
  fingerName
}: BiometricUploaderProps) {
  const [base64Value, setBase64Value] = useState(initialValue || "");
  const [isDragging, setIsDragging] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableBase64, setEditableBase64] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Sincronizar quando o valor inicial mudar externamente
  useEffect(() => {
    setBase64Value(initialValue || "");
  }, [initialValue]);
  
  // Função para gerar o src de imagem correto a partir do base64
  const getImageSrc = (base64: string): string => {
    // Verifica se o base64 já contém o prefixo data:image
    if (base64.startsWith('data:image')) {
      return base64;
    }
    
    // Verifica se o base64 começa com /9j/ (assinatura JPEG)
    if (base64.startsWith('/9j/')) {
      return `data:image/jpeg;base64,${base64}`;
    }
    
    // Verifica se o base64 começa com iVBOR (assinatura PNG)
    if (base64.startsWith('iVBOR')) {
      return `data:image/png;base64,${base64}`;
    }
    
    // Verifica se o base64 começa com R0lGOD (assinatura GIF)
    if (base64.startsWith('R0lGOD')) {
      return `data:image/gif;base64,${base64}`;
    }
    
    // Se não conseguir identificar o tipo, tenta um genérico
    return `data:image;base64,${base64}`;
  };
  
  // Memoriza o src da imagem
  const imageSrc = useMemo(() => getImageSrc(base64Value), [base64Value]);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processFile(file);
    }
  };

  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === "string") {
          const base64 = event.target.result.split(",")[1];
          setBase64Value(base64);
          onBiometricChange(base64);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error processing file:", error);
    }
  };

  const handleBrowseClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita que o clique se propague para o drop-zone
    try {
      // Use file input directly instead of dialog API
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } catch (error) {
      console.error("Error selecting file:", error);
    }
  };
  
  const startEditMode = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita que o clique se propague para o drop-zone
    setEditableBase64(base64Value);
    setIsEditMode(true);
  };
  
  const saveEditedBase64 = () => {
    try {
      // Valida se é uma string base64 válida
      window.atob(editableBase64.trim());
      
      setBase64Value(editableBase64.trim());
      onBiometricChange(editableBase64.trim());
      setIsEditMode(false);
    } catch (e) {
      alert("Base64 inválido. Verifique o conteúdo e tente novamente.");
    }
  };
  
  const cancelEditMode = () => {
    setIsEditMode(false);
    setEditableBase64("");
  };

  return (
    <div className="biometric-uploader">
      {!isEditMode ? (
        <>
          <div 
            className="drop-zone" 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? "var(--color-primary)" : "var(--text-secondary)"}`,
              borderRadius: "6px",
              padding: "20px",
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: isDragging ? "rgba(34, 197, 94, 0.1)" : "var(--surface-alt)",
              marginBottom: "12px",
              transition: "all 0.2s ease",
              position: "relative"
            }}
          >
            <div style={{ marginBottom: "12px", color: "var(--text-secondary)" }}>
              {type === "facial" ? "Biometria Facial" : `Biometria Digital${fingerName ? ` - ${fingerName}` : ""}`}
            </div>
            
            <div style={{ 
              fontSize: "0.9rem", 
              color: isDragging ? "var(--color-primary)" : "var(--text-secondary)",
              marginBottom: "8px"
            }}>
              {isDragging ? "Solte a imagem aqui" : "Arraste e solte uma imagem ou clique para selecionar"}
            </div>
            
            {base64Value && (
              <>
                <div style={{ 
                  marginTop: "10px", 
                  padding: "6px", 
                  backgroundColor: "var(--bg-main-alt)",
                  borderRadius: "4px",
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}>
                  {base64Value.substring(0, 20)}...{base64Value.substring(base64Value.length - 20)}
                </div>

                {/* Miniatura da imagem */}
                <div style={{ 
                  marginTop: "10px", 
                  display: "flex", 
                  justifyContent: "center",
                  alignItems: "center"
                }}>
                  <img
                    src={imageSrc}
                    alt="Miniatura"
                    onError={(e) => {
                      console.error("Erro ao carregar imagem base64");
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                    style={{
                      maxWidth: "100px",
                      maxHeight: "100px",
                      border: "1px solid var(--border-color)",
                      borderRadius: "4px"
                    }}
                  />
                </div>
              </>
            )}
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept="image/*"
            style={{ display: "none" }}
          />
          
          <div style={{ display: "flex", gap: "8px", justifyContent: "space-between" }}>
            <button 
              className="btn btn-secondary"
              onClick={handleBrowseClick}
              style={{ fontSize: "0.875rem" }}
            >
              Selecionar Arquivo
            </button>
            
            <div>
              {base64Value && (
                <>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setIsPreviewOpen(true)}
                    style={{ fontSize: "0.875rem", marginRight: "8px" }}
                  >
                    Visualizar
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={startEditMode}
                    style={{ fontSize: "0.875rem", marginRight: "8px" }}
                  >
                    Editar Base64
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => {
                      setBase64Value("");
                      onBiometricChange("");
                    }}
                    style={{ fontSize: "0.875rem" }}
                  >
                    Limpar
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="edit-mode" style={{
          border: "1px solid var(--border-color)",
          borderRadius: "6px",
          padding: "16px",
          backgroundColor: "var(--surface-alt)"
        }}>
          <h3 style={{ marginTop: 0, marginBottom: "16px", fontSize: "1rem" }}>
            Editar Base64 {type === "facial" ? "da Biometria Facial" : `da Biometria Digital - ${fingerName || ""}`}
          </h3>
          
          <textarea
            value={editableBase64}
            onChange={(e) => setEditableBase64(e.target.value)}
            style={{
              width: "100%",
              height: "200px",
              padding: "8px",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              fontSize: "0.8rem",
              fontFamily: "monospace",
              marginBottom: "16px",
              backgroundColor: "var(--bg-main)"
            }}
          />
          
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button
              className="btn btn-secondary"
              onClick={cancelEditMode}
              style={{ fontSize: "0.875rem" }}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={saveEditedBase64}
              style={{ fontSize: "0.875rem" }}
            >
              Salvar
            </button>
          </div>
        </div>
      )}
      
      {/* Modal de visualização */}
      {isPreviewOpen && base64Value && (
        <div className="preview-modal" style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: "var(--surface)",
            padding: "20px",
            borderRadius: "8px",
            maxWidth: "80%",
            maxHeight: "80%",
            overflow: "auto"
          }}>
            <div style={{ marginBottom: "16px", textAlign: "right" }}>
              <button 
                className="btn btn-secondary"
                onClick={() => setIsPreviewOpen(false)}
              >
                Fechar
              </button>
            </div>
            <img 
              src={imageSrc} 
              alt="Biometric preview" 
              onError={(e) => {
                console.error("Erro ao carregar imagem base64 no preview");
                (e.target as HTMLImageElement).style.display = 'none';
                // Adiciona mensagem de erro
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) {
                  const errorMsg = document.createElement('div');
                  errorMsg.textContent = 'Não foi possível exibir a imagem. O formato de base64 pode estar incorreto.';
                  errorMsg.style.color = 'red';
                  errorMsg.style.padding = '20px';
                  errorMsg.style.textAlign = 'center';
                  parent.appendChild(errorMsg);
                }
              }}
              style={{ maxWidth: "100%", maxHeight: "70vh" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface AppConfig {
  base_url?: string;
  user?: string;
  password?: string;
  clinic?: string;
  provider_code?: string;
  health_insurer_code?: string;
  server_host?: string;
  server_port?: number;
  portal_user?: string;
  portal_password?: string;
}

export default function AppSettings() {
  const [config, setConfig] = useState<AppConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      setLoading(true);
      const data = await invoke("load_config");
      setConfig(data as AppConfig);
    } catch (err: any) {
      setMessage({ text: `Erro ao carregar configurações: ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    try {
      setSaving(true);
      await invoke("save_config", { value: config });
      setMessage({ text: "Configurações salvas com sucesso!", type: "success" });
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ text: `Erro ao salvar configurações: ${err.message}`, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Carregando configurações...</div>;
  }

  return (
    <div style={{ padding: 24 }} className="bg-surface">
      <header style={{ marginBottom: 24 }}>
        <h1 className="text-title" style={{ margin: 0 }}>Configurações do Aplicativo</h1>
        <p className="text-secondary" style={{ margin: "8px 0 0 0" }}>
          Configure as conexões com a API e servidores locais
        </p>
      </header>

      {message && (
        <div 
          className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`}
          style={{ 
            padding: "12px 16px", 
            borderRadius: "8px", 
            marginBottom: "24px",
            backgroundColor: message.type === "success" ? "var(--color-success)" : "var(--color-error)",
            color: "white"
          }}
        >
          {message.text}
        </div>
      )}

      <div style={{ display: "grid", gap: "24px", maxWidth: "900px" }}>
        {/* API Configuration */}
        <div className="config-section">
          <h2 className="text-subtitle" style={{ margin: "0 0 20px 0" }}>Configuração da API</h2>
          <div style={{ display: "grid", gap: "20px" }}>
            <div>
              <label className="form-label">Servidor (URL)</label>
              <input
                type="text"
                className="form-input"
                value={config.base_url || ""}
                onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
                placeholder="http://es-datasul.sp01.local:8880"
              />
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <label className="form-label">Usuário</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.user || ""}
                  onChange={(e) => setConfig({ ...config, user: e.target.value })}
                  placeholder="lucas.hsilva"
                />
              </div>
              <div>
                <label className="form-label">Senha</label>
                <input
                  type="password"
                  className="form-input"
                  value={config.password || ""}
                  onChange={(e) => setConfig({ ...config, password: e.target.value })}
                  placeholder="totvs@123@"
                />
              </div>
            </div>

            {/* Portal Prestador */}
            <h3 className="text-subtitle" style={{margin:"20px 0 10px 0"}}>Parâmetros do Portal Prestador</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <label className="form-label">Usuário Portal</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.portal_user || ""}
                  onChange={(e) => setConfig({ ...config, portal_user: e.target.value })}
                  placeholder="usuário do portal"
                />
              </div>
              <div>
                <label className="form-label">Senha Portal</label>
                <input
                  type="password"
                  className="form-input"
                  value={config.portal_password || ""}
                  onChange={(e) => setConfig({ ...config, portal_password: e.target.value })}
                  placeholder="senha do portal"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <label className="form-label">Clínica</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.clinic || ""}
                  onChange={(e) => setConfig({ ...config, clinic: e.target.value })}
                  placeholder="Código da clínica"
                />
              </div>
              <div>
                <label className="form-label">Código do Prestador</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.provider_code || ""}
                  onChange={(e) => setConfig({ ...config, provider_code: e.target.value })}
                  placeholder="Código do prestador"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Unidade de Saúde</label>
              <input
                type="text"
                className="form-input"
                value={config.health_insurer_code || ""}
                onChange={(e) => setConfig({ ...config, health_insurer_code: e.target.value })}
                placeholder="Código da unidade"
              />
            </div>
          </div>
        </div>

        {/* Local Server Configuration */}
        <div className="config-section">
          <h2 className="text-subtitle" style={{ margin: "0 0 20px 0" }}>Servidor Local de Biometria</h2>
          <div style={{ display: "grid", gap: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <label className="form-label">Host</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.server_host || "127.0.0.1"}
                  onChange={(e) => setConfig({ ...config, server_host: e.target.value })}
                  placeholder="127.0.0.1"
                />
              </div>
              <div>
                <label className="form-label">Porta</label>
                <input
                  type="number"
                  className="form-input"
                  value={config.server_port || 21004}
                  onChange={(e) => setConfig({ ...config, server_port: parseInt(e.target.value) || 21004 })}
                  min="1024"
                  max="65535"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "16px", justifyContent: "flex-end" }}>
          <button 
            className="btn btn-secondary" 
            onClick={loadConfig}
            disabled={saving}
          >
            Restaurar
          </button>
          <button 
            className="btn btn-primary" 
            onClick={saveConfig}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar Configurações"}
          </button>
        </div>
      </div>
    </div>
  );
} 
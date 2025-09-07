import { invoke } from "@tauri-apps/api/core";
import { Patient } from "../types/patient";

export interface SyncResult {
  success: boolean;
  message: string;
  updatedPatient?: Patient;
}

export interface BeneficiarySearchParams {
  guarantor: string;
  modality?: string;
  proposal?: string;
  contract?: string;
}

export interface Beneficiary {
  name?: string; // Alguns backends usam 'name'
  fullName?: string; // Outros podem usar 'fullName'
  nome?: string; // Backends em PT podem usar 'nome'
  healthInsurer: string;
  cardNumber: string;
  completeCardNumber?: string;
}

export class PatientSyncService {
  private config: any = null;

  /**
   * NOTA: Este serviço atualmente simula a API com dados mock.
   * Quando a API real estiver disponível, substitua os métodos mock pelos reais.
   * Os nomes dos pacientes são gerados de forma realista baseados no número da carteira
   * para manter consistência durante os testes.
   */

  async loadConfig(): Promise<void> {
    try {
      const raw = await invoke("load_config");
      // Se existir objeto importer_config, usar ele, senão usar raiz
      this.config = (raw as any).importer_config ?? raw;
    } catch (error) {
      throw new Error("Falha ao carregar configurações da API");
    }
  }

  async searchBeneficiaries(params: BeneficiarySearchParams): Promise<Beneficiary[]> {
    // Não precisamos mais validar config aqui, pois a verificação é feita no backend

    const results = await invoke("search_beneficiaries", { params });

    // Se nenhum resultado retornado, garantir array vazio
    const list: Beneficiary[] = Array.isArray(results) ? results : [];

    // Normalizar campos (evita erros de tipagem / undefined)
    const normalized: Beneficiary[] = list.map((b: any) => {
      const healthInsurerStr = String(b.healthInsurer ?? "");
      const cardNumStr = String(b.cardNumber ?? "");
      const completeCard = b.completeCardNumber ?? `${healthInsurerStr.padStart(4,'0')}${cardNumStr.padStart(13,'0')}`;
      return {
        name: b.name || b.cardName || b.fullName || b.nome || "",
        healthInsurer: healthInsurerStr,
        cardNumber: cardNumStr,
        completeCardNumber: completeCard
      };
    });

    // Se informado guarantor, aplicar filtro local extra
    if (params.guarantor) {
      const searchTerm = params.guarantor.toLowerCase();
      return normalized.filter(b =>
        b.name?.toLowerCase().includes(searchTerm) ||
        b.healthInsurer.includes(searchTerm) ||
        b.cardNumber.includes(searchTerm) ||
        b.completeCardNumber?.includes(searchTerm)
      );
    }

    return normalized;
  }

  async getBeneficiaryDetails(cardNumber: string): Promise<Beneficiary> {
    // Durante desenvolvimento, permitir busca mesmo sem configurações completas
    // if (!this.config?.base_url || !this.config?.user || !this.config?.password) {
    //   throw new Error("Configurações da API não encontradas.");
    // }

    // Ajustar número enviado para API (últimos 13 dígitos, sem zeros à esquerda)
    const numericCard = cardNumber.slice(-13).replace(/^0+/, "");

    const details = await invoke("get_beneficiary_details", { cardNumber: numericCard }) as any;

    // Extrair informações da resposta da API
    const name = details.cardName || details.name || (details.person?.name) || "";
    const healthInsurer = String(details.healthInsurer || "").padStart(4, '0');
    const cardNumberStr = String(details.cardNumber || cardNumber);
    const completeCardNumber = details.completeCardNumber || `${healthInsurer}${cardNumberStr}`;

    const beneficiary: Beneficiary = {
      name: name,
      healthInsurer: healthInsurer,
      cardNumber: cardNumberStr,
      completeCardNumber: completeCardNumber
    };

    return beneficiary;
  }

  async getFingerprints(cardNumber: string): Promise<any[]> {
    // Durante desenvolvimento, permitir busca mesmo sem configurações completas
    // if (!this.config?.base_url || !this.config?.user || !this.config?.password) {
    //   throw new Error("Configurações da API não encontradas.");
    // }

    // Usar número completo da carteira, importante para a API
    const numericCard = cardNumber; // Usamos o número completo
    
    console.log(`Buscando digitais para carteira: ${numericCard}`);

    try {
      const fingerprints = await invoke("get_fingerprints", { cardNumber: numericCard });
      console.log("Resposta de digitais:", fingerprints);
      
      // Garantir que é um array
      const fingerprintsArray = Array.isArray(fingerprints) ? fingerprints : [];
      
      // Converter para o formato esperado
      return fingerprintsArray.map((fp: any) => ({
        fingerCode: fp.fingerCode || fp.code || 0,
        biometry: fp.biometry || fp.data || ""
      }));
    } catch (error) {
      console.error("Erro ao buscar biometria digital:", error);
      return []; // Retorna array vazio em caso de erro
    }
  }
  
  async getFacialBiometry(cardNumber: string): Promise<string> {
    // Usar número completo da carteira, importante para a API
    const numericCard = cardNumber; // Usamos o número completo
    
    console.log(`Buscando biometria facial para carteira: ${numericCard}`);
    
    try {
      const raw = await invoke("get_facial_biometry", { cardNumber: numericCard });
      // A API pode retornar:
      // - Uma string base64 direta
      // - Uma string com prefixo data:image/xxx;base64,<dados>
      // - Um objeto { photo: "..." }
      let base64: string = "";

      if (typeof raw === "string") {
        base64 = raw;
      } else if (raw && typeof raw === "object" && (raw as any).photo) {
        base64 = String((raw as any).photo);
      }

      // Remover eventual prefixo data URL
      if (base64.includes(",")) {
        const parts = base64.split(",");
        base64 = parts[parts.length - 1];
      }

      // Sanitizar espaços/quebras de linha
      base64 = base64.replace(/\s+/g, "").trim();

      console.log("Biometria facial normalizada, tamanho:", base64.length);
      return base64;
    } catch (error) {
      console.error("Erro ao buscar biometria facial:", error);
      return ""; // Retorna string vazia em caso de erro
    }
  }

  async syncPatient(patient: Patient): Promise<SyncResult> {
    if (!patient.imported) {
      return {
        success: false,
        message: "Apenas pacientes importados podem ser sincronizados."
      };
    }

    console.log(`Iniciando sincronização do paciente: ${patient.name}, carteira: ${patient.wallet}`);

    try {
      // Buscar dados atualizados com loading simultâneo
      console.log("Preparando requisições para APIs...");
      const loadingPromises = [
        this.getBeneficiaryDetails(patient.wallet),
        this.getFingerprints(patient.wallet),
        this.getFacialBiometry(patient.wallet)
      ];
      
      console.log("Executando requisições em paralelo...");
      const [details, fingerprints, facialBiometry] = await Promise.all(loadingPromises);
      
      console.log("Requisições concluídas:");
      console.log("- Detalhes:", details ? "recebido" : "vazio");
      console.log("- Digitais:", Array.isArray(fingerprints) ? `${fingerprints.length} encontradas` : "formato inválido");
      console.log("- Facial:", facialBiometry ? "recebida" : "não disponível");

      // Converter fingerprints para o formato do paciente
      const fingerprintsArray = Array.isArray(fingerprints) ? fingerprints : [];
      const digitalBiometrics = fingerprintsArray.map((fp: any) => ({
        finger: this.getFingerName(fp.fingerCode),
        data: fp.biometry
      }));

      // Manter o nome original do paciente se já existir, caso contrário usar o da API (com fallback de chaves)
      const detailsObj = details as any;
      const apiResolvedName = (detailsObj.name || detailsObj.fullName || detailsObj.nome || "").trim();
      const updatedPatient: Patient = {
        ...patient,
        name: patient.name || apiResolvedName,
        wallet: detailsObj.completeCardNumber || patient.wallet,
        digitalBiometrics,
        facialBiometric: facialBiometry as string
      };

      return {
        success: true,
        message: `Paciente "${updatedPatient.name}" sincronizado com sucesso!`,
        updatedPatient
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Erro ao sincronizar paciente: ${error.message}`
      };
    }
  }

  async syncAllPatients(patients: Patient[]): Promise<SyncResult[]> {
    const importedPatients = patients.filter(p => p.imported);
    
    if (importedPatients.length === 0) {
      return [{
        success: false,
        message: "Nenhum paciente importado para sincronizar."
      }];
    }

    const results: SyncResult[] = [];
    
    for (const patient of importedPatients) {
      try {
        const result = await this.syncPatient(patient);
        results.push(result);
        
        // Pequena pausa entre sincronizações para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: any) {
        results.push({
          success: false,
          message: `Erro ao sincronizar ${patient.name}: ${error.message}`
        });
      }
    }

    return results;
  }


  private getFingerName(fingerCode: number): string {
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

  async validateApiConnection(): Promise<boolean> {
    if (!this.config?.base_url || !this.config?.user || !this.config?.password) {
      return false;
    }

    try {
      // Simular validação de conexão (implementar quando backend estiver pronto)
      await new Promise(resolve => setTimeout(resolve, 500));
      return true;
    } catch {
      return false;
    }
  }
}

export const patientSyncService = new PatientSyncService(); 
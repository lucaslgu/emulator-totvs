# Virtual I/O Hub - Emulador TOTVS

Uma aplicação desktop desenvolvida com Tauri e React para emular dispositivos de entrada/saída utilizados em sistemas TOTVS, incluindo cartões magnéticos, biometria digital e facial, e webcam virtual.

## 🚀 Funcionalidades Principais

### 📋 Gerenciador de Pacientes
- **Adicionar/Editar Pacientes**: Interface completa para cadastro e edição de pacientes
- **Importar da API**: Busca e importa pacientes de base de dados externa
- **Busca Avançada**: Pesquisa por contratante, modalidade, contrato e proposta
- **Sincronização**: Atualiza dados de pacientes importados com a API
- **Exclusão**: Remove pacientes com confirmação
- **Sincronização em Lote**: Atualiza todos os pacientes importados de uma vez

### 🔑 Cartão Magnético
- **Emulação via Hotkey**: Atalho Ctrl+Q para enviar dados do paciente selecionado
- **AutoHotkey Integration**: Requer AutoHotkey V2 instalado na pasta resources
- **Seleção de Paciente**: Combobox pesquisável para escolher o paciente ativo

### 🔐 Biometria Digital
- **Servidor Local**: Inicia servidor HTTP para responder requisições de biometria
- **Configuração de Host/Porta**: Personalização do endereço do servidor
- **Seleção de Paciente**: Usa biometrias digitais do paciente selecionado
- **Simulação de Captura/Verificação**: Responde comandos de captura e verificação

### 📷 Webcam Virtual
- **Múltiplas Fontes**: Arquivo de mídia, câmera física ou biometria facial
- **Suporte a Imagens e Vídeos**: PNG, JPG, MP4, AVI e outros formatos
- **Câmeras Físicas**: Detecção automática de câmeras disponíveis
- **Biometria Facial**: Transmite biometria facial de pacientes cadastrados
- **Preview em Tempo Real**: Visualização da transmissão atual

### ⚙️ Configurações
- **Configuração da API**: URL do servidor, usuário, senha, clínica, prestador e unidade
- **Servidor Local**: Configuração de host e porta para biometria digital
- **Persistência**: Salva configurações automaticamente
- **Validação**: Verifica campos obrigatórios e formatos

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React + TypeScript
- **Backend**: Rust (Tauri)
- **UI**: CSS customizado com design system
- **Persistência**: JSON files
- **Emulação**: AutoHotkey V2, pyvirtualcam

## 📦 Dependências

### Frontend
```bash
npm install
```

### Backend (Rust)
```bash
cargo install tauri-cli
```

### Dependências Externas
- **AutoHotkey V2**: Para emulação de cartão magnético
- **pyvirtualcam**: Para emulação de webcam (opcional)

## 🚀 Como Executar

### Desenvolvimento
```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run tauri dev
```

### Build de Produção
```bash
# Build da aplicação
npm run tauri build
```

## 📁 Estrutura do Projeto

```
src/
├── components/           # Componentes React
│   ├── PatientManager.tsx      # Gerenciador principal de pacientes
│   ├── AddEditPatient.tsx      # Modal de adição/edição
│   ├── PatientImporter.tsx     # Modal de importação da API
│   ├── AppSettings.tsx         # Configurações do aplicativo
│   ├── HotkeyManager.tsx       # Gerenciador de cartão magnético
│   ├── BiometryServerManager.tsx # Gerenciador de biometria digital
│   └── WebcamEmulatorManager.tsx # Gerenciador de webcam virtual
├── services/            # Serviços de dados
│   ├── patientsService.ts      # CRUD de pacientes
│   ├── patientSyncService.ts   # Sincronização com API
│   ├── hotkeyService.ts        # Serviços de hotkey
│   ├── biometryServerService.ts # Serviços de biometria
│   └── webcamEmulatorService.ts # Serviços de webcam
└── types/               # Definições de tipos TypeScript
    └── patient.ts       # Interface de paciente

src-tauri/
├── src/                 # Código Rust
│   ├── patient.rs       # Lógica de pacientes
│   ├── hotkey.rs        # Gerenciamento de hotkeys
│   ├── biometry_server.rs # Servidor de biometria
│   └── webcam_emulator.rs # Emulador de webcam
└── Cargo.toml          # Dependências Rust
```

## 🔧 Configuração

### 1. Configuração da API
Acesse a aba "Configurações" e configure:
- **Servidor**: URL base da API TOTVS
- **Usuário/Senha**: Credenciais de acesso
- **Clínica**: Código da clínica
- **Prestador**: Código do prestador de serviços
- **Unidade**: Código da unidade de saúde

### 2. AutoHotkey
Para funcionalidade de cartão magnético:
1. Instale AutoHotkey V2
2. Coloque o executável em `resources/AutoHotkey/v2/AutoHotkey64.exe`
3. Ou ajuste o caminho nas configurações

### 3. Servidor de Biometria
- **Host padrão**: 127.0.0.1
- **Porta padrão**: 21004
- Configurável na aba de configurações

## 📖 Uso

### Importar Pacientes
1. Acesse "Gerenciador de Pacientes"
2. Clique em "📥 Importar"
3. Escolha entre busca por carteira ou busca avançada
4. Para busca avançada, preencha o contratante (obrigatório)
5. Selecione o beneficiário desejado e clique em "Importar"

### Sincronizar Pacientes
1. Selecione um paciente importado
2. Clique no botão "🔄" na linha ou no painel de ações
3. Para sincronizar todos, use "🔄 Sincronizar Todos"

### Emular Cartão Magnético
1. Acesse "Cartão Magnético"
2. Selecione um paciente no combobox
3. Clique em "Ativar Hotkey Ctrl+Q"
4. Use Ctrl+Q em qualquer campo de texto

### Servidor de Biometria
1. Acesse "Biometria Digital"
2. Selecione um paciente com biometrias digitais
3. Clique em "Ativar Servidor Local"
4. O servidor responderá em http://127.0.0.1:21004

### Webcam Virtual
1. Acesse "Webcam Virtual"
2. Escolha a fonte (arquivo, câmera ou biometria)
3. Configure os parâmetros
4. Clique em "Iniciar Transmissão"

## 🔒 Segurança

- Credenciais são armazenadas localmente
- Servidor de biometria roda apenas localmente
- Validação de entrada em todos os campos
- Confirmação para operações destrutivas

## 🐛 Solução de Problemas

### Hotkey não funciona
- Verifique se AutoHotkey V2 está instalado
- Confirme o caminho nas configurações
- Reinicie a aplicação após mudanças

### Servidor de biometria não inicia
- Verifique se há pacientes com biometrias digitais
- Confirme as configurações de host/porta
- Verifique se a porta não está em uso

### Webcam não funciona
- Instale pyvirtualcam: `pip install pyvirtualcam`
- Para OBS: instale OBS-VirtualCam
- Verifique permissões de câmera

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 📞 Suporte

Para suporte técnico ou dúvidas:
- Abra uma issue no GitHub
- Consulte a documentação da API TOTVS
- Verifique os logs da aplicação

---

**Desenvolvido com ❤️ para a comunidade TOTVS**

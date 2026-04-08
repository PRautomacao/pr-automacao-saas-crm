# PR Automação CRM

Sistema CRM multi-tenant para gestão de clientes, atendimentos e integração com WhatsApp.

## 🚀 Visão Geral

| Item | Descrição |
|------|-----------|
| **Stack** | Next.js 14, TypeScript, Tailwind CSS, Prisma, PostgreSQL |
| **Autenticação** | NextAuth.js com JWT |
| **Multi-tenancy** | Isolamento por empresa (company) |
| **Deploy** | Vercel (frontend), Railway/Supabase (PostgreSQL) |

## 📦 Instalação

### 1. Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

### 2. Clone e Instalação

```bash
# Clone o repositório
cd pr-automa-crm

# Instale as dependências
npm install

# ou com yarn
yarn install
```

### 3. Configuração do Banco

```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Configure o DATABASE_URL no arquivo .env
# Exemplo: postgresql://usuario:senha@localhost:5432/nome_do_banco
```

### 4. Execute o Setup

```bash
# Gere o cliente Prisma
npm run db:generate

# Crie as tabelas no banco
npm run db:push

# Popule com dados de teste (seed)
npm run db:seed
```

### 5. Inicie o Servidor

```bash
npm run dev
```

Acesse: http://localhost:3000

## 🔐 Credenciais de Teste

| Usuário | Email | Senha | Função |
|---------|-------|-------|--------|
| Admin | admin@bioanalise.com.br | admin123 | ADMIN |
| Gerente | gerente@bioanalise.com.br | manager123 | MANAGER |
| Atendente | atendente@bioanalise.com.br | attendant123 | ATTENDANT |

> **Empresa**: Bio Análise Laboratório (slug: `bio-analise`)

## 📁 Estrutura do Projeto

```
├── prisma/
│   └── schema.prisma          # Modelagem do banco
├── src/
│   ├── app/
│   │   ├── (auth)/            # Páginas públicas (login)
│   │   ├── (dashboard)/      # Páginas autenticadas
│   │   │   ├── dashboard/     # Dashboard principal
│   │   │   ├── customers/    # Gestão de clientes
│   │   │   ├── tickets/      # Gestão de atendimentos
│   │   │   ├── services/     # Serviços/Produtos
│   │   │   └── settings/     # Configurações
│   │   └── api/              # API Routes
│   │       ├── auth/         # NextAuth endpoints
│   │       ├── customers/    # CRUD clientes
│   │       ├── tickets/      # CRUD atendimentos
│   │       └── services/     # CRUD serviços
│   ├── components/
│   │   ├── ui/               # Componentes reutilizáveis
│   │   └── layouts/          # Layouts (dashboard)
│   ├── lib/
│   │   ├── prisma.ts         # Cliente Prisma
│   │   ├── auth.ts           # Configuração NextAuth
│   │   └── utils.ts          # Utilitários
│   └── types/                # Tipos TypeScript
└── package.json
```

## 🏗️ Arquitetura

### Multi-tenancy

O sistema utiliza estratégia de **row-level isolation**:
- Todas as tabelas têm `companyId` como FK obrigatória
- Consultas são filtradas automaticamente via middlewares
- Usuários só acessam dados da sua empresa

### Stack técnica

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 14 (App Router), React, Tailwind |
| Backend | Next.js API Routes |
| ORM | Prisma 5 |
| Auth | NextAuth 4 (JWT) |
| DB | PostgreSQL |

## 🔌 Integrações Preparadas

O sistema já possui estrutura para:

- **n8n**: Webhooks de eventos (`/api/webhooks`)
- **Chatwoot**: Sincronização de conversas
- **Evolution API**: Mensagens WhatsApp
- **OpenAI**: Classificação de intenção e automação

## 📄 Licença

MIT License - © 2024 PR Automação de Software

---

## ⚡ Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor dev
npm run build           # Build produção
npm run start           # Inicia produção

# Banco de dados
npm run db:generate     # Gera Prisma Client
npm run db:push         # Aplica schema
npm run db:migrate      # Cria migration
npm run db:seed         # Popula dados teste
npm run db:studio       # GUI do Prisma

# Linting
npm run lint            # Verifica código
```

## 🎯 Roadmap

- [ ] CRUD completo de clientes
- [ ] CRUD completo de tickets
- [ ] CRUD completo de serviços
- [ ] Visualização de conversas
- [ ] Integração WhatsApp (Evolution API)
- [ ] Integração Chatwoot
- [ ] Automação com n8n
- [ ] Relatórios e métricas
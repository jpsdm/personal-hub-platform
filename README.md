# 🏦 Personal Hub Platform

Uma plataforma pessoal completa para gerenciamento de finanças com assistente de IA integrado.

![Dashboard](.github/images/dashboard_combined.png)

## ✨ Funcionalidades

### 💰 Gestão Financeira

- **Contas**: Gerencie múltiplas contas bancárias e carteiras
- **Transações**: Controle receitas e despesas com categorização
- **Categorias**: Organize seus gastos por categorias personalizadas
- **Tags**: Adicione tags para classificação detalhada
- **Transações Fixas**: Configure despesas recorrentes mensais
- **Parcelamentos**: Controle compras parceladas automaticamente

### 🤖 Assistente de IA

- Consulte suas finanças por linguagem natural
- Crie transações, categorias e tags via chat
- Obtenha resumos e análises financeiras
- Integração com OpenAI GPT

### 📊 Dashboard

- Visão geral do saldo e movimentações
- Gráficos de receitas vs despesas
- Análise por categoria
- Filtros por período

![Dashboard com IA](.github/images/dashboard_ai_combined.png)

### 📝 Transações

- Criação rápida de lançamentos
- Filtros avançados (data, tipo, categoria, conta, tag, status)
- Edição individual ou em lote para transações recorrentes
- Exportação de dados

![Transações](.github/images/transaction_combined.png)

![Criar Transação](.github/images/transaction_create_combined.png)

### 👥 Multi-perfil

- Suporte a múltiplos usuários
- Proteção opcional por senha
- Dados isolados por perfil

![Hub de Perfis](.github/images/hub_combined.png)

---

## 🛠️ Tecnologias

- **Frontend**: Next.js 16, React 19, TypeScript
- **UI**: Tailwind CSS, Radix UI, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **IA**: Vercel AI SDK + OpenAI
- **Deploy**: Docker

---

## 🚀 Instalação

### Pré-requisitos

- Node.js 20+
- pnpm (ou npm/yarn)
- PostgreSQL (ou Docker)

### Desenvolvimento Local

1. **Clone o repositório**

```bash
git clone https://github.com/jpsdm/personal-hub-platform.git
cd personal-hub-platform
```

2. **Instale as dependências**

```bash
pnpm install
```

3. **Configure as variáveis de ambiente**

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/personal_hub"
```

4. **Configure o banco de dados**

```bash
# Gerar o Prisma Client
pnpm prisma generate

# Criar as tabelas
pnpm prisma db push

# (Opcional) Popular com dados iniciais
pnpm run db:seed
```

5. **Inicie o servidor de desenvolvimento**

```bash
pnpm dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## 🐳 Produção com Docker

### Docker Compose (Recomendado)

1. **Configure as variáveis de ambiente**

```bash
cp .env.example .env
```

Edite o `.env` com suas configurações:

```env
POSTGRES_USER=finance
POSTGRES_PASSWORD=sua_senha_segura
POSTGRES_DB=personal_hub
```

2. **Inicie os containers**

```bash
# Subir banco de dados e aplicação
docker-compose up -d

# Executar migrações e seeds (primeira vez)
docker-compose --profile migrate up migrate
```

3. **Acesse a aplicação**

- Aplicação: [http://localhost:3000](http://localhost:3000)
- PostgreSQL: `localhost:5432`

### Comandos Docker Úteis

```bash
# Ver logs
docker-compose logs -f app

# Parar containers
docker-compose down

# Parar e remover volumes (apaga dados!)
docker-compose down -v

# Rebuild após alterações
docker-compose up -d --build
```

---

## 📁 Estrutura do Projeto

```
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── finance/           # Páginas de finanças
│   ├── hub/               # Seleção de perfil
│   └── profiles/          # Gerenciamento de perfis
├── components/            # Componentes React
│   ├── finance/          # Componentes de finanças
│   └── ui/               # Componentes UI (shadcn)
├── generated/             # Prisma Client gerado
├── lib/                   # Utilitários e helpers
├── prisma/               # Schema e migrations
└── public/               # Assets estáticos
```

---

## 🔧 Scripts Disponíveis

| Comando                | Descrição                          |
| ---------------------- | ---------------------------------- |
| `pnpm dev`             | Inicia servidor de desenvolvimento |
| `pnpm build`           | Build de produção                  |
| `pnpm start`           | Inicia servidor de produção        |
| `pnpm lint`            | Executa linter                     |
| `pnpm prisma generate` | Gera Prisma Client                 |
| `pnpm prisma db push`  | Sincroniza schema com banco        |
| `pnpm run db:seed`     | Popula banco com dados iniciais    |

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Add: nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está licenciado sob **Apache 2.0 com Commons Clause**.

### ✅ Você pode:

- Usar para gerenciamento pessoal de finanças
- Self-host para uso pessoal ou familiar
- Modificar e customizar para suas necessidades
- Estudar o código fonte
- Contribuir com melhorias

### ❌ Você não pode (sem autorização):

- Vender o software ou derivados
- Oferecer como serviço hospedado pago (SaaS)
- Incluir em produtos comerciais

Para uso comercial, entre em contato.

---

## 👤 Autor

**João Pedro Soares de Mendonça**

- LinkedIn: [@jpsdm](https://linkedin.com/in/jpsdm)
- Email: dev.jpsdm@gmail.com
- GitHub: [@jpsdm](https://github.com/jpsdm)

---

## ⭐ Apoie o Projeto

Se este projeto te ajudou, considere dar uma ⭐ no GitHub!

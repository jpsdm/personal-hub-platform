# 🔄 Guia de Atualização

Este guia explica como atualizar o Personal Hub Platform para uma nova versão.

---

## 📋 Índice

- [Atualização via Docker (Recomendado)](#-atualização-via-docker-recomendado)
- [Atualização Manual (Código Fonte)](#-atualização-manual-código-fonte)
- [Backup antes de Atualizar](#-backup-antes-de-atualizar)
- [Rollback (Voltar Versão Anterior)](#-rollback-voltar-versão-anterior)
- [Solução de Problemas](#-solução-de-problemas)

---

## 🐳 Atualização via Docker (Recomendado)

Se você está usando Docker, siga estes passos:

### 1. Verificar versão atual

```bash
docker exec finance-app cat package.json | grep version
```

### 2. Fazer backup do banco de dados

```bash
# Criar backup antes de atualizar
docker exec finance-db pg_dump -U finance finance > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 3. Parar os containers

```bash
docker-compose down
```

### 4. Baixar a nova imagem

```bash
# Baixar última versão
docker pull jpsdm/personal-hub-platform:latest

# Ou uma versão específica
docker pull jpsdm/personal-hub-platform:1.0.0
```

### 5. Atualizar o docker-compose.yml (se necessário)

Se houver mudanças no `docker-compose.yml`, baixe a versão atualizada:

```bash
# Backup do arquivo atual
cp docker-compose.yml docker-compose.yml.bak

# Baixar nova versão
curl -O https://raw.githubusercontent.com/jpsdm/personal-hub-platform/master/docker-compose.yml
```

### 6. Iniciar com a nova versão

```bash
docker-compose up -d
```

### 7. Executar migrações (se houver)

```bash
docker-compose --profile migrate up migrate
```

### 8. Verificar se está funcionando

```bash
# Ver logs
docker-compose logs -f app

# Verificar status
docker-compose ps
```

### 9. Limpar imagens antigas (opcional)

```bash
# Remover imagens não utilizadas
docker image prune -a
```

---

## 💻 Atualização Manual (Código Fonte)

Se você clonou o repositório e roda localmente:

### 1. Verificar versão atual

```bash
cat package.json | grep version
```

### 2. Fazer backup do banco de dados

```bash
pg_dump -U seu_usuario seu_banco > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 3. Baixar as atualizações

```bash
# Salvar alterações locais (se houver)
git stash

# Buscar atualizações
git fetch origin

# Ver as mudanças
git log HEAD..origin/master --oneline

# Aplicar atualizações
git pull origin master

# Restaurar alterações locais (se houver)
git stash pop
```

### 4. Instalar dependências atualizadas

```bash
pnpm install
```

### 5. Gerar Prisma Client

```bash
pnpm prisma generate
```

### 6. Executar migrações do banco

```bash
pnpm prisma db push
```

### 7. Fazer build da aplicação

```bash
pnpm build
```

### 8. Reiniciar a aplicação

```bash
# Se estiver usando PM2
pm2 restart personal-hub

# Ou reinicie manualmente
pnpm start
```

---

## 💾 Backup antes de Atualizar

**IMPORTANTE**: Sempre faça backup antes de atualizar!

### Backup do Banco de Dados

#### Docker:

```bash
# Criar pasta de backups
mkdir -p backups

# Exportar banco
docker exec finance-db pg_dump -U finance finance > backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Local:

```bash
pg_dump -U seu_usuario -h localhost seu_banco > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Backup do arquivo .env

```bash
cp .env .env.backup
```

### Backup completo (Docker volumes)

```bash
# Parar containers
docker-compose down

# Backup do volume
docker run --rm -v personal-finance-platform-v2_postgres_data:/data -v $(pwd)/backups:/backup alpine tar czf /backup/postgres_data_$(date +%Y%m%d_%H%M%S).tar.gz /data
```

---

## ⏪ Rollback (Voltar Versão Anterior)

Se algo der errado, você pode voltar para a versão anterior:

### Docker:

```bash
# Parar containers
docker-compose down

# Usar versão específica anterior
docker pull jpsdm/personal-hub-platform:0.1.0

# Atualizar docker-compose.yml para usar a versão antiga
# Edite a linha: image: jpsdm/personal-hub-platform:0.1.0

# Reiniciar
docker-compose up -d

# Restaurar backup do banco (se necessário)
cat backup_YYYYMMDD_HHMMSS.sql | docker exec -i finance-db psql -U finance finance
```

### Manual:

```bash
# Voltar para commit anterior
git log --oneline  # Encontrar o commit desejado
git checkout <commit-hash>

# Ou voltar para uma tag específica
git checkout v0.1.0

# Reinstalar dependências
pnpm install

# Rebuild
pnpm build

# Restaurar banco (se necessário)
psql -U seu_usuario -h localhost seu_banco < backup_YYYYMMDD_HHMMSS.sql
```

---

## 🔧 Solução de Problemas

### Erro: Container não inicia

```bash
# Ver logs detalhados
docker-compose logs app

# Verificar se o banco está rodando
docker-compose ps db

# Reiniciar apenas o banco
docker-compose restart db

# Aguardar e reiniciar app
sleep 10
docker-compose restart app
```

### Erro: Migração falhou

```bash
# Ver status das migrações
docker-compose exec app npx prisma migrate status

# Forçar reset (CUIDADO: apaga dados!)
docker-compose exec app npx prisma migrate reset --force
```

### Erro: Dependências incompatíveis

```bash
# Limpar cache e reinstalar
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### Erro: Porta já em uso

```bash
# Verificar o que está usando a porta
# Windows:
netstat -ano | findstr :3000

# Linux/Mac:
lsof -i :3000

# Matar processo
# Windows:
taskkill /PID <PID> /F

# Linux/Mac:
kill -9 <PID>
```

### Erro: Imagem Docker corrompida

```bash
# Remover imagem e baixar novamente
docker rmi jpsdm/personal-hub-platform:latest
docker pull jpsdm/personal-hub-platform:latest
docker-compose up -d --force-recreate
```

---

## 📌 Checklist de Atualização

- [ ] Verificar notas da versão no GitHub
- [ ] Fazer backup do banco de dados
- [ ] Fazer backup do arquivo .env
- [ ] Baixar nova versão (Docker pull ou git pull)
- [ ] Atualizar docker-compose.yml se necessário
- [ ] Executar migrações
- [ ] Verificar logs após iniciar
- [ ] Testar funcionalidades principais
- [ ] Limpar imagens/arquivos antigos

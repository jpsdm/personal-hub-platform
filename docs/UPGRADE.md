# 🔄 Guia de Atualização

Este guia explica como atualizar o Personal Hub Platform para uma nova versão.

> **Nota**: O banco de dados **NÃO é afetado** durante a atualização. Seus dados estão seguros no volume Docker.

---

## 📋 Índice

- [Etapa 1: Atualizar o Código](#-etapa-1-atualizar-o-código)
- [Etapa 2: Atualizar o Docker (Opcional)](#-etapa-2-atualizar-o-docker-opcional)
- [Rollback (Voltar Versão Anterior)](#-rollback-voltar-versão-anterior)
- [Solução de Problemas](#-solução-de-problemas)

---

## 📥 Etapa 1: Atualizar o Código

Esta etapa baixa as atualizações do repositório e aplica as migrações no banco de dados.

### 1.1 Verificar versão atual

```powershell
# Windows (PowerShell)
Get-Content package.json | Select-String "version"

# Linux/Mac
cat package.json | grep version
```

### 1.2 Baixar atualizações do repositório

```bash
# Salvar alterações locais (se houver)
git stash

# Buscar atualizações
git fetch origin

# Ver o que mudou
git log HEAD..origin/master --oneline

# Aplicar atualizações
git pull origin master

# Restaurar alterações locais (se houver)
git stash pop
```

### 1.3 Instalar novas dependências

```bash
pnpm install
```

### 1.4 Gerar Prisma Client atualizado

```bash
pnpm prisma generate
```

### 1.5 Aplicar migrações no banco de dados

> **Importante**: Este comando aplica as migrações **sem perder dados**.

```bash
# Aplicar migrações pendentes
pnpm prisma db push
```

### 1.6 Verificar nova versão

```powershell
# Windows (PowerShell)
Get-Content package.json | Select-String "version"

# Linux/Mac
cat package.json | grep version
```

✅ **Pronto!** O código está atualizado. Se você roda localmente (sem Docker), basta reiniciar:

```bash
# Parar o servidor atual (Ctrl+C) e iniciar novamente
pnpm dev

# Ou para produção
pnpm build
pnpm start
```

---

## 🐳 Etapa 2: Atualizar o Docker (Opcional)

Se você usa Docker, siga esta etapa para reconstruir a imagem com o código atualizado.

> **Nota**: O banco de dados está em um volume separado e **NÃO será afetado**.

### 2.1 Verificar se o código foi atualizado

Certifique-se de ter completado a [Etapa 1](#-etapa-1-atualizar-o-código) primeiro.

### 2.2 Parar os containers

```bash
docker-compose down
```

> ⚠️ **NÃO use** `docker-compose down -v` (isso apaga os volumes/dados)

### 2.3 Reconstruir a imagem

```bash
# Rebuild forçando recriação sem cache
docker-compose build --no-cache app
```

### 2.4 Iniciar os containers

```bash
docker-compose up -d
```

### 2.5 Aplicar migrações no banco do Docker

```bash
docker-compose --profile migrate up migrate --build
```

### 2.6 Verificar se está funcionando

```bash
# Ver logs
docker-compose logs -f app

# Verificar status
docker-compose ps
```

### 2.7 Limpar imagens antigas (opcional)

```bash
# Remover imagens não utilizadas
docker image prune -f
```

---

## ⏪ Rollback (Voltar Versão Anterior)

Se algo der errado, você pode voltar para a versão anterior.

### Voltar código para versão anterior

```bash
# Ver histórico de commits
git log --oneline

# Voltar para um commit específico
git checkout <commit-hash>

# Ou voltar para uma tag específica
git checkout v0.1.0

# Reinstalar dependências
pnpm install

# Gerar Prisma Client
pnpm prisma generate
```

### Reconstruir Docker com versão anterior

```bash
# Parar containers
docker-compose down

# Rebuild com código revertido
docker-compose build --no-cache app

# Iniciar
docker-compose up -d
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
docker-compose restart app
```

### Erro: Conflito no git pull

```bash
# Ver arquivos com conflito
git status

# Opção 1: Descartar alterações locais
git checkout -- .
git pull origin master

# Opção 2: Resolver conflitos manualmente
# Edite os arquivos, depois:
git add .
git commit -m "Resolve conflicts"
```

### Erro: Dependências incompatíveis

```bash
# Limpar cache e reinstalar
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### Erro: Porta já em uso

```powershell
# Windows (PowerShell)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

### Erro: Prisma migration falhou

```bash
# Ver status das migrações
pnpm prisma migrate status

# Forçar sincronização (seguro, não perde dados)
pnpm prisma db push --accept-data-loss
```

### Erro: Docker build falhou

```bash
# Limpar cache do Docker
docker builder prune -f

# Rebuild
docker-compose build --no-cache app
```

---

## 📌 Checklist de Atualização

### Etapa 1 - Código:

- [ ] `git pull origin master`
- [ ] `pnpm install`
- [ ] `pnpm prisma generate`
- [ ] `pnpm prisma db push`

### Etapa 2 - Docker (opcional):

- [ ] `docker-compose down`
- [ ] `docker-compose build --no-cache app`
- [ ] `docker-compose up -d`
- [ ] `docker-compose --profile migrate up migrate --build`
- [ ] `docker-compose logs -f app` (verificar)

---

## 📞 Suporte

Se encontrar problemas durante a atualização:

1. Verifique as [Issues no GitHub](https://github.com/jpsdm/personal-hub-platform/issues)
2. Consulte as [Discussões](https://github.com/jpsdm/personal-hub-platform/discussions)
3. Abra uma nova issue com:
   - Versão atual e versão alvo
   - Mensagens de erro
   - Sistema operacional

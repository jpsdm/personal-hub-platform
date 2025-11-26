# 1. Iniciar banco de dados e aplicação

docker-compose up -d

# 2. Rodar migrações (primeira vez ou após mudanças no schema)

docker-compose --profile migrate up migrate

# 3. Ver logs

docker-compose logs -f app

# 4. Parar tudo

docker-compose down

# 5. Parar e remover volumes (apaga dados do banco)

docker-compose down -v

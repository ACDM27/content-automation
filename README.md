# 部署指南

## 环境要求

- Docker
- Docker Compose

## 快速部署

1. 复制环境变量文件：

```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，配置必要的环境变量

3. 启动服务：

```bash
docker-compose up -d
```

4. 访问服务：

- 前端：http://localhost
- 后端 API：http://localhost/api/v1/docs

## 服务架构

```
┌─────────────┐
│   Nginx     │  :80
│  (Frontend) │
└──────┬──────┘
       │
       │ /api/
       ▼
┌─────────────┐
│   Backend   │  :8000
│  (FastAPI)  │
└──────┬──────┘
       │
   ┌───┴───┐
   ▼       ▼
┌─────┐ ┌─────┐
│Postgres│ │Redis│
└─────┘ └─────┘
```

## 常用命令

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重新构建镜像
docker-compose build --no-cache

# 重启单个服务
docker-compose restart backend
```

## 数据持久化

- PostgreSQL 数据：`postgres_data` 卷
- Redis 数据：`redis_data` 卷
- 上传文件：`uploads` 卷

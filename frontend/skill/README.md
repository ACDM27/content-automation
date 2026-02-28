# Skill 配置

本项目的 Skill 定义文件，用于描述项目结构和常用操作。

## 文件说明

- `skill.json` - Skill主定义文件

## 项目信息

- **项目类型**: React + Vite
- **路由**: React Router v6
- **API请求**: Axios
- **UI样式**: 自定义CSS

## 核心模块

| 模块 | 路径 | 说明 |
|------|------|------|
| 爬虫管理 | /crawl | 手动触发、定时任务 |
| 热点分析 | /analysis | 热点列表、详情、统计 |
| 视频生成 | /video | 创建项目、生成视频、进度查看 |
| 视频发布 | /publish | 发布记录、账号管理 |
| 飞书推送 | /feishu | 机器人配置、测试推送 |
| 系统设置 | /system | 仪表盘、系统配置 |

## 常用命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## API代理

开发环境通过 Vite 代理访问后端API：
- 前端: http://localhost:5173
- 后端: http://localhost:8000
- 代理路径: /api -> http://localhost:8000/api/v1

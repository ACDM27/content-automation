from fastapi import APIRouter
from app.api.v1.endpoints import crawl, analysis, video, publish, feishu, system

api_router = APIRouter()

api_router.include_router(crawl.router, prefix="/crawl", tags=["爬虫管理"])
api_router.include_router(analysis.router, tags=["热点分析"])
api_router.include_router(video.router, tags=["视频生成"])
api_router.include_router(publish.router, tags=["视频发布"])
api_router.include_router(feishu.router, tags=["飞书推送"])
api_router.include_router(system.router, tags=["系统管理"])

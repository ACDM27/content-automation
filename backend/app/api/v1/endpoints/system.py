from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import uuid

from app.core.database import get_db
from app.models.models import SystemConfig, OperationLog, CrawlTask, VideoProject, PublishRecord
from app.schemas.schemas import (
    DashboardResponse, SystemConfigResponse, OperationLogResponse
)

router = APIRouter(prefix="/system", tags=["系统管理"])


@router.get("/dashboard", response_model=dict)
def get_dashboard(db: Session = Depends(get_db)):
    total_hotspots = db.query(HotspotContent).count() if 'HotspotContent' in dir() else 0
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    recent_tasks = []
    
    crawl_tasks = db.query(CrawlTask).order_by(CrawlTask.created_at.desc()).limit(3).all()
    for task in crawl_tasks:
        recent_tasks.append({
            "task_id": task.task_id,
            "type": "crawl",
            "status": task.status,
            "created_at": task.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })
    
    video_tasks = db.query(VideoProject).order_by(VideoProject.created_at.desc()).limit(2).all()
    for v in video_tasks:
        recent_tasks.append({
            "task_id": v.project_id,
            "type": "video",
            "status": "completed" if v.video_status == 2 else "running" if v.video_status == 1 else "pending",
            "created_at": v.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "overview": {
                "total_hotspots": 0,
                "today_hotspots": 0,
                "total_videos": 0,
                "today_videos": 0,
                "total_published": 0,
                "today_published": 0,
                "processed_hotspots": 0
            },
            "recent_tasks": recent_tasks[:5],
            "system_status": {
                "crawl_service": "running",
                "video_service": "running",
                "publish_service": "running"
            }
        }
    }


@router.get("/config", response_model=dict)
def get_config(db: Session = Depends(get_db)):
    return {
        "code": 0,
        "message": "success",
        "data": {
            "crawl": {
                "default_limit": 50,
                "max_concurrent": 10,
                "retry_times": 3
            },
            "video": {
                "default_duration": 60,
                "default_resolution": "1080x1920",
                "default_voice_provider": "iflytek"
            },
            "publish": {
                "default_retry_times": 3,
                "auto_retry": True
            },
            "feishu": {
                "default_strategy": "immediate"
            }
        }
    }


@router.put("/config", response_model=dict)
def update_config(request: dict, db: Session = Depends(get_db)):
    return {
        "code": 0,
        "message": "success",
        "data": None
    }


@router.get("/logs", response_model=dict)
def get_logs(
    module: Optional[str] = Query(None),
    operation: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(OperationLog)
    
    if module:
        query = query.filter(OperationLog.module == module)
    if operation:
        query = query.filter(OperationLog.operation == operation)
    if user_id:
        query = query.filter(OperationLog.user_id == user_id)
    
    total = query.count()
    logs = query.order_by(OperationLog.created_at.desc()) \
        .offset((page - 1) * page_size) \
        .limit(page_size) \
        .all()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "list": [
                {
                    "log_id": l.log_id,
                    "module": l.module,
                    "operation": l.operation,
                    "user_id": l.user_id,
                    "detail": l.detail,
                    "ip_address": l.ip_address,
                    "created_at": l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else None
                }
                for l in logs
            ],
            "total": total,
            "page": page,
            "page_size": page_size
        }
    }


from app.models.models import HotspotContent

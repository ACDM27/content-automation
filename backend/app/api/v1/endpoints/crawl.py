from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import uuid
import asyncio

from app.core.database import get_db
from app.models.models import CrawlTask, CrawlSchedule, HotspotContent
from app.schemas.schemas import (
    CrawlTaskCreate, CrawlTaskResponse, CrawlScheduleCreate, CrawlScheduleResponse,
    PaginatedResponse
)
from app.services.crawler import douyin_crawler

router = APIRouter(tags=["爬虫管理"])


async def execute_crawl_task(task_id: str, source: str, crawl_type: str, limit: int):
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        task = db.query(CrawlTask).filter(CrawlTask.task_id == task_id).first()
        if not task:
            return
        
        task.status = "running"
        task.started_at = datetime.now()
        db.commit()
        
        items = await douyin_crawler.crawl(crawl_type, limit)
        
        for item in items:
            hotspot = HotspotContent(
                title=item.get("title", ""),
                description=item.get("description", ""),
                author=item.get("author"),
                author_avatar=item.get("author_avatar"),
                likes=item.get("likes", 0),
                comments=item.get("comments", 0),
                shares=item.get("shares", 0),
                heat_score=item.get("heat_score", 0),
                topic_tags=item.get("topic_tags"),
                video_url=item.get("video_url"),
                cover_url=item.get("cover_url"),
                crawled_at=datetime.now(),
                status=0
            )
            db.add(hotspot)
        
        task.total_items = len(items)
        task.crawled_items = len(items)
        task.status = "completed"
        task.finished_at = datetime.now()
        db.commit()
        
    except Exception as e:
        task = db.query(CrawlTask).filter(CrawlTask.task_id == task_id).first()
        if task:
            task.status = "failed"
            task.error_message = str(e)
            task.finished_at = datetime.now()
            db.commit()
    finally:
        db.close()


@router.post("/start", response_model=dict)
def start_crawl(request: CrawlTaskCreate, db: Session = Depends(get_db)):
    task_id = f"crawl_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}"
    
    task = CrawlTask(
        task_id=task_id,
        source=request.source,
        crawl_type=request.crawl_type,
        topics=request.topics,
        limit=request.limit,
        status="running"
    )
    task.started_at = datetime.now()
    db.add(task)
    db.commit()
    
    try:
        items = asyncio.run(douyin_crawler.crawl(request.crawl_type, request.limit, request.topics))
        
        for item in items:
            hotspot = HotspotContent(
                title=item.get("title", ""),
                description=item.get("description", ""),
                author=item.get("author"),
                author_avatar=item.get("author_avatar"),
                likes=item.get("likes", 0),
                comments=item.get("comments", 0),
                shares=item.get("shares", 0),
                heat_score=item.get("heat_score", 0),
                topic_tags=item.get("topic_tags"),
                video_url=item.get("video_url"),
                cover_url=item.get("cover_url"),
                crawled_at=datetime.now(),
                status=0
            )
            db.add(hotspot)
        
        task.total_items = len(items)
        task.crawled_items = len(items)
        task.status = "completed"
        task.finished_at = datetime.now()
        db.commit()
        
    except Exception as e:
        task.status = "failed"
        task.error_message = str(e)
        task.finished_at = datetime.now()
        db.commit()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "task_id": task_id,
            "status": task.status,
            "started_at": task.started_at.strftime("%Y-%m-%d %H:%M:%S") if task.started_at else None
        }
    }


@router.get("/status/{task_id}", response_model=dict)
def get_crawl_status(task_id: str, db: Session = Depends(get_db)):
    task = db.query(CrawlTask).filter(CrawlTask.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    progress = 100 if task.status == "completed" else (50 if task.status == "running" else 0)
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "task_id": task.task_id,
            "status": task.status,
            "progress": progress,
            "total_items": task.total_items,
            "crawled_items": task.crawled_items,
            "started_at": task.started_at.strftime("%Y-%m-%d %H:%M:%S") if task.started_at else None,
            "finished_at": task.finished_at.strftime("%Y-%m-%d %H:%M:%S") if task.finished_at else None
        }
    }


@router.get("/tasks", response_model=dict)
def get_crawl_tasks(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(CrawlTask)
    
    if status:
        query = query.filter(CrawlTask.status == status)
    
    total = query.count()
    tasks = query.order_by(CrawlTask.created_at.desc()) \
        .offset((page - 1) * page_size) \
        .limit(page_size) \
        .all()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "list": [
                {
                    "task_id": t.task_id,
                    "source": t.source,
                    "crawl_type": t.crawl_type,
                    "topics": t.topics,
                    "total_items": t.total_items,
                    "status": t.status,
                    "started_at": t.started_at.strftime("%Y-%m-%d %H:%M:%S") if t.started_at else None,
                    "finished_at": t.finished_at.strftime("%Y-%m-%d %H:%M:%S") if t.finished_at else None
                }
                for t in tasks
            ],
            "total": total,
            "page": page,
            "page_size": page_size
        }
    }


@router.post("/schedule", response_model=dict)
def create_schedule(request: CrawlScheduleCreate, db: Session = Depends(get_db)):
    schedule_id = f"schedule_{uuid.uuid4().hex[:8]}"
    
    schedule = CrawlSchedule(
        schedule_id=schedule_id,
        cron_expression=request.cron_expression,
        crawl_type=request.crawl_type,
        topics=request.topics,
        limit=request.limit,
        enabled=request.enabled
    )
    db.add(schedule)
    db.commit()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "schedule_id": schedule_id,
            "cron_expression": request.cron_expression,
            "crawl_type": request.crawl_type,
            "topics": request.topics,
            "enabled": request.enabled,
            "next_run_at": None
        }
    }


@router.get("/schedules", response_model=dict)
def get_schedules(db: Session = Depends(get_db)):
    schedules = db.query(CrawlSchedule).all()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "list": [
                {
                    "schedule_id": s.schedule_id,
                    "cron_expression": s.cron_expression,
                    "crawl_type": s.crawl_type,
                    "topics": s.topics,
                    "enabled": s.enabled,
                    "next_run_at": s.next_run_at.strftime("%Y-%m-%d %H:%M:%S") if s.next_run_at else None,
                    "last_run_at": s.last_run_at.strftime("%Y-%m-%d %H:%M:%S") if s.last_run_at else None
                }
                for s in schedules
            ]
        }
    }


@router.delete("/schedule/{schedule_id}", response_model=dict)
def delete_schedule(schedule_id: str, db: Session = Depends(get_db)):
    schedule = db.query(CrawlSchedule).filter(CrawlSchedule.schedule_id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    
    db.delete(schedule)
    db.commit()
    
    return {
        "code": 0,
        "message": "success",
        "data": None
    }


@router.get("/content/{task_id}", response_model=dict)
def get_task_content(task_id: str, db: Session = Depends(get_db)):
    """获取任务爬取的内容详情"""
    task = db.query(CrawlTask).filter(CrawlTask.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    query = db.query(HotspotContent)
    
    if task.started_at and task.finished_at:
        query = query.filter(
            HotspotContent.crawled_at >= task.started_at,
            HotspotContent.crawled_at <= task.finished_at
        )
    elif task.started_at:
        query = query.filter(HotspotContent.crawled_at >= task.started_at)
    
    hotspots = query.order_by(HotspotContent.heat_score.desc()).limit(100).all()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "task_id": task.task_id,
            "status": task.status,
            "crawl_type": task.crawl_type,
            "topics": task.topics,
            "total_items": task.total_items,
            "started_at": task.started_at.strftime("%Y-%m-%d %H:%M:%S") if task.started_at else None,
            "finished_at": task.finished_at.strftime("%Y-%m-%d %H:%M:%S") if task.finished_at else None,
            "list": [
                {
                    "id": h.id,
                    "title": h.title,
                    "description": h.description,
                    "author": h.author,
                    "likes": h.likes,
                    "comments": h.comments,
                    "shares": h.shares,
                    "heat_score": h.heat_score,
                    "topic_tags": h.topic_tags or [],
                    "video_url": h.video_url,
                    "cover_url": h.cover_url,
                    "crawled_at": h.crawled_at.strftime("%Y-%m-%d %H:%M:%S") if h.crawled_at else None
                }
                for h in hotspots
            ]
        }
    }

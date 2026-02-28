from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from typing import Optional
from datetime import datetime, timedelta
import uuid

from app.core.database import get_db
from app.models.models import HotspotContent, VideoProject
from app.schemas.schemas import (
    HotspotResponse, StatisticsResponse, ClusterResponse,
    SummarizeRequest, BatchProcessRequest
)
from app.services.ai_service import ai_generator

router = APIRouter(prefix="/analysis", tags=["热点分析"])


@router.get("/hotspots", response_model=dict)
def get_hotspots(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("heat_score"),
    sort_order: str = Query("desc"),
    topic_filter: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    status: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(HotspotContent)
    
    if status is not None:
        query = query.filter(HotspotContent.status == status)
    
    if topic_filter:
        query = query.filter(HotspotContent.topic_tags.contains(topic_filter))
    
    if date_from:
        query = query.filter(HotspotContent.crawled_at >= datetime.fromisoformat(date_from))
    
    if date_to:
        query = query.filter(HotspotContent.crawled_at <= datetime.fromisoformat(date_to))
    
    sort_column = getattr(HotspotContent, sort_by, HotspotContent.heat_score)
    if sort_order == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))
    
    total = query.count()
    hotspots = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
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
                    "crawled_at": h.crawled_at.strftime("%Y-%m-%d %H:%M:%S") if h.crawled_at else None,
                    "status": h.status
                }
                for h in hotspots
            ],
            "total": total,
            "page": page,
            "page_size": page_size
        }
    }


@router.get("/hotspot/{hotspot_id}", response_model=dict)
def get_hotspot_detail(hotspot_id: int, db: Session = Depends(get_db)):
    hotspot = db.query(HotspotContent).filter(HotspotContent.id == hotspot_id).first()
    if not hotspot:
        raise HTTPException(status_code=404, detail="热点内容不存在")
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "id": hotspot.id,
            "title": hotspot.title,
            "description": hotspot.description,
            "author": hotspot.author,
            "author_avatar": hotspot.author_avatar,
            "likes": hotspot.likes,
            "comments": hotspot.comments,
            "shares": hotspot.shares,
            "heat_score": hotspot.heat_score,
            "topic_tags": hotspot.topic_tags or [],
            "video_url": hotspot.video_url,
            "cover_url": hotspot.cover_url,
            "crawled_at": hotspot.crawled_at.strftime("%Y-%m-%d %H:%M:%S") if hotspot.crawled_at else None,
            "status": hotspot.status,
            "processed_at": hotspot.processed_at.strftime("%Y-%m-%d %H:%M:%S") if hotspot.processed_at else None
        }
    }


@router.get("/statistics", response_model=dict)
def get_statistics(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(HotspotContent)
    
    if date_from:
        query = query.filter(HotspotContent.crawled_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(HotspotContent.crawled_at <= datetime.fromisoformat(date_to))
    
    total_hotspots = query.count()
    processed_hotspots = query.filter(HotspotContent.status == 1).count()
    pending_hotspots = total_hotspots - processed_hotspots
    
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_hotspots = query.filter(HotspotContent.crawled_at >= today_start).count()
    
    all_hotspots = db.query(HotspotContent).all()
    topic_count = {}
    for h in all_hotspots:
        if h.topic_tags:
            for tag in h.topic_tags:
                topic_count[tag] = topic_count.get(tag, 0) + 1
    
    top_topics = sorted(topic_count.items(), key=lambda x: x[1], reverse=True)[:10]
    top_topics = [{"tag": t[0], "count": t[1]} for t in top_topics]
    
    heat_trend = []
    for i in range(7):
        date = (datetime.now() - timedelta(days=i)).date()
        day_hotspots = db.query(HotspotContent).filter(
            db.func.date(HotspotContent.crawled_at) == date
        ).all()
        avg_score = sum(h.heat_score for h in day_hotspots) / len(day_hotspots) if day_hotspots else 0
        heat_trend.append({
            "date": date.strftime("%Y-%m-%d"),
            "avg_heat_score": int(avg_score)
        })
    heat_trend.reverse()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "total_hotspots": total_hotspots,
            "today_hotspots": today_hotspots,
            "processed_hotspots": processed_hotspots,
            "pending_hotspots": pending_hotspots,
            "top_topics": top_topics,
            "heat_trend": heat_trend
        }
    }


@router.get("/clusters", response_model=dict)
def get_clusters(
    min_similarity: float = Query(0.6),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    return {
        "code": 0,
        "message": "success",
        "data": {
            "clusters": []
        }
    }


@router.post("/summarize/{hotspot_id}", response_model=dict)
def summarize_hotspot(hotspot_id: int, request: SummarizeRequest, db: Session = Depends(get_db)):
    hotspot = db.query(HotspotContent).filter(HotspotContent.id == hotspot_id).first()
    if not hotspot:
        raise HTTPException(status_code=404, detail="热点内容不存在")
    
    hotspot_data = {
        "id": hotspot.id,
        "title": hotspot.title,
        "description": hotspot.description,
        "topic_tags": hotspot.topic_tags or [],
        "heat_score": hotspot.heat_score,
        "likes": hotspot.likes,
        "comments": hotspot.comments,
        "shares": hotspot.shares
    }
    
    result = ai_generator.generate_video_script(hotspot_data)
    
    if result["success"]:
        summary = result["script"]
        if request.max_length:
            summary = summary[:request.max_length]
        
        hotspot.status = 1
        hotspot.processed_at = datetime.now()
        db.commit()
        
        return {
            "code": 0,
            "message": "success",
            "data": {
                "hotspot_id": hotspot_id,
                "summary": summary,
                "model": result.get("model"),
                "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        }
    else:
        return {
            "code": 500,
            "message": f"AI生成失败: {result.get('error')}",
            "data": None
        }


@router.post("/analyze/{hotspot_id}", response_model=dict)
def analyze_hotspot(hotspot_id: int, db: Session = Depends(get_db)):
    """AI分析热点内容，返回结构化分析结果"""
    hotspot = db.query(HotspotContent).filter(HotspotContent.id == hotspot_id).first()
    if not hotspot:
        raise HTTPException(status_code=404, detail="热点内容不存在")
    
    hotspot_data = {
        "id": hotspot.id,
        "title": hotspot.title,
        "description": hotspot.description,
        "topic_tags": hotspot.topic_tags or [],
        "heat_score": hotspot.heat_score,
        "likes": hotspot.likes,
        "comments": hotspot.comments,
        "shares": hotspot.shares
    }
    
    result = ai_generator.analyze_hotspot(hotspot_data)
    
    if result["success"]:
        return {
            "code": 0,
            "message": "success",
            "data": {
                "hotspot_id": hotspot_id,
                "analysis": result["analysis"],
                "model": result.get("model"),
                "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        }
    else:
        return {
            "code": 500,
            "message": f"AI分析失败: {result.get('error')}",
            "data": None
        }


@router.post("/batch-ai-generate", response_model=dict)
def batch_ai_generate(request: BatchProcessRequest, db: Session = Depends(get_db)):
    """批量AI生成视频脚本"""
    from app.services.ai_service import ai_generator
    
    results = []
    succeeded = 0
    failed = 0
    
    for hotspot_id in request.hotspot_ids:
        hotspot = db.query(HotspotContent).filter(HotspotContent.id == hotspot_id).first()
        if hotspot:
            hotspot_data = {
                "id": hotspot.id,
                "title": hotspot.title,
                "description": hotspot.description,
                "topic_tags": hotspot.topic_tags or [],
                "heat_score": hotspot.heat_score,
                "likes": hotspot.likes,
                "comments": hotspot.comments,
                "shares": hotspot.shares
            }
            
            result = ai_generator.generate_video_script(hotspot_data)
            
            if result["success"]:
                project = VideoProject(
                    project_id=f"video_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}",
                    hotspot_id=hotspot_id,
                    title=hotspot.title,
                    script=result["script"],
                    script_status=2
                )
                db.add(project)
                hotspot.status = 1
                hotspot.processed_at = datetime.now()
                db.commit()
                
                results.append({
                    "hotspot_id": hotspot_id,
                    "success": True,
                    "script": result["script"]
                })
                succeeded += 1
            else:
                results.append({
                    "hotspot_id": hotspot_id,
                    "success": False,
                    "error": result.get("error")
                })
                failed += 1
        else:
            failed += 1
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "batch_id": f"batch_{uuid.uuid4().hex[:8]}",
            "total": len(request.hotspot_ids),
            "succeeded": succeeded,
            "failed": failed,
            "results": results,
            "task_id": f"task_{uuid.uuid4().hex[:8]}"
        }
    }
def batch_process(request: BatchProcessRequest, db: Session = Depends(get_db)):
    succeeded = 0
    failed = 0
    
    for hotspot_id in request.hotspot_ids:
        hotspot = db.query(HotspotContent).filter(HotspotContent.id == hotspot_id).first()
        if hotspot:
            if request.action == "generate_script":
                project = VideoProject(
                    project_id=f"video_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}",
                    hotspot_id=hotspot_id,
                    title=hotspot.title,
                    script_status=1
                )
                db.add(project)
                hotspot.status = 1
                hotspot.processed_at = datetime.now()
                succeeded += 1
            else:
                hotspot.status = 1
                hotspot.processed_at = datetime.now()
                succeeded += 1
        else:
            failed += 1
    
    db.commit()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "batch_id": f"batch_{uuid.uuid4().hex[:8]}",
            "total": len(request.hotspot_ids),
            "succeeded": succeeded,
            "failed": failed,
            "task_id": f"task_{uuid.uuid4().hex[:8]}"
        }
    }


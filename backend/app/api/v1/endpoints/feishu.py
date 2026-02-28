from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import uuid

from app.core.database import get_db
from app.models.models import FeishuBot, FeishuStrategy, FeishuPushRecord
from app.schemas.schemas import (
    FeishuBotCreate, FeishuBotResponse, FeishuBotUpdate,
    FeishuTestRequest, FeishuStrategyCreate, FeishuStrategyResponse,
    FeishuPushRecordResponse
)

router = APIRouter(prefix="/feishu", tags=["飞书推送"])


@router.post("/config", response_model=dict)
def create_bot(request: FeishuBotCreate, db: Session = Depends(get_db)):
    bot_id = f"bot_{uuid.uuid4().hex[:8]}"
    
    bot = FeishuBot(
        bot_id=bot_id,
        name=request.name,
        webhook_url=request.webhook_url,
        secret=request.secret,
        enabled=request.enabled
    )
    db.add(bot)
    db.commit()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "bot_id": bot_id,
            "name": request.name,
            "enabled": request.enabled,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    }


@router.get("/configs", response_model=dict)
def get_bots(db: Session = Depends(get_db)):
    bots = db.query(FeishuBot).all()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "list": [
                {
                    "bot_id": b.bot_id,
                    "name": b.name,
                    "webhook_url": b.webhook_url,
                    "enabled": b.enabled,
                    "created_at": b.created_at.strftime("%Y-%m-%d %H:%M:%S") if b.created_at else None
                }
                for b in bots
            ]
        }
    }


@router.put("/config/{bot_id}", response_model=dict)
def update_bot(bot_id: str, request: FeishuBotUpdate, db: Session = Depends(get_db)):
    bot = db.query(FeishuBot).filter(FeishuBot.bot_id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="机器人不存在")
    
    if request.name is not None:
        bot.name = request.name
    if request.webhook_url is not None:
        bot.webhook_url = request.webhook_url
    if request.enabled is not None:
        bot.enabled = request.enabled
    if request.secret is not None:
        bot.secret = request.secret
    
    db.commit()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "bot_id": bot_id,
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    }


@router.delete("/config/{bot_id}", response_model=dict)
def delete_bot(bot_id: str, db: Session = Depends(get_db)):
    bot = db.query(FeishuBot).filter(FeishuBot.bot_id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="机器人不存在")
    
    db.delete(bot)
    db.commit()
    
    return {
        "code": 0,
        "message": "success",
        "data": None
    }


@router.post("/test", response_model=dict)
def test_push(request: FeishuTestRequest, db: Session = Depends(get_db)):
    bot = db.query(FeishuBot).filter(FeishuBot.bot_id == request.bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="机器人不存在")
    
    record = FeishuPushRecord(
        record_id=f"msg_{uuid.uuid4().hex[:8]}",
        bot_id=request.bot_id,
        event_type="test",
        message_type=request.message_type,
        status="sent"
    )
    db.add(record)
    db.commit()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "message_id": record.record_id,
            "sent_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    }


@router.post("/strategy", response_model=dict)
def create_strategy(request: FeishuStrategyCreate, db: Session = Depends(get_db)):
    strategy_id = f"strategy_{uuid.uuid4().hex[:8]}"
    
    strategy = FeishuStrategy(
        strategy_id=strategy_id,
        bot_id=request.bot_id,
        event_type=request.event_type,
        strategy=request.strategy,
        schedule_time=request.schedule_time,
        enabled=True
    )
    db.add(strategy)
    db.commit()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "strategy_id": strategy_id,
            "bot_id": request.bot_id,
            "event_type": request.event_type,
            "strategy": request.strategy
        }
    }


@router.get("/history", response_model=dict)
def get_push_history(
    bot_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(FeishuPushRecord)
    
    if bot_id:
        query = query.filter(FeishuPushRecord.bot_id == bot_id)
    if event_type:
        query = query.filter(FeishuPushRecord.event_type == event_type)
    
    total = query.count()
    records = query.order_by(FeishuPushRecord.sent_at.desc()) \
        .offset((page - 1) * page_size) \
        .limit(page_size) \
        .all()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "list": [
                {
                    "record_id": r.record_id,
                    "bot_id": r.bot_id,
                    "event_type": r.event_type,
                    "message_type": r.message_type,
                    "status": r.status,
                    "sent_at": r.sent_at.strftime("%Y-%m-%d %H:%M:%S") if r.sent_at else None
                }
                for r in records
            ],
            "total": total,
            "page": page,
            "page_size": page_size
        }
    }

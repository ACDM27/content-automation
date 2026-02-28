from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
import uuid
import os
import asyncio

from app.core.database import get_db
from app.models.models import DouyinAccount, PublishRecord, VideoProject
from app.schemas.schemas import (
    DouyinAccountCreate, DouyinAccountResponse, DouyinVerifyRequest,
    PublishRequest, PublishResponse, PublishRecordResponse
)
from app.services.douyin_publish import douyin_publish_service, DouyinAPIError

router = APIRouter(prefix="/publish", tags=["视频发布"])


# Douyin Account endpoints
@router.get("/douyin/accounts", response_model=dict)
def get_accounts(db: Session = Depends(get_db)):
    accounts = db.query(DouyinAccount).all()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "list": [
                {
                    "account_id": a.account_id,
                    "nickname": a.nickname,
                    "avatar_url": a.avatar_url,
                    "status": a.status,
                    "followers": a.followers,
                    "created_at": a.created_at.strftime("%Y-%m-%d %H:%M:%S") if a.created_at else None
                }
                for a in accounts
            ]
        }
    }


@router.post("/douyin/account", response_model=dict)
def add_account(request: DouyinAccountCreate, db: Session = Depends(get_db)):
    account_id = f"account_{uuid.uuid4().hex[:8]}"
    
    try:
        auth_url = douyin_publish_service.get_authorization_url(
            redirect_uri=request.redirect_uri or "https://yourdomain.com/callback",
            state=account_id
        )
    except ValueError as e:
        return {
            "code": -1,
            "message": str(e),
            "data": None
        }
    
    account = DouyinAccount(
        account_id=account_id,
        status="pending_verify"
    )
    db.add(account)
    db.commit()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "account_id": account_id,
            "nickname": None,
            "status": "pending_verify",
            "verify_code_sent": True,
            "authorization_url": auth_url
        }
    }


@router.post("/douyin/callback", response_model=dict)
def oauth_callback(code: str, state: str, db: Session = Depends(get_db)):
    """OAuth授权回调处理"""
    account = db.query(DouyinAccount).filter(DouyinAccount.account_id == state).first()
    if not account:
        raise HTTPException(status_code=404, detail="账号不存在")
    
    try:
        token_data = douyin_publish_service.get_access_token(code)
        
        account.access_token = token_data.get("access_token")
        account.refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 86400)
        account.token_expires_at = datetime.now() + timedelta(seconds=expires_in)
        
        user_info = douyin_publish_service.get_user_info(token_data.get("access_token"))
        
        account.nickname = user_info.get("nickname", f"用户{account.account_id[-4:]}")
        account.avatar_url = user_info.get("avatar_url")
        account.douyin_id = user_info.get("open_id")
        account.status = "active"
        
        db.commit()
        
        return {
            "code": 0,
            "message": "success",
            "data": {
                "account_id": account.account_id,
                "nickname": account.nickname,
                "status": account.status
            }
        }
    except DouyinAPIError as e:
        return {
            "code": e.code,
            "message": e.message,
            "data": None
        }
    except Exception as e:
        return {
            "code": -1,
            "message": f"授权失败: {str(e)}",
            "data": None
        }


@router.post("/douyin/verify", response_model=dict)
def verify_account(request: DouyinVerifyRequest, db: Session = Depends(get_db)):
    account = db.query(DouyinAccount).filter(DouyinAccount.account_id == request.account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="账号不存在")
    
    account.status = "active"
    account.nickname = f"用户{account.account_id[-4:]}"
    db.commit()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "account_id": request.account_id,
            "status": "active"
        }
    }


@router.delete("/douyin/account/{account_id}", response_model=dict)
def delete_account(account_id: str, db: Session = Depends(get_db)):
    account = db.query(DouyinAccount).filter(DouyinAccount.account_id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="账号不存在")
    
    db.delete(account)
    db.commit()
    
    return {
        "code": 0,
        "message": "success",
        "data": None
    }


@router.post("/douyin", response_model=dict)
async def publish_video(request: PublishRequest, db: Session = Depends(get_db)):
    project = db.query(VideoProject).filter(VideoProject.project_id == request.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="视频项目不存在")
    
    if not project.video_path and not project.video_url:
        raise HTTPException(status_code=400, detail="视频文件不存在")
    
    account = db.query(DouyinAccount).filter(DouyinAccount.account_id == request.account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="抖音账号不存在")
    
    if account.status != "active":
        raise HTTPException(status_code=400, detail="抖音账号未授权或已失效")
    
    if account.token_expires_at and account.token_expires_at < datetime.now():
        try:
            token_data = douyin_publish_service.refresh_access_token(account.refresh_token)
            account.access_token = token_data.get("access_token")
            account.refresh_token = token_data.get("refresh_token")
            expires_in = token_data.get("expires_in", 86400)
            account.token_expires_at = datetime.now() + timedelta(seconds=expires_in)
            db.commit()
        except DouyinAPIError:
            raise HTTPException(status_code=400, detail="账号授权已过期，请重新授权")
    
    publish_id = f"publish_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}"
    
    record = PublishRecord(
        publish_id=publish_id,
        project_id=request.project_id,
        account_id=request.account_id,
        title=request.title,
        description=request.description,
        topic_tags=request.topic_tags,
        visibility=request.visibility,
        comment_enabled=request.comment_enabled,
        download_enabled=request.download_enabled,
        platform="douyin",
        status="publishing"
    )
    db.add(record)
    db.commit()
    
    video_path = project.video_path
    if not video_path and project.video_url:
        video_path = project.video_url
    
    def _do_publish():
        try:
            result = douyin_publish_service.upload_video(
                access_token=account.access_token,
                video_path=video_path,
                title=request.title,
                description=request.description,
                topic_tags=request.topic_tags or [],
                visibility=request.visibility,
                comment_enabled=request.comment_enabled,
                download_enabled=request.download_enabled
            )
            
            record = db.query(PublishRecord).filter(PublishRecord.publish_id == publish_id).first()
            if record:
                record.status = "published"
                record.douyin_video_id = result.get("video_id")
                record.publish_url = f"https://www.douyin.com/video/{result.get('video_id')}"
                record.publish_at = datetime.now()
                db.commit()
            
            return result
        except DouyinAPIError as e:
            record = db.query(PublishRecord).filter(PublishRecord.publish_id == publish_id).first()
            if record:
                record.status = "failed"
                record.error_message = e.message
                db.commit()
            raise
    
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _do_publish)
        
        return {
            "code": 0,
            "message": "success",
            "data": {
                "publish_id": publish_id,
                "project_id": request.project_id,
                "account_id": request.account_id,
                "status": "published",
                "video_id": result.get("video_id"),
                "publish_url": f"https://www.douyin.com/video/{result.get('video_id')}",
                "started_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        }
    except DouyinAPIError as e:
        return {
            "code": e.code,
            "message": e.message,
            "data": {
                "publish_id": publish_id,
                "status": "failed"
            }
        }
    except Exception as e:
        record = db.query(PublishRecord).filter(PublishRecord.publish_id == publish_id).first()
        if record:
            record.status = "failed"
            record.error_message = str(e)
            db.commit()
        
        return {
            "code": -1,
            "message": f"发布失败: {str(e)}",
            "data": {
                "publish_id": publish_id,
                "status": "failed"
            }
        }


@router.get("/status/{publish_id}", response_model=dict)
def get_publish_status(publish_id: str, db: Session = Depends(get_db)):
    record = db.query(PublishRecord).filter(PublishRecord.publish_id == publish_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="发布记录不存在")
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "publish_id": record.publish_id,
            "project_id": record.project_id,
            "account_id": record.account_id,
            "status": record.status,
            "publish_url": record.publish_url,
            "douyin_video_id": record.douyin_video_id,
            "publish_at": record.publish_at.strftime("%Y-%m-%d %H:%M:%S") if record.publish_at else None,
            "error_message": record.error_message
        }
    }


@router.get("/list", response_model=dict)
def get_publish_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    account_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(PublishRecord)
    
    if account_id:
        query = query.filter(PublishRecord.account_id == account_id)
    if status:
        query = query.filter(PublishRecord.status == status)
    if date_from:
        query = query.filter(PublishRecord.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(PublishRecord.created_at <= datetime.fromisoformat(date_to))
    
    total = query.count()
    records = query.order_by(PublishRecord.created_at.desc()) \
        .offset((page - 1) * page_size) \
        .limit(page_size) \
        .all()
    
    result_list = []
    for r in records:
        account = db.query(DouyinAccount).filter(DouyinAccount.account_id == r.account_id).first()
        result_list.append({
            "publish_id": r.publish_id,
            "project_id": r.project_id,
            "title": r.title,
            "account_id": r.account_id,
            "account_nickname": account.nickname if account else None,
            "platform": r.platform,
            "status": r.status,
            "publish_url": r.publish_url,
            "publish_at": r.publish_at.strftime("%Y-%m-%d %H:%M:%S") if r.publish_at else None
        })
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "list": result_list,
            "total": total,
            "page": page,
            "page_size": page_size
        }
    }


@router.post("/retry/{publish_id}", response_model=dict)
def retry_publish(publish_id: str, db: Session = Depends(get_db)):
    record = db.query(PublishRecord).filter(PublishRecord.publish_id == publish_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="发布记录不存在")
    
    record.status = "publishing"
    record.retry_count += 1
    db.commit()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "publish_id": publish_id,
            "status": "republishing",
            "retry_count": record.retry_count
        }
    }


@router.post("/cancel/{publish_id}", response_model=dict)
def cancel_publish(publish_id: str, db: Session = Depends(get_db)):
    record = db.query(PublishRecord).filter(PublishRecord.publish_id == publish_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="发布记录不存在")
    
    record.status = "cancelled"
    db.commit()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "publish_id": publish_id,
            "status": "cancelled"
        }
    }

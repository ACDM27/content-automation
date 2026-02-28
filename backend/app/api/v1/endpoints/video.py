from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import uuid
import json

from app.core.database import get_db
from app.models.models import VideoProject
from app.schemas.schemas import (
    VideoProjectCreate, VideoGenerateRequest, VideoProjectResponse,
    VideoProgressResponse, VideoScriptUpdate, VideoRegenerateRequest,
    ChatCompletionRequest
)

router = APIRouter(prefix="/video", tags=["视频生成"])


@router.post("/create", response_model=dict)
def create_video_project(request: VideoProjectCreate, db: Session = Depends(get_db)):
    project_id = f"video_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}"
    
    script_status = 2 if request.script else 0
    
    project = VideoProject(
        project_id=project_id,
        hotspot_id=request.hotspot_id,
        title=request.title,
        script=request.script,
        script_status=script_status,
        duration=request.duration,
        resolution=request.resolution,
        style=request.style,
        video_status=0
    )
    db.add(project)
    db.commit()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "project_id": project_id,
            "title": request.title,
            "status": "created",
            "created_at": project.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
    }


@router.post("/generate", response_model=dict)
def generate_video(request: VideoGenerateRequest, db: Session = Depends(get_db)):
    print(f"[VideoGenerate] Received request for project: {request.project_id}")
    
    project = db.query(VideoProject).filter(VideoProject.project_id == request.project_id).first()
    if not project:
        print(f"[VideoGenerate] Project not found: {request.project_id}")
        raise HTTPException(status_code=404, detail="视频项目不存在")
    
    print(f"[VideoGenerate] Project script: {project.script[:100] if project.script else 'None'}...")
    
    if not project.script:
        return {
            "code": 400,
            "message": "请先填写视频脚本内容",
            "data": None
        }
    
    project.script_status = 2
    project.video_status = 1
    project.voice_provider = request.voice_provider
    project.voice_speed = request.voice_speed
    db.commit()
    
    from app.services.ai_service import ai_generator
    
    duration = project.duration or 60
    video_prompt = f"{project.script} --duration {duration // 10} --camerafixed false --watermark true"
    print(f"[VideoGenerate] Calling ARK with prompt: {video_prompt[:80]}...")
    result = ai_generator.generate_video_with_ark(video_prompt)
    print(f"[VideoGenerate] ARK result: {result}")
    
    if result["success"]:
        task_id = result.get("task_id")
        project.video_path = task_id
        db.commit()
        
        import time
        max_wait = 120
        wait_interval = 5
        elapsed = 0
        
        while elapsed < max_wait:
            time.sleep(wait_interval)
            elapsed += wait_interval
            
            task_result = ai_generator.check_video_task(task_id)
            print(f"[VideoGenerate] Task {task_id} status: {task_result.get('status')}")
            if task_result["success"]:
                status = task_result.get("status")
                if status == "succeeded" or status == "completed":
                    video_url = task_result.get("video_url")
                    project.video_status = 2
                    project.video_url = video_url
                    project.video_path = video_url
                    db.commit()
                    return {
                        "code": 0,
                        "message": "success",
                        "data": {
                            "task_id": task_id,
                            "project_id": request.project_id,
                            "status": "completed",
                            "progress": 100,
                            "video_url": video_url,
                            "started_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        }
                    }
                elif status == "failed":
                    project.video_status = 3
                    db.commit()
                    return {
                        "code": 500,
                        "message": "视频生成失败",
                        "data": {
                            "task_id": task_id,
                            "project_id": request.project_id,
                            "status": "failed"
                        }
                    }
        
        return {
            "code": 0,
            "message": "任务已提交，等待处理",
            "data": {
                "task_id": task_id,
                "project_id": request.project_id,
                "status": "processing",
                "progress": 50,
                "started_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        }
    else:
        project.video_status = 3
        db.commit()
        return {
            "code": 500,
            "message": f"视频生成失败: {result.get('error', '未知错误')}",
            "data": {
                "task_id": f"generate_{uuid.uuid4().hex[:8]}",
                "project_id": request.project_id,
                "status": "failed",
                "progress": 0
            }
        }


@router.get("/{project_id}", response_model=dict)
def get_video_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(VideoProject).filter(VideoProject.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="视频项目不存在")
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "project_id": project.project_id,
            "title": project.title,
            "hotspot_id": project.hotspot_id,
            "script": project.script,
            "script_status": project.script_status,
            "video_path": project.video_path,
            "video_status": project.video_status,
            "duration": project.duration,
            "resolution": project.resolution,
            "video_url": project.video_url,
            "created_at": project.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": project.updated_at.strftime("%Y-%m-%d %H:%M:%S")
        }
    }


@router.get("/list", response_model=dict)
def get_video_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[int] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(VideoProject)
    
    if status is not None:
        query = query.filter(VideoProject.video_status == status)
    
    if date_from:
        query = query.filter(VideoProject.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(VideoProject.created_at <= datetime.fromisoformat(date_to))
    
    total = query.count()
    videos = query.order_by(VideoProject.created_at.desc()) \
        .offset((page - 1) * page_size) \
        .limit(page_size) \
        .all()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "list": [
                {
                    "project_id": v.project_id,
                    "title": v.title,
                    "script_status": v.script_status,
                    "video_status": v.video_status,
                    "duration": v.duration,
                    "resolution": v.resolution,
                    "video_url": v.video_url,
                    "thumbnail_url": v.thumbnail_url,
                    "created_at": v.created_at.strftime("%Y-%m-%d %H:%M:%S")
                }
                for v in videos
            ],
            "total": total,
            "page": page,
            "page_size": page_size
        }
    }


@router.get("/progress/{project_id}", response_model=dict)
def get_video_progress(project_id: str, db: Session = Depends(get_db)):
    project = db.query(VideoProject).filter(VideoProject.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="视频项目不存在")
    
    steps = []
    
    script_progress = 100 if project.script_status == 2 else (50 if project.script_status == 1 else 0)
    script_status_map = {0: "pending", 1: "running", 2: "completed", 3: "failed"}
    steps.append({
        "step": "script",
        "name": "脚本生成",
        "progress": script_progress,
        "status": script_status_map.get(project.script_status, "pending")
    })
    
    voice_progress = 100 if project.voice_url else (50 if project.script_status == 2 else 0)
    steps.append({
        "step": "voice",
        "name": "配音合成",
        "progress": voice_progress,
        "status": "completed" if project.voice_url else "pending"
    })
    
    subtitle_progress = 100 if project.subtitle_url else (50 if project.voice_url else 0)
    steps.append({
        "step": "subtitle",
        "name": "字幕生成",
        "progress": subtitle_progress,
        "status": "completed" if project.subtitle_url else "pending"
    })
    
    video_progress = 100 if project.video_status == 2 else (50 if project.video_status == 1 else 0)
    video_status_map = {0: "pending", 1: "running", 2: "completed", 3: "failed"}
    steps.append({
        "step": "merge",
        "name": "视频合成",
        "progress": video_progress,
        "status": video_status_map.get(project.video_status, "pending")
    })
    
    overall_progress = sum(s["progress"] for s in steps) // len(steps)
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "project_id": project_id,
            "overall_progress": overall_progress,
            "steps": steps
        }
    }


@router.put("/script/{project_id}", response_model=dict)
def update_script(project_id: str, request: VideoScriptUpdate, db: Session = Depends(get_db)):
    project = db.query(VideoProject).filter(VideoProject.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="视频项目不存在")
    
    project.script = request.script
    project.script_status = 2
    db.commit()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "project_id": project_id,
            "script": request.script,
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    }


@router.post("/regenerate/{project_id}", response_model=dict)
def regenerate_video(project_id: str, request: VideoRegenerateRequest, db: Session = Depends(get_db)):
    project = db.query(VideoProject).filter(VideoProject.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="视频项目不存在")
    
    if request.regenerate_script:
        project.script_status = 1
    if request.regenerate_voice:
        project.voice_url = None
    
    project.video_status = 1
    db.commit()
    
    return {
        "code": 0,
        "message": "success",
        "data": {
            "task_id": f"regenerate_{uuid.uuid4().hex[:8]}",
            "project_id": project_id,
            "status": "regenerating",
            "started_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    }


@router.delete("/{project_id}", response_model=dict)
def delete_video_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(VideoProject).filter(VideoProject.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="视频项目不存在")
    
    db.delete(project)
    db.commit()
    
    return {
        "code": 0,
        "message": "success",
        "data": None
    }


@router.post("/chat", response_model=dict)
def chat_with_ai(request: ChatCompletionRequest, db: Session = Depends(get_db)):
    from app.services.ai_service import ai_generator
    from app.models.models import Hotspot
    
    hotspot_data = None
    if request.hotspot_id:
        hotspot = db.query(Hotspot).filter(Hotspot.id == request.hotspot_id).first()
        if hotspot:
            hotspot_data = {
                "title": hotspot.title,
                "description": hotspot.description,
                "topic_tags": hotspot.topic_tags or []
            }
    
    result = ai_generator.chat_completion(request.messages, hotspot_data)
    
    if result["success"]:
        return {
            "code": 0,
            "message": "success",
            "data": {
                "content": result["content"],
                "model": result["model"]
            }
        }
    else:
        return {
            "code": 500,
            "message": result.get("error", "AI对话失败"),
            "data": None
        }


@router.post("/chat/stream")
def chat_with_ai_stream(request: ChatCompletionRequest, db: Session = Depends(get_db)):
    """流式对话接口"""
    from app.services.ai_service import ai_generator
    from app.models.models import Hotspot
    import dashscope
    
    hotspot_data = None
    if request.hotspot_id:
        hotspot = db.query(Hotspot).filter(Hotspot.id == request.hotspot_id).first()
        if hotspot:
            hotspot_data = {
                "title": hotspot.title,
                "description": hotspot.description,
                "topic_tags": hotspot.topic_tags or []
            }
    
    system_prompt = """你是一个专业的短视频脚本创作专家。
你的任务是通过与用户的多轮对话，帮助用户创作、优化短视频脚本。
脚本应当：
1. 语言生动有趣，适合短视频口播。
2. 开头3秒要有吸引力（钩子）。
3. 结构清晰：开场hook → 核心内容 → 总结互动。
4. 字数控制在150-200字左右（约60-90秒时长）。

如果用户提供了热点信息，请结合热点信息进行创作。
当你认为脚本已经基本完成时，请在回复中包含一个结构化的脚本块。"""

    if hotspot_data:
        hotspot_info = f"\n当前热点信息：\n标题：{hotspot_data.get('title')}\n描述：{hotspot_data.get('description')}"
        system_prompt += hotspot_info

    formatted_messages = [{"role": "system", "content": system_prompt}]
    for msg in request.messages:
        formatted_messages.append({"role": msg.role, "content": msg.content})

    def generate():
        try:
            response = dashscope.Generation.call(
                model=ai_generator.model,
                messages=formatted_messages,
                result_format='message',
                temperature=0.7,
                stream=True
            )
            
            full_content = ""
            for chunk in response:
                if chunk.status_code == 200:
                    content = chunk.output.choices[0].message.content
                    if content:
                        full_content += content
                        yield f"data: {json.dumps({'content': content, 'done': False})}\n\n"
                else:
                    yield f"data: {json.dumps({'error': chunk.message, 'done': True})}\n\n"
                    break
            
            yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/templates", response_model=dict)
def get_templates(
    style: Optional[str] = Query(None),
    resolution: Optional[str] = Query(None)
):
    templates = [
        {
            "template_id": "template_001",
            "name": "资讯快报",
            "style": "news",
            "resolution": "1080x1920",
            "duration_range": "60-120"
        },
        {
            "template_id": "template_002",
            "name": "娱乐快讯",
            "style": "entertainment",
            "resolution": "1080x1920",
            "duration_range": "30-60"
        },
        {
            "template_id": "template_003",
            "name": "知识科普",
            "style": "education",
            "resolution": "1920x1080",
            "duration_range": "120-180"
        }
    ]
    
    return {
        "code": 0,
        "message": "success",
        "data": {"list": templates}
    }

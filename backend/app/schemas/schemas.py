from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class HotspotBase(BaseModel):
    title: str
    description: Optional[str] = None
    author: Optional[str] = None
    likes: int = 0
    comments: int = 0
    shares: int = 0
    heat_score: int = 0
    topic_tags: Optional[List[str]] = None
    video_url: Optional[str] = None


class HotspotCreate(HotspotBase):
    pass


class HotspotResponse(HotspotBase):
    id: int
    author_avatar: Optional[str] = None
    cover_url: Optional[str] = None
    crawled_at: Optional[datetime] = None
    status: int
    processed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CrawlTaskCreate(BaseModel):
    source: str = "douyin"
    crawl_type: str = "hotspot"
    topics: Optional[List[str]] = None
    limit: int = 50


class CrawlTaskResponse(BaseModel):
    task_id: str
    crawl_type: str
    topics: Optional[List[str]] = None
    status: str
    progress: int = 0
    total_items: int = 0
    crawled_items: int = 0
    started_at: Optional[str] = None
    finished_at: Optional[str] = None

    class Config:
        from_attributes = True


class CrawlScheduleCreate(BaseModel):
    cron_expression: str
    crawl_type: str
    topics: Optional[List[str]] = None
    enabled: bool = True
    limit: int = 50


class CrawlScheduleResponse(BaseModel):
    schedule_id: str
    cron_expression: str
    crawl_type: str
    topics: Optional[List[str]] = None
    enabled: bool
    next_run_at: Optional[str] = None
    last_run_at: Optional[str] = None

    class Config:
        from_attributes = True


class VideoProjectCreate(BaseModel):
    hotspot_id: Optional[int] = None
    title: str
    script: Optional[str] = None
    duration: int = 60
    resolution: str = "1080x1920"
    style: str = "news"
    template_id: Optional[str] = None


class VideoGenerateRequest(BaseModel):
    project_id: str
    generate_script: bool = True
    generate_voice: bool = True
    generate_subtitle: bool = True
    add_background_music: bool = True
    voice_provider: str = "iflytek"
    voice_speed: float = 1.0


class VideoProjectResponse(BaseModel):
    project_id: str
    title: str
    hotspot_id: Optional[int] = None
    script: Optional[str] = None
    script_status: int
    video_path: Optional[str] = None
    video_status: int
    duration: int
    resolution: str
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VideoProgressResponse(BaseModel):
    project_id: str
    overall_progress: int
    steps: List[dict]


class VideoScriptUpdate(BaseModel):
    script: str


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    messages: List[ChatMessage]
    hotspot_id: Optional[int] = None
    project_id: Optional[str] = None


class VideoRegenerateRequest(BaseModel):
    regenerate_script: bool = False
    regenerate_voice: bool = False


class DouyinAccountCreate(BaseModel):
    login_method: str = "phone"
    phone: Optional[str] = None
    auth_code: Optional[str] = None
    redirect_uri: Optional[str] = None


class DouyinAccountResponse(BaseModel):
    account_id: str
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    status: str
    followers: int = 0

    class Config:
        from_attributes = True


class DouyinVerifyRequest(BaseModel):
    account_id: str
    verify_code: str


class PublishRequest(BaseModel):
    project_id: str
    account_id: str
    title: str
    description: Optional[str] = None
    topic_tags: Optional[List[str]] = None
    cover_image: Optional[str] = None
    location: Optional[str] = None
    visibility: str = "public"
    comment_enabled: bool = True
    download_enabled: bool = True


class PublishResponse(BaseModel):
    publish_id: str
    project_id: str
    account_id: str
    status: str
    started_at: datetime

    class Config:
        from_attributes = True


class PublishRecordResponse(BaseModel):
    publish_id: str
    project_id: str
    title: str
    account_id: str
    account_nickname: Optional[str] = None
    platform: str
    status: str
    publish_url: Optional[str] = None
    publish_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FeishuBotCreate(BaseModel):
    webhook_url: str
    name: str
    enabled: bool = True
    secret: Optional[str] = None


class FeishuBotResponse(BaseModel):
    bot_id: str
    name: str
    webhook_url: str
    enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True


class FeishuBotUpdate(BaseModel):
    webhook_url: Optional[str] = None
    name: Optional[str] = None
    enabled: Optional[bool] = None
    secret: Optional[str] = None


class FeishuTestRequest(BaseModel):
    bot_id: str
    message_type: str = "text"
    content: dict


class FeishuStrategyCreate(BaseModel):
    bot_id: str
    event_type: str
    strategy: str = "immediate"
    schedule_time: Optional[str] = None


class FeishuStrategyResponse(BaseModel):
    strategy_id: str
    bot_id: str
    event_type: str
    strategy: str
    schedule_time: Optional[str] = None

    class Config:
        from_attributes = True


class FeishuPushRecordResponse(BaseModel):
    record_id: str
    bot_id: str
    event_type: str
    message_type: str
    status: str
    sent_at: datetime

    class Config:
        from_attributes = True


class SummarizeRequest(BaseModel):
    max_length: int = 200
    style: str = "news"


class BatchProcessRequest(BaseModel):
    hotspot_ids: List[int]
    action: Optional[str] = "generate_script"


class StatisticsResponse(BaseModel):
    total_hotspots: int
    today_hotspots: int
    processed_hotspots: int
    pending_hotspots: int
    top_topics: List[dict]
    heat_trend: List[dict]


class ClusterResponse(BaseModel):
    clusters: List[dict]


class DashboardResponse(BaseModel):
    overview: dict
    recent_tasks: List[dict]
    system_status: dict


class SystemConfigResponse(BaseModel):
    crawl: dict
    video: dict
    publish: dict
    feishu: dict


class OperationLogResponse(BaseModel):
    log_id: str
    module: str
    operation: str
    user_id: Optional[str] = None
    detail: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str


class PaginatedResponse(BaseModel):
    list: List[Any]
    total: int
    page: int
    page_size: int

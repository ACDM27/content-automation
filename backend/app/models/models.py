from sqlalchemy import Column, BigInteger, Integer, String, Text, DateTime, JSON, Float, Boolean, Enum as SQLEnum
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class CrawlType(enum.Enum):
    hotspot = "hotspot"
    topic = "topic"
    video = "video"
    custom_topic = "custom_topic"


class TaskStatus(enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class ProcessStatus(enum.Enum):
    not_generated = 0
    generating = 1
    generated = 2
    failed = 3


class PublishStatus(enum.Enum):
    pending = "pending"
    publishing = "publishing"
    published = "published"
    failed = "failed"


class HotspotContent(Base):
    __tablename__ = "hotspot_content"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    author = Column(String(100))
    author_avatar = Column(String(500))
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    heat_score = Column(Integer, default=0)
    topic_tags = Column(JSON)
    video_url = Column(String(500))
    cover_url = Column(String(500))
    crawled_at = Column(DateTime, default=func.now())
    status = Column(Integer, default=0)
    processed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class CrawlTask(Base):
    __tablename__ = "crawl_task"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    task_id = Column(String(50), unique=True, index=True)
    source = Column(String(20), default="douyin")
    crawl_type = Column(String(20), default="hotspot")
    topics = Column(JSON, nullable=True)
    limit = Column(Integer, default=50)
    total_items = Column(Integer, default=0)
    crawled_items = Column(Integer, default=0)
    status = Column(String(20), default="pending")
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())


class CrawlSchedule(Base):
    __tablename__ = "crawl_schedule"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    schedule_id = Column(String(50), unique=True, index=True)
    cron_expression = Column(String(50))
    crawl_type = Column(String(20))
    topics = Column(JSON, nullable=True)
    limit = Column(Integer, default=50)
    enabled = Column(Boolean, default=True)
    next_run_at = Column(DateTime, nullable=True)
    last_run_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())


class VideoProject(Base):
    __tablename__ = "video_project"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    project_id = Column(String(50), unique=True, index=True)
    hotspot_id = Column(BigInteger, nullable=True)
    title = Column(String(200), nullable=False)
    script = Column(Text, nullable=True)
    script_status = Column(Integer, default=0)
    voice_url = Column(String(500), nullable=True)
    subtitle_url = Column(String(500), nullable=True)
    video_path = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    video_status = Column(Integer, default=0)
    duration = Column(Integer, default=60)
    resolution = Column(String(20), default="1080x1920")
    style = Column(String(20), default="news")
    voice_provider = Column(String(20), default="iflytek")
    voice_speed = Column(Float, default=1.0)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class DouyinAccount(Base):
    __tablename__ = "douyin_account"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    account_id = Column(String(50), unique=True, index=True)
    nickname = Column(String(100))
    avatar_url = Column(String(500))
    status = Column(String(20), default="pending_verify")
    followers = Column(Integer, default=0)
    douyin_id = Column(String(100), nullable=True)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())


class PublishRecord(Base):
    __tablename__ = "publish_record"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    publish_id = Column(String(50), unique=True, index=True)
    project_id = Column(String(50))
    account_id = Column(String(50))
    title = Column(String(200))
    description = Column(Text)
    topic_tags = Column(JSON)
    visibility = Column(String(20), default="public")
    comment_enabled = Column(Boolean, default=True)
    download_enabled = Column(Boolean, default=True)
    platform = Column(String(20), default="douyin")
    status = Column(String(20), default="pending")
    publish_url = Column(String(500), nullable=True)
    douyin_video_id = Column(String(50), nullable=True)
    publish_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())


class FeishuBot(Base):
    __tablename__ = "feishu_bot"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    bot_id = Column(String(50), unique=True, index=True)
    name = Column(String(100), nullable=False)
    webhook_url = Column(String(500), nullable=False)
    secret = Column(String(100), nullable=True)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())


class FeishuStrategy(Base):
    __tablename__ = "feishu_strategy"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    strategy_id = Column(String(50), unique=True, index=True)
    bot_id = Column(String(50))
    event_type = Column(String(50))
    strategy = Column(String(20), default="immediate")
    schedule_time = Column(String(10), nullable=True)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())


class FeishuPushRecord(Base):
    __tablename__ = "feishu_push_record"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    record_id = Column(String(50), unique=True, index=True)
    bot_id = Column(String(50))
    event_type = Column(String(50))
    message_type = Column(String(20))
    status = Column(String(20), default="sent")
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime, default=func.now())


class SystemConfig(Base):
    __tablename__ = "system_config"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    key = Column(String(50), unique=True, index=True)
    value = Column(Text)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class OperationLog(Base):
    __tablename__ = "operation_log"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    log_id = Column(String(50), unique=True, index=True)
    module = Column(String(20))
    operation = Column(String(50))
    user_id = Column(String(50), nullable=True)
    detail = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=func.now())

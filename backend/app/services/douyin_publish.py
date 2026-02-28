import httpx
import hashlib
import time
import os
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from app.core.config import settings


class DouyinAPIError(Exception):
    def __init__(self, code: int, message: str):
        self.code = code
        self.message = message
        super().__init__(f"Douyin API Error {code}: {message}")


class DouyinPublishService:
    def __init__(self):
        self.app_key = settings.DOUYIN_APP_KEY
        self.app_secret = settings.DOUYIN_APP_SECRET
        self.api_base_url = "https://open.douyin.com"
        
    def get_authorization_url(self, redirect_uri: str, state: str = "") -> str:
        """获取抖音OAuth授权URL"""
        if not self.app_key:
            raise ValueError("DOUYIN_APP_KEY is not configured")
        
        scope = "video.create"
        url = f"{self.api_base_url}/oauth/authorize/"
        params = {
            "client_key": self.app_key,
            "redirect_uri": redirect_uri,
            "scope": scope,
            "state": state,
            "response_type": "code"
        }
        
        query_string = "&".join([f"{k}={httpx.utils.quote(str(v))}" for k, v in params.items()])
        return f"{url}?{query_string}"
    
    def get_access_token(self, code: str) -> Dict[str, Any]:
        """通过授权码获取access_token"""
        if not self.app_key or not self.app_secret:
            raise ValueError("DOUYIN_APP_KEY or DOUYIN_APP_SECRET is not configured")
        
        url = f"{self.api_base_url}/oauth/access_token/"
        data = {
            "client_key": self.app_key,
            "client_secret": self.app_secret,
            "code": code,
            "grant_type": "authorization_code"
        }
        
        with httpx.Client() as client:
            response = client.post(url, data=data)
            result = response.json()
            
            if result.get("data", {}).get("error_code") != 0:
                error_msg = result.get("data", {}).get("description", "Unknown error")
                raise DouyinAPIError(result.get("data", {}).get("error_code", -1), error_msg)
            
            return result.get("data", {})
    
    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """刷新access_token"""
        if not self.app_key or not self.app_secret:
            raise ValueError("DOUYIN_APP_KEY or DOUYIN_APP_SECRET is not configured")
        
        url = f"{self.api_base_url}/oauth/refresh_token/"
        data = {
            "client_key": self.app_key,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token"
        }
        
        with httpx.Client() as client:
            response = client.post(url, data=data)
            result = response.json()
            
            if result.get("data", {}).get("error_code") != 0:
                error_msg = result.get("data", {}).get("description", "Unknown error")
                raise DouyinAPIError(result.get("data", {}).get("error_code", -1), error_msg)
            
            return result.get("data", {})
    
    def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """获取用户信息"""
        url = f"{self.api_base_url}/oauth/userinfo/"
        params = {"access_token": access_token}
        
        with httpx.Client() as client:
            response = client.get(url, params=params)
            result = response.json()
            
            if result.get("data", {}).get("error_code") != 0:
                error_msg = result.get("data", {}).get("description", "Unknown error")
                raise DouyinAPIError(result.get("data", {}).get("error_code", -1), error_msg)
            
            return result.get("data", {})
    
    def upload_video(self, access_token: str, video_path: str, title: str, 
                     description: str = "", cover_path: str = None,
                     topic_tags: list = None, visibility: str = "public",
                     comment_enabled: bool = True, download_enabled: bool = True) -> Dict[str, Any]:
        """
        上传视频到抖音
        抖音上传流程：1. 创建视频上传任务 2. 上传视频文件 3. 上传封面(可选) 4. 发布视频
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")
        
        file_size = os.path.getsize(video_path)
        
        if file_size > 4 * 1024 * 1024 * 1024:
            raise ValueError("Video file size exceeds 4GB limit")
        
        upload_url = self._get_upload_url(access_token)
        if not upload_url:
            raise DouyinAPIError(-1, "Failed to get upload URL")
        
        upload_result = self._upload_file(upload_url, video_path)
        if not upload_result.get("data", {}).get("upload_id"):
            raise DouyinAPIError(-1, "Failed to upload video")
        
        upload_id = upload_result["data"]["upload_id"]
        
        if cover_path and os.path.exists(cover_path):
            self._upload_cover(access_token, upload_id, cover_path)
        
        publish_result = self._create_video(
            access_token=access_token,
            upload_id=upload_id,
            title=title,
            description=description,
            topic_tags=topic_tags or [],
            visibility=visibility,
            comment_enabled=comment_enabled,
            download_enabled=download_enabled
        )
        
        return publish_result
    
    def _get_upload_url(self, access_token: str) -> Optional[str]:
        """获取视频上传URL"""
        url = f"{self.api_base_url}/video/create/"
        params = {"access_token": access_token}
        
        with httpx.Client() as client:
            response = client.get(url, params=params)
            result = response.json()
            
            if result.get("data"):
                return result["data"].get("upload_url")
            
            return None
    
    def _upload_file(self, upload_url: str, file_path: str) -> Dict[str, Any]:
        """上传视频文件到抖音服务器"""
        with open(file_path, "rb") as f:
            video_data = f.read()
        
        with httpx.Client(timeout=httpx.Timeout(300.0)) as client:
            files = {"file": (os.path.basename(file_path), video_data, "video/mp4")}
            response = client.post(upload_url, files=files)
            
            if response.status_code == 200:
                return response.json()
            
            raise DouyinAPIError(-1, f"Upload failed with status {response.status_code}")
    
    def _upload_cover(self, access_token: str, upload_id: str, cover_path: str) -> bool:
        """上传视频封面"""
        url = f"{self.api_base_url}/video/cover/upload/"
        params = {"access_token": access_token}
        
        with open(cover_path, "rb") as f:
            cover_data = f.read()
        
        files = {"cover_image": (os.path.basename(cover_path), cover_data, "image/jpeg")}
        data = {"upload_id": upload_id}
        
        with httpx.Client(timeout=httpx.Timeout(60.0)) as client:
            response = client.post(url, params=params, files=files, data=data)
            result = response.json()
            
            return result.get("data", {}).get("error_code") == 0
    
    def _create_video(self, access_token: str, upload_id: str, title: str,
                     description: str, topic_tags: list, visibility: str,
                     comment_enabled: bool, download_enabled: bool) -> Dict[str, Any]:
        """创建视频发布"""
        url = f"{self.api_base_url}/video/create/"
        
        topic_str = " ".join([f"#{tag}#" for tag in topic_tags])
        full_title = f"{title}\n{topic_str}"
        
        data = {
            "access_token": access_token,
            "upload_id": upload_id,
            "title": full_title[:100],
            "description": description[:500],
            "visibility": 0 if visibility == "public" else 1,
            "comment_switch": 1 if comment_enabled else 0,
            "download_switch": 1 if download_enabled else 0
        }
        
        with httpx.Client(timeout=httpx.Timeout(60.0)) as client:
            response = client.post(url, data=data)
            result = response.json()
            
            if result.get("data", {}).get("error_code") != 0:
                error_msg = result.get("data", {}).get("description", "Failed to create video")
                raise DouyinAPIError(result.get("data", {}).get("error_code", -1), error_msg)
            
            return result.get("data", {})
    
    def get_video_status(self, access_token: str, video_id: str) -> Dict[str, Any]:
        """查询视频发布状态"""
        url = f"{self.api_base_url}/video/status/"
        params = {
            "access_token": access_token,
            "video_id": video_id
        }
        
        with httpx.Client() as client:
            response = client.get(url, params=params)
            result = response.json()
            
            if result.get("data", {}).get("error_code") != 0:
                error_msg = result.get("data", {}).get("description", "Unknown error")
                raise DouyinAPIError(result.get("data", {}).get("error_code", -1), error_msg)
            
            return result.get("data", {})
    
    def get_video_list(self, access_token: str, page: int = 1, page_size: int = 10) -> Dict[str, Any]:
        """获取已发布视频列表"""
        url = f"{self.api_base_url}/video/list/"
        params = {
            "access_token": access_token,
            "page": page,
            "page_size": page_size
        }
        
        with httpx.Client() as client:
            response = client.get(url, params=params)
            result = response.json()
            
            if result.get("data", {}).get("error_code") != 0:
                error_msg = result.get("data", {}).get("description", "Unknown error")
                raise DouyinAPIError(result.get("data", {}).get("error_code", -1), error_msg)
            
            return result.get("data", {})


douyin_publish_service = DouyinPublishService()

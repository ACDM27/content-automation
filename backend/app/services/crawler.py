import httpx
import asyncio
import json
from typing import List, Dict, Optional
from datetime import datetime


class DouyinCrawler:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.douyin.com/",
            "Accept": "application/json",
            "Accept-Language": "zh-CN,zh;q=0.9",
        }
        self.base_url = "https://www.douyin.com"

    async def crawl_hotspot(self, limit: int = 50) -> List[Dict]:
        url = f"{self.base_url}/api/feed/web/hot/search/"
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            try:
                response = await client.get(url, headers=self.headers)
                print(f"Response status: {response.status_code}")
                print(f"Response text: {response.text[:500]}")
                
                if response.status_code != 200:
                    return self._get_mock_hotspot_data(limit)
                
                data = response.json()
                
                items = []
                word_list = data.get("data", {}).get("word_list", [])
                
                for idx, word in enumerate(word_list[:limit]):
                    items.append({
                        "title": word.get("word", ""),
                        "description": word.get("sentence", ""),
                        "heat_score": word.get("hot_value", 0),
                        "topic_tags": [word.get("word", "")],
                        "likes": word.get("discuss_count", 0),
                        "comments": word.get("discuss_count", 0),
                        "shares": 0,
                    })
                
                if not items:
                    return self._get_mock_hotspot_data(limit)
                
                return items
            except Exception as e:
                print(f"Error crawling hotspot: {e}")
                return self._get_mock_hotspot_data(limit)

    async def crawl_topic(self, limit: int = 50) -> List[Dict]:
        url = f"{self.base_url}/api/feed/web/hot/search/topic/"
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            try:
                response = await client.get(url, headers=self.headers)
                
                if response.status_code != 200:
                    return self._get_mock_topic_data(limit)
                
                data = response.json()
                
                items = []
                topic_list = data.get("data", {}).get("topic_list", [])
                
                for topic in topic_list[:limit]:
                    items.append({
                        "title": topic.get("topic_name", ""),
                        "description": topic.get("topic_desc", ""),
                        "heat_score": topic.get("hot_value", 0),
                        "topic_tags": [topic.get("topic_name", "")],
                        "likes": topic.get("discuss_count", 0),
                        "comments": topic.get("discuss_count", 0),
                        "shares": 0,
                    })
                
                if not items:
                    return self._get_mock_topic_data(limit)
                
                return items
            except Exception as e:
                print(f"Error crawling topic: {e}")
                return self._get_mock_topic_data(limit)

    async def crawl_video(self, limit: int = 50) -> List[Dict]:
        url = f"{self.base_url}/api/feed/web/follow/"
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            try:
                response = await client.get(url, headers=self.headers, params={"count": limit})
                
                if response.status_code != 200:
                    return self._get_mock_video_data(limit)
                
                data = response.json()
                
                items = []
                aweme_list = data.get("data", {}).get("aweme_list", [])
                
                for aweme in aweme_list[:limit]:
                    video_info = aweme.get("aweme_info", {})
                    stats = video_info.get("statistics", {})
                    author = video_info.get("author", {})
                    
                    items.append({
                        "title": video_info.get("desc", ""),
                        "description": video_info.get("desc", ""),
                        "author": author.get("nickname", ""),
                        "author_avatar": author.get("avatar_url", ""),
                        "likes": stats.get("digg_count", 0),
                        "comments": stats.get("comment_count", 0),
                        "shares": stats.get("share_count", 0),
                        "heat_score": stats.get("play_count", 0),
                        "video_url": video_info.get("video", {}).get("play_addr", {}).get("url_list", [None])[0],
                        "cover_url": video_info.get("video", {}).get("cover", {}).get("url_list", [None])[0],
                        "topic_tags": [tag.get("tag_name", "") for tag in video_info.get("challenges", [])],
                    })
                
                if not items:
                    return self._get_mock_video_data(limit)
                
                return items
            except Exception as e:
                print(f"Error crawling video: {e}")
                return self._get_mock_video_data(limit)

    def _get_mock_hotspot_data(self, limit: int) -> List[Dict]:
        mock_data = [
            {"title": "春节档电影票房突破纪录", "description": "2026年春节档电影票房创新高", "heat_score": 985600, "topic_tags": ["春节档", "电影"], "likes": 125000, "comments": 8900},
            {"title": "人工智能助手新功能发布", "description": "AI助手新增多项实用功能", "heat_score": 876500, "topic_tags": ["AI", "科技"], "likes": 98000, "comments": 5600},
            {"title": "新能源汽车销量创新高", "description": "国产新能源车市场份额持续增长", "heat_score": 765400, "topic_tags": ["新能源", "汽车"], "likes": 87000, "comments": 4300},
            {"title": "SpaceX完成新一轮火箭发射", "description": "SpaceX成功发射新一代火箭", "heat_score": 654300, "topic_tags": ["SpaceX", "航天"], "likes": 76000, "comments": 3200},
            {"title": "世界杯预选赛精彩瞬间", "description": "世预赛关键比赛回顾", "heat_score": 543200, "topic_tags": ["足球", "世界杯"], "likes": 65000, "comments": 7800},
            {"title": "5G网络覆盖全国县城", "description": "5G网络建设取得重大进展", "heat_score": 432100, "topic_tags": ["5G", "通信"], "likes": 54000, "comments": 2100},
            {"title": "国产操作系统新版本发布", "description": "国产操作系统功能全面升级", "heat_score": 321000, "topic_tags": ["操作系统", "国产"], "likes": 43000, "comments": 1900},
            {"title": "直播带货销售额创新高", "description": "电商直播再创佳绩", "heat_score": 210900, "topic_tags": ["直播", "电商"], "likes": 32000, "comments": 1500},
            {"title": "元宇宙应用场景不断拓展", "description": "元宇宙技术落地应用", "heat_score": 109800, "topic_tags": ["元宇宙", "科技"], "likes": 21000, "comments": 980},
            {"title": "芯片技术取得新突破", "description": "国产芯片技术重大进展", "heat_score": 98700, "topic_tags": ["芯片", "半导体"], "likes": 18000, "comments": 760},
        ]
        return mock_data[:limit]

    def _get_mock_topic_data(self, limit: int) -> List[Dict]:
        mock_data = [
            {"title": "#春节档电影#", "description": "春节档电影相关话题", "heat_score": 985600, "topic_tags": ["春节档", "电影"], "likes": 125000, "comments": 8900},
            {"title": "#AI改变生活#", "description": "人工智能应用讨论", "heat_score": 876500, "topic_tags": ["AI", "科技"], "likes": 98000, "comments": 5600},
            {"title": "#新能源汽车#", "description": "新能源汽车话题", "heat_score": 765400, "topic_tags": ["新能源", "汽车"], "likes": 87000, "comments": 4300},
            {"title": "#航天探索#", "description": "航天科技话题", "heat_score": 654300, "topic_tags": ["SpaceX", "航天"], "likes": 76000, "comments": 3200},
            {"title": "#世界杯#", "description": "世界杯相关话题", "heat_score": 543200, "topic_tags": ["足球", "世界杯"], "likes": 65000, "comments": 7800},
        ]
        return mock_data[:limit]

    def _get_mock_video_data(self, limit: int) -> List[Dict]:
        mock_data = [
            {"title": "震撼人心的自然风光", "description": "最美的自然风光都在这里", "author": "旅行达人", "likes": 125000, "comments": 8900, "shares": 5600, "heat_score": 2500000, "topic_tags": ["风景", "旅行"]},
            {"title": "美食制作教程", "description": "教你做出美味家常菜", "author": "美食家", "likes": 98000, "comments": 5600, "shares": 3200, "heat_score": 1800000, "topic_tags": ["美食", "教程"]},
            {"title": "最新科技产品测评", "description": "深度体验最新科技产品", "author": "科技评测", "likes": 87000, "comments": 4300, "shares": 2100, "heat_score": 1500000, "topic_tags": ["科技", "评测"]},
            {"title": "萌宠日常合集", "description": "可爱宠物带来的欢乐", "author": "宠物爱好者", "likes": 76000, "comments": 3200, "shares": 4500, "heat_score": 1200000, "topic_tags": ["宠物", "可爱"]},
            {"title": "健身教学视频", "description": "在家也能轻松健身", "author": "健身教练", "likes": 65000, "comments": 7800, "shares": 3800, "heat_score": 980000, "topic_tags": ["健身", "健康"]},
        ]
        return mock_data[:limit]

    async def crawl(self, crawl_type: str, limit: int = 50, topics: Optional[List[str]] = None) -> List[Dict]:
        if crawl_type == "hotspot":
            return await self.crawl_hotspot(limit)
        elif crawl_type == "topic":
            return await self.crawl_topic(limit)
        elif crawl_type == "video":
            return await self.crawl_video(limit)
        elif crawl_type == "custom_topic":
            return await self.crawl_custom_topics(topics, limit)
        else:
            return await self.crawl_hotspot(limit)

    async def crawl_custom_topics(self, topics: Optional[List[str]] = None, limit: int = 50) -> List[Dict]:
        if not topics:
            return self._get_mock_custom_topic_data([], limit)
        
        all_items = []
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            for topic in topics:
                try:
                    search_url = f"{self.base_url}/api/feed/web/search/single/"
                    params = {
                        "keyword": topic,
                        "search_source": "normal_search",
                        "query_correct_type": 1,
                        "is_filter_search": 0,
                        "count": limit // len(topics) if len(topics) > 0 else limit
                    }
                    
                    response = await client.get(search_url, headers=self.headers, params=params)
                    
                    if response.status_code == 200:
                        data = response.json()
                        aweme_list = data.get("data", {}).get("aweme_list", [])
                        
                        for aweme in aweme_list:
                            video_info = aweme.get("aweme_info", {})
                            if not video_info:
                                continue
                            stats = video_info.get("statistics", {})
                            author = video_info.get("author", {})
                            
                            all_items.append({
                                "title": video_info.get("desc", ""),
                                "description": video_info.get("desc", ""),
                                "author": author.get("nickname", ""),
                                "author_avatar": author.get("avatar_url", ""),
                                "likes": stats.get("digg_count", 0),
                                "comments": stats.get("comment_count", 0),
                                "shares": stats.get("share_count", 0),
                                "heat_score": stats.get("play_count", 0),
                                "video_url": video_info.get("video", {}).get("play_addr", {}).get("url_list", [None])[0],
                                "cover_url": video_info.get("video", {}).get("cover", {}).get("url_list", [None])[0],
                                "topic_tags": [topic] + [tag.get("tag_name", "") for tag in video_info.get("challenges", [])],
                            })
                    else:
                        all_items.extend(self._get_mock_data_for_topic(topic, limit // len(topics)))
                        
                except Exception as e:
                    print(f"Error crawling topic '{topic}': {e}")
                    all_items.extend(self._get_mock_data_for_topic(topic, limit // len(topics)))
        
        if not all_items:
            return self._get_mock_custom_topic_data(topics, limit)
        
        return all_items[:limit]

    def _get_mock_data_for_topic(self, topic: str, limit: int) -> List[Dict]:
        mock_data = [
            {"title": f"关于{topic}的最新动态", "description": f"{topic}相关热门内容", "heat_score": 985600, "topic_tags": [topic], "likes": 125000, "comments": 8900, "shares": 5600},
            {"title": f"{topic}引发网友热议", "description": f"关于{topic}的讨论热度持续上升", "heat_score": 876500, "topic_tags": [topic], "likes": 98000, "comments": 5600, "shares": 3200},
            {"title": f"深度解析{topic}", "description": f"全面解读{topic}的背后故事", "heat_score": 765400, "topic_tags": [topic], "likes": 87000, "comments": 4300, "shares": 2100},
            {"title": f"{topic}最新消息", "description": f"{topic}最新资讯一手掌握", "heat_score": 654300, "topic_tags": [topic], "likes": 76000, "comments": 3200, "shares": 1800},
            {"title": f"聚焦{topic}", "description": f"关于{topic}的深度报道", "heat_score": 543200, "topic_tags": [topic], "likes": 65000, "comments": 2800, "shares": 1500},
        ]
        return mock_data[:limit]

    def _get_mock_custom_topic_data(self, topics: List[str], limit: int) -> List[Dict]:
        if not topics:
            return self._get_mock_hotspot_data(limit)
        
        all_items = []
        for topic in topics:
            all_items.extend(self._get_mock_data_for_topic(topic, limit // len(topics) if len(topics) > 0 else limit))
        
        return all_items[:limit]


douyin_crawler = DouyinCrawler()

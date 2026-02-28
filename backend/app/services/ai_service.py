import dashscope
import requests
from dashscope import Generation
from typing import Dict, Optional
from app.core.config import settings


class AITextGenerator:
    def __init__(self):
        dashscope.api_key = settings.DASHSCOPE_API_KEY
        self.model = settings.DASHSCOPE_MODEL or "qwen-plus"
        self.ark_api_key = settings.ARK_API_KEY
        self.ark_model = settings.ARK_MODEL or "doubao-seed-2-0-pro-260215"
        self.use_ark = bool(self.ark_api_key)

    def generate_video_script(self, hotspot_data: Dict) -> Dict:
        """根据热点数据生成视频脚本"""
        prompt = f"""你是一个专业的短视频脚本创作专家。根据以下热点信息生成一个吸引人的短视频脚本。

热点信息：
- 标题：{hotspot_data.get('title', '')}
- 描述：{hotspot_data.get('description', '')}
- 话题标签：{', '.join(hotspot_data.get('topic_tags', []))}
- 热度指数：{hotspot_data.get('heat_score', 0)}
- 点赞数：{hotspot_data.get('likes', 0)}
- 评论数：{hotspot_data.get('comments', 0)}

请生成一个时长约60秒的短视频脚本，要求：
1. 语言生动有趣，适合短视频口播
2. 开头3秒要有吸引力（钩子）
3. 结构：开场hook → 核心内容 → 总结互动
4. 总字数控制在150-200字
5. 直接输出脚本内容，不要任何格式标记"""

        response = Generation.call(
            model=self.model,
            prompt=prompt,
            temperature=0.8,
            max_tokens=500
        )

        if response.status_code == 200:
            return {
                "success": True,
                "script": response.output.text,
                "model": self.model
            }
        else:
            return {
                "success": False,
                "error": f"status: {response.status_code}, message: {response.message}",
                "script": ""
            }

    def analyze_hotspot(self, hotspot_data: Dict) -> Dict:
        """分析热点内容，返回结构化分析结果"""
        prompt = f"""你是一个热点内容分析师。请分析以下热点信息，提取关键信息并给出视频创作建议。

热点信息：
- 标题：{hotspot_data.get('title', '')}
- 描述：{hotspot_data.get('description', '')}
- 话题标签：{', '.join(hotspot_data.get('topic_tags', []))}
- 热度指数：{hotspot_data.get('heat_score', 0)}
- 点赞数：{hotspot_data.get('likes', 0)}
- 评论数：{hotspot_data.get('comments', 0)}
- 分享数：{hotspot_data.get('shares', 0)}

请以JSON格式输出分析结果，包含以下字段：
{{
    "主题": "提取的核心主题",
    "受众": "目标受众群体",
    "情绪": "内容的情绪基调",
    "亮点": "3-5个吸引人的亮点",
    "创作角度": "视频创作的切入角度建议",
    "风险提示": "需要注意的潜在风险",
    "推荐风格": "推荐的视频风格"
}}"""

        response = Generation.call(
            model=self.model,
            prompt=prompt,
            temperature=0.7,
            max_tokens=800
        )

        if response.status_code == 200:
            return {
                "success": True,
                "analysis": response.output.text,
                "model": self.model
            }
        else:
            return {
                "success": False,
                "error": f"status: {response.status_code}, message: {response.message}",
                "analysis": ""
            }

    def batch_generate_scripts(self, hotspots: list) -> list:
        """批量生成视频脚本"""
        results = []
        for hotspot in hotspots:
            result = self.generate_video_script(hotspot)
            result["hotspot_id"] = hotspot.get("id")
            results.append(result)
        return results

    def chat_completion(self, messages: list, hotspot_data: Optional[Dict] = None) -> Dict:
        """多轮对话生成/优化视频脚本"""
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
        for msg in messages:
            formatted_messages.append({"role": msg.role if hasattr(msg, 'role') else msg['role'], 
                                     "content": msg.content if hasattr(msg, 'content') else msg['content']})

        response = Generation.call(
            model=self.model,
            messages=formatted_messages,
            result_format='message',
            temperature=0.7
        )

        if response.status_code == 200:
            content = response.output.choices[0].message.content
            return {
                "success": True,
                "content": content,
                "model": self.model
            }
        else:
            return {
                "success": False,
                "error": f"status: {response.status_code}, message: {response.message}",
                "content": ""
            }

    def generate_video_with_ark(self, prompt: str, image_url: str = None) -> Dict:
        """使用火山引擎ARK生成视频"""
        base_url = getattr(settings, 'ARK_VIDEO_BASE_URL', 'https://ark.cn-beijing.volces.com')
        
        create_url = f"{base_url}/api/v3/contents/generations/tasks"
        
        headers = {
            "Authorization": f"Bearer {self.ark_api_key}",
            "Content-Type": "application/json"
        }
        
        content = [
            {"type": "text", "text": prompt}
        ]
        
        if image_url:
            content.append({
                "type": "image_url",
                "image_url": {"url": image_url}
            })
        
        payload = {
            "model": self.ark_model,
            "content": content
        }
        
        try:
            response = requests.post(create_url, headers=headers, json=payload, timeout=30)
            if response.status_code == 200:
                result = response.json()
                task_id = result.get("id")
                return {
                    "success": True,
                    "task_id": task_id,
                    "status": "processing",
                    "model": self.ark_model
                }
            else:
                return {
                    "success": False,
                    "error": f"status: {response.status_code}, message: {response.text}",
                    "result": ""
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "result": ""
            }

    def check_video_task(self, task_id: str) -> Dict:
        """查询视频生成任务状态"""
        base_url = getattr(settings, 'ARK_VIDEO_BASE_URL', 'https://ark.cn-beijing.volces.com')
        
        check_url = f"{base_url}/api/v3/contents/generations/tasks/{task_id}"
        
        headers = {
            "Authorization": f"Bearer {self.ark_api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.get(check_url, headers=headers, timeout=30)
            if response.status_code == 200:
                result = response.json()
                status = result.get("status")
                video_url = None
                
                if result.get("content") and isinstance(result["content"], dict):
                    video_url = result["content"].get("video_url")
                elif result.get("output"):
                    if isinstance(result["output"], list) and len(result["output"]) > 0:
                        video_url = result["output"][0].get("url")
                    elif isinstance(result["output"], dict):
                        video_url = result["output"].get("video_url")
                
                return {
                    "success": True,
                    "status": status,
                    "video_url": video_url,
                    "result": result
                }
            else:
                return {
                    "success": False,
                    "error": f"status: {response.status_code}, message: {response.text}"
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


ai_generator = AITextGenerator()

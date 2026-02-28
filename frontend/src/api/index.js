import axios from 'axios';

const baseURL = '/api/v1';

const api = axios.create({
  baseURL,
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

export const crawlApi = {
  startCrawl: (data) => api.post('/crawl/start', data),
  getCrawlStatus: (taskId) => api.get(`/crawl/status/${taskId}`),
  getCrawlTasks: (params) => api.get('/crawl/tasks', { params }),
  getTaskContent: (taskId) => api.get(`/crawl/content/${taskId}`),
  createSchedule: (data) => api.post('/crawl/schedule', data),
  getSchedules: () => api.get('/crawl/schedules'),
  deleteSchedule: (scheduleId) => api.delete(`/crawl/schedule/${scheduleId}`),
};

export const analysisApi = {
  getHotspots: (params) => api.get('/analysis/hotspots', { params }),
  getHotspotDetail: (id) => api.get(`/analysis/hotspot/${id}`),
  getStatistics: (params) => api.get('/analysis/statistics', { params }),
  getClusters: (params) => api.get('/analysis/clusters', { params }),
  summarizeHotspot: (id, data) => api.post(`/analysis/summarize/${id}`, data),
  analyzeHotspot: (id) => api.post(`/analysis/analyze/${id}`),
  batchAiGenerate: (data) => api.post('/analysis/batch-ai-generate', data),
  batchProcess: (data) => api.post('/analysis/batch-process', data),
};

export const videoApi = {
  createProject: (data) => api.post('/video/create', data),
  generateVideo: (data) => api.post('/video/generate', data),
  getProject: (projectId) => api.get(`/video/${projectId}`),
  getProjectList: (params) => api.get('/video/list', { params }),
  getProgress: (projectId) => api.get(`/video/progress/${projectId}`),
  updateScript: (projectId, data) => api.put(`/video/script/${projectId}`, data),
  regenerate: (projectId, data) => api.post(`/video/regenerate/${projectId}`, data),
  deleteProject: (projectId) => api.delete(`/video/${projectId}`),
  getTemplates: (params) => api.get('/video/templates', { params }),
  downloadVideo: (projectId) => api.get(`/video/download/${projectId}`, { responseType: 'blob' }),
  chat: (data) => api.post('/video/chat', data),
  chatStream: (data) => {
    const token = localStorage.getItem('token');
    return fetch('/api/v1/video/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(data),
    });
  },
};

export const publishApi = {
  getAccounts: () => api.get('/publish/douyin/accounts'),
  addAccount: (data) => api.post('/publish/douyin/account', data),
  verifyAccount: (data) => api.post('/publish/douyin/verify', data),
  deleteAccount: (accountId) => api.delete(`/publish/douyin/account/${accountId}`),
  publishVideo: (data) => api.post('/publish/douyin', data),
  getPublishStatus: (publishId) => api.get(`/publish/status/${publishId}`),
  getPublishList: (params) => api.get('/publish/list', { params }),
  retryPublish: (publishId) => api.post(`/publish/retry/${publishId}`),
  cancelPublish: (publishId) => api.post(`/publish/cancel/${publishId}`),
};

export const feishuApi = {
  createBot: (data) => api.post('/feishu/config', data),
  getBots: () => api.get('/feishu/configs'),
  updateBot: (botId, data) => api.put(`/feishu/config/${botId}`, data),
  deleteBot: (botId) => api.delete(`/feishu/config/${botId}`),
  testPush: (data) => api.post('/feishu/test', data),
  createStrategy: (data) => api.post('/feishu/strategy', data),
  getHistory: (params) => api.get('/feishu/history', { params }),
};

export const systemApi = {
  getDashboard: () => api.get('/dashboard'),
  getConfig: () => api.get('/system/config'),
  updateConfig: (data) => api.put('/system/config', data),
  getLogs: (params) => api.get('/system/logs', { params }),
};

export default api;

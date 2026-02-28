import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { videoApi, analysisApi } from '../../api';

const CREATION_TEMPLATES = [
  { id: 'news', name: '资讯播报', prompt: '帮我创作一个关于{topic}的资讯类视频脚本，时长约90秒' },
  { id: 'story', name: '故事叙述', prompt: '帮我创作一个关于{topic}的叙事类视频脚本，要有情节起伏' },
  { id: 'tutorial', name: '知识教程', prompt: '帮我创作一个关于{topic}的教学视频脚本，要通俗易懂' },
  { id: 'review', name: '产品评测', prompt: '帮我创作一个关于{topic}的产品评测视频脚本' },
  { id: 'hot', name: '热点解读', prompt: '帮我分析{topic}这个热点事件，创作一个深度解读视频脚本' },
];

const SESSION_KEY = 'video_chat_sessions';

function loadSessions() {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
}

function VideoCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [hotspots, setHotspots] = useState([]);
  const [formData, setFormData] = useState({
    hotspot_id: '',
    title: '',
    script: '',
    duration: 90,
    resolution: '1080x1920',
    style: 'news',
  });

  const [sessions, setSessions] = useState(loadSessions);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: '你好！我是你的视频创作助手。你可以告诉我你想拍什么样的视频，或者选择一个热点，我来帮你写脚本。' }
  ]);
  const [userInput, setUserInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchHotspots();
    if (location.state) {
      setFormData(prev => ({
        ...prev,
        hotspot_id: location.state.hotspot_id || '',
        title: location.state.title || '',
        script: location.state.script || ''
      }));
    }
    if (sessions.length === 0) {
      createNewSession();
    }
  }, [location]);

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, streamingContent]);

  const createNewSession = () => {
    const newSession = {
      id: Date.now().toString(),
      name: `会话 ${sessions.length + 1}`,
      messages: [
        { role: 'assistant', content: '你好！我是你的视频创作助手。你可以告诉我你想拍什么样的视频，或者选择一个热点，我来帮你写脚本。' }
      ],
      createdAt: new Date().toISOString()
    };
    setSessions([...sessions, newSession]);
    setCurrentSessionId(newSession.id);
    setChatMessages(newSession.messages);
  };

  const switchSession = (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setChatMessages(session.messages);
    }
  };

  const deleteSession = (sessionId, e) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(newSessions);
    if (currentSessionId === sessionId) {
      if (newSessions.length > 0) {
        switchSession(newSessions[0].id);
      } else {
        createNewSession();
      }
    }
  };

  const renameSession = (sessionId, newName) => {
    setSessions(sessions.map(s => s.id === sessionId ? { ...s, name: newName } : s));
  };

  const updateCurrentSession = (messages) => {
    if (currentSessionId) {
      setSessions(sessions.map(s => 
        s.id === currentSessionId ? { ...s, messages } : s
      ));
    }
  };

  const fetchHotspots = async () => {
    try {
      const res = await analysisApi.getHotspots({ page: 1, page_size: 50, status: 0 });
      setHotspots(res.data.list || []);
    } catch (error) {
      console.error('Failed to fetch hotspots:', error);
    }
  };

  const handleSendMessage = async (templateTopic = null) => {
    const messageText = templateTopic || userInput;
    if (!messageText.trim()) return;
    
    const newMessages = [...chatMessages, { role: 'user', content: messageText }];
    setChatMessages(newMessages);
    setUserInput('');
    setChatLoading(true);
    setStreamingContent('');
    
    try {
      const response = await videoApi.chatStream({
        messages: newMessages,
        hotspot_id: formData.hotspot_id
      });
      
      if (!response.ok) {
        throw new Error('Chat failed');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                throw new Error(data.error);
              }
              if (data.content) {
                fullContent += data.content;
                setStreamingContent(fullContent);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
      
      const finalMessages = [...newMessages, { role: 'assistant', content: fullContent }];
      setChatMessages(finalMessages);
      updateCurrentSession(finalMessages);
    } catch (error) {
      console.error('Chat failed:', error);
      alert('AI 对话失败，请稍后再试');
    } finally {
      setChatLoading(false);
      setStreamingContent('');
    }
  };

  const applyScript = (content) => {
    setPreviewContent(content);
    setShowPreview(true);
  };

  const confirmApplyScript = () => {
    setFormData({ ...formData, script: previewContent });
    setShowPreview(false);
    setPreviewContent('');
  };

  const handleTemplateClick = (template) => {
    const selectedHotspot = hotspots.find(h => h.id === formData.hotspot_id);
    const topic = selectedHotspot?.title || '{topic}';
    const prompt = template.prompt.replace('{topic}', topic);
    handleSendMessage(prompt);
    setShowTemplates(false);
  };

  const handleSubmit = async () => {
    if (!formData.hotspot_id || !formData.title) {
      alert('请填写必填项');
      return;
    }
    setLoading(true);
    try {
      const res = await videoApi.createProject(formData);
      navigate(`/video/detail/${res.data.project_id}`);
    } catch (error) {
      alert('创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">创建视频项目</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/video')}>返回</button>
      </div>

      <div className="page-content">
        <div className="flex flex-gap-20">
          <div style={{ flex: 1 }}>
            <div className="card">
              <h3 className="card-title">基本信息</h3>
              <div className="form-group">
                <label className="form-label">关联热点 *</label>
                <select className="form-select" value={formData.hotspot_id} onChange={e => setFormData({ ...formData, hotspot_id: e.target.value })}>
                  <option value="">请选择热点</option>
                  {hotspots.map(h => (
                    <option key={h.id} value={h.id}>{h.title} (热度: {h.heat_score})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">视频标题 *</label>
                <input type="text" className="form-input" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="请输入视频标题" />
              </div>
              <div className="form-group">
                <label className="form-label">视频内容（脚本）</label>
                <textarea 
                  className="form-textarea" 
                  value={formData.script} 
                  onChange={e => setFormData({ ...formData, script: e.target.value })} 
                  rows={10} 
                  placeholder="请输入视频脚本内容"
                  style={{ 
                    color: '#000',
                    backgroundColor: '#fff',
                    border: '2px solid #3b82f6',
                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
                  }}
                ></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">视频风格</label>
                <select className="form-select" value={formData.style} onChange={e => setFormData({ ...formData, style: e.target.value })}>
                  <option value="news">资讯</option>
                  <option value="entertainment">娱乐</option>
                  <option value="education">教育</option>
                </select>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title">视频参数</h3>
              <div className="flex flex-gap-20">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">时长(秒)</label>
                  <input type="number" className="form-input" value={formData.duration} onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })} min={60} max={180} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">分辨率</label>
                  <select className="form-select" value={formData.resolution} onChange={e => setFormData({ ...formData, resolution: e.target.value })}>
                    <option value="1080x1920">竖版 1080x1920</option>
                    <option value="1920x1080">横版 1920x1080</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '600px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 className="card-title" style={{ margin: 0 }}>AI 创作助手</h3>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button 
                    className="btn btn-sm btn-secondary" 
                    onClick={() => setShowTemplates(!showTemplates)}
                    title="创作模板"
                  >
                    模板
                  </button>
                  <button 
                    className="btn btn-sm btn-secondary" 
                    onClick={createNewSession}
                    title="新建会话"
                  >
                    + 新会话
                  </button>
                </div>
              </div>

              {showTemplates && (
                <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f0f7ff', borderRadius: '4px' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>选择创作模板：</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {CREATION_TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        className="btn btn-sm"
                        style={{ backgroundColor: '#007bff', color: '#fff' }}
                        onClick={() => handleTemplateClick(t)}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sessions.length > 0 && (
                <div style={{ marginBottom: '10px', display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '5px' }}>
                  {sessions.map(s => (
                    <div 
                      key={s.id}
                      onClick={() => switchSession(s.id)}
                      style={{ 
                        padding: '5px 10px', 
                        borderRadius: '4px',
                        backgroundColor: s.id === currentSessionId ? '#007bff' : '#e0e0e0',
                        color: s.id === currentSessionId ? '#fff' : '#333',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '12px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span>{s.name}</span>
                      <span 
                        onClick={(e) => deleteSession(s.id, e)}
                        style={{ opacity: 0.7 }}
                      >
                        ×
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="chat-history" style={{ flex: 1, overflowY: 'auto', marginBottom: '15px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`message ${msg.role}`} style={{ marginBottom: '15px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                    <div style={{ 
                      display: 'inline-block', 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      maxWidth: '80%',
                      backgroundColor: msg.role === 'user' ? '#007bff' : '#fff',
                      color: msg.role === 'user' ? '#fff' : '#333',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {msg.content}
                      {msg.role === 'assistant' && index > 0 && (
                        <div style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '5px', display: 'flex', gap: '5px' }}>
                          <button className="btn btn-sm btn-secondary" onClick={() => applyScript(msg.content)}>预览脚本</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {streamingContent && (
                  <div style={{ color: '#999' }}>
                    {streamingContent}
                    <span style={{ animation: 'blink 1s infinite' }}>|</span>
                  </div>
                )}
                {chatLoading && !streamingContent && <div style={{ color: '#999' }}>AI 正在思考中...</div>}
                <div ref={chatEndRef} />
              </div>
              <div className="chat-input" style={{ display: 'flex', gap: '10px' }}>
                <textarea 
                  className="form-input" 
                  value={userInput} 
                  onChange={e => setUserInput(e.target.value)} 
                  onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  placeholder="描述你想要的视频，或要求修改脚本..."
                  rows={2}
                  style={{ flex: 1, resize: 'none' }}
                />
                <button className="btn btn-primary" onClick={() => handleSendMessage()} disabled={chatLoading}>发送</button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-gap-10" style={{ marginTop: '20px' }}>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? '创建中...' : '创建项目'}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/video')}>取消</button>
        </div>
      </div>

      {showPreview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowPreview(false)}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>脚本预览</h3>
            <div style={{ 
              whiteSpace: 'pre-wrap', 
              padding: '15px', 
              backgroundColor: '#fff', 
              borderRadius: '4px',
              border: '2px solid #3b82f6',
              boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
              maxHeight: '400px',
              overflow: 'auto',
              marginBottom: '15px',
              color: '#000'
            }}>
              {previewContent}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>取消</button>
              <button className="btn btn-primary" onClick={confirmApplyScript}>使用此脚本</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default VideoCreate;

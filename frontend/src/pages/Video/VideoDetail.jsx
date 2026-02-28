import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { videoApi, publishApi } from '../../api';

function VideoDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [progress, setProgress] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [scriptEditing, setScriptEditing] = useState(false);
  const [script, setScript] = useState('');
  const [publishModal, setPublishModal] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishForm, setPublishForm] = useState({ title: '', description: '', topic_tags: [], visibility: 'public', comment_enabled: true, download_enabled: true });

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  useEffect(() => {
    if (project?.video_status === 1) {
      const timer = setInterval(fetchProgress, 2000);
      return () => clearInterval(timer);
    }
  }, [project?.video_status]);

  const fetchProject = async () => {
    setLoading(true);
    try {
      const res = await videoApi.getProject(projectId);
      setProject(res.data);
      setScript(res.data.script || '');
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const res = await videoApi.getProgress(projectId);
      setProgress(res.data);
      if (res.data.overall_progress === 100) {
        fetchProject();
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await videoApi.generateVideo({ project_id: projectId });
      console.log('Generate response:', res);
      if (res.code === 0) {
        alert('视频生成成功！');
      } else {
        alert('生成失败: ' + res.message);
      }
      fetchProject();
    } catch (error) {
      console.error('Generate error:', error);
      alert('生成失败: ' + (error.message || error.detail || JSON.stringify(error)));
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateScript = async () => {
    try {
      await videoApi.updateScript(projectId, { script });
      setScriptEditing(false);
      fetchProject();
    } catch (error) {
      alert('更新失败');
    }
  };

  const handleRegenerate = async () => {
    try {
      await videoApi.regenerate(projectId, { regenerate_script: true });
      fetchProject();
    } catch (error) {
      alert('重试失败');
    }
  };

  const handleDownload = async () => {
    try {
      const res = await videoApi.downloadVideo(projectId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${project.title}.mp4`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('下载失败');
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await publishApi.getAccounts();
      setAccounts(res.data.list || []);
      if (res.data.list && res.data.list.length > 0) {
        setSelectedAccount(res.data.list[0].account_id);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  };

  const openPublishModal = async () => {
    await fetchAccounts();
    setPublishForm({
      title: project.title || '',
      description: project.script ? project.script.substring(0, 200) : '',
      topic_tags: [],
      visibility: 'public',
      comment_enabled: true,
      download_enabled: true
    });
    setPublishModal(true);
  };

  const handlePublish = async () => {
    if (!selectedAccount) {
      alert('请先添加抖音账号');
      return;
    }
    setPublishing(true);
    try {
      const res = await publishApi.publishVideo({
        project_id: projectId,
        account_id: selectedAccount,
        ...publishForm
      });
      if (res.code === 0) {
        alert('发布成功！');
        setPublishModal(false);
      } else {
        alert('发布失败: ' + res.message);
      }
    } catch (error) {
      alert('发布失败: ' + (error.message || error.detail || JSON.stringify(error)));
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (!project) {
    return <div className="empty">未找到视频项目</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">视频详情</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/video')}>返回</button>
      </div>

      <div className="page-content">
        <div className="card">
          <h3 className="card-title">{project.title}</h3>
          <div className="flex flex-gap-20 mb-20">
            <div><strong>项目ID：</strong>{project.project_id}</div>
            <div><strong>时长：</strong>{project.duration}秒</div>
            <div><strong>分辨率：</strong>{project.resolution}</div>
            <div><strong>创建时间：</strong>{project.created_at}</div>
          </div>
        </div>

        {progress && progress.overall_progress < 100 && (
          <div className="card">
            <h3 className="card-title">生成进度</h3>
            <div className="progress-bar mb-10">
              <div className="progress-bar-inner" style={{ width: `${progress.overall_progress}%` }}></div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>{progress.overall_progress}%</div>
            <div className="flex flex-gap-10">
              {progress.steps?.map((step, index) => (
                <div key={index} style={{ flex: 1, padding: '10px', background: '#f8f9fa', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>{step.name}</div>
                  <div className={`badge ${step.status === 'completed' ? 'badge-success' : step.status === 'running' ? 'badge-info' : 'badge-warning'}`}>
                    {step.status === 'completed' ? '完成' : step.status === 'running' ? `${step.progress}%` : '待开始'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <div className="flex flex-between">
            <h3 className="card-title">视频脚本</h3>
            {!scriptEditing && project.script_status !== 1 && (
              <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => setScriptEditing(true)}>编辑</button>
            )}
          </div>
          {scriptEditing ? (
            <div>
              <textarea className="form-textarea" value={script} onChange={e => setScript(e.target.value)} rows={6}></textarea>
              <div className="flex flex-gap-10 mt-10">
                <button className="btn btn-primary" onClick={handleUpdateScript}>保存</button>
                <button className="btn btn-secondary" onClick={() => setScriptEditing(false)}>取消</button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '6px', minHeight: '100px' }}>
              {project.script || '暂无脚本'}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">视频预览</h3>
          {project.video_status === 2 && project.video_url ? (
            <div>
              <div style={{ marginBottom: '15px' }}>
                <video 
                  controls 
                  style={{ width: '100%', maxWidth: '400px', borderRadius: '8px', backgroundColor: '#000' }}
                  src={project.video_url}
                >
                  您的浏览器不支持视频播放
                </video>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <strong>视频地址：</strong>
                <a href={project.video_url} target="_blank" rel="noopener noreferrer" style={{ color: '#00d9ff', wordBreak: 'break-all' }}>
                  {project.video_url}
                </a>
              </div>
              <div className="flex flex-gap-10">
                <button className="btn btn-primary" onClick={handleDownload}>下载视频</button>
                <button className="btn btn-success" onClick={openPublishModal}>发布到抖音</button>
                <button className="btn btn-secondary" onClick={handleRegenerate}>重新生成</button>
              </div>
            </div>
          ) : project.video_status === 2 && project.video_path ? (
            <div>
              <div style={{ marginBottom: '15px' }}>
                <video 
                  controls 
                  style={{ width: '100%', maxWidth: '400px', borderRadius: '8px', backgroundColor: '#000' }}
                  src={project.video_path}
                >
                  您的浏览器不支持视频播放
                </video>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <strong>视频路径：</strong><span style={{ wordBreak: 'break-all' }}>{project.video_path}</span>
              </div>
              <div className="flex flex-gap-10">
                <button className="btn btn-primary" onClick={handleDownload}>下载视频</button>
                <button className="btn btn-success" onClick={openPublishModal}>发布到抖音</button>
                <button className="btn btn-secondary" onClick={handleRegenerate}>重新生成</button>
              </div>
            </div>
          ) : project.video_status === 3 ? (
            <div>
              <div style={{ color: '#ff4757', marginBottom: '10px' }}>视频生成失败</div>
              <button className="btn btn-primary" onClick={handleRegenerate}>重新生成</button>
            </div>
          ) : project.video_status === 1 ? (
            <div style={{ color: '#00d9ff' }}>视频生成中...</div>
          ) : (
            <div>
              <div style={{ marginBottom: '15px' }}>视频尚未生成</div>
              <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
                {generating ? '生成中...' : '开始生成'}
              </button>
            </div>
          )}
        </div>
      </div>

      {publishModal && (
        <div className="modal-overlay" onClick={() => setPublishModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">发布到抖音</h3>
              <button className="modal-close" onClick={() => setPublishModal(false)}>&times;</button>
            </div>
            <div className="form-group">
              <label className="form-label">选择抖音账号</label>
              {accounts.length === 0 ? (
                <div style={{ padding: '10px', background: '#fff3cd', borderRadius: '4px', color: '#856404' }}>
                  暂无抖音账号，请先在"账号管理"中添加
                </div>
              ) : (
                <select className="form-select" value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
                  {accounts.map(acc => (
                    <option key={acc.account_id} value={acc.account_id}>
                      {acc.nickname || acc.account_id} {acc.status === 'active' ? '(已认证)' : '(未认证)'}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">视频标题</label>
              <input type="text" className="form-input" value={publishForm.title} onChange={e => setPublishForm({ ...publishForm, title: e.target.value })} maxLength={100} />
            </div>
            <div className="form-group">
              <label className="form-label">视频描述</label>
              <textarea className="form-textarea" value={publishForm.description} onChange={e => setPublishForm({ ...publishForm, description: e.target.value })} rows={3} maxLength={500} />
            </div>
            <div className="form-group">
              <label className="form-label">可见性</label>
              <select className="form-select" value={publishForm.visibility} onChange={e => setPublishForm({ ...publishForm, visibility: e.target.value })}>
                <option value="public">公开</option>
                <option value="private">私密</option>
                <option value="friends">好友可见</option>
              </select>
            </div>
            <div className="form-group">
              <label className="flex flex-gap-10">
                <input type="checkbox" checked={publishForm.comment_enabled} onChange={e => setPublishForm({ ...publishForm, comment_enabled: e.target.checked })} />
                允许评论
              </label>
            </div>
            <div className="form-group">
              <label className="flex flex-gap-10">
                <input type="checkbox" checked={publishForm.download_enabled} onChange={e => setPublishForm({ ...publishForm, download_enabled: e.target.checked })} />
                允许下载
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPublishModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handlePublish} disabled={publishing || accounts.length === 0}>
                {publishing ? '发布中...' : '确认发布'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoDetail;

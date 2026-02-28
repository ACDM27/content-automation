import { useState, useEffect } from 'react';
import { publishApi, videoApi } from '../../api';

function PublishList() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0 });
  const [publishModal, setPublishModal] = useState(false);
  const [formData, setFormData] = useState({ project_id: '', account_id: '', title: '', description: '', topic_tags: [], visibility: 'public', comment_enabled: true });
  const [accounts, setAccounts] = useState([]);
  const [videos, setVideos] = useState([]);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, [pagination.page]);

  useEffect(() => {
    if (publishModal) {
      fetchAccounts();
      fetchVideos();
    }
  }, [publishModal]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await publishApi.getPublishList({ page: pagination.page, page_size: pagination.page_size });
      setRecords(res.data.list || []);
      setPagination(prev => ({ ...prev, total: res.data.total || 0 }));
    } catch (error) {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await publishApi.getAccounts();
      setAccounts(res.data.list || []);
    } catch (error) {
      setAccounts([]);
    }
  };

  const fetchVideos = async () => {
    try {
      const res = await videoApi.getProjectList({ page: 1, page_size: 100, status: 2 });
      setVideos(res.data.list || []);
    } catch (error) {
      setVideos([]);
    }
  };

  const handlePublish = async () => {
    if (!formData.project_id || !formData.account_id || !formData.title) {
      alert('请填写必填项');
      return;
    }
    setPublishing(true);
    try {
      await publishApi.publishVideo(formData);
      setPublishModal(false);
      fetchRecords();
    } catch (error) {
      alert('发布失败');
    } finally {
      setPublishing(false);
    }
  };

  const handleRetry = async (publishId) => {
    try {
      await publishApi.retryPublish(publishId);
      fetchRecords();
    } catch (error) {
      alert('重试失败');
    }
  };

  const getStatusBadge = (status) => {
    const map = { 
      pending: { label: '待发布', class: 'badge-warning' }, 
      publishing: { label: '发布中', class: 'badge-info' }, 
      published: { label: '发布成功', class: 'badge-success' }, 
      failed: { label: '发布失败', class: 'badge-error' } 
    };
    const item = map[status] || { label: status, class: 'badge-info' };
    return <span className={`badge ${item.class}`}>{item.label}</span>;
  };

  const totalPages = Math.ceil(pagination.total / pagination.page_size) || 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">发布管理</h1>
          <p className="page-subtitle">管理视频发布到抖音平台</p>
        </div>
        <button className="btn btn-primary" onClick={() => setPublishModal(true)}>+ 发布视频</button>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
          </div>
        ) : records.length === 0 ? (
          <div className="empty">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📤</div>
            <div>暂无发布记录</div>
            <button className="btn btn-primary mt-20" onClick={() => setPublishModal(true)}>发布第一个视频</button>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>发布ID</th>
                    <th>视频标题</th>
                    <th>发布账号</th>
                    <th>平台</th>
                    <th>状态</th>
                    <th>发布时间</th>
                    <th>发布链接</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.publish_id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{record.publish_id}</td>
                      <td style={{ maxWidth: '150px' }} className="truncate">{record.title}</td>
                      <td>{record.account_nickname}</td>
                      <td>抖音</td>
                      <td>{getStatusBadge(record.status)}</td>
                      <td>{record.publish_at || '-'}</td>
                      <td>
                        {record.publish_url ? (
                          <a href={record.publish_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>查看</a>
                        ) : '-'}
                      </td>
                      <td>
                        {record.status === 'failed' && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleRetry(record.publish_id)}>重试</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <button disabled={pagination.page === 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>上一页</button>
              <span>{pagination.page} / {totalPages}</span>
              <button disabled={pagination.page >= totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>下一页</button>
            </div>
          </>
        )}
      </div>

      {publishModal && (
        <div className="modal-overlay" onClick={() => setPublishModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ minWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">发布视频到抖音</h3>
              <button className="modal-close" onClick={() => setPublishModal(false)}>&times;</button>
            </div>
            <div className="form-group">
              <label className="form-label">选择视频 *</label>
              <select className="form-select" value={formData.project_id} onChange={e => setFormData({ ...formData, project_id: e.target.value })}>
                <option value="">请选择视频</option>
                {videos.map(v => (
                  <option key={v.project_id} value={v.project_id}>{v.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">选择账号 *</label>
              <select className="form-select" value={formData.account_id} onChange={e => setFormData({ ...formData, account_id: e.target.value })}>
                <option value="">请选择账号</option>
                {accounts.map(a => (
                  <option key={a.account_id} value={a.account_id}>{a.nickname}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">视频标题 *</label>
              <input type="text" className="form-input" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="请输入视频标题" />
            </div>
            <div className="form-group">
              <label className="form-label">视频描述</label>
              <textarea className="form-textarea" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="请输入视频描述"></textarea>
            </div>
            <div className="form-group">
              <label className="form-label">话题标签（逗号分隔）</label>
              <input type="text" className="form-input" placeholder="春节,旅游,攻略" onChange={e => setFormData({ ...formData, topic_tags: e.target.value.split(',').filter(t => t.trim()) })} />
            </div>
            <div className="form-group">
              <label className="form-label">可见性</label>
              <select className="form-select" value={formData.visibility} onChange={e => setFormData({ ...formData, visibility: e.target.value })}>
                <option value="public">公开</option>
                <option value="private">私密</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-checkbox">
                <input type="checkbox" checked={formData.comment_enabled} onChange={e => setFormData({ ...formData, comment_enabled: e.target.checked })} />
                开启评论
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPublishModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handlePublish} disabled={publishing}>
                {publishing ? '发布中...' : '发布'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PublishList;

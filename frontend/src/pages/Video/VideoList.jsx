import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { videoApi } from '../../api';

function VideoList() {
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0 });
  const [filters, setFilters] = useState({ status: '' });

  useEffect(() => {
    fetchVideos();
  }, [pagination.page, filters]);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, page_size: pagination.page_size, ...filters };
      if (!params.status) delete params.status;
      const res = await videoApi.getProjectList(params);
      setVideos(res.data.list || []);
      setPagination(prev => ({ ...prev, total: res.data.total || 0 }));
    } catch (error) {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId) => {
    if (!confirm('确定要删除这个视频项目吗？')) return;
    try {
      await videoApi.deleteProject(projectId);
      fetchVideos();
    } catch (error) {
      alert('删除失败');
    }
  };

  const getStatusBadge = (status) => {
    const map = { 
      0: { label: '未生成', class: 'badge-warning' }, 
      1: { label: '生成中', class: 'badge-info' }, 
      2: { label: '生成成功', class: 'badge-success' }, 
      3: { label: '生成失败', class: 'badge-error' } 
    };
    const item = map[status] || { label: status, class: 'badge-info' };
    return <span className={`badge ${item.class}`}>{item.label}</span>;
  };

  const totalPages = Math.ceil(pagination.total / pagination.page_size) || 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">视频管理</h1>
          <p className="page-subtitle">管理AI生成的视频项目</p>
        </div>
        <Link to="/video/create" className="btn btn-primary">+ 创建视频项目</Link>
      </div>

      <div className="page-content">
        <div className="mb-20">
          <select className="form-select" style={{ width: 'auto', minWidth: '140px' }} value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">全部状态</option>
            <option value="0">未生成</option>
            <option value="1">生成中</option>
            <option value="2">生成成功</option>
            <option value="3">生成失败</option>
          </select>
        </div>

        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
          </div>
        ) : videos.length === 0 ? (
          <div className="empty">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎬</div>
            <div>暂无视频项目</div>
            <Link to="/video/create" className="btn btn-primary mt-20">创建第一个视频</Link>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>项目ID</th>
                    <th>标题</th>
                    <th>脚本状态</th>
                    <th>视频状态</th>
                    <th>时长(秒)</th>
                    <th>分辨率</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((video) => (
                    <tr key={video.project_id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{video.project_id}</td>
                      <td style={{ maxWidth: '180px' }} className="truncate">{video.title}</td>
                      <td>{getStatusBadge(video.script_status)}</td>
                      <td>{getStatusBadge(video.video_status)}</td>
                      <td>{video.duration || '-'}</td>
                      <td>{video.resolution || '-'}</td>
                      <td>{video.created_at?.split(' ')[0] || '-'}</td>
                      <td>
                        <div className="flex flex-gap-10">
                          <Link to={`/video/detail/${video.project_id}`} className="btn btn-secondary btn-sm">详情</Link>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(video.project_id)}>删除</button>
                        </div>
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
    </div>
  );
}

export default VideoList;

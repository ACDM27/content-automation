import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analysisApi } from '../../api';

function AnalysisList() {
  const [loading, setLoading] = useState(true);
  const [hotspots, setHotspots] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0 });
  const [filters, setFilters] = useState({ sort_by: 'heat_score', sort_order: 'desc', status: '' });

  useEffect(() => {
    fetchHotspots();
  }, [pagination.page, filters]);

  const fetchHotspots = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, page_size: pagination.page_size, ...filters };
      if (!params.status) delete params.status;
      const res = await analysisApi.getHotspots(params);
      setHotspots(res.data.list || []);
      setPagination(prev => ({ ...prev, total: res.data.total || 0 }));
    } catch (error) {
      setHotspots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchProcess = async () => {
    const selected = hotspots.filter(h => h.status === 0).map(h => h.id);
    if (selected.length === 0) {
      alert('没有可处理的热点');
      return;
    }
    try {
      await analysisApi.batchProcess({ hotspot_ids: selected, action: 'generate_script' });
      fetchHotspots();
    } catch (error) {
      alert('处理失败');
    }
  };

  const getStatusBadge = (status) => {
    return status === 1 ? 
      <span className="badge badge-success">已处理</span> : 
      <span className="badge badge-warning">未处理</span>;
  };

  const totalPages = Math.ceil(pagination.total / pagination.page_size) || 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">热点分析</h1>
          <p className="page-subtitle">分析抖音热点内容，生成视频素材</p>
        </div>
        <div className="flex flex-gap-10">
          <select className="form-select" style={{ width: '140px' }} value={filters.sort_by} onChange={e => setFilters({ ...filters, sort_by: e.target.value })}>
            <option value="heat_score">热度评分</option>
            <option value="likes">点赞数</option>
            <option value="comments">评论数</option>
            <option value="shares">分享数</option>
          </select>
          <select className="form-select" style={{ width: '120px' }} value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">全部</option>
            <option value="0">未处理</option>
            <option value="1">已处理</option>
          </select>
          <button className="btn btn-primary" onClick={handleBatchProcess}>
            批量生成脚本
          </button>
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
          </div>
        ) : hotspots.length === 0 ? (
          <div className="empty">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📈</div>
            <div>暂无热点数据</div>
            <p className="text-muted mt-10">请先在爬虫管理中获取热点数据</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>标题</th>
                    <th>作者</th>
                    <th>热度评分</th>
                    <th>点赞</th>
                    <th>评论</th>
                    <th>分享</th>
                    <th>话题标签</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {hotspots.map((hotspot) => (
                    <tr key={hotspot.id}>
                      <td>{hotspot.id}</td>
                      <td style={{ maxWidth: '200px' }} className="truncate">{hotspot.title}</td>
                      <td>{hotspot.author}</td>
                      <td><strong>{hotspot.heat_score?.toLocaleString()}</strong></td>
                      <td>{hotspot.likes?.toLocaleString()}</td>
                      <td>{hotspot.comments?.toLocaleString()}</td>
                      <td>{hotspot.shares?.toLocaleString()}</td>
                      <td style={{ maxWidth: '120px' }} className="truncate">{hotspot.topic_tags?.join(', ')}</td>
                      <td>{getStatusBadge(hotspot.status)}</td>
                      <td>
                        <Link to={`/analysis/detail/${hotspot.id}`} className="btn btn-secondary btn-sm">
                          详情
                        </Link>
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

export default AnalysisList;

import { useState, useEffect } from 'react';
import { crawlApi } from '../../api';

function CrawlList() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0 });
  const [startModal, setStartModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [taskContent, setTaskContent] = useState(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [formData, setFormData] = useState({ source: 'douyin', crawl_type: 'hotspot', topics: [], limit: 50 });
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [pagination.page]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await crawlApi.getCrawlTasks({ page: pagination.page, page_size: pagination.page_size });
      setTasks(res.data.list || []);
      setPagination(prev => ({ ...prev, total: res.data.total || 0 }));
    } catch (error) {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCrawl = async () => {
    if (formData.crawl_type === 'custom_topic' && (!formData.topics || formData.topics.length === 0)) {
      alert('请至少输入一个话题');
      return;
    }
    setStarting(true);
    try {
      await crawlApi.startCrawl(formData);
      setStartModal(false);
      setFormData({ source: 'douyin', crawl_type: 'hotspot', topics: [], limit: 50 });
      fetchTasks();
    } catch (error) {
      alert('启动爬取失败');
    } finally {
      setStarting(false);
    }
  };

  const [topicInput, setTopicInput] = useState('');

  const handleAddTopic = () => {
    const topic = topicInput.trim();
    if (topic && !formData.topics.includes(topic)) {
      setFormData({ ...formData, topics: [...formData.topics, topic] });
      setTopicInput('');
    }
  };

  const handleRemoveTopic = (topic) => {
    setFormData({ ...formData, topics: formData.topics.filter(t => t !== topic) });
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: '等待中', class: 'badge-warning' },
      running: { label: '执行中', class: 'badge-info' },
      completed: { label: '已完成', class: 'badge-success' },
      failed: { label: '失败', class: 'badge-error' },
    };
    const item = map[status] || { label: status, class: 'badge-info' };
    return <span className={`badge ${item.class}`}>{item.label}</span>;
  };

  const getCrawlTypeName = (type, topics) => {
    const map = { hotspot: '热点榜', topic: '话题榜', video: '热门视频', custom_topic: '自定义话题' };
    if (type === 'custom_topic' && topics && topics.length > 0) {
      return `自定义话题: ${topics.join(', ')}`;
    }
    return map[type] || type;
  };

  const handleViewDetail = async (taskId) => {
    setContentLoading(true);
    setDetailModal(true);
    setTaskContent(null);
    try {
      const res = await crawlApi.getTaskContent(taskId);
      setTaskContent(res.data);
    } catch (error) {
      console.error('获取详情失败', error);
    } finally {
      setContentLoading(false);
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.page_size) || 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">爬虫管理</h1>
          <p className="page-subtitle">管理抖音热点数据爬取任务</p>
        </div>
        <button className="btn btn-primary" onClick={() => setStartModal(true)}>
          + 手动触发爬取
        </button>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🕷️</div>
            <div>暂无爬取任务</div>
            <button className="btn btn-primary mt-20" onClick={() => setStartModal(true)}>开始第一个爬取</button>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                  <thead>
                  <tr>
                    <th>任务ID</th>
                    <th>数据源</th>
                    <th>爬取类型</th>
                    <th>数据条数</th>
                    <th>状态</th>
                    <th>开始时间</th>
                    <th>完成时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.task_id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{task.task_id}</td>
                      <td>{task.source}</td>
                      <td>{getCrawlTypeName(task.crawl_type, task.topics)}</td>
                      <td>{task.total_items}</td>
                      <td>{getStatusBadge(task.status)}</td>
                      <td>{task.started_at || '-'}</td>
                      <td>{task.finished_at || '-'}</td>
                      <td>
                        <button 
                          className="btn-link" 
                          onClick={() => handleViewDetail(task.task_id)}
                          disabled={task.status !== 'completed'}
                        >
                          查看内容
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <button disabled={pagination.page === 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>
                上一页
              </button>
              <span>{pagination.page} / {totalPages}</span>
              <button disabled={pagination.page >= totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>
                下一页
              </button>
            </div>
          </>
        )}
      </div>

      {startModal && (
        <div className="modal-overlay" onClick={() => setStartModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">手动触发爬取</h3>
              <button className="modal-close" onClick={() => setStartModal(false)}>&times;</button>
            </div>
            <div className="form-group">
              <label className="form-label">数据源</label>
              <select className="form-select" value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })}>
                <option value="douyin">抖音</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">爬取类型</label>
              <select className="form-select" value={formData.crawl_type} onChange={e => setFormData({ ...formData, crawl_type: e.target.value, topics: e.target.value !== 'custom_topic' ? [] : formData.topics })}>
                <option value="hotspot">热点榜</option>
                <option value="topic">话题榜</option>
                <option value="video">热门视频</option>
                <option value="custom_topic">自定义话题</option>
              </select>
            </div>
            {formData.crawl_type === 'custom_topic' && (
              <div className="form-group">
                <label className="form-label">设置爬取话题</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={topicInput} 
                    onChange={e => setTopicInput(e.target.value)}
                    placeholder="输入话题关键词，回车添加"
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddTopic())}
                  />
                  <button type="button" className="btn btn-secondary" onClick={handleAddTopic}>添加</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {formData.topics.map(topic => (
                    <span key={topic} className="badge badge-info" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {topic}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveTopic(topic)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: 'inherit' }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>添加话题后，系统将按话题搜索相关视频内容</p>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">爬取数量限制</label>
              <input type="number" className="form-input" value={formData.limit} onChange={e => setFormData({ ...formData, limit: parseInt(e.target.value) })} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setStartModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleStartCrawl} disabled={starting}>
                {starting ? '启动中...' : '启动爬取'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailModal && (
        <div className="modal-overlay" onClick={() => setDetailModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">爬取内容详情</h3>
              <button className="modal-close" onClick={() => setDetailModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {contentLoading ? (
                <div className="loading">
                  <div className="loading-spinner"></div>
                </div>
              ) : taskContent ? (
                <>
                  <div className="detail-info">
                    <p><strong>任务ID：</strong>{taskContent.task_id}</p>
                    <p><strong>爬取类型：</strong>{getCrawlTypeName(taskContent.crawl_type, taskContent.topics)}</p>
                    <p><strong>数据条数：</strong>{taskContent.list?.length || 0}</p>
                    <p><strong>爬取时间：</strong>{taskContent.started_at} ~ {taskContent.finished_at}</p>
                  </div>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>标题</th>
                          <th>热度</th>
                          <th>点赞</th>
                          <th>评论</th>
                          <th>话题标签</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taskContent.list?.map((item) => (
                          <tr key={item.id}>
                            <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.title}
                            </td>
                            <td>{item.heat_score?.toLocaleString()}</td>
                            <td>{item.likes?.toLocaleString()}</td>
                            <td>{item.comments?.toLocaleString()}</td>
                            <td>{(item.topic_tags || []).join(', ') || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="empty">暂无数据</div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetailModal(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CrawlList;

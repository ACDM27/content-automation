import { useState, useEffect } from 'react';
import { crawlApi } from '../../api';

function CrawlSchedule() {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({ cron_expression: '0 */6 * * *', crawl_type: 'hotspot', topics: [], enabled: true, limit: 50 });
  const [submitting, setSubmitting] = useState(false);
  const [topicInput, setTopicInput] = useState('');

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await crawlApi.getSchedules();
      setSchedules(res.data.list || []);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (formData.crawl_type === 'custom_topic' && (!formData.topics || formData.topics.length === 0)) {
      alert('请至少输入一个话题');
      return;
    }
    setSubmitting(true);
    try {
      await crawlApi.createSchedule(formData);
      setModalVisible(false);
      setFormData({ cron_expression: '0 */6 * * *', crawl_type: 'hotspot', topics: [], enabled: true, limit: 50 });
      fetchSchedules();
    } catch (error) {
      alert('创建失败');
    } finally {
      setSubmitting(false);
    }
  };

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

  const handleDelete = async (scheduleId) => {
    if (!confirm('确定要删除这个定时任务吗？')) return;
    try {
      await crawlApi.deleteSchedule(scheduleId);
      fetchSchedules();
    } catch (error) {
      alert('删除失败');
    }
  };

  const getCronDesc = (expr) => {
    const map = {
      '0 */6 * * *': '每6小时执行一次',
      '0 */12 * * *': '每12小时执行一次',
      '0 0 * * *': '每天0点执行',
      '0 6 * * *': '每天6点执行',
      '0 8 * * *': '每天8点执行',
    };
    return map[expr] || expr;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">定时任务</h1>
        <button className="btn btn-primary" onClick={() => setModalVisible(true)}>
          添加定时任务
        </button>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : schedules.length === 0 ? (
          <div className="empty">暂无定时任务</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>任务ID</th>
                <th>Cron表达式</th>
                <th>爬取类型</th>
                <th>数据限制</th>
                <th>状态</th>
                <th>下次执行</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr key={schedule.schedule_id}>
                  <td>{schedule.schedule_id}</td>
                  <td>
                    <div>{schedule.cron_expression}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{getCronDesc(schedule.cron_expression)}</div>
                  </td>
                  <td>
                    {schedule.crawl_type === 'hotspot' ? '热点榜' : 
                     schedule.crawl_type === 'topic' ? '话题榜' : 
                     schedule.crawl_type === 'video' ? '热门视频' : 
                     schedule.crawl_type === 'custom_topic' ? `自定义话题: ${(schedule.topics || []).join(', ')}` : 
                     schedule.crawl_type}
                  </td>
                  <td>{schedule.limit}</td>
                  <td>
                    <span className={`badge ${schedule.enabled ? 'badge-success' : 'badge-warning'}`}>
                      {schedule.enabled ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td>{schedule.next_run_at || '-'}</td>
                  <td>
                    <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleDelete(schedule.schedule_id)}>
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalVisible && (
        <div className="modal-overlay" onClick={() => setModalVisible(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">添加定时任务</h3>
              <button className="modal-close" onClick={() => setModalVisible(false)}>&times;</button>
            </div>
            <div className="form-group">
              <label className="form-label">Cron表达式</label>
              <select className="form-select" value={formData.cron_expression} onChange={e => setFormData({ ...formData, cron_expression: e.target.value })}>
                <option value="0 */6 * * *">每6小时执行一次</option>
                <option value="0 */12 * * *">每12小时执行一次</option>
                <option value="0 0 * * *">每天0点执行</option>
                <option value="0 6 * * *">每天6点执行</option>
                <option value="0 8 * * *">每天8点执行</option>
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
              </div>
            )}
            <div className="form-group">
              <label className="form-label">数据限制</label>
              <input type="number" className="form-input" value={formData.limit} onChange={e => setFormData({ ...formData, limit: parseInt(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="flex flex-gap-10">
                <input type="checkbox" checked={formData.enabled} onChange={e => setFormData({ ...formData, enabled: e.target.checked })} />
                启用任务
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalVisible(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>
                {submitting ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CrawlSchedule;

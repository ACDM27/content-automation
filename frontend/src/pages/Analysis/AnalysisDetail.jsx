import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { analysisApi } from '../../api';

function AnalysisDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState('');
  const [summaryForm, setSummaryForm] = useState({ max_length: 200, style: 'news' });

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await analysisApi.getHotspotDetail(id);
      setDetail(res.data);
    } catch (error) {
      console.error('Failed to fetch detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    setSummary('');
    try {
      const res = await analysisApi.summarizeHotspot(id, summaryForm);
      if (res.code === 0) {
        setSummary(res.data.summary);
      } else {
        alert('生成摘要失败: ' + res.message);
      }
    } catch (error) {
      alert('生成摘要失败: ' + (error.message || error.detail || ''));
    } finally {
      setSummarizing(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!summary) {
      alert('请先生成摘要');
      return;
    }
    navigate('/video/create', { state: { hotspot_id: id, title: detail?.title, script: summary } });
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (!detail) {
    return <div className="empty">未找到热点数据</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">热点详情</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/analysis')}>返回</button>
      </div>

      <div className="page-content">
        <div className="card">
          <h3 className="card-title">{detail.title}</h3>
          <p style={{ color: '#666', marginBottom: '15px' }}>{detail.description}</p>
          
          <div className="stats-grid" style={{ marginBottom: '20px' }}>
            <div className="stat-card">
              <div className="stat-label">热度评分</div>
              <div className="stat-value">{detail.heat_score?.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">点赞数</div>
              <div className="stat-value">{detail.likes?.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">评论数</div>
              <div className="stat-value">{detail.comments?.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">分享数</div>
              <div className="stat-value">{detail.shares?.toLocaleString()}</div>
            </div>
          </div>

          <div className="flex flex-gap-20 mb-20">
            <div><strong>作者：</strong>{detail.author}</div>
            <div><strong>爬取时间：</strong>{detail.crawled_at}</div>
            <div><strong>状态：</strong><span className={`badge ${detail.status === 1 ? 'badge-success' : 'badge-warning'}`}>{detail.status === 1 ? '已处理' : '未处理'}</span></div>
          </div>

          <div className="mb-20">
            <strong>话题标签：</strong>
            {detail.topic_tags?.map((tag, index) => (
              <span key={index} className="badge badge-info" style={{ marginLeft: '8px' }}>{tag}</span>
            ))}
          </div>

          {detail.video_url && (
            <div className="mb-20">
              <strong>视频链接：</strong>
              <a href={detail.video_url} target="_blank" rel="noopener noreferrer" style={{ color: '#00d9ff' }}>查看原视频</a>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="card-title">AI摘要生成</h3>
          <div className="flex flex-gap-10 mb-10">
            <select className="form-select" style={{ width: 'auto' }} value={summaryForm.style} onChange={e => setSummaryForm({ ...summaryForm, style: e.target.value })}>
              <option value="news">资讯风格</option>
              <option value="humor">幽默风格</option>
              <option value="formal">正式风格</option>
            </select>
            <input type="number" className="form-input" style={{ width: '100px' }} value={summaryForm.max_length} onChange={e => setSummaryForm({ ...summaryForm, max_length: parseInt(e.target.value) })} placeholder="最大长度" />
            <button className="btn btn-primary" onClick={handleSummarize} disabled={summarizing}>
              {summarizing ? '生成中...' : '生成摘要'}
            </button>
          </div>
          {summary && (
            <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '6px', marginTop: '10px', color: '#000' }}>
              {summary}
            </div>
          )}
        </div>

        <div className="flex flex-gap-10">
          <button className="btn btn-primary" onClick={handleGenerateVideo}>生成视频</button>
        </div>
      </div>
    </div>
  );
}

export default AnalysisDetail;

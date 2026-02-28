import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { systemApi, analysisApi } from '../../api';

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [hotspotsLoading, setHotspotsLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    fetchHotspots();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await systemApi.getDashboard();
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      setData({
        overview: {
          total_hotspots: 0,
          today_hotspots: 0,
          total_videos: 0,
          today_videos: 0,
          total_published: 0,
          today_published: 0,
          processed_hotspots: 0
        },
        system_status: {
          crawl_service: 'running',
          video_service: 'running',
          publish_service: 'running'
        },
        recent_tasks: []
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHotspots = async () => {
    try {
      const res = await analysisApi.getHotspots({ page: 1, page_size: 10, sort_by: 'heat_score', sort_order: 'desc' });
      setHotspots(res.data?.list || []);
    } catch (error) {
      console.error('Failed to fetch hotspots:', error);
      setHotspots([]);
    } finally {
      setHotspotsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <div>加载中...</div>
      </div>
    );
  }

  const pending = (data?.overview?.total_hotspots || 0) - (data?.overview?.processed_hotspots || 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">仪表盘</h1>
          <p className="page-subtitle">欢迎使用热点视频生成平台</p>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon cyan">🔥</div>
          <div className="stat-info">
            <div className="stat-label">总热点数</div>
            <div className="stat-value">{data?.overview?.total_hotspots?.toLocaleString() || 0}</div>
            <div className="stat-change positive">+{data?.overview?.today_hotspots || 0} 今日新增</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon green">🎬</div>
          <div className="stat-info">
            <div className="stat-label">视频总数</div>
            <div className="stat-value">{data?.overview?.total_videos?.toLocaleString() || 0}</div>
            <div className="stat-change positive">+{data?.overview?.today_videos || 0} 今日生成</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon amber">📤</div>
          <div className="stat-info">
            <div className="stat-label">已发布视频</div>
            <div className="stat-value">{data?.overview?.total_published?.toLocaleString() || 0}</div>
            <div className="stat-change positive">+{data?.overview?.today_published || 0} 今日发布</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon red">⏳</div>
          <div className="stat-info">
            <div className="stat-label">待处理热点</div>
            <div className="stat-value">{pending.toLocaleString()}</div>
            <div className="stat-change">等待分析处理</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card dashboard-card">
          <h3 className="card-title">系统状态</h3>
          <div className="status-list">
            <div className="status-item">
              <span className="status-icon">🕷️</span>
              <span className="status-label">爬虫服务</span>
              <span className={`badge ${data?.system_status?.crawl_service === 'running' ? 'badge-success' : 'badge-error'}`}>
                {data?.system_status?.crawl_service === 'running' ? '运行中' : '已停止'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-icon">🎬</span>
              <span className="status-label">视频生成服务</span>
              <span className={`badge ${data?.system_status?.video_service === 'running' ? 'badge-success' : 'badge-error'}`}>
                {data?.system_status?.video_service === 'running' ? '运行中' : '已停止'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-icon">📤</span>
              <span className="status-label">发布服务</span>
              <span className={`badge ${data?.system_status?.publish_service === 'running' ? 'badge-success' : 'badge-error'}`}>
                {data?.system_status?.publish_service === 'running' ? '运行中' : '已停止'}
              </span>
            </div>
          </div>
        </div>

        <div className="card dashboard-card">
          <div className="flex-between" style={{ marginBottom: '16px' }}>
            <h3 className="card-title" style={{ marginBottom: 0 }}>快速操作</h3>
          </div>
          <div className="quick-actions">
            <Link to="/crawl" className="quick-action-btn">
              <span className="quick-action-icon">🕷️</span>
              <span>开始爬取</span>
            </Link>
            <Link to="/video/create" className="quick-action-btn">
              <span className="quick-action-icon">🎬</span>
              <span>创建视频</span>
            </Link>
            <Link to="/publish" className="quick-action-btn">
              <span className="quick-action-icon">📤</span>
              <span>发布视频</span>
            </Link>
            <Link to="/feishu" className="quick-action-btn">
              <span className="quick-action-icon">📱</span>
              <span>飞书配置</span>
            </Link>
          </div>
        </div>

        <div className="card dashboard-card dashboard-card-wide">
          <h3 className="card-title">最近任务</h3>
          {data?.recent_tasks?.length > 0 ? (
            <div className="task-list">
              {data.recent_tasks.slice(0, 5).map((task, index) => (
                <div key={index} className="task-item">
                  <div className="task-info">
                    <span className="task-icon">
                      {task.type === 'crawl' ? '🕷️' : task.type === 'video' ? '🎬' : '📤'}
                    </span>
                    <span className="task-type">
                      {task.type === 'crawl' ? '爬取任务' : task.type === 'video' ? '视频生成' : '发布任务'}
                    </span>
                    <span className="task-time">{task.created_at?.split(' ')[1] || ''}</span>
                  </div>
                  <span className={`badge badge-${task.status === 'completed' ? 'success' : task.status === 'failed' ? 'error' : 'warning'}`}>
                    {task.status === 'completed' ? '完成' : task.status === 'failed' ? '失败' : '进行中'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">暂无任务记录</div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="flex-between" style={{ marginBottom: '16px' }}>
          <h3 className="card-title" style={{ marginBottom: 0 }}>爬虫数据详情</h3>
          <Link to="/crawl" className="btn btn-primary btn-sm">查看全部</Link>
        </div>
        {hotspotsLoading ? (
          <div className="loading">加载中...</div>
        ) : hotspots.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>排名</th>
                  <th>标题</th>
                  <th>话题标签</th>
                  <th>热度值</th>
                  <th>点赞</th>
                  <th>评论</th>
                  <th>爬取时间</th>
                </tr>
              </thead>
              <tbody>
                {hotspots.map((item, index) => (
                  <tr key={item.id || index}>
                    <td>{index + 1}</td>
                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.title}>
                      {item.title}
                    </td>
                    <td>
                      {item.topic_tags && item.topic_tags.slice(0, 2).map((tag, i) => (
                        <span key={i} className="badge badge-info" style={{ marginRight: '4px' }}>{tag}</span>
                      ))}
                    </td>
                    <td>{item.heat_score?.toLocaleString() || 0}</td>
                    <td>{item.likes?.toLocaleString() || 0}</td>
                    <td>{item.comments?.toLocaleString() || 0}</td>
                    <td>{item.crawled_at || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">暂无爬取数据，请先执行爬取任务</div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;

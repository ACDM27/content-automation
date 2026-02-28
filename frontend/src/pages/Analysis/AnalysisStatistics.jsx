import { useState, useEffect } from 'react';
import { analysisApi } from '../../api';

function AnalysisStatistics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ date_from: '', date_to: '' });

  useEffect(() => {
    fetchStatistics();
  }, [filters]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const res = await analysisApi.getStatistics(filters);
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">热点统计分析</h1>
        <div className="flex flex-gap-10">
          <input type="date" className="form-input" style={{ width: 'auto' }} value={filters.date_from} onChange={e => setFilters({ ...filters, date_from: e.target.value })} />
          <span>至</span>
          <input type="date" className="form-input" style={{ width: 'auto' }} value={filters.date_to} onChange={e => setFilters({ ...filters, date_to: e.target.value })} />
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">总热点数</div>
          <div className="stat-value">{stats?.total_hotspots?.toLocaleString() || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">今日热点</div>
          <div className="stat-value">{stats?.today_hotspots?.toLocaleString() || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">已处理热点</div>
          <div className="stat-value">{stats?.processed_hotspots?.toLocaleString() || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">待处理热点</div>
          <div className="stat-value">{stats?.pending_hotspots?.toLocaleString() || 0}</div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">热门话题TOP10</h3>
        {stats?.top_topics?.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>排名</th>
                <th>话题</th>
                <th>出现次数</th>
              </tr>
            </thead>
            <tbody>
              {stats.top_topics.map((topic, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{topic.tag}</td>
                  <td>{topic.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">暂无数据</div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">热度趋势</h3>
        {stats?.heat_trend?.length > 0 ? (
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>平均热度</th>
                  <th>趋势</th>
                </tr>
              </thead>
              <tbody>
                {stats.heat_trend.map((item, index) => (
                  <tr key={index}>
                    <td>{item.date}</td>
                    <td>{item.avg_heat_score?.toLocaleString()}</td>
                    <td>
                      {index > 0 && (
                        <span className={item.avg_heat_score > stats.heat_trend[index - 1].avg_heat_score ? 'stat-change positive' : 'stat-change negative'}>
                          {item.avg_heat_score > stats.heat_trend[index - 1].avg_heat_score ? '↑' : '↓'} 
                          {Math.abs(((item.avg_heat_score - stats.heat_trend[index - 1].avg_heat_score) / stats.heat_trend[index - 1].avg_heat_score * 100)).toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">暂无数据</div>
        )}
      </div>
    </div>
  );
}

export default AnalysisStatistics;

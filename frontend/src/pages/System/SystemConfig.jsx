import { useState, useEffect } from 'react';
import { systemApi } from '../../api';

function SystemConfig() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    crawl: { default_limit: 50, max_concurrent: 10, retry_times: 3 },
    video: { default_duration: 60, default_resolution: '1080x1920', default_voice_provider: 'iflytek' },
    publish: { default_retry_times: 3, auto_retry: true },
    feishu: { default_strategy: 'immediate' },
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await systemApi.getConfig();
      setConfig(res.data);
      if (res.data) {
        setFormData({
          crawl: res.data.crawl || formData.crawl,
          video: res.data.video || formData.video,
          publish: res.data.publish || formData.publish,
          feishu: res.data.feishu || formData.feishu,
        });
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await systemApi.updateConfig({ config: formData });
      alert('保存成功');
    } catch (error) {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">系统配置</h1>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存配置'}
        </button>
      </div>

      <div className="page-content">
        <div className="card">
          <h3 className="card-title">爬虫配置</h3>
          <div className="flex flex-gap-20">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">默认爬取数量</label>
              <input type="number" className="form-input" value={formData.crawl.default_limit} onChange={e => setFormData({ ...formData, crawl: { ...formData.crawl, default_limit: parseInt(e.target.value) } })} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">最大并发数</label>
              <input type="number" className="form-input" value={formData.crawl.max_concurrent} onChange={e => setFormData({ ...formData, crawl: { ...formData.crawl, max_concurrent: parseInt(e.target.value) } })} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">重试次数</label>
              <input type="number" className="form-input" value={formData.crawl.retry_times} onChange={e => setFormData({ ...formData, crawl: { ...formData.crawl, retry_times: parseInt(e.target.value) } })} />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">视频生成配置</h3>
          <div className="flex flex-gap-20">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">默认时长（秒）</label>
              <input type="number" className="form-input" value={formData.video.default_duration} onChange={e => setFormData({ ...formData, video: { ...formData.video, default_duration: parseInt(e.target.value) } })} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">默认分辨率</label>
              <select className="form-select" value={formData.video.default_resolution} onChange={e => setFormData({ ...formData, video: { ...formData.video, default_resolution: e.target.value } })}>
                <option value="1080x1920">竖版 1080x1920</option>
                <option value="1920x1080">横版 1920x1080</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">配音提供商</label>
              <select className="form-select" value={formData.video.default_voice_provider} onChange={e => setFormData({ ...formData, video: { ...formData.video, default_voice_provider: e.target.value } })}>
                <option value="openai">OpenAI</option>
                <option value="iflytek">讯飞</option>
                <option value="bytedance">火山引擎</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">发布配置</h3>
          <div className="flex flex-gap-20">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">默认重试次数</label>
              <input type="number" className="form-input" value={formData.publish.default_retry_times} onChange={e => setFormData({ ...formData, publish: { ...formData.publish, default_retry_times: parseInt(e.target.value) } })} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">&nbsp;</label>
              <label className="flex flex-gap-10" style={{ marginTop: '8px' }}>
                <input type="checkbox" checked={formData.publish.auto_retry} onChange={e => setFormData({ ...formData, publish: { ...formData.publish, auto_retry: e.target.checked } })} />
                自动重试
              </label>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">飞书推送配置</h3>
          <div className="flex flex-gap-20">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">默认推送策略</label>
              <select className="form-select" value={formData.feishu.default_strategy} onChange={e => setFormData({ ...formData, feishu: { ...formData.feishu, default_strategy: e.target.value } })}>
                <option value="immediate">立即推送</option>
                <option value="summary">定时汇总</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SystemConfig;

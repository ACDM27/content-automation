import { useState, useEffect } from 'react';
import { feishuApi } from '../../api';

function FeishuConfig() {
  const [loading, setLoading] = useState(true);
  const [bots, setBots] = useState([]);
  const [botModal, setBotModal] = useState(false);
  const [testModal, setTestModal] = useState(false);
  const [formData, setFormData] = useState({ webhook_url: '', name: '', enabled: true, secret: '' });
  const [testForm, setTestForm] = useState({ bot_id: '', message_type: 'text', content: { text: '' } });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    setLoading(true);
    try {
      const res = await feishuApi.getBots();
      setBots(res.data.list || []);
    } catch (error) {
      setBots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.webhook_url || !formData.name) {
      alert('请填写必填项');
      return;
    }
    setSubmitting(true);
    try {
      await feishuApi.createBot(formData);
      setBotModal(false);
      setFormData({ webhook_url: '', name: '', enabled: true, secret: '' });
      fetchBots();
    } catch (error) {
      alert('创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (botId) => {
    if (!confirm('确定要删除这个机器人吗？')) return;
    try {
      await feishuApi.deleteBot(botId);
      fetchBots();
    } catch (error) {
      alert('删除失败');
    }
  };

  const handleTest = async () => {
    if (!testForm.bot_id || !testForm.content.text) {
      alert('请填写测试内容');
      return;
    }
    setSubmitting(true);
    try {
      await feishuApi.testPush(testForm);
      alert('发送成功');
      setTestModal(false);
    } catch (error) {
      alert('发送失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openTestModal = (botId) => {
    setTestForm({ bot_id: botId, message_type: 'text', content: { text: '' } });
    setTestModal(true);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">飞书机器人配置</h1>
          <p className="page-subtitle">配置飞书机器人推送视频发布通知</p>
        </div>
        <button className="btn btn-primary" onClick={() => setBotModal(true)}>+ 添加机器人</button>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
          </div>
        ) : bots.length === 0 ? (
          <div className="empty">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
            <div>暂无飞书机器人配置</div>
            <button className="btn btn-primary mt-20" onClick={() => setBotModal(true)}>添加第一个机器人</button>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>机器人ID</th>
                  <th>名称</th>
                  <th>Webhook地址</th>
                  <th>状态</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {bots.map((bot) => (
                  <tr key={bot.bot_id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{bot.bot_id}</td>
                    <td>{bot.name}</td>
                    <td style={{ maxWidth: '200px' }} className="truncate">{bot.webhook_url}</td>
                    <td>
                      <span className={`badge ${bot.enabled ? 'badge-success' : 'badge-warning'}`}>
                        {bot.enabled ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td>{bot.created_at}</td>
                    <td>
                      <div className="flex flex-gap-10">
                        <button className="btn btn-secondary btn-sm" onClick={() => openTestModal(bot.bot_id)}>测试</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(bot.bot_id)}>删除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {botModal && (
        <div className="modal-overlay" onClick={() => setBotModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">添加飞书机器人</h3>
              <button className="modal-close" onClick={() => setBotModal(false)}>&times;</button>
            </div>
            <div className="form-group">
              <label className="form-label">机器人名称 *</label>
              <input type="text" className="form-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="请输入机器人名称" />
            </div>
            <div className="form-group">
              <label className="form-label">Webhook地址 *</label>
              <input type="text" className="form-input" value={formData.webhook_url} onChange={e => setFormData({ ...formData, webhook_url: e.target.value })} placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx" />
            </div>
            <div className="form-group">
              <label className="form-label">密钥（可选）</label>
              <input type="text" className="form-input" value={formData.secret} onChange={e => setFormData({ ...formData, secret: e.target.value })} placeholder="签名校验密钥" />
            </div>
            <div className="form-group">
              <label className="form-checkbox">
                <input type="checkbox" checked={formData.enabled} onChange={e => setFormData({ ...formData, enabled: e.target.checked })} />
                启用机器人
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setBotModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>
                {submitting ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {testModal && (
        <div className="modal-overlay" onClick={() => setTestModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">测试飞书推送</h3>
              <button className="modal-close" onClick={() => setTestModal(false)}>&times;</button>
            </div>
            <div className="form-group">
              <label className="form-label">消息类型</label>
              <select className="form-select" value={testForm.message_type} onChange={e => setTestForm({ ...testForm, message_type: e.target.value })}>
                <option value="text">文本</option>
                <option value="card">卡片消息</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">消息内容</label>
              <textarea className="form-textarea" value={testForm.content.text} onChange={e => setTestForm({ ...testForm, content: { text: e.target.value } })} placeholder="请输入测试消息内容"></textarea>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setTestModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleTest} disabled={submitting}>
                {submitting ? '发送中...' : '发送'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeishuConfig;

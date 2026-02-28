import { useState, useEffect } from 'react';
import { publishApi } from '../../api';

function PublishAccount() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [addModal, setAddModal] = useState(false);
  const [verifyModal, setVerifyModal] = useState(false);
  const [formData, setFormData] = useState({ login_method: 'phone', phone: '', auth_code: '' });
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await publishApi.getAccounts();
      setAccounts(res.data.list || []);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (formData.login_method === 'phone' && !formData.phone) {
      alert('请填写手机号');
      return;
    }
    setSubmitting(true);
    try {
      const res = await publishApi.addAccount(formData);
      if (res.code === 0) {
        if (res.data.authorization_url) {
          window.location.href = res.data.authorization_url;
        } else {
          setSelectedAccount(res.data);
          setAddModal(false);
          setVerifyModal(true);
        }
      } else {
        alert(res.message || '添加失败');
      }
    } catch (error) {
      alert('添加失败: ' + (error.message || error.detail || JSON.stringify(error)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!formData.auth_code) {
      alert('请填写验证码');
      return;
    }
    setSubmitting(true);
    try {
      await publishApi.verifyAccount({ account_id: selectedAccount.account_id, verify_code: formData.auth_code });
      setVerifyModal(false);
      fetchAccounts();
    } catch (error) {
      alert('验证失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (accountId) => {
    if (!confirm('确定要删除这个账号吗？')) return;
    try {
      await publishApi.deleteAccount(accountId);
      fetchAccounts();
    } catch (error) {
      alert('删除失败');
    }
  };

  const getStatusBadge = (status) => {
    const map = { active: { label: '正常', class: 'badge-success' }, pending_verify: { label: '待验证', class: 'badge-warning' }, inactive: { label: '已禁用', class: 'badge-error' } };
    const item = map[status] || { label: status, class: 'badge-info' };
    return <span className={`badge ${item.class}`}>{item.label}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">抖音账号管理</h1>
        <button className="btn btn-primary" onClick={() => setAddModal(true)}>添加账号</button>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : accounts.length === 0 ? (
          <div className="empty">暂无抖音账号</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>账号ID</th>
                <th>昵称</th>
                <th>头像</th>
                <th>粉丝数</th>
                <th>状态</th>
                <th>绑定时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.account_id}>
                  <td>{account.account_id}</td>
                  <td>{account.nickname}</td>
                  <td>
                    {account.avatar_url && <img src={account.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%' }} />}
                  </td>
                  <td>{account.followers?.toLocaleString() || '-'}</td>
                  <td>{getStatusBadge(account.status)}</td>
                  <td>{account.created_at || '-'}</td>
                  <td>
                    <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleDelete(account.account_id)}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {addModal && (
        <div className="modal-overlay" onClick={() => setAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">添加抖音账号</h3>
              <button className="modal-close" onClick={() => setAddModal(false)}>&times;</button>
            </div>
            <div className="form-group">
              <label className="form-label">登录方式</label>
              <select className="form-select" value={formData.login_method} onChange={e => setFormData({ ...formData, login_method: e.target.value })}>
                <option value="phone">手机号</option>
                <option value="oauth">OAuth2授权</option>
              </select>
            </div>
            {formData.login_method === 'phone' && (
              <div className="form-group">
                <label className="form-label">手机号</label>
                <input type="text" className="form-input" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="请输入手机号" />
              </div>
            )}
            {formData.login_method === 'oauth' && (
              <div style={{ padding: '15px', background: '#e7f3ff', borderRadius: '6px', marginBottom: '15px' }}>
                <p style={{ margin: 0, color: '#0066cc' }}>
                  点击"添加"后将跳转到抖音授权页面，请使用抖音APP扫码完成授权。
                </p>
              </div>
            )}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAddModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={submitting}>
                {submitting ? '添加中...' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {verifyModal && (
        <div className="modal-overlay" onClick={() => setVerifyModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">验证账号</h3>
              <button className="modal-close" onClick={() => setVerifyModal(false)}>&times;</button>
            </div>
            <p style={{ marginBottom: '15px' }}>请输入发送到手机的验证码完成验证</p>
            <div className="form-group">
              <label className="form-label">验证码</label>
              <input type="text" className="form-input" value={formData.auth_code} onChange={e => setFormData({ ...formData, auth_code: e.target.value })} placeholder="请输入验证码" />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setVerifyModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleVerify} disabled={submitting}>
                {submitting ? '验证中...' : '验证'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PublishAccount;

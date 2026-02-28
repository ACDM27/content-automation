import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { publishApi } from '../../api';

function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('处理中...');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error_description');

    if (error) {
      setStatus('授权失败: ' + error);
      setTimeout(() => navigate('/publish/account'), 3000);
      return;
    }

    if (!code || !state) {
      setStatus('参数错误');
      setTimeout(() => navigate('/publish/account'), 3000);
      return;
    }

    const handleCallback = async () => {
      try {
        const res = await fetch(`/api/v1/publish/douyin/callback?code=${code}&state=${state}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        
        if (data.code === 0) {
          setStatus('授权成功！正在跳转...');
          setTimeout(() => navigate('/publish/account'), 1500);
        } else {
          setStatus('授权失败: ' + data.message);
          setTimeout(() => navigate('/publish/account'), 3000);
        }
      } catch (e) {
        setStatus('授权失败: ' + e.message);
        setTimeout(() => navigate('/publish/account'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      fontSize: '18px'
    }}>
      <div style={{ marginBottom: '20px' }}>{status}</div>
    </div>
  );
}

export default OAuthCallback;

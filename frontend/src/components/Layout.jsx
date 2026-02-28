import { Outlet, useLocation } from 'react-router-dom';
import '../styles/global.css';

const menuItems = [
  { key: '/', label: '仪表盘', icon: '📊' },
  { key: '/crawl', label: '爬虫管理', icon: '🕷️', section: '数据' },
  { key: '/analysis', label: '热点分析', icon: '📈', section: '数据' },
  { key: '/video', label: '视频生成', icon: '🎬', section: '内容' },
  { key: '/publish', label: '视频发布', icon: '📤', section: '内容' },
  { key: '/feishu', label: '飞书推送', icon: '📱', section: '通知' },
  { key: '/system', label: '系统设置', icon: '⚙️', section: '系统' },
];

function Layout() {
  const location = useLocation();

  const getCurrentMenu = () => {
    const path = location.pathname;
    for (const item of menuItems) {
      if (path === item.key || path.startsWith(item.key + '/')) {
        return item.key;
      }
    }
    return '/';
  };

  const currentMenu = getCurrentMenu();
  const sections = [...new Set(menuItems.map(m => m.section))];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">
          <h2>
            <span className="logo-icon">🎬</span>
            <span>热点视频平台</span>
          </h2>
        </div>
        <nav className="nav">
          {sections.map(section => (
            <div key={section} className="nav-section">
              <div className="nav-section-title">{section}</div>
              {menuItems.filter(m => m.section === section).map((item) => (
                <a
                  key={item.key}
                  href={item.key}
                  className={`nav-item ${currentMenu === item.key ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </a>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;

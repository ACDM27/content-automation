import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import Dashboard from '../pages/System/Dashboard';
import CrawlList from '../pages/Crawl/CrawlList';
import CrawlSchedule from '../pages/Crawl/CrawlSchedule';
import AnalysisList from '../pages/Analysis/AnalysisList';
import AnalysisDetail from '../pages/Analysis/AnalysisDetail';
import AnalysisStatistics from '../pages/Analysis/AnalysisStatistics';
import VideoList from '../pages/Video/VideoList';
import VideoCreate from '../pages/Video/VideoCreate';
import VideoDetail from '../pages/Video/VideoDetail';
import PublishList from '../pages/Publish/PublishList';
import PublishAccount from '../pages/Publish/PublishAccount';
import OAuthCallback from '../pages/Publish/OAuthCallback';
import FeishuConfig from '../pages/Feishu/FeishuConfig';
import SystemConfig from '../pages/System/SystemConfig';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'crawl', children: [
        { index: true, element: <CrawlList /> },
        { path: 'schedule', element: <CrawlSchedule /> },
      ]},
      { path: 'analysis', children: [
        { index: true, element: <AnalysisList /> },
        { path: 'detail/:id', element: <AnalysisDetail /> },
        { path: 'statistics', element: <AnalysisStatistics /> },
      ]},
      { path: 'video', children: [
        { index: true, element: <VideoList /> },
        { path: 'create', element: <VideoCreate /> },
        { path: 'detail/:projectId', element: <VideoDetail /> },
      ]},
      { path: 'publish', children: [
        { index: true, element: <PublishList /> },
        { path: 'account', element: <PublishAccount /> },
        { path: 'callback', element: <OAuthCallback /> },
      ]},
      { path: 'feishu', children: [
        { index: true, element: <FeishuConfig /> },
      ]},
      { path: 'system', children: [
        { index: true, element: <SystemConfig /> },
      ]},
    ],
  },
]);

export default router;

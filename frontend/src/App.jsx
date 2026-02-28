import { RouterProvider } from 'react-router-dom';
import router from './router/index.jsx';
import Layout from './components/Layout';
import './styles/global.css';

function App() {
  return (
    <RouterProvider router={router} />
  );
}

export default App;

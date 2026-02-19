import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Editor } from './pages/Editor';
import { Viewer } from './pages/Viewer';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/edit/:id" element={<Editor />} />
          <Route path="/view/:id" element={<Viewer />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;

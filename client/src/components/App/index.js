import * as React from 'react';
import Review from './Review';
import {BrowserRouter, Routes, Route} from 'react-router-dom'
import Layout from './Layout';
import Post from '../Post'


const App = () => {


  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Post />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;

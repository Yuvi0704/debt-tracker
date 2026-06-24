import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="container mt-6 mb-6">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

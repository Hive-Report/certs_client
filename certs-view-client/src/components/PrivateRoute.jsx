import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import config from '../config/config.js';

const PrivateRoute = () => {
  const token = localStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;

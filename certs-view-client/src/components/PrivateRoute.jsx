import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

// PrivateRoute: захищає роут, якщо немає токена — редирект на /login
const PrivateRoute = () => {
  const token = localStorage.getItem('authToken'); // або ваш ключ
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;

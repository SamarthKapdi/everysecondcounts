import React from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ChatBot from '../components/ChatBot';
import useAuthStore from '../store/authStore';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../hooks/useSocket';

const MainLayout = ({ children }) => {
  const { token } = useAuthStore();
  const isAuthenticated = !!token;
  const { isDark } = useTheme();

  // Initialize socket connection once globally for authenticated users
  useSocket();

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#0F172A] text-white' : 'bg-slate-50 text-slate-800'}`}>
      <Navbar />
      
      <div className="flex flex-1 pt-16">
        {isAuthenticated && <Sidebar />}
        <main className={`flex-1 p-6 ${isAuthenticated ? 'lg:ml-64' : ''} max-w-7xl mx-auto w-full transition-all`}>
          {children}
        </main>
      </div>

      <ChatBot />
    </div>
  );
};

export default MainLayout;

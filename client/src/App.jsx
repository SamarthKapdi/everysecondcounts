import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { ThemeProvider } from './context/ThemeContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
          <AppRoutes />
          <Toaster 
            position="top-right" 
            toastOptions={{
              className: 'dark:bg-[#1E293B] dark:text-white dark:border-slate-700 border border-slate-100 shadow-xl rounded-2xl text-sm font-semibold',
            }}
          />
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;

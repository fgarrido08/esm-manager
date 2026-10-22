import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Overlay oscuro cuando el sidebar está abierto en móvil */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Botón hamburguesa (solo en móvil) */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden bg-blue-900 text-white p-3 rounded-lg shadow-lg"
      >
        ☰
      </button>

      <div className="flex">
        {/* Sidebar: oculto en móvil por defecto, visible en desktop */}
        <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out fixed md:static z-40`}>
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
        
        {/* Contenido principal */}
        <main className="flex-1 p-4 md:p-8 md:ml-0 min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
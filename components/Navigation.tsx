'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/utils';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

  // Verificar autenticación al cargar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await apiFetch('/api/auth/status');
        const data = await response.json();

        if (data.authenticated) {
          setIsAuthenticated(true);
          setUser(data.user);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
      }
    };

    checkAuth();
  }, [pathname]); // Re-verificar cuando cambia la ruta

  const handleLogout = () => {
    // Limpiar datos locales
    localStorage.removeItem('auth_data');
    localStorage.removeItem('dev_auth_token');

    // Redirigir al logout
    window.location.href = '/logout';
  };

  // No mostrar navegación en páginas de auth
  const isAuthPage = ['/login', '/register', '/logout'].includes(pathname);

  const navigation = isAuthenticated
    ? [
        { name: 'Finanzas', href: '/finanzas' },
      ]
    : [
        { name: 'Inicio', href: '/' },
        { name: 'Registro', href: '/register' },
      ];

  // Secciones disponibles solo en la página de finanzas
  const sections = [
    { name: 'Resumen', href: '#resumen' },
    { name: 'Análisis', href: '#graficos' },
    { name: 'Transacciones', href: '#transacciones' },
    { name: 'Metas', href: '#metas' },
    { name: 'Categorías', href: '#categorias' },
    { name: 'Reportes', href: '#reportes' },
  ];

  const navigateToSection = (sectionId: string) => {
    // Disparar evento para que la página de finanzas expanda la sección y haga scroll
    const event = new CustomEvent('expandSection', {
      detail: { section: sectionId }
    });
    window.dispatchEvent(event);
    setIsOpen(false); // Cerrar menú móvil si está abierto
  };

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href.startsWith('#')) return false; // Las anclas no tienen estado activo
    return pathname.startsWith(href);
  };

  // No mostrar navegación en páginas de autenticación
  if (isAuthPage) {
    return null;
  }

  return (
    <nav className="bg-primary shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="text-white text-xl font-bold hover:text-blue-100 transition-colors">
                Fede Life
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-blue-700 text-white'
                        : 'text-white hover:bg-blue-600'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
                {/* Mostrar secciones solo en la página de finanzas */}
                {pathname === '/finanzas' && (
                  <>
                    <span className="text-white/50">|</span>
                    {sections.map((section) => (
                      <button
                        key={section.name}
                        onClick={() => navigateToSection(section.href.substring(1))}
                        className="px-3 py-2 rounded-md text-sm font-medium transition-colors text-white hover:bg-blue-600"
                      >
                        {section.name}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Authentication section */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className="text-white text-sm font-medium">
                      {user?.firstName || user?.username || 'Usuario'}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-blue-600 transition-colors"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    href="/login"
                    className="px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-blue-600 transition-colors"
                  >
                    Iniciar Sesión
                  </Link>
                  <Link
                    href="/register"
                    className="px-3 py-2 rounded-md text-sm font-medium bg-white text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    Registrarse
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile auth menu */}
          <div className="md:hidden flex items-center">
            {isAuthenticated ? (
              <div className="flex items-center space-x-2 mr-2">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="text-white text-xs font-medium">
                  {user?.firstName || user?.username || 'Usuario'}
                </span>
              </div>
            ) : null}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-expanded="false"
            >
              <span className="sr-only">Abrir menú principal</span>
              {/* Hamburger icon */}
              <svg
                className={`${isOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {/* Close icon */}
              <svg
                className={`${isOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${isOpen ? 'block' : 'hidden'} md:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-blue-700">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-800 text-white'
                  : 'text-blue-100 hover:bg-blue-600 hover:text-white'
              }`}
              onClick={() => setIsOpen(false)}
            >
              {item.name}
            </Link>
          ))}

          {/* Authentication options */}
          <div className="border-t border-blue-600 my-2"></div>
          {isAuthenticated ? (
            <div className="space-y-1">
              <button
                onClick={() => {
                  handleLogout();
                  setIsOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors text-blue-100 hover:bg-blue-600 hover:text-white"
              >
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <Link
                href="/login"
                className="block px-3 py-2 rounded-md text-base font-medium transition-colors text-blue-100 hover:bg-blue-600 hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/register"
                className="block px-3 py-2 rounded-md text-base font-medium transition-colors text-blue-100 hover:bg-blue-600 hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                Registrarse
              </Link>
            </div>
          )}

          {/* Mostrar secciones solo en la página de finanzas */}
          {pathname === '/finanzas' && (
            <>
              <div className="border-t border-blue-600 my-2"></div>
              {sections.map((section) => (
                <button
                  key={section.name}
                  onClick={() => navigateToSection(section.href.substring(1))}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors text-blue-100 hover:bg-blue-600 hover:text-white"
                >
                  {section.name}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

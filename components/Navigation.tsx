'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navigation = [
    { name: 'Finanzas', href: '/finanzas' },
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

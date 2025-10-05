import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import PWAInstallButton from '@/components/PWAInstallButton'
import OfflineIndicator from '@/components/OfflineIndicator'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Finanzas Personales - Fede Life',
  description: 'Sistema completo para gestionar tus finanzas personales con IA integrada',
  keywords: 'finanzas personales, presupuesto, ahorro, gastos, ingresos, metas financieras, IA financiera',
  authors: [{ name: 'Fede Life Team' }],
  creator: 'Senior Full Stack Developer',
  publisher: 'Fede Life',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Fede Life',
    startupImage: [
      {
        url: '/icons/icon-512x512.png',
        media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)',
      },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://fedelife-finanzas.onrender.com',
    title: 'Finanzas Personales - Fede Life',
    description: 'Sistema completo para gestionar tus finanzas personales con IA integrada',
    siteName: 'Fede Life',
    images: [
      {
        url: '/icons/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'Fede Life - Finanzas Personales',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Finanzas Personales - Fede Life',
    description: 'Sistema completo para gestionar tus finanzas personales con IA integrada',
    images: ['/icons/icon-512x512.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563eb' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        {/* Preload critical resources */}
        <link rel="preload" href="/sw.js" as="script" />
        <link rel="dns-prefetch" href="//api.openai.com" />

        {/* PWA meta tags adicionales */}
        <meta name="application-name" content="Fede Life" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Fede Life" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* Favicon alternativo para navegadores antiguos */}
        <link rel="shortcut icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${inter.className} min-h-screen bg-gray-50 flex flex-col`}>
        <OfflineIndicator />
        <Navigation />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
        <PWAInstallButton />

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(registration) {
                      console.log('✅ Service Worker registrado:', registration.scope);

                      // Manejar actualizaciones del SW
                      registration.addEventListener('updatefound', function() {
                        const newWorker = registration.installing;
                        if (newWorker) {
                          newWorker.addEventListener('statechange', function() {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              // Nueva versión disponible
                              if (confirm('Nueva versión disponible. ¿Quieres actualizar?')) {
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                                window.location.reload();
                              }
                            }
                          });
                        }
                      });
                    })
                    .catch(function(error) {
                      console.error('❌ Error registrando Service Worker:', error);
                    });
                });
              }

              // Detectar si estamos en modo standalone (PWA instalada)
              if (window.matchMedia('(display-mode: standalone)').matches ||
                  window.navigator.standalone === true) {
                document.body.classList.add('pwa-mode');
              }
            `,
          }}
        />

        {/* PWA Install Prompt */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              let deferredPrompt;

              window.addEventListener('beforeinstallprompt', (e) => {
                // Prevenir que Chrome muestre el prompt automáticamente
                e.preventDefault();
                deferredPrompt = e;

                // Mostrar botón de instalación personalizado si existe
                const installButton = document.getElementById('pwa-install-btn');
                if (installButton) {
                  installButton.style.display = 'block';
                  installButton.addEventListener('click', () => {
                    installButton.style.display = 'none';
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then((choiceResult) => {
                      if (choiceResult.outcome === 'accepted') {
                        console.log('✅ Usuario aceptó instalar PWA');
                      } else {
                        console.log('❌ Usuario rechazó instalar PWA');
                      }
                      deferredPrompt = null;
                    });
                  });
                }
              });

              // Detectar instalación exitosa
              window.addEventListener('appinstalled', (evt) => {
                console.log('✅ PWA instalada exitosamente');
                const installButton = document.getElementById('pwa-install-btn');
                if (installButton) {
                  installButton.style.display = 'none';
                }
              });
            `,
          }}
        />
      </body>
    </html>
  )
}

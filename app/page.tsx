import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { apiFetch } from '@/lib/utils'

export default async function Home() {
  try {
    // Verificar si hay cookies de autenticación en el servidor
    const headersList = headers()
    const cookieHeader = headersList.get('cookie')

    if (cookieHeader && cookieHeader.includes('auth-token')) {
      // Si hay cookie de autenticación, redirigir a finanzas
      redirect('/finanzas')
    }
  } catch (error) {
    // Si hay error, continuar mostrando la página de inicio
  }

  // Mostrar página de inicio
  redirect('/welcome')
}

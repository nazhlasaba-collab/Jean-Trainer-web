// utils/auth-utils.js - VERSIÓN CORREGIDA

// Verificar autenticación en cada página
export async function requireAuth(requiredRole = null) {
  const { supabase } = await import('../services/supabaseClient.js')
  
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session) {
    window.location.href = '/views/login.html'
    return null
  }
  
  // Verificar rol si es necesario
  if (requiredRole) {
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id_usuario', session.user.id)
      .single()
    
    if (usuarioError || !usuario) {
      window.location.href = '/views/login.html'
      return null
    }
    
    // Verificar si el rol coincide
    if (usuario.rol !== requiredRole) {
      // Redirigir según el rol que sí tiene
      switch(usuario.rol) {
        case 'admin':
          window.location.href = '/views/dashboard_admin.html';
          break;
        case 'entrenador':
        case 'usuario':
          window.location.href = '/views/dashboard_crossfit.html';
          break;
        default:
          window.location.href = '/views/inicio.html';
      }
      return null
    }
  }
  
  return session.user
}

// Obtener datos del usuario actual
export async function getCurrentUserData() {
  const { supabase } = await import('../services/supabaseClient.js')
  
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  
  const { data: usuario } = await supabase
    .from('usuarios')
    .select(`
      *,
      membresias (*)
    `)
    .eq('id_usuario', user.id)
    .single()
  
  return usuario
}

// Verificar rol específico
export async function checkUserRole(requiredRole) {
  const userData = await getCurrentUserData()
  return userData && userData.rol === requiredRole
}

// Cerrar sesión
export async function logoutUser() {
  const { supabase } = await import('../services/supabaseClient.js')
  const { error } = await supabase.auth.signOut()
  
  if (!error) {
    window.location.href = '/views/login.html'
  }
}
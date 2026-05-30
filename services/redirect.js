// Función para redirigir según el rol del usuario
export function redirectByRole(rol) {
  console.log(`🔀 Redirigiendo usuario con rol: ${rol}`);
  
  // Pequeña espera para que se carguen los datos
  setTimeout(() => {
    switch(rol) {
      case 'admin':
        console.log('🚀 Redirigiendo a dashboard-admin.html');
        window.location.href = 'dashboard_admin.html';
        break;
        
      case 'entrenador':
        // Si tienes dashboard para entrenador, aquí iría
        console.log('🚀 Redirigiendo a dashboard-entrenador.html');
        window.location.href = 'dashboard.html'; // Por ahora al mismo dashboard
        break;
        
      case 'usuario':
      default:
        console.log('🚀 Redirigiendo a dashboard.html');
        window.location.href = 'dashboard.html';
        break;
    }
  }, 1500); // Espera 1.5 segundos antes de redirigir
}

// Verificar autenticación al cargar la página
export function checkAuthAndRedirect() {
  const rol = localStorage.getItem('userRol');
  const currentPage = window.location.pathname;
  
  // Si ya está logueado y está en login/registro, redirigir al dashboard
  if (rol && (currentPage.includes('login.html') || currentPage.includes('registro.html'))) {
    console.log(`🔄 Usuario autenticado (rol: ${rol}) detectado en login/registro, redirigiendo...`);
    redirectByRole(rol);
  }
  
  // Si no está logueado y está en dashboard, redirigir al login
  if (!rol && currentPage.includes('dashboard')) {
    console.log('🔒 Usuario no autenticado en dashboard, redirigiendo al login');
    window.location.href = 'login.html';
  }
}

// Limpiar datos de sesión al cerrar sesión
export function logoutAndRedirect() {
  localStorage.removeItem('userRol');
  localStorage.removeItem('userEmail');
  window.location.href = 'login.html';
}
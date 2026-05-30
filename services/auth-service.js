// services/auth-service.js - VERSIÓN CORREGIDA
import { supabase } from './supabaseClient.js';

class AuthService {
  constructor() {
    console.log('🔐 AuthService inicializado');
  }

  async login(email, password) {
    try {
      console.log(`🔐 Intentando login para: ${email}`);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ Error en login:', error.message);
        return { 
          success: false, 
          error: this.translateError(error.message),
          code: error.code
        };
      }

      console.log('✅ Login exitoso:', data.user.email);
      
      // Obtener datos del usuario desde tabla 'usuarios' (NO 'users')
      let userProfile = null;
      try {
        const { data: profile, error: profileError } = await supabase
          .from('usuarios')  // ✅ TABLA CORRECTA
          .select('*')
          .eq('id_usuario', data.user.id)  // ✅ COLUMNA CORRECTA
          .single();
        
        if (profileError) {
          console.log('ℹ️ No se encontró perfil en tabla usuarios:', profileError.message);
        } else {
          userProfile = profile;
        }
      } catch (profileError) {
        console.log('ℹ️ Error obteniendo perfil:', profileError.message);
      }

      return {
        success: true,
        user: {
          ...data.user,
          profile: userProfile
        },
        session: data.session
      };

    } catch (error) {
      console.error('❌ Error inesperado en login:', error);
      return { 
        success: false, 
        error: 'Error inesperado. Intenta de nuevo.' 
      };
    }
  }

  async register(email, password, userData = {}) {
    try {
      console.log(`📝 Registrando usuario: ${email}`);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre: userData.nombre || '',
            apellido: userData.apellido || '',
            rol: userData.rol || 'usuario',
            telefono: userData.telefono || '',
            // Estos datos se sincronizan automáticamente con la tabla 'usuarios'
            // gracias al trigger que creamos en Supabase
          }
        }
      });

      if (error) {
        console.error('❌ Error en registro:', error.message);
        return { 
          success: false, 
          error: this.translateError(error.message)
        };
      }

      console.log('✅ Usuario registrado:', data.user?.email);
      
      // IMPORTANTE: NO intentes crear perfil manualmente
      // El trigger en Supabase lo hace automáticamente
      // Solo espera unos segundos para que se sincronice
      
      return {
        success: true,
        user: data.user,
        requiresConfirmation: data.user?.identities?.length === 0
      };

    } catch (error) {
      console.error('❌ Error inesperado en registro:', error);
      return { 
        success: false, 
        error: 'Error inesperado. Intenta de nuevo.' 
      };
    }
  }

  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Error en logout:', error.message);
        return false;
      }
      console.log('✅ Sesión cerrada correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error inesperado en logout:', error);
      return false;
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('❌ Error obteniendo usuario:', error.message);
        return null;
      }

      if (user) {
        // Obtener perfil desde tabla 'usuarios'
        try {
          const { data: profile, error: profileError } = await supabase
            .from('usuarios')  // ✅ TABLA CORRECTA
            .select('*')
            .eq('id_usuario', user.id)  // ✅ COLUMNA CORRECTA
            .single();
          
          if (profileError) {
            console.log('ℹ️ Perfil no encontrado en tabla usuarios');
            return user; // Retornar solo datos de auth
          }
          
          return {
            ...user,
            profile: profile
          };
        } catch (profileError) {
          console.log('ℹ️ Error obteniendo perfil:', profileError.message);
          return user;
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Error inesperado obteniendo usuario:', error);
      return null;
    }
  }

  async checkSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Error verificando sesión:', error.message);
        return { isValid: false, error: error.message };
      }

      return {
        isValid: !!session,
        session: session,
        user: session?.user || null
      };
    } catch (error) {
      console.error('❌ Error inesperado verificando sesión:', error);
      return { isValid: false, error: 'Error inesperado' };
    }
  }

  // Nuevo método: Obtener perfil completo del usuario
  async getUsuarioProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          *,
          membresias (*)
        `)
        .eq('id_usuario', userId)
        .single();
      
      if (error) {
        console.error('❌ Error obteniendo perfil:', error.message);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('❌ Error inesperado obteniendo perfil:', error);
      return null;
    }
  }

  translateError(errorMsg) {
    const errors = {
      'Invalid login credentials': 'Credenciales incorrectas',
      'Email not confirmed': 'Email no confirmado',
      'User already registered': 'Usuario ya registrado',
      'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
      'User not found': 'Usuario no encontrado',
      'Invalid password': 'Contraseña incorrecta'
    };
    
    return errors[errorMsg] || errorMsg;
  }
  // ... (código anterior se mantiene igual)

async login(email, password) {
  try {
    console.log(`🔐 Intentando login para: ${email}`);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('❌ Error en login:', error.message);
      return { 
        success: false, 
        error: this.translateError(error.message),
        code: error.code
      };
    }

    console.log('✅ Login exitoso:', data.user.email);
    
    // Obtener datos del usuario desde tabla 'usuarios'
    let userProfile = null;
    let userRol = 'usuario'; // Rol por defecto
    
    try {
      const { data: profile, error: profileError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id_usuario', data.user.id)
        .single();
      
      if (profileError) {
        console.log('ℹ️ No se encontró perfil en tabla usuarios:', profileError.message);
      } else {
        userProfile = profile;
        userRol = profile.rol || 'usuario';
      }
    } catch (profileError) {
      console.log('ℹ️ Error obteniendo perfil:', profileError.message);
    }

    // Guardar datos en localStorage para redirección
    localStorage.setItem('userRol', userRol);
    localStorage.setItem('userEmail', email);
    
    return {
      success: true,
      user: {
        ...data.user,
        profile: userProfile
      },
      session: data.session,
      rol: userRol // Agregar rol a la respuesta
    };

  } catch (error) {
    console.error('❌ Error inesperado en login:', error);
    return { 
      success: false, 
      error: 'Error inesperado. Intenta de nuevo.' 
    };
  }
}

async register(email, password, userData = {}) {
  try {
    console.log(`📝 Registrando usuario: ${email}`);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre: userData.nombre || '',
          apellido: userData.apellido || '',
          rol: userData.rol || 'usuario', // Rol por defecto 'usuario'
          telefono: userData.telefono || '',
        }
      }
    });

    if (error) {
      console.error('❌ Error en registro:', error.message);
      return { 
        success: false, 
        error: this.translateError(error.message)
      };
    }

    console.log('✅ Usuario registrado:', data.user?.email);
    
    // Guardar rol en localStorage
    localStorage.setItem('userRol', userData.rol || 'usuario');
    localStorage.setItem('userEmail', email);
    
    return {
      success: true,
      user: data.user,
      rol: userData.rol || 'usuario',
      requiresConfirmation: data.user?.identities?.length === 0
    };

  } catch (error) {
    console.error('❌ Error inesperado en registro:', error);
    return { 
      success: false, 
      error: 'Error inesperado. Intenta de nuevo.' 
    };
  }
}
}

// Exportar instancia única
export const authService = new AuthService();
// supabaseClient.js - VERSIÓN COMPLETA CORREGIDA
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://iketdpkxyojqxruzzrgy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZXRkcGt4eW9qcXhydXp6cmd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5ODMwNTcsImV4cCI6MjA4NTU1OTA1N30.974zKW2EMNMuCndTC6_g5zZP3mN2XZLlDsmsz8602Lk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// LOGIN - CON DETECCIÓN DE ROL
// ============================================
export async function loginUser(email, password) {
  try {
    console.log('🔐 Intentando login:', email)
    
    // 1. Autenticar con Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    })

    if (error) {
      console.log('❌ Error auth:', error.message)
      return { 
        success: false, 
        error: 'Email o contraseña incorrectos' 
      }
    }

    if (!data || !data.user) {
      return { 
        success: false, 
        error: 'Error al iniciar sesión' 
      }
    }

    console.log('✅ Usuario autenticado:', data.user.email)
    
    // 2. Verificar si es ADMIN consultando la tabla usuarios (usando correo, no email)
    let userRole = 'usuario'
    let userName = data.user.user_metadata?.nombre || email.split('@')[0]
    
    try {
      console.log('🔍 Verificando rol en tabla usuarios...')
      
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('rol, nombre, apellido')
        .eq('correo', email)  // ← CORREGIDO: usar 'correo' en lugar de 'email'
        .maybeSingle()
      
      if (!userError && userData) {
        userRole = userData.rol || 'usuario'
        // Si tiene nombre en la tabla, usarlo
        if (userData.nombre) {
          userName = userData.nombre
          if (userData.apellido) {
            userName += ' ' + userData.apellido
          }
        }
        console.log('✅ Rol encontrado en DB:', userRole)
      } else {
        console.log('ℹ️ Usuario no encontrado en tabla, usando rol por defecto')
        // Si no existe en la tabla usuarios, lo creamos automáticamente
        await crearUsuarioSiNoExiste(data.user.id, email, data.user.user_metadata?.nombre || email.split('@')[0], data.user.user_metadata?.apellido || '')
      }
    } catch (dbError) {
      console.log('⚠️ Error consultando DB:', dbError)
    }
    
    // 3. Guardar en localStorage
    localStorage.setItem('userEmail', email)
    localStorage.setItem('userName', userName)
    localStorage.setItem('userRol', userRole)
    localStorage.setItem('userId', data.user.id)
    
    if (data.session) {
      localStorage.setItem('supabase.auth.token', JSON.stringify(data.session))
    }
    
    console.log('💾 Datos guardados - Usuario:', userName, 'Rol:', userRole)
    
    return {
      success: true,
      user: data.user,
      profile: {
        nombre: userName
      },
      rol: userRole
    }

  } catch (error) {
    console.error('❌ Error inesperado:', error)
    return { 
      success: false, 
      error: 'Error inesperado' 
    }
  }
}

// ============================================
// FUNCIÓN AUXILIAR: Crear usuario en tabla usuarios si no existe
// ============================================
async function crearUsuarioSiNoExiste(userId, email, nombre, apellido) {
  try {
    const { data, error } = await supabase.rpc('crear_usuario_manual', {
      p_id_usuario: userId,
      p_correo: email,
      p_nombre: nombre || email.split('@')[0],
      p_apellido: apellido || '',
      p_rol: 'usuario'
    })
    
    if (error) {
      console.log('⚠️ Error creando usuario:', error)
      return false
    }
    
    console.log('✅ Usuario creado en tabla usuarios')
    return true
  } catch (error) {
    console.error('Error en crearUsuarioSiNoExiste:', error)
    return false
  }
}

// ============================================
// REGISTRO - CORREGIDO
// ============================================
export async function registerUser(email, password, userData = {}) {
  try {
    console.log('📝 Registrando:', email)
    
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          nombre: userData.nombre || email.split('@')[0],
          apellido: userData.apellido || ''
        }
      }
    })

    if (error) {
      console.log('❌ Error registro:', error.message)
      return { 
        success: false, 
        error: error.message 
      }
    }

    const userName = userData.nombre || email.split('@')[0]
    
    // Crear usuario en la tabla usuarios usando la función RPC
    if (data.user) {
      await crearUsuarioSiNoExiste(data.user.id, email, userName, userData.apellido || '')
    }
    
    // Guardar en localStorage (siempre usuario normal al registrarse)
    localStorage.setItem('userEmail', email)
    localStorage.setItem('userName', userName)
    localStorage.setItem('userRol', 'usuario')
    localStorage.setItem('userId', data.user?.id || '')
    
    console.log('✅ Usuario registrado:', userName)
    
    return {
      success: true,
      user: data.user,
      profile: {
        nombre: userName
      },
      rol: 'usuario'
    }

  } catch (error) {
    console.error('❌ Error:', error)
    return { 
      success: false, 
      error: 'Error inesperado' 
    }
  }
}

// ============================================
// VALIDAR EMAIL
// ============================================
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

// ============================================
// CERRAR SESIÓN
// ============================================
export async function logoutUser() {
  try {
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Error al cerrar sesión:', error)
  }
  
  localStorage.clear()
  sessionStorage.clear()
  window.location.href = 'login.html'
  return true
}

// ============================================
// VERIFICAR SESIÓN ACTUAL
// ============================================
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }
    
    // Obtener rol de la tabla usuarios
    let userRole = 'usuario'
    let userName = user.email.split('@')[0]
    
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('rol, nombre, apellido')
        .eq('correo', user.email)
        .maybeSingle()
      
      if (userData) {
        userRole = userData.rol || 'usuario'
        if (userData.nombre) {
          userName = userData.nombre
          if (userData.apellido) {
            userName += ' ' + userData.apellido
          }
        }
      }
    } catch (dbError) {
      console.log('Error obteniendo rol:', dbError)
    }
    
    return {
      id: user.id,
      email: user.email,
      nombre: userName,
      rol: userRole
    }
    
  } catch (error) {
    return null
  }
}

// ============================================
// VERIFICAR SI HAY SESIÓN ACTIVA
// ============================================
export async function checkSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  } catch (error) {
    return false
  }
}

// ============================================
// RECUPERAR CONTRASEÑA - CORREGIDO
// ============================================
export async function resetPassword(email, redirectUrl = null) {
  try {
    console.log('📧 Enviando recuperación a:', email)
    
    // Usar la URL actual del navegador
    const baseUrl = window.location.origin
    const resetPage = redirectUrl || `${baseUrl}/restablecer.html`
    
    console.log('🔗 URL de redirección:', resetPage)
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetPage
    })
    
    if (error) {
      console.error('❌ Error detallado:', error)
      
      // Mensajes de error más amigables
      if (error.message.includes('rate limit')) {
        return { 
          success: false, 
          error: 'Demasiados intentos. Espera 5 minutos.' 
        }
      }
      
      if (error.message.includes('User not found') || error.message.includes('Email not found')) {
        return { 
          success: false, 
          error: 'No encontramos una cuenta con ese email' 
        }
      }
      
      if (error.message.includes('Email not confirmed')) {
        return { 
          success: false, 
          error: 'Debes confirmar tu email primero. Revisa tu bandeja de entrada.' 
        }
      }
      
      // Error 500 - Problema con el proveedor de email
      if (error.status === 500 || error.message.includes('Error sending recovery email')) {
        return { 
          success: false, 
          error: '⚠️ El servicio de email no está configurado. Por favor, contacta al administrador.' 
        }
      }
      
      return { 
        success: false, 
        error: error.message 
      }
    }
    
    console.log('✅ Email enviado exitosamente a:', email)
    
    return {
      success: true,
      message: 'Email enviado correctamente'
    }
    
  } catch (error) {
    console.error('❌ Error inesperado:', error)
    return { 
      success: false, 
      error: 'Error inesperado: ' + error.message 
    }
  }
}

// ============================================
// ACTUALIZAR CONTRASEÑA
// ============================================
export async function updatePassword(newPassword) {
  try {
    console.log('🔐 Actualizando contraseña...')
    
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    
    if (error) {
      console.error('❌ Error al actualizar:', error.message)
      
      if (error.message.includes('Password should be at least 6 characters')) {
        return {
          success: false,
          error: 'La contraseña debe tener al menos 6 caracteres'
        }
      }
      
      if (error.message.includes('same as the old password')) {
        return {
          success: false,
          error: 'La nueva contraseña debe ser diferente a la anterior'
        }
      }
      
      if (error.message.includes('session_not_found') || error.message.includes('invalid token')) {
        return {
          success: false,
          error: 'El enlace de recuperación ha expirado. Por favor, solicita uno nuevo.'
        }
      }
      
      return {
        success: false,
        error: error.message
      }
    }
    
    console.log('✅ Contraseña actualizada exitosamente')
    
    return {
      success: true,
      message: 'Contraseña actualizada correctamente'
    }
    
  } catch (error) {
    console.error('❌ Error inesperado:', error)
    return {
      success: false,
      error: 'Error inesperado: ' + error.message
    }
  }
}
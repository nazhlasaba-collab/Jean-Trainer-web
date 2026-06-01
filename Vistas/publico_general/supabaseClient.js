// supabaseClient.js - VERSIÓN CORREGIDA (CON CÉDULA Y TELÉFONO)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://iketdpkxyojqxruzzrgy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZXRkcGt4eW9qcXhydXp6cmd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5ODMwNTcsImV4cCI6MjA4NTU1OTA1N30.974zKW2EMNMuCndTC6_g5zZP3mN2XZLlDsmsz8602Lk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// FUNCIÓN AUXILIAR: Crear usuario en tabla usuarios
// ============================================
async function crearUsuarioEnTabla(userId, email, nombre, apellido, cedula = null, telefono = null, rol = 'usuario') {
  try {
    console.log('📝 Creando usuario en tabla:', { userId, email, nombre, apellido, cedula, telefono })
    
    // Intentar usar la función RPC con 6 parámetros
    const { data, error } = await supabase.rpc('crear_usuario_manual', {
      p_id_usuario: userId,
      p_correo: email,
      p_nombre: nombre || email.split('@')[0],
      p_apellido: apellido || '',
      p_rol: rol,
      p_cedula: cedula || null
    })
    
    if (error) {
      console.log('⚠️ Error con RPC, intentando inserción directa:', error.message)
      
      // Si falla RPC, usar inserción directa
      const { error: insertError } = await supabase
        .from('usuarios')
        .insert({
          id_usuario: userId,
          correo: email,
          nombre: nombre || email.split('@')[0],
          apellido: apellido || '',
          rol: rol,
          cedula: cedula || null,
          telefono: telefono || null,
          created_at: new Date(),
          updated_at: new Date()
        })
        .select()
      
      if (insertError) {
        console.error('❌ Error en inserción directa:', insertError)
        return false
      }
      
      console.log('✅ Usuario creado con inserción directa')
      return true
    }
    
    console.log('✅ Usuario creado con RPC')
    
    // Si hay teléfono, actualizarlo por separado (por si acaso)
    if (telefono) {
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ telefono: telefono })
        .eq('id_usuario', userId)
      
      if (updateError) {
        console.warn('⚠️ No se pudo actualizar teléfono:', updateError)
      } else {
        console.log('✅ Teléfono actualizado')
      }
    }
    
    return true
  } catch (error) {
    console.error('❌ Error en crearUsuarioEnTabla:', error)
    return false
  }
}

// ============================================
// LOGIN - CON DETECCIÓN DE ROL
// ============================================
export async function loginUser(email, password) {
  try {
    console.log('🔐 Intentando login:', email)
    
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
    
    let userRole = 'usuario'
    let userName = data.user.user_metadata?.nombre || email.split('@')[0]
    let userCedula = null
    
    try {
      console.log('🔍 Verificando rol en tabla usuarios...')
      
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('rol, nombre, apellido, cedula')
        .eq('correo', email)
        .maybeSingle()
      
      if (!userError && userData) {
        userRole = userData.rol || 'usuario'
        userCedula = userData.cedula || null
        if (userData.nombre) {
          userName = userData.nombre
          if (userData.apellido) {
            userName += ' ' + userData.apellido
          }
        }
        console.log('✅ Rol encontrado en DB:', userRole)
      } else {
        console.log('ℹ️ Usuario no encontrado en tabla, creándolo...')
        await crearUsuarioEnTabla(data.user.id, email, userName, data.user.user_metadata?.apellido || '', null, null, 'usuario')
      }
    } catch (dbError) {
      console.log('⚠️ Error consultando DB:', dbError)
    }
    
    localStorage.setItem('userEmail', email)
    localStorage.setItem('userName', userName)
    localStorage.setItem('userRol', userRole)
    localStorage.setItem('userId', data.user.id)
    if (userCedula) localStorage.setItem('userCedula', userCedula)
    
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
// REGISTRO - CORREGIDO CON CÉDULA Y TELÉFONO
// ============================================
export async function registerUser(email, password, userData = {}) {
  try {
    console.log('📝 Registrando usuario:', { email, userData })
    
    // 1. Registrar en Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          nombre: userData.nombre || email.split('@')[0],
          apellido: userData.apellido || '',
          cedula: userData.cedula || null,
          telefono: userData.telefono || ''
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

    if (!data.user) {
      return { 
        success: false, 
        error: 'Error al crear el usuario' 
      }
    }

    const userName = userData.nombre || email.split('@')[0]
    const userApellido = userData.apellido || ''
    const userCedula = userData.cedula || null
    const userTelefono = userData.telefono || null

    console.log('✅ Usuario creado en Auth, ID:', data.user.id)
    
    // 2. Crear usuario en la tabla usuarios (con cédula y teléfono)
    const creado = await crearUsuarioEnTabla(
      data.user.id, 
      email, 
      userName, 
      userApellido, 
      userCedula, 
      userTelefono, 
      'usuario'
    )
    
    if (!creado) {
      console.warn('⚠️ No se pudo crear el usuario en la tabla, pero el Auth está listo')
    }
    
    // 3. Guardar en localStorage
    localStorage.setItem('userEmail', email)
    localStorage.setItem('userName', userName)
    localStorage.setItem('userRol', 'usuario')
    localStorage.setItem('userId', data.user.id)
    if (userCedula) localStorage.setItem('userCedula', userCedula)
    
    console.log('✅ Registro completado:', { userName, userCedula, userTelefono })
    
    return {
      success: true,
      user: data.user,
      profile: {
        nombre: userName,
        apellido: userApellido,
        cedula: userCedula,
        telefono: userTelefono
      },
      rol: 'usuario'
    }

  } catch (error) {
    console.error('❌ Error en registerUser:', error)
    return { 
      success: false, 
      error: error.message || 'Error inesperado en el registro' 
    }
  }
}

// ============================================
// ACTUALIZAR PERFIL DE USUARIO
// ============================================
export async function updateUserProfile(userId, updates) {
  try {
    console.log('📝 Actualizando perfil:', { userId, updates })
    
    const { error } = await supabase
      .from('usuarios')
      .update({
        ...updates,
        updated_at: new Date()
      })
      .eq('id_usuario', userId)
    
    if (error) throw error
    
    console.log('✅ Perfil actualizado')
    return { success: true }
    
  } catch (error) {
    console.error('❌ Error actualizando perfil:', error)
    return { success: false, error: error.message }
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
    
    let userRole = 'usuario'
    let userName = user.email.split('@')[0]
    let userCedula = null
    let userTelefono = null
    
    try {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('rol, nombre, apellido, cedula, telefono')
        .eq('correo', user.email)
        .maybeSingle()
      
      if (userData) {
        userRole = userData.rol || 'usuario'
        userCedula = userData.cedula || null
        userTelefono = userData.telefono || null
        if (userData.nombre) {
          userName = userData.nombre
          if (userData.apellido) {
            userName += ' ' + userData.apellido
          }
        }
      }
    } catch (dbError) {
      console.log('Error obteniendo datos:', dbError)
    }
    
    return {
      id: user.id,
      email: user.email,
      nombre: userName,
      rol: userRole,
      cedula: userCedula,
      telefono: userTelefono
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
// RECUPERAR CONTRASEÑA
// ============================================
export async function resetPassword(email, redirectUrl = null) {
  try {
    console.log('📧 Enviando recuperación a:', email)
    
    const baseUrl = window.location.origin
    const resetPage = redirectUrl || `${baseUrl}/restablecer.html`
    
    console.log('🔗 URL de redirección:', resetPage)
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetPage
    })
    
    if (error) {
      console.error('❌ Error detallado:', error)
      
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

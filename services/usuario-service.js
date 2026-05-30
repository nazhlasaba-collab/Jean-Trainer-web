// services/usuario-service.js - VERSIÓN CORREGIDA
import { supabase } from './supabaseClient.js'

export const usuarioService = {
  // Obtener perfil del usuario actual
  async getMiPerfil() {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { data: null, error: 'No autenticado' }
    }
    
    return await supabase
      .from('usuarios')
      .select(`
        *,
        membresias (*)
      `)
      .eq('id_usuario', user.id)
      .single()
  },

  // Actualizar perfil del usuario actual
  async actualizarMiPerfil(usuarioData) {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }
    
    return await supabase
      .from('usuarios')
      .update(usuarioData)
      .eq('id_usuario', user.id)
      .select()
      .single()
  },

  // Obtener todos los usuarios (solo admin - RLS permite)
  async obtenerTodosUsuarios() {
    return await supabase
      .from('vista_usuarios_membresias')  // ✅ Usar vista en lugar de tabla directa
      .select('*')
      .order('created_at', { ascending: false })
  },

  // Actualizar usuario (admin puede actualizar cualquier usuario)
  async actualizarUsuario(idUsuario, usuarioData) {
    return await supabase
      .from('usuarios')
      .update(usuarioData)
      .eq('id_usuario', idUsuario)
      .select()
      .single()
  },

  // Obtener usuario por ID
  async obtenerUsuarioPorId(idUsuario) {
    return await supabase
      .from('usuarios')
      .select(`
        *,
        membresias (*),
        rutinas:código_membresia (
          *,
          rutinas (*)
        )
      `)
      .eq('id_usuario', idUsuario)
      .single()
  },

  // Crear usuario (solo admin - usa función almacenada)
  async crearUsuarioCompleto(usuarioData) {
    return await supabase.rpc('crear_usuario_con_membresia', {
      p_correo: usuarioData.correo,
      p_nombre: usuarioData.nombre,
      p_apellido: usuarioData.apellido,
      p_rol: usuarioData.rol || 'usuario',
      p_tipo_membresia: usuarioData.tipo_membresia || 'standard'
    })
  }
}
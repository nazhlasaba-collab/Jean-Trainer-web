// services/rutina-service.js - VERSIÓN CORREGIDA
import { supabase } from './supabaseClient.js'

export const rutinaService = {
  // Obtener rutinas del usuario actual
  async obtenerMisRutinas() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }
    
    // Primero obtener la membresía del usuario
    const { data: membresia, error: membresiaError } = await supabase
      .from('membresias')
      .select('cod_membresia')
      .eq('id_usuario', user.id)
      .single()
    
    if (membresiaError || !membresia) {
      return { data: [], error: 'No tienes membresía activa' }
    }
    
    // Luego obtener rutinas de esa membresía
    return await supabase
      .from('rutinas')
      .select(`
        *,
        creado_por:creado_por (nombre, apellido)
      `)
      .eq('cod_membresia', membresia.cod_membresia)
      .order('fecha_inicio', { ascending: false })
  },

  // Crear nueva rutina (solo admin/entrenador)
  async crearRutina(rutinaData) {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { data: null, error: 'No autenticado' }
    }
    
    // Añadir quien crea la rutina
    const rutinaCompleta = {
      ...rutinaData,
      creado_por: user.id,
      fecha_inicio: new Date().toISOString().split('T')[0]
    }
    
    return await supabase
      .from('rutinas')
      .insert([rutinaCompleta])
      .select()
      .single()
  },

  // Actualizar rutina (solo admin/entrenador)
  async actualizarRutina(codRutina, rutinaData) {
    return await supabase
      .from('rutinas')
      .update(rutinaData)
      .eq('cod_rutina', codRutina)
      .select()
      .single()
  },

  // Eliminar rutina (solo admin)
  async eliminarRutina(codRutina) {
    return await supabase
      .from('rutinas')
      .delete()
      .eq('cod_rutina', codRutina)
  },

  // Obtener todas las rutinas (solo admin/entrenador)
  async obtenerTodasRutinas() {
    return await supabase
      .from('vista_rutinas_detalladas')  // ✅ Usar vista que creamos
      .select('*')
      .order('fecha_inicio', { ascending: false })
  },

  // Obtener rutinas por usuario (admin/entrenador)
  async obtenerRutinasPorUsuario(idUsuario) {
    // Obtener membresía del usuario
    const { data: membresia, error: membresiaError } = await supabase
      .from('membresias')
      .select('cod_membresia')
      .eq('id_usuario', idUsuario)
      .single()
    
    if (membresiaError || !membresia) {
      return { data: [], error: 'Usuario no tiene membresía' }
    }
    
    return await supabase
      .from('rutinas')
      .select('*')
      .eq('cod_membresia', membresia.cod_membresia)
      .order('fecha_inicio', { ascending: false })
  }
}
// load-dependencies.js
import { supabase, testSupabaseConnection } from './services/supabase-client.js';

// Hacer disponible globalmente
window.supabase = supabase;
window.testSupabaseConnection = testSupabaseConnection;

console.log('🚀 Dependencies loaded');
console.log('Supabase:', supabase ? '✅ Loaded' : '❌ Failed');

// Prueba automática en desarrollo
(async () => {
  if (import.meta.env.DEV) {
    console.log('🔄 Testing Supabase connection...');
    const result = await testSupabaseConnection();
    if (result.success) {
      console.log('🎉 ¡Supabase conectado correctamente!');
    }
  }
})();

export { supabase, testSupabaseConnection };
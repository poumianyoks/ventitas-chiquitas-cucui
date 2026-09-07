import { createClient } from '@supabase/supabase-js'

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!rawSupabaseUrl || !supabaseKey) {
  throw new Error(
    'Faltan las variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local'
  )
}

/*
  Algunas pantallas de Supabase muestran la API URL terminada
  en /rest/v1.

  createClient() necesita solamente la URL base del proyecto,
  por ejemplo:

  https://xxxxxxxx.supabase.co

  Por eso eliminamos /rest/v1 automáticamente si estuviera presente.
*/

const supabaseUrl = rawSupabaseUrl
  .trim()
  .replace(/\/rest\/v1\/?$/i, '')
  .replace(/\/+$/, '')

console.log('Supabase conectado a:', supabaseUrl)

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
)
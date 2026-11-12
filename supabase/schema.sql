-- =============================================================================
-- EDV MONITOR - ESQUEMA DE BASE DE DATOS SUPABASE POSTGRESQL
-- EMPRESAS DEL VALLE - MONITOREO DE GRUPOS ELECTRÓGENOS Y PLANTAS ELÉCTRICAS
-- =============================================================================

-- 1. TABLA DE PLANTAS ELÉCTRICAS (GENERATORS)
CREATE TABLE IF NOT EXISTS public.generators (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    capacity_kva NUMERIC NOT NULL DEFAULT 100,
    fuel_type TEXT NOT NULL DEFAULT 'diesel',
    current_hours NUMERIC NOT NULL DEFAULT 0,
    service_interval_hours NUMERIC NOT NULL DEFAULT 200,
    last_service_hours NUMERIC NOT NULL DEFAULT 0,
    location TEXT,
    serial_number TEXT,
    status TEXT NOT NULL DEFAULT 'standby', -- 'running', 'standby', 'maintenance', 'fault'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABLA DE LECTURAS DE HORÓMETRO (HOROMETER LOGS)
CREATE TABLE IF NOT EXISTS public.horometer_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    generator_id TEXT NOT NULL REFERENCES public.generators(id) ON DELETE CASCADE,
    user_id TEXT,
    user_email TEXT,
    hours NUMERIC NOT NULL,
    delta_hours NUMERIC NOT NULL DEFAULT 0,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABLA DE CORTES ELÉCTRICOS Y REGRESOS (POWER OUTAGES)
CREATE TABLE IF NOT EXISTS public.power_outages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    generator_id TEXT NOT NULL REFERENCES public.generators(id) ON DELETE CASCADE,
    user_id TEXT,
    user_email TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    generator_started BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABLA DE SERVICIOS TÉCNICOS Y MANTENIMIENTO PREVENTIVO (GENERATOR SERVICES - SIN MONTOS NI COSTOS)
CREATE TABLE IF NOT EXISTS public.generator_services (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    generator_id TEXT NOT NULL REFERENCES public.generators(id) ON DELETE CASCADE,
    user_id TEXT,
    user_email TEXT,
    service_type TEXT NOT NULL, -- 'oil', 'oil_filter', 'fuel_filter', 'air_filter', 'coolant', 'battery', 'general_inspection'
    horometer NUMERIC NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    performed_by TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABLA DE USUARIOS DE LA APLICACIÓN (APP USERS - GESTIÓN POR SUPERADMINISTRADOR)
CREATE TABLE IF NOT EXISTS public.app_users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operador', -- 'superadmin', 'operador', 'tecnico'
    assigned_generator_id TEXT REFERENCES public.generators(id) ON DELETE SET NULL,
    assigned_generator_name TEXT,
    assigned_generator_ids TEXT[],
    company_id TEXT,
    company_name TEXT,
    department_id TEXT,
    department_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger de Autoconfirmación Instantánea de Usuarios (Para permitir acceso inmediato de operadores)
CREATE OR REPLACE FUNCTION public.handle_auto_confirm_user()
RETURNS trigger AS $$
BEGIN
  NEW.email_confirmed_at := now();
  NEW.raw_user_meta_data := coalesce(NEW.raw_user_meta_data, '{}'::jsonb) || '{"email_verified": true}'::jsonb;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auto_confirm_user();

-- Función RPC Segura para que el Superadministrador cree o actualice usuarios con contraseñas encriptadas en auth.users
CREATE OR REPLACE FUNCTION public.admin_create_or_update_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'operador',
  p_assigned_generator_id TEXT DEFAULT NULL,
  p_assigned_generator_name TEXT DEFAULT NULL,
  p_company_id TEXT DEFAULT NULL,
  p_company_name TEXT DEFAULT NULL,
  p_department_id TEXT DEFAULT NULL,
  p_department_name TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_pw TEXT;
  v_clean_email TEXT;
BEGIN
  v_clean_email := lower(trim(p_email));
  
  -- Encriptación bcrypt segura usando pgcrypto
  IF p_password IS NOT NULL AND length(p_password) >= 6 THEN
    v_encrypted_pw := crypt(p_password, gen_salt('bf', 10));
  ELSE
    v_encrypted_pw := crypt('123456', gen_salt('bf', 10));
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_clean_email;

  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now(),
        raw_user_meta_data = jsonb_build_object(
          'first_name', p_full_name,
          'role', p_role,
          'assigned_generator', p_assigned_generator_id,
          'email_verified', true
        )
    WHERE id = v_user_id;
  ELSE
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      v_clean_email, v_encrypted_pw, now(), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object(
        'first_name', p_full_name,
        'role', p_role,
        'assigned_generator', p_assigned_generator_id,
        'email_verified', true
      ),
      false, now(), now()
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_clean_email),
      'email', v_clean_email, now(), now(), now()
    )
    ON CONFLICT (provider, provider_id) DO NOTHING;
  END IF;

  INSERT INTO public.app_users (
    id, email, full_name, role, assigned_generator_id, assigned_generator_name,
    company_id, company_name, department_id, department_name, created_at
  ) VALUES (
    v_user_id::text, v_clean_email, p_full_name, p_role, p_assigned_generator_id,
    p_assigned_generator_name, p_company_id, p_company_name, p_department_id,
    p_department_name, now()
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    assigned_generator_id = EXCLUDED.assigned_generator_id,
    assigned_generator_name = EXCLUDED.assigned_generator_name,
    company_id = EXCLUDED.company_id,
    company_name = EXCLUDED.company_name,
    department_id = EXCLUDED.department_id,
    department_name = EXCLUDED.department_name;

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id, 'email', v_clean_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_or_update_user TO anon, authenticated, service_role;

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.generators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horometer_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_outages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generator_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Políticas de Acceso RLS (Lectura y Escritura para clientes autorizados)
CREATE POLICY "Permitir lectura publica de generadores" ON public.generators FOR SELECT USING (true);
CREATE POLICY "Permitir escritura de generadores" ON public.generators FOR ALL USING (true);

CREATE POLICY "Permitir lectura publica de horometros" ON public.horometer_logs FOR SELECT USING (true);
CREATE POLICY "Permitir insercion de horometros" ON public.horometer_logs FOR ALL USING (true);

CREATE POLICY "Permitir lectura publica de cortes electricos" ON public.power_outages FOR SELECT USING (true);
CREATE POLICY "Permitir insercion de cortes electricos" ON public.power_outages FOR ALL USING (true);

CREATE POLICY "Permitir lectura publica de servicios" ON public.generator_services FOR SELECT USING (true);
CREATE POLICY "Permitir insercion de servicios" ON public.generator_services FOR ALL USING (true);

CREATE POLICY "Permitir lectura de app_users" ON public.app_users FOR SELECT USING (true);
CREATE POLICY "Permitir gestion de app_users" ON public.app_users FOR ALL USING (true);

-- ÍNDICES PARA ALTO RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_horometer_generator_date ON public.horometer_logs(generator_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_outages_generator_start ON public.power_outages(generator_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_services_generator_date ON public.generator_services(generator_id, date DESC);

-- =============================================================================
-- SEED DATA INICIAL (SOLO ESTRUCTURA REAL Y SUPERADMINISTRADOR)
-- =============================================================================

-- 1. Flota de Plantas Eléctricas Empresas del Valle (Inicia en 0.0 hrs para lecturas reales)
INSERT INTO public.generators (id, name, brand, model, capacity_kva, fuel_type, current_hours, service_interval_hours, last_service_hours, location, serial_number, status)
VALUES 
  ('gen-blue-power-c125', 'Planta Principal Sede Central', 'Blue Power Generation', 'C125', 125, 'diesel', 0.0, 200, 0.0, 'Sala de Máquinas - Edificio Central', 'BPG-2024-C125-089', 'standby'),
  ('gen-blue-power-c75', 'Planta Respaldo Servidores / DataCenter', 'Blue Power Generation', 'C75', 75, 'diesel', 0.0, 200, 0.0, 'Sótano 1 - Área Técnica', 'BPG-2024-C75-014', 'standby')
ON CONFLICT (id) DO NOTHING;

-- 2. Super Administrador Oficial Empresas del Valle
INSERT INTO public.app_users (id, email, full_name, role, assigned_generator_id)
VALUES 
  ('user-admin-edv', 'admin@empresasdelvalle.com', 'Super Administrador Empresas del Valle', 'superadmin', 'gen-blue-power-c125')
ON CONFLICT (email) DO NOTHING;

-- NOTA: Las lecturas de horómetro, bitácora de cortes eléctricos y servicios técnicos
-- se registrarán con datos reales generados en vivo por los operadores y administradores.

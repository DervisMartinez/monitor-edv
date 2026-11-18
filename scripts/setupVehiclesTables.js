const path = require('path');
const { Client } = require('pg');

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(path.join(__dirname, '../.env'));
  } catch {}
} else {
  try {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
  } catch {}
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: DATABASE_URL no encontrada en .env');
  process.exit(1);
}

async function setupVehiclesTables() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Conectado a Supabase PostgreSQL.');

    // 1. Extender app_users para múltiples plantas y ficha de piloto/conductor
    await client.query(`
      ALTER TABLE public.app_users
        ADD COLUMN IF NOT EXISTS assigned_generator_ids jsonb DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS assigned_generator_names jsonb DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS dni text,
        ADD COLUMN IF NOT EXISTS phone text,
        ADD COLUMN IF NOT EXISTS blood_type text,
        ADD COLUMN IF NOT EXISTS license_grade text,
        ADD COLUMN IF NOT EXISTS emergency_contact_name text,
        ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
        ADD COLUMN IF NOT EXISTS city text;
    `);
    console.log('Tabla app_users actualizada (assigned_generator_ids y ficha piloto).');

    // Backfill assigned_generator_ids donde aún sea vacío y exista assigned_generator_id
    await client.query(`
      UPDATE public.app_users
      SET assigned_generator_ids = jsonb_build_array(assigned_generator_id)
      WHERE (assigned_generator_ids IS NULL OR assigned_generator_ids = '[]'::jsonb)
        AND assigned_generator_id IS NOT NULL
        AND assigned_generator_id <> '';
    `);

    // 2. Tabla de Vehículos Corporativos (Motos & Carros)
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.vehicles (
        id text PRIMARY KEY,
        name text,
        brand text NOT NULL,
        model text NOT NULL,
        year integer NOT NULL DEFAULT 2024,
        plate text,
        vehicle_type text NOT NULL DEFAULT 'moto',
        category text,
        current_odometer numeric NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'operativo',
        company_id text,
        company_name text,
        department_id text,
        department_name text,
        assigned_user_id text,
        assigned_user_name text,
        assigned_user_email text,
        driver_dni text,
        driver_phone text,
        driver_blood_type text,
        driver_license_grade text,
        driver_emergency_contact text,
        driver_emergency_phone text,
        driver_city text,
        image_url text,
        custom_image_uri text,
        catalog_id text,
        notes text,
        is_from_agency boolean DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_user ON public.vehicles(assigned_user_id);
      CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_email ON public.vehicles(assigned_user_email);
    `);
    console.log('Tabla public.vehicles lista.');

    // 3. Tabla de Servicios y Combustible de Vehículos
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.vehicle_services (
        id text PRIMARY KEY,
        vehicle_id text NOT NULL,
        user_id text,
        user_email text,
        type text NOT NULL,
        date text NOT NULL,
        odometer numeric NOT NULL DEFAULT 0,
        cost_usd numeric DEFAULT 0,
        liters numeric DEFAULT 0,
        notes text,
        performed_by text,
        is_agency boolean DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_vehicle_services_vehicle_id ON public.vehicle_services(vehicle_id);
    `);
    console.log('Tabla public.vehicle_services lista.');

    // 4. Tabla de Historial de Odómetros de Vehículos
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.vehicle_odometer_logs (
        id text PRIMARY KEY,
        vehicle_id text NOT NULL,
        user_id text,
        user_email text,
        odometer numeric NOT NULL DEFAULT 0,
        delta_km numeric DEFAULT 0,
        date text NOT NULL,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_vehicle_odometer_logs_vehicle_id ON public.vehicle_odometer_logs(vehicle_id);
    `);
    console.log('Tabla public.vehicle_odometer_logs lista.');

    // 5. Tabla de Documentos Legales / Billetera Digital
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.vehicle_documents (
        id text PRIMARY KEY,
        vehicle_id text NOT NULL,
        user_id text,
        driver_name text,
        doc_category text NOT NULL DEFAULT 'vehicle',
        title text NOT NULL,
        doc_number text NOT NULL,
        issue_date text,
        expiry_date text NOT NULL,
        is_permanent boolean DEFAULT false,
        image_url text,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle_id ON public.vehicle_documents(vehicle_id);
    `);
    console.log('Tabla public.vehicle_documents lista.');

    // 6. Habilitar RLS y políticas compatibles con app corporativa EDV
    const tables = ['vehicles', 'vehicle_services', 'vehicle_odometer_logs', 'vehicle_documents'];
    for (const tbl of tables) {
      await client.query(`ALTER TABLE public.${tbl} ENABLE ROW LEVEL SECURITY;`);
      await client.query(`DROP POLICY IF EXISTS "Permitir todo ${tbl}" ON public.${tbl};`);
      await client.query(`
        CREATE POLICY "Permitir todo ${tbl}"
          ON public.${tbl}
          FOR ALL
          USING (true)
          WITH CHECK (true);
      `);
    }
    console.log('Políticas RLS aplicadas en tablas vehiculares.');

    // 7. Publicación Realtime en vivo (8081 <-> 8082)
    for (const tbl of tables) {
      await client.query(`
        DO $$ BEGIN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.${tbl};
        EXCEPTION WHEN duplicate_object THEN null;
        WHEN undefined_object THEN null;
        END $$;
      `);
    }
    console.log('Realtime habilitado para tablas vehiculares.');

    // 8. Bucket Storage público para documentos/fotos vehiculares
    await client.query(`
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('vehicle-docs', 'vehicle-docs', true)
      ON CONFLICT (id) DO UPDATE SET public = true;
    `);
    await client.query(`
      DO $$ BEGIN
        DROP POLICY IF EXISTS "vehicle_docs_select" ON storage.objects;
        DROP POLICY IF EXISTS "vehicle_docs_insert" ON storage.objects;
        DROP POLICY IF EXISTS "vehicle_docs_update" ON storage.objects;
        DROP POLICY IF EXISTS "vehicle_docs_delete" ON storage.objects;

        CREATE POLICY "vehicle_docs_select" ON storage.objects FOR SELECT USING (bucket_id = 'vehicle-docs');
        CREATE POLICY "vehicle_docs_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vehicle-docs');
        CREATE POLICY "vehicle_docs_update" ON storage.objects FOR UPDATE USING (bucket_id = 'vehicle-docs');
        CREATE POLICY "vehicle_docs_delete" ON storage.objects FOR DELETE USING (bucket_id = 'vehicle-docs');
      EXCEPTION WHEN OTHERS THEN null; END $$;
    `);
    console.log('Bucket vehicle-docs configurado.');
  } finally {
    await client.end();
  }
}

setupVehiclesTables().catch((err) => {
  console.error('Error configurando tablas vehiculares:', err);
  process.exit(1);
});

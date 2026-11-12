const path = require('path');
const { Client } = require('pg');

if (typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile(path.join(__dirname, '../.env')); } catch (e) {}
} else {
  try { require('dotenv').config({ path: path.join(__dirname, '../.env') }); } catch (e) {}
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.log('DATABASE_URL no configurada, se usará persistencia local.');
  process.exit(0);
}

const setupDB = async () => {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL for Generator Tables setup.');

    // 1. Generators table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.generators (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        brand TEXT NOT NULL,
        model TEXT NOT NULL,
        capacity_kva NUMERIC NOT NULL,
        fuel_type TEXT NOT NULL DEFAULT 'diesel',
        current_hours NUMERIC DEFAULT 0,
        service_interval_hours NUMERIC DEFAULT 200,
        last_service_hours NUMERIC DEFAULT 0,
        location TEXT,
        serial_number TEXT,
        status TEXT DEFAULT 'standby',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);
    console.log('Table generators created/verified.');

    // 2. Horometer Logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.horometer_logs (
        id TEXT PRIMARY KEY,
        generator_id TEXT,
        user_id TEXT,
        user_email TEXT,
        hours NUMERIC NOT NULL,
        delta_hours NUMERIC DEFAULT 0,
        date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);
    console.log('Table horometer_logs created/verified.');

    // 3. Power Outages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.power_outages (
        id TEXT PRIMARY KEY,
        generator_id TEXT,
        user_id TEXT,
        user_email TEXT,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE,
        duration_minutes INTEGER,
        generator_started BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);
    console.log('Table power_outages created/verified.');

    // 4. Generator Services table (NO AMOUNT / NO COST)
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.generator_services (
        id TEXT PRIMARY KEY,
        generator_id TEXT,
        user_id TEXT,
        user_email TEXT,
        service_type TEXT NOT NULL,
        horometer NUMERIC NOT NULL,
        date TEXT NOT NULL,
        performed_by TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);
    console.log('Table generator_services created/verified.');

    // 5. App Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.app_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'operador',
        assigned_generator_id TEXT,
        last_active TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);
    console.log('Table app_users created/verified.');

  } catch (err) {
    console.error('Error during setup:', err.message);
  } finally {
    await client.end();
  }
};

setupDB();

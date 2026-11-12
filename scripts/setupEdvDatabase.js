const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Cargar .env
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(path.join(__dirname, '../.env'));
  } catch (e) {}
} else {
  try {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
  } catch (e) {}
}

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

console.log('Connecting to Supabase PostgreSQL at:', connectionString ? connectionString.replace(/:[^:]*@/, ':****@') : 'UNDEFINED');

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conexión exitosa a Supabase PostgreSQL!');

    const sqlPath = path.join(__dirname, '../supabase/schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('⏳ Ejecutando schema.sql...');
    await client.query(sql);
    console.log('✅ Esquema y tablas creadas exitosamente en Supabase:');
    console.log('   - generators');
    console.log('   - horometer_logs');
    console.log('   - power_outages');
    console.log('   - generator_services');
    console.log('   - app_users');

    const res = await client.query('SELECT count(*) FROM public.generators;');
    console.log(`📊 Generadores base registrados en la nube: ${res.rows[0].count}`);

    const resUsers = await client.query('SELECT email, full_name, role FROM public.app_users;');
    console.log('👤 Usuarios en la nube:', resUsers.rows);

  } catch (err) {
    console.error('❌ Error conectando o ejecutando SQL:', err.message);
  } finally {
    await client.end();
  }
}

run();

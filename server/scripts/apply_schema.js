import fs from 'fs';
import path from 'path';
import { query, getClient } from '../db.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
    console.log('🚀 Starting schema migration...');
    const client = await getClient();

    try {
        const migrations = [
            '002_files_schema.sql',
            '003_fix_files_schema.sql'
        ];

        for (const migration of migrations) {
            const filePath = path.join(__dirname, '../migrations', migration);
            console.log(`📄 Reading ${migration}...`);
            const sql = fs.readFileSync(filePath, 'utf8');

            console.log(`⚡ Executing ${migration}...`);
            await client.query(sql);
            console.log(`✅ ${migration} applied successfully.`);
        }

        console.log('🎉 All migrations applied successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        process.exit();
    }
}

runMigrations();

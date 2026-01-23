import { query } from '../db.js';

async function migrate() {
    try {
        console.log('Adding order_index to projects table...');
        await query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0');

        console.log('Initializing order_index for existing projects...');
        const { rows: projects } = await query('SELECT id FROM projects ORDER BY created_at ASC');

        for (let i = 0; i < projects.length; i++) {
            await query('UPDATE projects SET order_index = $1 WHERE id = $2', [i, projects[i].id]);
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();

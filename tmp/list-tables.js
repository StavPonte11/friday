const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://friday:friday_password@localhost:5433/friday_portal?schema=public' });

async function main() {
    try {
        await client.connect();
        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
        console.log("Tables in database:");
        console.log(res.rows.map(r => r.table_name).sort());
    } catch (err) {
        console.error("Error connecting to database:", err);
    } finally {
        await client.end();
    }
}

main();

const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://friday:friday_password@localhost:5433/friday_portal?schema=public' });

async function main() {
    try {
        await client.connect();
        const res = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='PmComment'");
        console.log("Columns in PmComment:");
        res.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type} (Nullable: ${r.is_nullable})`));
        
        const res2 = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='PmCommentMention'");
        console.log("\nColumns in PmCommentMention:");
        res2.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type} (Nullable: ${r.is_nullable})`));
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

main();

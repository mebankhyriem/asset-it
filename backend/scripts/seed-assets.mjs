import { readFileSync } from "fs";
import mysql from "mysql2/promise";

function loadEnvLocal() {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf-8");
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}
loadEnvLocal();

const TYPES = ["Laptop", "Desktop", "Monitor", "Printer", "Scanner", "Router", "Switch", "UPS", "Projector", "Phone", "Tablet", "Server", "Workstation", "Hub"];
const STATUSES = ["Available", "Available", "Available", "Assigned", "Assigned", "Maintenance"];
const DESCRIPTIONS = [
  "Good condition", "Minor scratches", "Refurbished unit", "New in box",
  "Slightly used", "Factory reset done", "Needs inspection", null, null, null
];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pad(n) { return String(n).padStart(3, "0"); }

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  const [[imUser]] = await conn.query("SELECT id FROM users WHERE role = 'INVENTORY_MANAGER' LIMIT 1");
  if (!imUser) { console.error("No INVENTORY_MANAGER found. Run the app first to seed the DB."); process.exit(1); }

  const [departments] = await conn.query("SELECT id FROM departments");
  if (departments.length === 0) { console.error("No departments found."); process.exit(1); }

  const year = new Date().getFullYear();
  let added = 0;

  for (let i = 1; i <= 100; i++) {
    const type = rand(TYPES);
    const assetId = `AST-${year}-${pad(i)}`;
    const serial = `SN-${type.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const status = rand(STATUSES);
    const dept = rand(departments);
    const desc = rand(DESCRIPTIONS);

    const [result] = await conn.query(`
      INSERT IGNORE INTO assets (asset_id, asset_type, serial_number, description, status, department_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [assetId, type, serial, desc, status, dept.id, imUser.id]);
    if (result.affectedRows > 0) added++;
  }

  console.log(`✓ Added ${added} assets successfully.`);
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

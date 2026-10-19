// One-time backfill: assets that were already assigned before the asset-id-from-serial
// change still have their original DSK-2026-NNN sequence id. Rewrite each one's trailing
// segment to its serial number, e.g. DSK-2026-001 -> DSK-2026-987654321.
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

function buildAssetIdFromSerial(currentAssetId, serial) {
  const prefix = currentAssetId.split("-").slice(0, -1).join("-");
  return `${prefix}-${serial}`;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  const [assets] = await conn.query(`
    SELECT id, asset_id, serial_number FROM assets
    WHERE serial_number IS NOT NULL AND TRIM(serial_number) != ''
  `);

  let changed = 0;
  for (const a of assets) {
    const newAssetId = buildAssetIdFromSerial(a.asset_id, a.serial_number.trim());
    if (newAssetId === a.asset_id) continue;

    const [[conflict]] = await conn.query("SELECT id FROM assets WHERE asset_id = ? AND id != ?", [newAssetId, a.id]);
    if (conflict) {
      console.warn(`Skipped asset ${a.id}: "${newAssetId}" already in use by asset ${conflict.id}`);
      continue;
    }

    await conn.query("UPDATE assets SET asset_id=?, updated_at=NOW() WHERE id=?", [newAssetId, a.id]);
    console.log(`${a.asset_id} -> ${newAssetId}`);
    changed++;
  }

  console.log(`\n✓ Updated ${changed} asset id(s).`);
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

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

const WORKER_NAMES = [
  "Rajesh Kumar", "Priya Sharma", "Amit Singh", "Sunita Verma", "Deepak Patel",
  "Neha Gupta", "Rohit Yadav", "Kavita Joshi", "Suresh Nair", "Anita Mehta",
  "Vikram Bose", "Pooja Reddy", "Manoj Tiwari", "Rekha Iyer", "Sanjay Dubey",
  "Lakshmi Pillai", "Arjun Chatterjee", "Meena Saxena", "Rahul Mishra", "Divya Krishnan"
];

const DESIGNATIONS = [
  "Lab Technician", "System Administrator", "Network Engineer", "IT Support Staff",
  "Data Entry Operator", "Office Assistant", "Research Assistant", "Field Officer",
  "Senior Technician", "Junior Engineer"
];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pastDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  const [[imUser]] = await conn.query("SELECT id FROM users WHERE role = 'INVENTORY_MANAGER' LIMIT 1");
  const [departments] = await conn.query("SELECT id FROM departments");
  const [assignedAssets] = await conn.query("SELECT * FROM assets WHERE status = 'Assigned'");

  let counter = 200;

  await conn.query("START TRANSACTION");
  try {
    for (const asset of assignedAssets) {
      const issuedDaysAgo = randInt(30, 600);
      const issuedDate = pastDate(issuedDaysAgo);
      const eolDate = new Date(issuedDate);
      eolDate.setFullYear(eolDate.getFullYear() + 3);
      const eolStr = eolDate.toISOString().split("T")[0];

      const reqNum = `REQ-SEED-${String(counter++).padStart(4, "0")}`;
      const workerName = rand(WORKER_NAMES);
      const empId = `EMP-S${String(randInt(100, 999))}`;
      const dept = rand(departments);
      const designation = rand(DESIGNATIONS);
      const phone = `+91-${randInt(7000000000, 9999999999)}`;
      const email = `${workerName.split(" ")[0].toLowerCase()}${randInt(1,99)}@example.com`;
      const createdAt = pastDate(issuedDaysAgo + randInt(1, 7));

      const [result] = await conn.query(`
        INSERT INTO requests (
          request_number, requested_by, department_id, request_type,
          asset_type, quantity, justification,
          requester_name, requester_employee_id, requester_email,
          requester_designation, requester_phone,
          status, allocated_asset_id, allocation_date,
          assigned_to_name, condition_on_issue, acknowledged,
          created_at, updated_at
        ) VALUES (?, ?, ?, 'New Asset', ?, 1, ?, ?, ?, ?, ?, ?, 'Issued', ?, ?, ?, ?, 1, ?, ?)
      `, [
        reqNum, imUser.id, dept.id, asset.asset_type,
        `Required for departmental use — ${asset.asset_type}`,
        workerName, empId, email, designation, phone,
        asset.id, issuedDate, workerName, "Good",
        createdAt, issuedDate
      ]);

      const reqId = result.insertId;

      // Insert all 4 approval steps as Approved
      const steps = ["IM Initial Review", "JIO Approval", "SIO Approval", "IM Final Processing"];
      for (const step of steps) {
        await conn.query(`
          INSERT INTO approvals (request_id, step, status, reviewer_id, reviewed_at, created_at)
          VALUES (?, ?, 'Approved', ?, ?, ?)
        `, [reqId, step, imUser.id, issuedDate, createdAt]);
      }

      // Set issued_date and end_of_life_date on the asset
      await conn.query(`
        UPDATE assets SET issued_date=?, end_of_life_date=?, updated_at=NOW() WHERE id=?
      `, [issuedDate, eolStr, asset.id]);
    }
    await conn.query("COMMIT");
  } catch (err) {
    await conn.query("ROLLBACK");
    throw err;
  }

  console.log(`✓ Created ${assignedAssets.length} issued requests with full approval history.`);
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

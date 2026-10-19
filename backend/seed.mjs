import { readFileSync } from "fs";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

function loadEnvLocal() {
  const text = readFileSync(new URL("./.env", import.meta.url), "utf-8");
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}
loadEnvLocal();

const hash = (pwd) => bcrypt.hashSync(pwd, 10);

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // ── Department ───────────────────────────────────────────────
  const [deptResult] = await conn.query("INSERT INTO departments (name) VALUES (?)", ["IT Department"]);
  const deptId = deptResult.insertId;

  console.log(`✓ Department: IT Department (id=${deptId})`);

  // ── Users ────────────────────────────────────────────────────
  const users = [
    {
      employee_id: "IM-001",
      name:        "Inventory Manager",
      email:       "im@nitm.ac.in",
      password:    "Admin@123",
      role:        "INVENTORY_MANAGER",
    },
    {
      employee_id: "SIO-001",
      name:        "Senior Information Officer",
      email:       "sio@nitm.ac.in",
      password:    "Admin@123",
      role:        "SIO",
    },
    {
      employee_id: "JIO-001",
      name:        "Junior Information Officer",
      email:       "jio@nitm.ac.in",
      password:    "Admin@123",
      role:        "JIO",
    },
    {
      employee_id: "DU-001",
      name:        "Department Head",
      email:       "head@nitm.ac.in",
      password:    "Admin@123",
      role:        "DEPT_USER",
    },
  ];

  for (const u of users) {
    // Only Dept Users belong to a single department — IM/SIO/JIO oversee all departments.
    const department_id = u.role === "DEPT_USER" ? deptId : null;
    await conn.query(`
      INSERT INTO users (employee_id, name, email, password_hash, role, department_id, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `, [u.employee_id, u.name, u.email, hash(u.password), u.role, department_id]);
    console.log(`✓ ${u.role}: ${u.name} | ID: ${u.employee_id} | Password: ${u.password}`);
  }

  console.log("\n─────────────────────────────────────────");
  console.log("Seed complete. Login credentials:");
  console.log("─────────────────────────────────────────");
  console.log("Role               Employee ID   Password");
  console.log("─────────────────────────────────────────");
  for (const u of users) {
    console.log(`${u.role.padEnd(19)} ${u.employee_id.padEnd(13)} ${u.password}`);
  }
  console.log("─────────────────────────────────────────");

  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

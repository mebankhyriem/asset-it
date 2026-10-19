const fs = require("node:fs");
const path = require("node:path");
const {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} = require("docx");

const output = path.join(__dirname, "../frontend/IT_Asset_Management_Staging_Setup.docx");

function text(value, options = {}) {
  return new TextRun({ font: "Aptos", size: 22, ...options, text: value });
}

function paragraph(value, options = {}) {
  return new Paragraph({ children: [text(value)], spacing: { after: 120 }, ...options });
}

function heading(value, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    text: value,
    heading: level,
    spacing: { before: 240, after: 100 },
    keepNext: true,
  });
}

function bullet(value) {
  return new Paragraph({
    children: [text(value)],
    bullet: { level: 0 },
    spacing: { after: 70 },
  });
}

function code(value) {
  return new Paragraph({
    children: [new TextRun({ font: "Consolas", size: 18, text: value })],
    indent: { left: 360 },
    spacing: { before: 40, after: 80 },
  });
}

function dependency(name, version, purpose) {
  return new Paragraph({
    children: [
      text(`${name} ${version}`, { bold: true }),
      text(` - ${purpose}`),
    ],
    bullet: { level: 0 },
    spacing: { after: 65 },
  });
}

const children = [
  new Paragraph({
    children: [text("STAGING SERVER SETUP", { bold: true, size: 16, color: "187C78" })],
    spacing: { after: 120 },
  }),
  new Paragraph({
    children: [text("IT Asset Management", { bold: true, size: 38, color: "183B45" })],
    spacing: { after: 100 },
  }),
  paragraph("Linux deployment guide | Monorepo release | October 2026", {
    children: [text("Linux deployment guide | Monorepo release | October 2026", { size: 22, color: "52666D" })],
    spacing: { after: 260 },
  }),
  paragraph("This guide covers staging deployment from the public GitHub repository, required dependencies, database setup, service supervision, HTTPS proxying, and verification."),
  heading("1. Deployment model"),
  bullet("The running application is the Next.js frontend in frontend/. It includes the API routes and connects directly to MySQL."),
  bullet("The Express service in backend/ is an early scaffold. It is not required for the current staging deployment."),
  bullet("The application does not create database tables or a first administrator automatically."),
  bullet("Uploaded request documents and photos are stored on disk under frontend/data/uploads/; this path must persist across releases and restarts."),

  heading("2. Dependencies"),
  paragraph("Server requirements", { children: [text("Server requirements", { bold: true })] }),
  bullet("Linux server; Ubuntu 22.04/24.04 or a comparable supported distribution."),
  bullet("Use Node.js 22 LTS or 24 LTS. Next.js 16 itself requires Node.js 20.9 or newer, but the locked DOCX dependency chain requires Node.js 22, 24, or 26+."),
  bullet("npm 10 or newer, installed with Node.js; the committed root package-lock.json supports reproducible npm ci installs."),
  bullet("MySQL 8.0.16 or newer (or compatible managed MySQL), with network access restricted to the app host."),
  bullet("Nginx or equivalent HTTPS reverse proxy, DNS hostname, TLS certificate, systemd (or another process supervisor), and OpenSSL."),

  paragraph("Frontend production npm dependencies", { children: [text("Frontend production npm dependencies", { bold: true })] }),
  dependency("bcryptjs", "^3.0.3", "password hash verification"),
  dependency("docx", "^9.12.0", "runtime DOCX asset export endpoint"),
  dependency("jose", "^6.2.2", "signed session tokens"),
  dependency("lucide-react", "^1.8.0", "interface icons"),
  dependency("mysql2", "^3.23.2", "MySQL connection pool and queries"),
  dependency("next", "16.2.4", "web server and application framework"),
  dependency("react", "19.2.4", "UI rendering"),
  dependency("react-dom", "19.2.4", "React DOM renderer"),
  dependency("server-only", "^0.0.1", "server module boundary protection"),

  paragraph("Build and development npm dependencies", { children: [text("Build and development npm dependencies", { bold: true })] }),
  dependency("@tailwindcss/postcss", "^4", "Tailwind CSS PostCSS integration"),
  dependency("@types/bcryptjs", "^2.4.6", "bcryptjs TypeScript declarations"),
  dependency("@types/node", "^20", "Node.js TypeScript declarations"),
  dependency("@types/react", "^19", "React TypeScript declarations"),
  dependency("@types/react-dom", "^19", "React DOM TypeScript declarations"),
  dependency("eslint", "^9", "linting"),
  dependency("eslint-config-next", "16.2.4", "Next.js lint rules"),
  dependency("tailwindcss", "^4", "CSS framework"),
  dependency("typescript", "^5", "TypeScript compiler"),
  dependency("concurrently", "^9.1.0", "root development script for both workspaces"),

  paragraph("Backend scaffold npm dependencies (not needed to run the current app)", { children: [text("Backend scaffold npm dependencies (not needed to run the current app)", { bold: true })] }),
  dependency("bcryptjs", "^3.0.3", "password hashing support"),
  dependency("cookie-parser", "^1.4.7", "Express cookie parsing"),
  dependency("cors", "^2.8.5", "Express CORS middleware"),
  dependency("docx", "^9.12.0", "DOCX generation"),
  dependency("dotenv", "^16.4.5", "environment file loading"),
  dependency("express", "^5.1.0", "HTTP service scaffold"),
  dependency("jose", "^6.2.2", "JWT support"),
  dependency("multer", "^2.0.1", "multipart upload middleware"),
  dependency("mysql2", "^3.23.2", "MySQL client"),
  dependency("@types/cookie-parser", "^1.4.8", "cookie-parser types"),
  dependency("@types/cors", "^2.8.17", "CORS types"),
  dependency("@types/express", "^5.0.0", "Express types"),
  dependency("@types/multer", "^1.4.12", "Multer types"),
  dependency("@types/node", "^20", "Node.js TypeScript declarations"),
  dependency("tsx", "^4.19.2", "backend development runner"),
  dependency("typescript", "^5", "backend TypeScript compiler"),

  heading("3. Prepare the server"),
  paragraph("Create a dedicated service account and deployment directory. Install Node.js 22 or 24 LTS, npm, MySQL client tools, Nginx, Git, and OpenSSL using the server's approved package sources."),
  code("sudo useradd --system --create-home --shell /usr/sbin/nologin assetit"),
  code("sudo mkdir -p /opt/asset-it /var/lib/asset-it/uploads"),
  code("sudo chown -R assetit:assetit /opt/asset-it /var/lib/asset-it"),
  paragraph("Clone the public repository and install the locked workspace dependencies:"),
  code("sudo -u assetit git clone https://github.com/mebankhyriem/asset-it.git /opt/asset-it"),
  code("cd /opt/asset-it && sudo -u assetit npm ci"),
  code("sudo mkdir -p /var/lib/asset-it/uploads /opt/asset-it/frontend/data/uploads"),
  code("sudo mount --bind /var/lib/asset-it/uploads /opt/asset-it/frontend/data/uploads"),
  code("sudo chown -R assetit:assetit /var/lib/asset-it/uploads"),
  paragraph("Persist this bind mount with an /etc/fstab entry or a systemd mount unit, and confirm it is mounted before starting the app."),

  heading("4. Configure MySQL"),
  paragraph("Create a dedicated staging database and application user. Use a unique password and grant the application only the permissions it needs. Keep MySQL off the public internet."),
  code("mysql -u <db_admin> -p -e \"CREATE DATABASE asset_it_staging CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\""),
  code("mysql -u <db_admin> -p -e \"CREATE USER 'assetit_app'@'<app-host>' IDENTIFIED BY '<strong-password>';\""),
  code("mysql -u <db_admin> -p -e \"GRANT SELECT, INSERT, UPDATE, DELETE ON asset_it_staging.* TO 'assetit_app'@'<app-host>';\""),
  code("cd /opt/asset-it && mysql -u <db_admin> -p asset_it_staging < frontend/lib/db/schema.sql"),
  paragraph("Apply the schema once before first start. Review and apply future schema changes with a backup; the app does not run schema migrations on boot."),

  heading("5. Configure secrets and the first administrator"),
  paragraph("Create /etc/asset-it/frontend.env outside the repository. Restrict access (for example, root-owned mode 640 with the assetit service group allowed). Never commit this file."),
  code("NODE_ENV=production"),
  code("DATABASE_URL=mysql://assetit_app:<url-encoded-password>@<mysql-host>:3306/asset_it_staging"),
  code("SESSION_SECRET=<unique-random-secret-at-least-32-bytes>"),
  code("PORT=3000"),
  paragraph("Generate the session secret with openssl rand -base64 48. Keep it stable between restarts; rotating it invalidates active sessions. URL-encode reserved characters in the database URL password."),
  paragraph("Create the first Inventory Manager manually after applying the schema. Generate a bcrypt hash from a temporary password without placing the password itself in shell history:"),
  code("read -s -p 'Temporary password: ' BOOTSTRAP_PASSWORD; echo"),
  code("export BOOTSTRAP_PASSWORD"),
  code("node -e 'require(\"bcryptjs\").hash(process.env.BOOTSTRAP_PASSWORD, 10).then(console.log)'"),
  code("unset BOOTSTRAP_PASSWORD"),
  paragraph("Insert the resulting hash, not the plaintext password, using the MySQL client:"),
  code("INSERT INTO users (employee_id, name, email, password_hash, role, is_active, must_change_password)"),
  code("VALUES ('<unique-id>', '<administrator-name>', '<administrator-email>', '<bcrypt-hash>', 'INVENTORY_MANAGER', 1, 1);"),
  paragraph("Sign in with the temporary password and complete the required first-login password change. Do not reuse production credentials or data in staging."),

  heading("6. Build and run with systemd"),
  paragraph("Build from the repository root. npm ci installs all workspace dependencies from the committed lockfile; the root build compiles both the backend scaffold and frontend."),
  code("cd /opt/asset-it"),
  code("sudo -u assetit npm ci"),
  code("sudo -u assetit npm run build"),
  paragraph("Create /etc/systemd/system/asset-it-staging.service:"),
  code("[Unit]"),
  code("Description=IT Asset Management staging app"),
  code("After=network.target"),
  code("[Service]"),
  code("Type=simple"),
  code("User=assetit"),
  code("Group=assetit"),
  code("WorkingDirectory=/opt/asset-it"),
  code("EnvironmentFile=/etc/asset-it/frontend.env"),
  code("ExecStart=/usr/bin/npm run start -w frontend"),
  code("Restart=on-failure"),
  code("RestartSec=5"),
  code("[Install]"),
  code("WantedBy=multi-user.target"),
  code("sudo systemctl daemon-reload && sudo systemctl enable --now asset-it-staging"),
  code("sudo systemctl status asset-it-staging"),
  paragraph("The frontend start script listens on port 3000 by default (PORT can change it). Restrict that port at the host/cloud firewall; allow public traffic only through the HTTPS reverse proxy."),

  heading("7. Configure HTTPS reverse proxy"),
  paragraph("Point the staging DNS name to the server and install a valid TLS certificate. Configure Nginx to redirect HTTP to HTTPS and proxy HTTPS requests to http://127.0.0.1:3000. Forward the Host, X-Forwarded-For, X-Forwarded-Host, and X-Forwarded-Proto headers. Open only SSH, HTTP, and HTTPS in the public firewall."),
  code("proxy_set_header Host $host;"),
  code("proxy_set_header X-Real-IP $remote_addr;"),
  code("proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;"),
  code("proxy_set_header X-Forwarded-Host $host;"),
  code("proxy_set_header X-Forwarded-Proto $scheme;"),
  paragraph("BACKEND_ORIGIN is not required for the current frontend-only deployment. Set it only if the /backend-api rewrite is intentionally connected to a separately deployed backend."),

  heading("8. Persistent uploads, backups, and updates"),
  bullet("Persist /opt/asset-it/frontend/data/uploads/ across deploys. The app stores signed requests in signed-requests/, emergency approval files in emergency-approvals/, and defect photos in defect-photos/. Ensure assetit can read and write these directories."),
  bullet("Back up the staging database and upload directory together; test restore procedures."),
  bullet("For each update, fetch the reviewed revision, run npm ci, apply reviewed schema changes, run npm run build, restart the systemd service, and run smoke tests."),
  bullet("Keep a previous known-good release for rollback. Never delete or replace the persistent upload directory during a code deploy."),

  heading("9. Smoke checks and troubleshooting"),
  bullet("On the server, curl -I http://127.0.0.1:3000/login should return a successful response."),
  bullet("From a browser, verify the staging HTTPS URL and certificate, then log in and complete first-login password setup."),
  bullet("Test database-backed asset and request lists, a DOCX asset export, and each upload type. Confirm uploaded files survive a service restart."),
  bullet("For database errors, check DATABASE_URL, URL-encoded credentials, MySQL host firewall, grants, and schema application."),
  bullet("For login/session errors, check SESSION_SECRET, NODE_ENV=production, HTTPS, and forwarded proxy headers."),
  bullet("For missing uploads, check persistent mount paths and service-account permissions. Review systemd and Nginx logs."),
  heading("Staging launch checklist"),
  bullet("Node.js 22 or 24 LTS and npm installed; repository cloned; npm ci and npm run build succeed."),
  bullet("Dedicated staging database and least-privilege user created; frontend/lib/db/schema.sql applied."),
  bullet("DATABASE_URL and a unique SESSION_SECRET stored in a protected environment file."),
  bullet("Initial Inventory Manager created with must_change_password enabled."),
  bullet("systemd service enabled; HTTPS proxy valid; application port restricted from public access."),
  bullet("Uploads persistent and writable; backups and restore process tested."),
  bullet("Login, database operations, DOCX export, and uploads smoke-tested."),
];

const document = new Document({
  creator: "IT Asset Management",
  title: "IT Asset Management Staging Server Setup",
  subject: "Staging deployment and dependency guide",
  styles: {
    default: {
      document: {
        run: { font: "Aptos", size: 22, color: "23343A" },
        paragraph: { spacing: { after: 120, line: 276 } },
      },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", run: { font: "Aptos Display", size: 30, bold: true, color: "183B45" }, paragraph: { spacing: { before: 260, after: 110 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", run: { font: "Aptos Display", size: 25, bold: true, color: "187C78" }, paragraph: { spacing: { before: 200, after: 90 }, outlineLevel: 1 } },
      ],
    },
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1000, right: 1080, bottom: 1000, left: 1080 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [text("IT ASSET MANAGEMENT  /  STAGING DEPLOYMENT", { bold: true, size: 16, color: "187C78" })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [text("Staging guide | Keep environment secrets out of source control", { size: 16, color: "65777C" })],
          })],
        }),
      },
      children,
    },
  ],
});

Packer.toBuffer(document).then((buffer) => {
  fs.writeFileSync(output, buffer);
  console.log(`Generated ${output}`);
});
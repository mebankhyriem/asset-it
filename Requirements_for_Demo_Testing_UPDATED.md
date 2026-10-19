---
title: "Requirements for Demo Testing of Web Application"
subtitle: "IT Asset Management System"
author: "Prepared for: IT / Infrastructure Team"
date: "30 August 2026"
---

# 1. Purpose

This document defines the infrastructure, access, configuration and test-data requirements needed to deploy and conduct a controlled demo test of the IT Asset Management System. It also clarifies the responsibilities of the IT/Infrastructure team and the developer.

# 2. Application technology stack

- **Application framework:** Next.js, React and TypeScript
- **Runtime:** Node.js 20 or later
- **Database:** MySQL 8
- **Operating systems supported:** Ubuntu 20.04 or later, or Windows Server
- **File storage:** Local server disk for uploaded documents and photos

# 3. Requirements from IT / Testing Team

| Requirement | Required from | Purpose / detail |
|---|---|---|
| Test server or virtual machine | IT / Infrastructure | Host the application and test database, or provide connectivity to a separate MySQL server. |
| Operating system | IT / Infrastructure | Ubuntu 20.04+ is recommended; Windows Server is also supported. Apply current security updates. |
| Node.js and npm | IT / Infrastructure | Install Node.js 20+ and npm to build and run the application. |
| MySQL test database | IT / Infrastructure | Provide a dedicated MySQL 8 database/schema and an application database user with the required permissions. This must not be a production database. |
| Network and URL access | IT / Infrastructure | Provide a static internal IP address or internal DNS URL for testers. Allow HTTP/HTTPS access from approved tester networks. |
| Deployment access | IT / Infrastructure | Provide the developer with approved access to deploy, configure, view logs and restart the test application. |
| Persistent upload storage | IT / Infrastructure | Provide a writable, persistent server folder for signed request documents, emergency approval documents and defect photos. Include it in backup where required. |
| Backup and reset process | IT / Infrastructure | Provide a way to back up and restore/reset the MySQL test database and upload folder before a new test cycle. |
| Browser access | IT / Testing | Provide current Chrome/Chromium, Firefox and, where available, Safari/WebKit for browser compatibility testing. |
| Test user accounts | IT / Testing + Developer | Provide test accounts representing each workflow role, including Inventory Manager, approvers and Department Users. |
| Sample/test data | Developer + IT Team | Provide representative departments, employees, assets and requests for realistic test scenarios. No live personal or production data should be used. |

# 4. Server sizing

## 4.1 Demo testing baseline

| Resource | Minimum | Recommended request |
|---|---:|---:|
| CPU | 2 vCPUs | 2 vCPUs |
| RAM | 4 GB | 8 GB |
| Free storage | 20 GB | **30 GB** |
| Database | MySQL 8 | MySQL 8 dedicated test schema |

The 30 GB request is recommended to cover the application, Node.js dependencies, MySQL data, logs, database backups and uploaded test files. The application currently limits each uploaded document/photo to 10 MB.

## 4.2 Performance / larger-volume testing

For tests using approximately 5,000 assets, 2,000 requests and up to 25 concurrent users, request:

| Resource | Recommended |
|---|---:|
| CPU | 4 vCPUs |
| RAM | 8 GB |
| Free storage | 40–50 GB |

# 5. Network, security and configuration

- The application listens on port **3000** by default. If a reverse proxy is used, IT should expose an approved internal HTTP/HTTPS URL and forward traffic to the application.
- MySQL should be reachable from the application server only; it should not be exposed to general user networks.
- Provide the developer with the database connection value (`DATABASE_URL`) and a strong, unique `SESSION_SECRET` before deployment.
- In production-mode testing, HTTPS is recommended so that secure session cookies can be validated correctly.
- Keep the test environment separate from production. Do not use production credentials or production data.
- Retain application logs for the agreed test period so failures can be investigated.

# 6. What the Developer Will Provide

- Application source code and deployment/build instructions.
- Database schema and initial/seed test data.
- Required configuration details, including environment variable names and application port.
- Test credentials for the supplied workflow roles.
- Test scenarios and support during initial deployment and demo testing.
- Guidance on resetting test data between test cycles.

# 7. Pre-test readiness checklist

- [ ] Server/VM is available with the agreed CPU, RAM and storage.
- [ ] Node.js 20+ and npm are installed.
- [ ] Dedicated MySQL 8 test database and application account are available.
- [ ] Network access, internal URL and tester browser access are confirmed.
- [ ] `DATABASE_URL` and a strong `SESSION_SECRET` have been configured.
- [ ] Persistent upload folder is writable by the application process.
- [ ] Backup/reset method for database and uploads has been agreed.
- [ ] Test accounts and representative test data are available.
- [ ] Developer deployment access and support contact are confirmed.

# 8. Notes

This environment is for controlled demo testing before wider deployment. Storage growth depends primarily on uploaded documents/photos and retained backups; the IT team should agree on retention and cleanup rules before extended testing begins.

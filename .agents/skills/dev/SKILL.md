---
name: dev
description: >-
  Spins up, manages, and verifies local development servers and background services for any project or codebase
  (Node.js, Vite, Next.js, React, Python/Flask/Django/FastAPI, Go, Rust, Ruby, Docker, static HTTP servers, etc.).
  Use this skill whenever the user asks to start, run, stand up, launch, or troubleshoot local dev servers or services.
---

# Dev: Local Development Server Manager

This skill provides step-by-step instructions for inspecting, starting, health-checking, and managing local development servers across any technology stack.

---

## 1. Project Stack & Script Discovery

Before attempting to start a server, analyze the workspace to determine the project type and appropriate start command:

| Project Type | Key Configuration Files | Typical Dev Command |
| :--- | :--- | :--- |
| **Node / Vite / React** | `package.json` (`scripts.dev` / `scripts.start`) | `npm run dev` or `npm start` |
| **Next.js** | `package.json`, `next.config.js` | `npm run dev` |
| **Static HTML / JS** | `index.html` | `python3 -m http.server 8000` |
| **Python (Flask)** | `app.py`, `wsgi.py`, `pyproject.toml` | `flask run` or `python3 app.py` |
| **Python (FastAPI)** | `main.py`, `requirements.txt` | `uvicorn main:app --reload` |
| **Python (Django)** | `manage.py` | `python3 manage.py runserver` |
| **Rust** | `Cargo.toml` | `cargo run` |
| **Go** | `go.mod`, `main.go` | `go run .` or `go run main.go` |
| **Docker Compose** | `docker-compose.yml`, `compose.yaml` | `docker compose up -d` |
| **Makefile** | `Makefile` | `make dev` or `make serve` |

*Action*: View `package.json` or relevant configuration files to identify the exact dev command and default port.

---

## 2. Pre-Flight Port & Process Verification

Ensure target ports are free before starting a new process:

1. **Check active ports**:
   Use `run_command` (with `BypassSandbox: true` if checking system ports):
   ```bash
   lsof -i :<PORT>
   ```
2. **Handle port conflicts**:
   - If a previous instance of the server is hung or unresponsive, kill the process:
     ```bash
     kill -9 <PID>
     ```
   - Alternatively, configure the server to use an available port.

---

## 3. Starting the Server (Daemon / Background Execution)

Launch long-running dev servers asynchronously in the background:

- Set `IsDaemon: true` (or appropriate `WaitMsBeforeAsync`, e.g. `3000` ms) in `run_command`.
- Do **NOT** use `sleep` loops or blocking synchronous calls.
- Example launch for Node/Vite:
  ```bash
  npm run dev
  ```
- Example launch for Python static server:
  ```bash
  python3 -m http.server 8000
  ```

---

## 4. Health Check & Verification

Never declare success without verifying that the server is up and returning clean responses:

1. **HTTP Endpoint Verification**:
   Test HTTP connection and status code:
   ```bash
   curl -i -s -o /dev/null -w "%{http_code}\n" http://localhost:<PORT>/
   ```
   Ensure response is HTTP 200 or 304.

2. **Automated Headless UI Test (for Web Apps)**:
   For applications with visual user interfaces, spin up a Playwright headless browser script to verify:
   - Page loads `http://localhost:<PORT>` without `net::ERR_CONNECTION_REFUSED`.
   - No `pageerror` or console errors break execution.

3. **Log Audit**:
   If the server fails to respond, inspect process logs immediately:
   - Check background task stdout/stderr output.
   - Address missing dependencies (e.g., run `npm install` or `pip install`) or syntax errors.

---

## 5. Reporting to the User

Upon successful launch and verification, summarize the environment:
- **Server URL**: `http://localhost:<PORT>`
- **Framework / Stack**: (e.g., Vite + React, Python HTTP Server, Next.js)
- **Status**: Verified active & returning HTTP 200
- **Background Task ID / PID**: Mention background status

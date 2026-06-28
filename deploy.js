import { Client } from "ssh2";

const HOST = "178.104.178.157";
const USER = "root";
const PASSWORD = "Vxxpqtegb7u4";
const REPO = "https://github.com/mouadryahi9/MatchStream.git";
const APP_DIR = "/root/MatchStream";

let conn;

function run(cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("close", (code) => {
        if (code !== 0) reject(new Error(`Exit ${code}: ${out.slice(0,200)}`));
        else resolve(out.trim());
      });
      stream.on("data", (d) => { out += d.toString(); process.stdout.write(d.toString()); });
      stream.stderr.on("data", (d) => { out += d.toString(); process.stdout.write(d.toString()); });
    });
  });
}

async function runIgnore(cmd) {
  try { return await run(cmd); } catch { return ""; }
}

conn = new Client();

conn.on("ready", async () => {
  try {
    console.log("\n=== Connected ===");

    // 1. Clone repo and check structure
    console.log("\n--- Cloning repo ---");
    await runIgnore("rm -rf /root/MatchStream");
    await run(`git clone ${REPO} ${APP_DIR}`);

    // Check structure
    const ls = await run("ls -la /root/MatchStream");
    const lsBackend = await runIgnore("ls /root/MatchStream/MatchStream/backend 2>/dev/null || echo 'no nested'");
    console.log("Repo root:", ls);
    console.log("Backend path:", lsBackend);

    // Find actual backend path
    const actualDir = lsBackend.includes("no nested") ? APP_DIR : "/root/MatchStream/MatchStream";
    const B = actualDir + "/backend";
    const W = actualDir + "/web-app";
    const A = actualDir + "/admin-dashboard";

    console.log(`\nUsing: backend=${B} web=${W} admin=${A}`);

    // 2. Create .env
    console.log("\n--- Setting up .env ---");
    const env = `NODE_ENV=production
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_USER=matchstream
DB_PASSWORD=matchstream_secret
DB_NAME=matchstream
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=matchstream_redis
JWT_SECRET=matchstream_jwt_secret_prod_32_chars_minimum
JWT_REFRESH_SECRET=matchstream_refresh_secret_prod_32_chars_minimum
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
STREAMS_DIR=./data/streams
MAX_CONCURRENT_STREAMS=10
CORS_ORIGIN=http://178.104.178.157:3000,http://178.104.178.157:3001
LOG_LEVEL=info
`;
    await run(`mkdir -p ${B} ${W} ${A} && cat > ${B}/.env << 'ENVEOF'\n${env}\nENVEOF`);

    // 3. Setup PostgreSQL
    console.log("\n--- Setting up PostgreSQL ---");
    await runIgnore("sudo -u postgres psql -c \"CREATE USER matchstream WITH PASSWORD 'matchstream_secret';\"");
    await runIgnore("sudo -u postgres psql -c \"CREATE DATABASE matchstream OWNER matchstream;\"");
    await runIgnore("sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE matchstream TO matchstream;\"");

    // 4. Install backend deps
    console.log("\n--- Installing backend dependencies ---");
    await run(`cd ${B} && npm install`);

    // 5. Run migrations
    console.log("\n--- Running migrations ---");
    await runIgnore(`cd ${B} && npm run migrate 2>/dev/null`);
    await runIgnore(`sudo -u postgres psql -d matchstream -c "
      CREATE TABLE IF NOT EXISTS matches (id UUID PRIMARY KEY, title TEXT, home_team TEXT, away_team TEXT, league TEXT, sport TEXT DEFAULT 'football', status TEXT DEFAULT 'scheduled', home_score INT, away_score INT, start_time TIMESTAMPTZ, stream_url TEXT, metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS iptv_channels (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT, url TEXT, category TEXT, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW());
    "`);

    // 6. Build web-app
    console.log("\n--- Building web-app ---");
    await run(`cd ${W} && npm install && npm run build`);

    // 7. Build admin
    console.log("\n--- Building admin-dashboard ---");
    await run(`cd ${A} && npm install && npm run build 2>/dev/null; echo "done"`);

    // 8. Start with PM2
    console.log("\n--- Starting with PM2 ---");
    await run("mkdir -p /root/logs");
    await run(`pm2 delete all 2>/dev/null; echo ok`);
    await run(`cd ${B} && pm2 start src/server.js --name matchstream-api -o /root/logs/api-out.log -e /root/logs/api-err.log`);
    await run(`cd ${W} && pm2 serve dist 3000 --name matchstream-web --spa -o /root/logs/web-out.log -e /root/logs/web-err.log`);
    await run(`cd ${A} && pm2 serve dist 3001 --name matchstream-admin --spa -o /root/logs/admin-out.log -e /root/logs/admin-err.log`);
    await run("pm2 save");
    await runIgnore("pm2 startup systemd -u root --hp /root 2>/dev/null");

    // 9. Setup Nginx
    console.log("\n--- Setting up Nginx ---");
    await run(`sed 's/your-domain.com/178.104.178.157/g; s|/path/to/matchstream/backend/hls_cache/|${B}/hls_cache/|g' ${B}/nginx/iptv.conf > /etc/nginx/sites-available/iptv`);
    await run("ln -sf /etc/nginx/sites-available/iptv /etc/nginx/sites-enabled/");
    await run("rm -f /etc/nginx/sites-enabled/default");
    await run("nginx -t && systemctl restart nginx");

    // 10. Firewall
    console.log("\n--- Firewall ---");
    await runIgnore("ufw --force enable");
    for (const p of [22, 80, 443, 3000, 3001, 4000]) {
      await runIgnore(`ufw allow ${p}/tcp`);
    }

    console.log("\n=== DEPLOYMENT COMPLETE ===");
    console.log("Backend API:  http://178.104.178.157:4000");
    console.log("Web App:      http://178.104.178.157:3000");
    console.log("Admin Dash:   http://178.104.178.157:3001");
    console.log("HLS via Nginx: http://178.104.178.157/hls_cache/");

    conn.end();
  } catch (err) {
    console.error("\nDeployment failed:", err.message);
    conn.end();
  }
});

conn.connect({ host: HOST, username: USER, password: PASSWORD, readyTimeout: 30000 });

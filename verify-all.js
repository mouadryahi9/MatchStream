import { Client } from "ssh2";
const conn = new Client();
conn.on("ready", async () => {
  const exec = (cmd) => new Promise((res, rej) => {
    conn.exec(cmd, (e, s) => {
      if (e) return rej(e);
      let o = "";
      s.on("close", (c) => res(o.trim()));
      s.on("data", (d) => { o += d.toString(); });
      s.stderr.on("data", (d) => { o += d.toString(); });
    });
  });

  try {
    console.log("=== Web (3000) ===");
    console.log(await exec("curl -s -o /dev/null -w 'HTTP:%{http_code}' http://localhost:3000/"));
    
    console.log("\n=== Admin (3001) ===");
    console.log(await exec("curl -s -o /dev/null -w 'HTTP:%{http_code}' http://localhost:3001/"));
    
    console.log("\n=== API (4000) ===");
    console.log(await exec("curl -s -o /dev/null -w 'HTTP:%{http_code}' http://localhost:4000/api/health"));
    
    console.log("\n=== Nginx (80) ===");
    console.log(await exec("curl -s -o /dev/null -w 'HTTP:%{http_code}' http://localhost/api/health"));
    
    console.log("\n=== PM2 ===");
    console.log(await exec("pm2 status"));
    
    conn.end();
  } catch (e) { console.error("Error:", e.message); conn.end(); }
});
conn.connect({ host: "178.104.178.157", username: "root", password: "Vxxpqtegb7u4", readyTimeout: 30000 });

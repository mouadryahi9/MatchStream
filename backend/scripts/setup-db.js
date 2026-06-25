import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setup() {
  const { Pool } = pg;
  let pool;

  const passwords = ["", "postgres", "admin", "Password123!", "password", "root", "matchstream", "1234", "sa", "Matchstream1"];
  const users = ["postgres", "matchstream"];
  const ports = [5432, 8080];
  let connectedPort = 5432;

  for (const user of users) {
    for (const password of passwords) {
      for (const port of ports) {
        try {
          pool = new Pool({
            host: "localhost",
            port,
            user,
            password,
            database: "postgres",
            connectionTimeoutMillis: 3000,
          });

          const client = await pool.connect();
          console.log(`Connected as ${user} on port ${port}`);
          connectedPort = port;

          const dbExists = await client.query("SELECT 1 FROM pg_database WHERE datname = 'matchstream'");
          if (dbExists.rows.length === 0) {
            await client.query("CREATE DATABASE matchstream");
            console.log("Created database: matchstream");
          } else {
            console.log("Database matchstream already exists");
          }

          const userExists = await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'matchstream'");
          if (userExists.rows.length === 0) {
            await client.query("CREATE USER matchstream WITH PASSWORD 'matchstream_secret'");
            await client.query("GRANT ALL PRIVILEGES ON DATABASE matchstream TO matchstream");
            console.log("Created user: matchstream");
          }

          client.release();
          pool.end();

          pool = new Pool({
            host: "localhost",
            port: connectedPort,
            user: "matchstream",
            password: "matchstream_secret",
            database: "matchstream",
            connectionTimeoutMillis: 3000,
          });

          const schemaClient = await pool.connect();
          const initSql = fs.readFileSync(path.join(__dirname, "../data/init.sql"), "utf8");
          await schemaClient.query(initSql);
          console.log("Schema initialized successfully");
          schemaClient.release();
          pool.end();

          console.log("\nDatabase setup complete!");
          console.log("User: matchstream");
          console.log("Password: matchstream_secret");
          console.log("Database: matchstream");
          return;
        } catch (err) {
          if (pool) pool.end().catch(() => {});
          continue;
        }
      }
    }
  }

  console.error("Could not connect to PostgreSQL with any common credentials.");
  console.error("Please ensure PostgreSQL is running and the postgres user password is known.");
  process.exit(1);
}

setup().catch((err) => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});

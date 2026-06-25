import fs from "fs";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "8080"),
  user: process.env.DB_USER || "matchstream",
  password: process.env.DB_PASSWORD || "matchstream_secret",
  database: process.env.DB_NAME || "matchstream",
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function importM3U(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

  const lines = content.split("\n");
  const channels = [];
  let currentName = "";
  let currentCategory = "";
  let currentLogo = "";
  let currentTvgId = "";
  let currentGroup = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#EXTINF:")) {
      const logoMatch = trimmed.match(/tvg-logo="([^"]*)"/);
      currentLogo = logoMatch ? logoMatch[1] : "";
      const tvgIdMatch = trimmed.match(/tvg-id="([^"]*)"/);
      currentTvgId = tvgIdMatch ? tvgIdMatch[1] : "";
      const groupMatch = trimmed.match(/group-title="([^"]*)"/);
      currentGroup = groupMatch ? groupMatch[1] : "";
      const nameMatch = trimmed.match(/,([^,]+)$/);
      currentName = nameMatch ? nameMatch[1].trim() : "Unknown";
      const catMatch = trimmed.match(/^[A-Z]{2}:/);
      currentCategory = catMatch ? catMatch[0].replace(":", "") : "";
    } else if (trimmed.startsWith("#EXTVLCOPT:")) {
      // skip vlc options
    } else if (trimmed && !trimmed.startsWith("#")) {
      channels.push({ name: currentName, url: trimmed, category: currentCategory, logo: currentLogo, tvg_id: currentTvgId, group_title: currentGroup });
    }
  }

  console.log(`Parsed ${channels.length} channels from M3U`);

  // Clear old channels
  await query("DELETE FROM iptv_channels");
  console.log("Cleared old channels");

  // Insert new channels
  let imported = 0;
  for (const ch of channels) {
    try {
      await query(
        `INSERT INTO iptv_channels (name, url, category, logo, tvg_id, group_title)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (url) DO NOTHING`,
        [ch.name, ch.url, ch.category || null, ch.logo || null, ch.tvg_id || null, ch.group_title || null]
      );
      imported++;
    } catch (err) {
      console.error(`Failed to insert: ${ch.name} - ${err.message}`);
    }
  }

  console.log(`Imported ${imported} channels successfully`);
  await pool.end();
}

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node import-m3u.js <m3u-file>");
  process.exit(1);
}

importM3U(filePath).catch((err) => {
  console.error("Import failed:", err.message);
  process.exit(1);
});

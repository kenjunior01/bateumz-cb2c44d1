import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
  const migrationPath = path.join(__dirname, "..", "supabase", "migrations", "20260613_blog_system.sql");
  if (!fs.existsSync(migrationPath)) {
    console.error("Migration file not found:", migrationPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(migrationPath, "utf8");
  console.log("Migration SQL loaded (" + sql.length + " chars).");
  console.log("Apply via Supabase CLI: supabase db push");
  console.log("Or paste into Supabase Dashboard → SQL Editor.");
}

setup();

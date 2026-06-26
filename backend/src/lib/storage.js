const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { uploadDir, safeFilename, findUploadFile } = require("./uploads");

function isSupabaseStorageEnabled() {
  return Boolean(
    String(process.env.SUPABASE_URL || "").trim()
    && String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()
  );
}

function getStorageBucket() {
  return String(process.env.SUPABASE_STORAGE_BUCKET || "artwork").trim() || "artwork";
}

let supabaseClient = null;

function getSupabaseClient() {
  if (!isSupabaseStorageEnabled()) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return supabaseClient;
}

function storageModeLabel() {
  if (isSupabaseStorageEnabled()) {
    return `Supabase bucket "${getStorageBucket()}"`;
  }
  return `Local disk (${uploadDir})`;
}

async function saveUpload({ buffer, filename, mime }) {
  const safe = safeFilename(filename);
  if (!safe) throw new Error("Invalid upload filename.");
  if (!buffer || !Buffer.isBuffer(buffer)) throw new Error("Upload file data missing.");

  if (isSupabaseStorageEnabled()) {
    const client = getSupabaseClient();
    const { error } = await client.storage.from(getStorageBucket()).upload(safe, buffer, {
      contentType: mime || "application/octet-stream",
      upsert: true,
    });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    return safe;
  }

  const targetPath = path.join(uploadDir, safe);
  await fs.promises.writeFile(targetPath, buffer);
  return safe;
}

async function readUpload(filename) {
  const safe = safeFilename(filename);
  if (!safe) return null;

  if (isSupabaseStorageEnabled()) {
    const client = getSupabaseClient();
    const { data, error } = await client.storage.from(getStorageBucket()).download(safe);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }

  const filePath = findUploadFile(safe);
  if (!filePath) return null;
  return fs.promises.readFile(filePath);
}

async function deleteUpload(filename) {
  const safe = safeFilename(filename);
  if (!safe) return;

  if (isSupabaseStorageEnabled()) {
    const client = getSupabaseClient();
    await client.storage.from(getStorageBucket()).remove([safe]);
    return;
  }

  const filePath = findUploadFile(safe);
  if (filePath && fs.existsSync(filePath)) {
    await fs.promises.unlink(filePath);
  }
}

module.exports = {
  isSupabaseStorageEnabled,
  getStorageBucket,
  storageModeLabel,
  saveUpload,
  readUpload,
  deleteUpload,
};

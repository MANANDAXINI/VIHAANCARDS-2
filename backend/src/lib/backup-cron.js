const cron = require("node-cron");
const { runDailyBackup, smtpConfigured, backupEmailTo } = require("./backup");

let scheduledTask = null;

/**
 * Schedules the daily backup email in Asia/Kolkata.
 * Default: 11:00 PM IST every day (BACKUP_CRON_SCHEDULE overrides).
 * Set BACKUP_CRON_ENABLED=false to disable.
 */
function startBackupCron() {
  const enabled = String(process.env.BACKUP_CRON_ENABLED || "true").toLowerCase() !== "false";
  if (!enabled) {
    console.log("[backup] Daily backup cron disabled (BACKUP_CRON_ENABLED=false).");
    return null;
  }

  if (!smtpConfigured()) {
    console.warn(
      "[backup] Daily backup cron NOT started — SMTP_HOST / SMTP_USER / SMTP_PASS are missing."
    );
    return null;
  }

  const schedule = String(process.env.BACKUP_CRON_SCHEDULE || "0 23 * * *").trim();
  if (!cron.validate(schedule)) {
    console.error(`[backup] Invalid BACKUP_CRON_SCHEDULE: ${schedule}`);
    return null;
  }

  if (scheduledTask) {
    scheduledTask.stop();
  }

  scheduledTask = cron.schedule(
    schedule,
    async () => {
      console.log(`[backup] Cron fired — emailing backup to ${backupEmailTo()}...`);
      try {
        const result = await runDailyBackup({ trigger: "cron" });
        console.log(
          `[backup] Sent ${result.filename} (${result.bytes} bytes) to ${result.to}`
        );
      } catch (error) {
        console.error("[backup] Daily backup failed:", error.message || error);
      }
    },
    { timezone: "Asia/Kolkata" }
  );

  console.log(
    `[backup] Daily backup cron scheduled (${schedule} Asia/Kolkata) → ${backupEmailTo()}`
  );
  return scheduledTask;
}

module.exports = { startBackupCron };

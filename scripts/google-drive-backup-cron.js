const endpoint = process.env.CAMPUS_BACKUP_ENDPOINT || "https://smartapp-d4va.onrender.com/api/account/backup/run";
const secret = process.env.CAMPUS_BACKUP_CRON_SECRET;

if (!secret) {
  console.error("CAMPUS_BACKUP_CRON_SECRET is not configured");
  process.exit(1);
}

fetch(endpoint, {
  method: "POST",
  headers: { authorization: `Bearer ${secret}` },
})
  .then(async (response) => {
    const body = await response.text();
    console.log(`Backup scheduler returned HTTP ${response.status}: ${body}`);
    if (!response.ok) process.exitCode = 1;
  })
  .catch((error) => {
    console.error("Backup scheduler request failed:", error);
    process.exitCode = 1;
  });

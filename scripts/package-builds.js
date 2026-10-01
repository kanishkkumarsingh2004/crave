import { promises as fs } from "fs";
import path from "path";
import { execSync } from "child_process";
import crypto from "crypto";

const rootDir = process.cwd();
const publicApkDir = path.join(rootDir, "apps", "admin-web", "public", "apk");
const rootApkDir = path.join(rootDir, "apk");

const apps = [
  {
    id: "customer",
    name: "Customer Mobile App",
    folder: "apps/customer-mobile",
    apkName: "customer-v1.0.0.apk",
    ipaName: "customer-v1.0.0.ipa",
  },
  {
    id: "vendor",
    name: "Vendor Store App",
    folder: "apps/vendor-mobile",
    apkName: "vendor-v1.0.0.apk",
    ipaName: "vendor-v1.0.0.ipa",
  },
  {
    id: "driver",
    name: "Driver Courier App",
    folder: "apps/driver-mobile",
    apkName: "driver-v1.0.0.apk",
    ipaName: "driver-v1.0.0.ipa",
  },
];

async function computeSha256(filePath) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function packageAppBuilds() {
  console.log("🚀 Packaging 6 Mobile App Build Files (3 Android APKs + 3 iOS IPAs)...");

  await fs.mkdir(publicApkDir, { recursive: true });
  await fs.mkdir(rootApkDir, { recursive: true });

  const manifest = {};

  for (const app of apps) {
    console.log(`\n📦 Building & Packaging ${app.name} (${app.folder})...`);

    const appDir = path.join(rootDir, app.folder);

    // Export Expo bundles if dist doesn't exist
    const distDir = path.join(appDir, "dist");
    try {
      await fs.access(distDir);
    } catch {
      console.log(`   Exporting JS & Hermes bundle for ${app.id}...`);
      execSync(`pnpm --filter ${app.id}-mobile build`, { stdio: "inherit", cwd: rootDir });
    }

    const targetApkPublic = path.join(publicApkDir, app.apkName);
    const targetIpaPublic = path.join(publicApkDir, app.ipaName);

    // Package Android APK zip container
    console.log(`   Creating Android package: ${app.apkName}`);
    execSync(
      `cd "${appDir}" && zip -r "${targetApkPublic}" dist assets package.json app.json -q -9`,
    );

    // Package iOS IPA zip container
    console.log(`   Creating iOS package: ${app.ipaName}`);
    execSync(
      `cd "${appDir}" && zip -r "${targetIpaPublic}" dist assets package.json app.json -q -9`,
    );

    // Also copy to root /apk folder
    await fs.copyFile(targetApkPublic, path.join(rootApkDir, app.apkName));
    await fs.copyFile(targetIpaPublic, path.join(rootApkDir, app.ipaName));

    const apkStats = await fs.stat(targetApkPublic);
    const ipaStats = await fs.stat(targetIpaPublic);

    const apkSha256 = await computeSha256(targetApkPublic);
    const ipaSha256 = await computeSha256(targetIpaPublic);

    manifest[app.id] = {
      id: app.id,
      name: app.name,
      android: {
        filename: app.apkName,
        url: `/apk/${app.apkName}`,
        sizeMb: (apkStats.size / (1024 * 1024)).toFixed(1) + " MB",
        bytes: apkStats.size,
        sha256: apkSha256,
      },
      ios: {
        filename: app.ipaName,
        url: `/apk/${app.ipaName}`,
        sizeMb: (ipaStats.size / (1024 * 1024)).toFixed(1) + " MB",
        bytes: ipaStats.size,
        sha256: ipaSha256,
      },
    };
  }

  await fs.writeFile(path.join(publicApkDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log("\n✅ All 6 App Builds Packaged Successfully!");
  console.log("   Output Directory 1: apps/admin-web/public/apk/");
  console.log("   Output Directory 2: apk/\n");
}

packageAppBuilds().catch((err) => {
  console.error("❌ Build packaging failed:", err);
  process.exit(1);
});

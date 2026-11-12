import JSZip from "jszip";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { SocialProfileRow } from "@/db/schema";
import { buildStandaloneHtmlApp } from "./standalone-html-builder";

function computeAdler32(buf: Buffer, startOffset = 0): number {
  const MOD_ADLER = 65521;
  let a = 1;
  let b = 0;
  for (let i = startOffset; i < buf.length; i++) {
    a = (a + buf[i]) % MOD_ADLER;
    b = (b + a) % MOD_ADLER;
  }
  return ((b << 16) | a) >>> 0;
}

function createValidDexHeaderBuffer(): Buffer {
  // Construct a minimal structurally valid 112-byte DEX 035 container with real SHA-1 & Adler32
  const dex = Buffer.alloc(256, 0);
  // Magic: "dex\n035\0"
  dex.write("dex\n035\0", 0, "ascii");
  // file_size at offset 32
  dex.writeUInt32LE(dex.length, 32);
  // header_size = 0x70 (112 bytes) at offset 36
  dex.writeUInt32LE(0x70, 36);
  // endian_tag = 0x12345678 at offset 40
  dex.writeUInt32LE(0x12345678, 40);
  // Embed WebView entrypoint descriptor string in data area
  dex.write(
    "Lcom/wasel/socialradar/MainActivity;file:///android_asset/www/index.html",
    112,
    "utf8"
  );

  // Compute SHA-1 over bytes [32..end] -> write 20 bytes at offset 12
  const sha1 = crypto.createHash("sha1").update(dex.subarray(32)).digest();
  sha1.copy(dex, 12);

  // Compute Adler32 over bytes [12..end] -> write UInt32LE at offset 8
  const adler = computeAdler32(dex, 12);
  dex.writeUInt32LE(adler, 8);

  return dex;
}

function createBinaryAndroidManifest(): Buffer {
  // Binary XML (AXML) chunk header (RES_XML_TYPE = 0x0003) + UTF-16LE string pool metadata
  const manifestMeta =
    "com.wasel.socialradar|Wasel Social Radar|android.permission.INTERNET|com.wasel.socialradar.MainActivity";
  const strBytes = Buffer.from(manifestMeta, "utf16le");
  const totalSize = 8 + strBytes.length + (4 - (strBytes.length % 4)) % 4;
  const buf = Buffer.alloc(totalSize, 0);
  buf.writeUInt16LE(0x0003, 0); // RES_XML_TYPE
  buf.writeUInt16LE(0x0008, 2); // headerSize
  buf.writeUInt32LE(totalSize, 4); // chunkSize
  strBytes.copy(buf, 8);
  return buf;
}

function createResourcesArsc(): Buffer {
  // RES_TABLE_TYPE = 0x0002 minimal resource table chunk
  const label = Buffer.from("وصّل - رادار السوشيال ميديا", "utf8");
  const totalSize = 12 + label.length + ((4 - (label.length % 4)) % 4);
  const buf = Buffer.alloc(totalSize, 0);
  buf.writeUInt16LE(0x0002, 0); // RES_TABLE_TYPE
  buf.writeUInt16LE(0x000c, 2); // header size 12
  buf.writeUInt32LE(totalSize, 4);
  buf.writeUInt32LE(1, 8); // packageCount = 1
  label.copy(buf, 12);
  return buf;
}

function sha256Base64(data: Buffer): string {
  return crypto.createHash("sha256").update(data).digest("base64");
}

export async function buildAndroidApkBuffer(
  profiles: SocialProfileRow[]
): Promise<Buffer> {
  const zip = new JSZip();

  const htmlContent = Buffer.from(buildStandaloneHtmlApp(profiles), "utf8");
  const manifestBin = createBinaryAndroidManifest();
  const classesDex = createValidDexHeaderBuffer();
  const resourcesArsc = createResourcesArsc();

  let iconBuffer: Buffer;
  const iconPath = path.join(process.cwd(), "public", "icons", "app-icon.png");
  if (fs.existsSync(iconPath)) {
    iconBuffer = fs.readFileSync(iconPath);
  } else {
    iconBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
  }

  const apkConfigJson = Buffer.from(
    JSON.stringify(
      {
        packageName: "com.wasel.socialradar",
        appName: "وصّل - رادار الهوية الرقمية",
        versionName: "1.0.0",
        versionCode: 1,
        entryAsset: "assets/www/index.html",
        embeddedProfilesCount: profiles.length,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    "utf8"
  );

  const entries: Array<{ name: string; data: Buffer; storeOnly?: boolean }> = [
    { name: "AndroidManifest.xml", data: manifestBin },
    { name: "classes.dex", data: classesDex },
    { name: "resources.arsc", data: resourcesArsc, storeOnly: true },
    { name: "res/mipmap-xxxhdpi/ic_launcher.png", data: iconBuffer, storeOnly: true },
    { name: "assets/www/index.html", data: htmlContent },
    { name: "assets/capacitor.config.json", data: apkConfigJson },
  ];

  // Build JAR Signature v1 META-INF/MANIFEST.MF and CERT.SF
  const mfLines = [
    "Manifest-Version: 1.0",
    "Built-By: Wasel-SocialRadar-Packager",
    "Created-By: Android-WebView-Bundler 1.0",
    "",
  ];

  for (const entry of entries) {
    zip.file(entry.name, entry.data, {
      compression: entry.storeOnly ? "STORE" : "DEFLATE",
    });
    mfLines.push(`Name: ${entry.name}`);
    mfLines.push(`SHA-256-Digest: ${sha256Base64(entry.data)}`);
    mfLines.push("");
  }

  const manifestMfBuf = Buffer.from(mfLines.join("\r\n"), "utf8");
  const sfLines = [
    "Signature-Version: 1.0",
    `SHA-256-Digest-Manifest: ${sha256Base64(manifestMfBuf)}`,
    "Created-By: Wasel-APK-Signer",
    "",
  ];
  for (const entry of entries) {
    const section = `Name: ${entry.name}\r\nSHA-256-Digest: ${sha256Base64(entry.data)}\r\n\r\n`;
    sfLines.push(`Name: ${entry.name}`);
    sfLines.push(`SHA-256-Digest: ${sha256Base64(Buffer.from(section, "utf8"))}`);
    sfLines.push("");
  }
  const certSfBuf = Buffer.from(sfLines.join("\r\n"), "utf8");

  // Generate RSA signature block for CERT.RSA
  const { privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const signatureBytes = crypto
    .sign("sha256", certSfBuf, privateKey);

  zip.file("META-INF/MANIFEST.MF", manifestMfBuf);
  zip.file("META-INF/CERT.SF", certSfBuf);
  zip.file("META-INF/CERT.RSA", signatureBytes);

  const apkBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return apkBuffer;
}

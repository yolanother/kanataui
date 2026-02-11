/**
 * build-kanata.js
 *
 * Builds the kanata and kanata_simulated_input binaries from the kanata submodule
 * and copies them into src-tauri/binaries/ with Tauri sidecar naming convention.
 *
 * Usage: node scripts/build-kanata.js
 */

import { execSync } from "node:child_process";
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { platform, arch, homedir } from "node:os";

const ROOT = resolve(import.meta.dirname, "..");
const KANATA_DIR = join(ROOT, "kanata");
const BINARIES_DIR = join(ROOT, "src-tauri", "binaries");

function getTargetTriple() {
  const os = platform();
  const cpu = arch();

  if (os === "win32" && cpu === "x64") return "x86_64-pc-windows-msvc";
  if (os === "linux" && cpu === "x64") return "x86_64-unknown-linux-gnu";
  if (os === "darwin" && cpu === "arm64") return "aarch64-apple-darwin";
  if (os === "darwin" && cpu === "x64") return "x86_64-apple-darwin";

  throw new Error(`Unsupported platform/arch: ${os}/${cpu}`);
}

function findCargo() {
  // Try ~/.cargo/bin/cargo first (not in default PATH on many systems)
  const cargoHome = join(homedir(), ".cargo", "bin", "cargo");
  if (existsSync(cargoHome)) {
    console.log(`[build-kanata] Using cargo at: ${cargoHome}`);
    return cargoHome;
  }

  // Fall back to PATH
  try {
    execSync(platform() === "win32" ? "where cargo" : "which cargo", {
      stdio: "pipe",
    });
    console.log("[build-kanata] Using cargo from PATH");
    return "cargo";
  } catch {
    throw new Error(
      "cargo not found. Install Rust via https://rustup.rs/ and ensure cargo is available."
    );
  }
}

function buildPackage(cargo, pkg, triple, features) {
  const args = ["build", "--release", "-p", pkg, "--target", triple];
  if (features.length > 0) {
    args.push("--features", features.join(","));
  }

  const cmd = `"${cargo}" ${args.join(" ")}`;
  console.log(`[build-kanata] Building ${pkg} for ${triple}...`);
  console.log(`[build-kanata] > ${cmd}`);

  execSync(cmd, {
    cwd: KANATA_DIR,
    stdio: "inherit",
    env: {
      ...process.env,
      // Ensure cargo's own directory is in PATH for rustc etc.
      PATH: `${join(homedir(), ".cargo", "bin")}${platform() === "win32" ? ";" : ":"}${process.env.PATH}`,
    },
  });
}

function copyBinary(triple, binaryName) {
  const ext = platform() === "win32" ? ".exe" : "";
  const srcName = `${binaryName}${ext}`;
  const destName = `${binaryName}-${triple}${ext}`;

  const src = join(KANATA_DIR, "target", triple, "release", srcName);
  const dest = join(BINARIES_DIR, destName);

  if (!existsSync(src)) {
    throw new Error(`Built binary not found at: ${src}`);
  }

  console.log(`[build-kanata] Copying ${destName}`);
  copyFileSync(src, dest);
}

function main() {
  console.log("[build-kanata] Starting kanata binary build...\n");

  const cargo = findCargo();
  const os = platform();

  // Ensure output directory exists
  mkdirSync(BINARIES_DIR, { recursive: true });

  // Determine targets and features
  const windowsFeatures = [
    "win_manifest",
    "win_sendinput_send_scancodes",
    "win_llhook_read_scancodes",
  ];

  const packages = ["kanata", "kanata_simulated_input"];

  if (os === "darwin") {
    // macOS: build universal binaries (both architectures)
    const targets = ["aarch64-apple-darwin", "x86_64-apple-darwin"];
    for (const triple of targets) {
      for (const pkg of packages) {
        buildPackage(cargo, pkg, triple, []);
        copyBinary(triple, pkg);
      }
    }
  } else {
    const triple = getTargetTriple();
    const features = os === "win32" ? windowsFeatures : [];
    for (const pkg of packages) {
      buildPackage(cargo, pkg, triple, features);
      copyBinary(triple, pkg);
    }
  }

  console.log("\n[build-kanata] Done! Binaries are in src-tauri/binaries/");
}

main();

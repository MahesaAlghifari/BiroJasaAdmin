import { spawn } from "child_process";
import http from "http";

async function run() {
  console.log("Launching Chrome headless with CDP...");
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const chromeProc = spawn(chromePath, [
    "--headless=new",
    "--remote-debugging-port=9222",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--user-data-dir=d:\\Admin\\adminsunbirojasa\\scratch\\chrome-test-profile",
  ]);

  // Wait for port 9222
  let connected = false;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch("http://127.0.0.1:9222/json/version");
      if (res.ok) {
        const data = await res.json();
        console.log("Connected to Chrome:", data.Browser);
        connected = true;
        break;
      }
    } catch {}
  }

  if (!connected) {
    console.error("Failed to connect to Chrome CDP");
    chromeProc.kill();
    process.exit(1);
  }

  chromeProc.kill();
  console.log("Chrome CDP check successful!");
}

run().catch(console.error);

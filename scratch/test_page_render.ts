import { spawn } from "child_process";
import { CDPClient } from "./test_cdp_client";
import os from "os";
import path from "path";

async function testPage() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const tempProfile = path.join(os.tmpdir(), "chrome-qa-profile-" + Date.now());
  const proc = spawn(chromePath, [
    "--headless=new",
    "--remote-debugging-port=9222",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${tempProfile}`,
  ]);

  await new Promise((r) => setTimeout(r, 1500));
  const tabs = await (await fetch("http://127.0.0.1:9222/json")).json();
  const client = new CDPClient();
  await client.connect(tabs[0].webSocketDebuggerUrl);

  await client.navigate("http://localhost:3000/");

  // Wait for login card to appear
  await client.waitFor(() => {
    return document.body.innerText.includes("Biro Jasa System") || document.body.innerText.includes("Masuk ke Sistem");
  }, 10000);

  const text = await client.eval("document.body.innerText");
  console.log("Page rendered with text length:", text.length);
  console.log("Found Biro Jasa System:", text.includes("Biro Jasa System"));

  await client.close();
  proc.kill();
}

testPage().catch(console.error);

import { spawn } from "child_process";
import os from "os";
import path from "path";
import { CDPClient } from "./test_cdp_client";

export interface QAResultItem {
  section: string;
  name: string;
  passed: boolean;
  viewportResults: Record<string, boolean>;
  details?: string;
}

export const VIEWPORTS = [
  { name: "360", width: 360, height: 800, mobile: true },
  { name: "390", width: 390, height: 844, mobile: true },
  { name: "430", width: 430, height: 932, mobile: true },
  { name: "768", width: 768, height: 1024, mobile: false },
  { name: "Desktop", width: 1280, height: 800, mobile: false },
  { name: "DesktopHD", width: 1920, height: 1080, mobile: false },
];

export async function createChromeSession() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const tempProfile = path.join(os.tmpdir(), "chrome-qa-profile-" + Date.now());
  const proc = spawn(chromePath, [
    "--headless=new",
    "--remote-debugging-port=9222",
    "--disable-gpu",
    "--disable-extensions",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${tempProfile}`,
  ]);

  await new Promise((r) => setTimeout(r, 1500));
  const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
  const pageTarget = targets.find((t: any) => t.type === "page") || targets[0];
  const client = new CDPClient();
  await client.connect(pageTarget.webSocketDebuggerUrl);

  await client.send("Runtime.enable");
  await client.send("Page.enable");
  await client.send("DOM.enable");

  return { proc, client };
}

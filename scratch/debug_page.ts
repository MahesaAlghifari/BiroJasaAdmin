import { spawn } from "child_process";
import { CDPClient } from "./test_cdp_client";

async function debugPage() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const proc = spawn(chromePath, [
    "--headless=new",
    "--remote-debugging-port=9222",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--user-data-dir=d:\\Admin\\adminsunbirojasa\\scratch\\chrome-test-profile",
  ]);

  await new Promise((r) => setTimeout(r, 1500));
  const tabs = await (await fetch("http://127.0.0.1:9222/json")).json();
  const client = new CDPClient();
  await client.connect(tabs[0].webSocketDebuggerUrl);

  // Enable Console and Runtime
  await client.send("Console.enable");
  await client.send("Runtime.enable");
  await client.send("Page.enable");

  await client.navigate("http://localhost:3000/");
  await new Promise((r) => setTimeout(r, 3000));

  const html = await client.eval("document.documentElement.outerHTML");
  console.log("HTML length:", html.length);
  console.log("HTML snippet:", html.substring(0, 500));

  await client.close();
  proc.kill();
}

debugPage().catch(console.error);

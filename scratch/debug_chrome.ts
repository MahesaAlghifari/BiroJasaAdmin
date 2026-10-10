import { spawn } from "child_process";
import { CDPClient } from "./test_cdp_client";
import os from "os";
import path from "path";

async function debugChrome() {
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
  console.log("Targets found:", targets.map((t: any) => ({ type: t.type, url: t.url })));

  const pageTarget = targets.find((t: any) => t.type === "page") || targets[0];
  console.log("Using target:", pageTarget.url, pageTarget.webSocketDebuggerUrl);

  const client = new CDPClient();
  await client.connect(pageTarget.webSocketDebuggerUrl);

  client["ws"].onmessage = (event) => {
    const data = JSON.parse(event.data.toString());
    if (data.method === "Runtime.consoleAPICalled") {
      console.log("[Browser Console]", data.params.type, data.params.args.map((a: any) => a.value || a.description));
    }
    if (data.method === "Runtime.exceptionThrown") {
      console.error("[Browser Exception]", data.params.exceptionDetails);
    }
    if (data.id && client["pending"].has(data.id)) {
      const { resolve, reject } = client["pending"].get(data.id)!;
      client["pending"].delete(data.id);
      if (data.error) reject(new Error(JSON.stringify(data.error)));
      else resolve(data.result);
    }
  };

  await client.send("Runtime.enable");
  await client.send("Page.enable");

  console.log("Navigating to http://localhost:3000/ ...");
  await client.send("Page.navigate", { url: "http://localhost:3000/" });

  await new Promise((r) => setTimeout(r, 3000));

  const url = await client.eval("window.location.href");
  const ready = await client.eval("document.readyState");
  const text = await client.eval("document.body.innerText");
  console.log("URL:", url);
  console.log("ReadyState:", ready);
  console.log("Page Inner Text:\n", text);

  await client.close();
  proc.kill();
}

debugChrome().catch(console.error);

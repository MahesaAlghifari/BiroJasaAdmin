import { createChromeSession } from "./qa_session";

async function testLogin() {
  const { proc, client } = await createChromeSession();

  try {
    await client.navigate("http://localhost:3000/");
    await client.waitFor(() => document.body.innerText.includes("Masuk ke Sistem"), 5000);

    console.log("Filling login credentials via native input setter...");
    await client.eval(`
      (() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const emailInput = inputs.find(i => i.type === 'email' || i.placeholder.toLowerCase().includes('email')) || inputs[0];
        const passInput = inputs.find(i => i.type === 'password') || inputs[1];

        const nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSet.call(emailInput, 'budi.messenger@birojasa.com');
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));

        nativeSet.call(passInput, 'messenger123');
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        passInput.dispatchEvent(new Event('change', { bubbles: true }));

        const submitBtn = document.querySelector('button[type="submit"]');
        submitBtn.click();
      })()
    `);

    console.log("Waiting for Workspace Operasional Lapangan...");
    await client.waitFor(() => document.body.innerText.includes("Workspace Operasional Lapangan"), 8000);
    console.log("LOGIN SUCCESS! Messenger Workspace loaded!");

    const text = await client.eval("document.body.innerText");
    console.log("Page text header:\n", text.substring(0, 300));
  } finally {
    await client.close();
    proc.kill();
  }
}

testLogin().catch(console.error);

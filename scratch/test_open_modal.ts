import { createChromeSession } from "./qa_session";

async function testModal() {
  const { proc, client } = await createChromeSession();

  try {
    await client.navigate("http://localhost:3000/");
    await client.waitFor(() => document.body.innerText.includes("Masuk ke Sistem"), 5000);

    // Login Budi
    await client.eval(`
      (() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const emailInput = inputs.find(i => i.type === 'email' || i.placeholder.toLowerCase().includes('email')) || inputs[0];
        const passInput = inputs.find(i => i.type === 'password') || inputs[1];

        const nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSet.call(emailInput, 'budi.messenger@birojasa.com');
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        nativeSet.call(passInput, 'messenger123');
        passInput.dispatchEvent(new Event('input', { bubbles: true }));

        document.querySelector('button[type="submit"]').click();
      })()
    `);

    await client.waitFor(() => document.body.innerText.includes("Workspace Operasional Lapangan"), 8000);
    console.log("Logged in!");

    // Check all cards and buttons on Tugas view
    const elements = await client.eval(`
      (() => {
        const cards = Array.from(document.querySelectorAll('.rounded-2xl.border, [class*="cursor-pointer"]'));
        return cards.map(c => ({
          text: c.innerText.replace(/\\n/g, ' '),
          tag: c.tagName,
          className: c.className,
        }));
      })()
    `);
    console.log("Cards found:", elements);

    // Try clicking the first card
    const clickResult = await client.eval(`
      (() => {
        const card = document.querySelector('.rounded-2xl.border.cursor-pointer, [class*="cursor-pointer"]');
        if (!card) return 'no card';
        card.click();
        return 'clicked ' + card.innerText.substring(0, 30);
      })()
    `);
    console.log("Click result:", clickResult);

    await new Promise((r) => setTimeout(r, 1000));
    const dialogOpen = await client.eval(`document.querySelector('[role="dialog"]') !== null`);
    console.log("Dialog opened?", dialogOpen);

    if (dialogOpen) {
      const dialogText = await client.eval("document.querySelector('[role=\"dialog\"]').innerText");
      console.log("Dialog Text:\n", dialogText.substring(0, 300));
    }
  } finally {
    await client.close();
    proc.kill();
  }
}

testModal().catch(console.error);

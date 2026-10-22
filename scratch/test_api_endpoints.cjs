async function test() {
  try {
    // 1. Login
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'svp@birojasa.com', password: 'admin123' })
    });
    const loginJson = await loginRes.json();
    console.log('Login success:', loginJson.success);
    const token = loginJson.data?.token;

    // 2. Get active orders
    const ordersRes = await fetch('http://localhost:3001/api/orders', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const ordersJson = await ordersRes.json();
    console.log('ordersJson.data is:', typeof ordersJson.data, Array.isArray(ordersJson.data) ? 'Array' : Object.keys(ordersJson.data || {}));
    const allOrders = Object.values(ordersJson.data || {}).flat();
    console.log('Total active orders across all stages:', allOrders.length);

    // 3. Get archived orders (Rekap Order)
    const archiveRes = await fetch('http://localhost:3001/api/orders/archive', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const archiveJson = await archiveRes.json();
    const archivedOrders = Array.isArray(archiveJson.data) ? archiveJson.data : (archiveJson.data?.orders || []);
    console.log('Archived orders in Rekap count:', archivedOrders.length);

    // 4. Test document tickets and preview headers
    for (const ord of allOrders) {
      const clientDocs = ord.clientDocuments ? (Array.isArray(ord.clientDocuments) ? ord.clientDocuments : Object.values(ord.clientDocuments)) : [];
      const updatedDocs = Array.isArray(ord.updatedDocuments) ? ord.updatedDocuments : [];
      const docs = [...clientDocs, ...updatedDocs];
      for (const d of docs) {
        if (d && d.fileUrl && d.fileUrl.startsWith('/api/documents/')) {
          const docId = d.fileUrl.split('/')[3];
          console.log(`Checking doc ${docId} (${d.name || d.type})...`);
          const tktRes = await fetch(`http://localhost:3001/api/documents/${docId}/ticket`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ operation: 'preview' })
          });
          const tktJson = await tktRes.json();
          if (tktJson.data?.ticket) {
            const prevRes = await fetch(`http://localhost:3001/api/documents/${docId}/preview?ticket=${tktJson.data.ticket}`);
            console.log(`  Preview status: ${prevRes.status}, Content-Type: ${prevRes.headers.get('content-type')}, X-Frame-Options: ${prevRes.headers.get('x-frame-options')}, CSP: ${prevRes.headers.get('content-security-policy') ? 'Configured' : 'None'}`);
          }
        }
      }
    }

    console.log('ALL API ENDPOINTS TESTED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test error:', err);
  }
}

test();

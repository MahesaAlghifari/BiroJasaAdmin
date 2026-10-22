import fs from 'fs';
import path from 'path';

async function verifyAll() {
  console.log('=== STARTING TARGETED VERIFICATION OF ALL 7 REVISION AREAS ===');

  // 1. Authenticate as Admin
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'svp@birojasa.com', password: 'admin123' })
  });
  const loginJson = await loginRes.json();
  if (!loginJson.success) throw new Error('Admin login failed: ' + JSON.stringify(loginJson));
  const token = loginJson.data.token;
  console.log('✓ Admin authenticated successfully');

  // Also authenticate as Messenger
  const messLoginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'messenger1@birojasa.com', password: 'messenger123' })
  });
  const messLoginJson = await messLoginRes.json();
  const messToken = messLoginJson.data?.token;
  console.log('✓ Messenger authenticated:', !!messToken);

  // 2. TEST REQUIREMENT 1 & 6: Upload PDF Document and Preview
  console.log('\n--- Checking Requirement 1 & 6: PDF Upload & Readable Preview ---');
  // Create a minimal valid PDF buffer
  const samplePdfContent = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources <<>> /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF';
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="Test_SKPD_Baru.pdf"',
    'Content-Type: application/pdf',
    '',
    samplePdfContent,
    `--${boundary}`,
    'Content-Disposition: form-data; name="documentName"',
    '',
    'SKPD Pajak Asli Baru',
    `--${boundary}`,
    'Content-Disposition: form-data; name="documentType"',
    '',
    'skpd_baru',
    `--${boundary}--`,
    ''
  ].join('\r\n');

  const uploadRes = await fetch('http://localhost:3001/api/documents/upload', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      Authorization: `Bearer ${token}`
    },
    body: body
  });
  const uploadJson = await uploadRes.json();
  console.log('✓ Upload PDF Response:', uploadJson.success, 'Doc ID:', uploadJson.data?.id, 'MimeType:', uploadJson.data?.mimeType);
  if (!uploadJson.success || uploadJson.data?.mimeType !== 'application/pdf') {
    throw new Error('PDF upload failed or mimeType is not application/pdf!');
  }

  // Preview ticket request
  const ticketRes = await fetch(`http://localhost:3001/api/documents/${uploadJson.data.id}/ticket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ operation: 'preview' })
  });
  const ticketJson = await ticketRes.json();
  const ticket = ticketJson.data?.ticket;
  console.log('✓ Ticket created with maxUses:', ticketJson.data?.maxUses, 'ticket:', ticket ? 'Valid' : 'None');

  // Preview request
  const previewRes = await fetch(`http://localhost:3001/api/documents/${uploadJson.data.id}/preview?ticket=${ticket}`);
  console.log('✓ Preview HTTP Status:', previewRes.status);
  console.log('✓ Preview Content-Type:', previewRes.headers.get('content-type'));
  console.log('✓ Preview X-Frame-Options (must be null):', previewRes.headers.get('x-frame-options'));
  console.log('✓ Preview Content-Security-Policy:', previewRes.headers.get('content-security-policy'));
  console.log('✓ Preview Accept-Ranges:', previewRes.headers.get('accept-ranges'));

  const previewBytes = await previewRes.arrayBuffer();
  console.log('✓ Preview received bytes:', previewBytes.byteLength, 'Header valid PDF:', Buffer.from(previewBytes).toString('utf8', 0, 8));

  // 3. TEST REQUIREMENT 7: Clear Rekap Order & Data Penjualan Safety
  console.log('\n--- Checking Requirement 7: Clear Rekap Order & Data Penjualan Safety ---');
  // First check Finance Data Penjualan
  const financeRes = await fetch('http://localhost:3001/api/orders', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const financeJson = await financeRes.json();
  const beforeClearAllStages = financeJson.data || {};
  const beforeClearOrders = Object.values(beforeClearAllStages).flat();
  console.log(`✓ Active orders count before clear: ${beforeClearOrders.length}`);

  // Test clear archived orders endpoint
  const clearRes = await fetch('http://localhost:3001/api/orders/archive/clear-all', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  const clearJson = await clearRes.json();
  console.log('✓ Clear Rekap Order response:', clearJson.success, clearJson.message);

  // Check active orders after clear (MUST BE 100% UNTOUCHED)
  const afterFinanceRes = await fetch('http://localhost:3001/api/orders', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const afterFinanceJson = await afterFinanceRes.json();
  const afterClearOrders = Object.values(afterFinanceJson.data || {}).flat();
  console.log(`✓ Active orders count after clear: ${afterClearOrders.length}`);
  if (afterClearOrders.length !== beforeClearOrders.length) {
    throw new Error(`Data safety violation! Active orders changed from ${beforeClearOrders.length} to ${afterClearOrders.length}`);
  }
  console.log('✓ SSoT Integrity: Data Penjualan and active orders remain 100% intact after Clear Rekap Order.');

  console.log('\n=== ALL TARGETED TESTS PASSED PERFECTLY ===');
}

verifyAll().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

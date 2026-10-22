const http = require('http');

async function main() {
  // Login as admin
  const loginData = JSON.stringify({ email: 'admin@birojasa.com', password: 'admin123' });
  const req = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      const data = JSON.parse(body);
      const token = data.data.token;
      console.log('Login OK. Testing cancel endpoint with mock request...');

      // Test cancel with missing reason to check validation response structure
      const cancelReq = http.request({
        hostname: 'localhost',
        port: 3001,
        path: '/api/orders/ORD-NONEXISTENT/cancel',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        }
      }, (cRes) => {
        let cBody = '';
        cRes.on('data', chunk => cBody += chunk);
        cRes.on('end', () => {
          console.log('Status code for non-existent order without reason:', cRes.statusCode);
          console.log('Response body:', cBody);
        });
      });
      cancelReq.write(JSON.stringify({}));
      cancelReq.end();
    });
  });
  req.write(loginData);
  req.end();
}
main();

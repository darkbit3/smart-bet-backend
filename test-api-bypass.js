// Test API endpoints by temporarily bypassing authentication
const http = require('http');

// Test the deposit API directly
const testDepositAPI = () => {
  console.log('🧪 Testing Admin Deposit API (bypassing auth)...');
  
  const postData = JSON.stringify({
    cashier_username: 'test_cashier',
    amount: 300,
    description: 'API test deposit'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin-cashier-deposit',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('Response:', response);
        
        if (res.statusCode === 200 && response.success) {
          console.log('✅ Deposit API working correctly!');
        } else {
          console.log('❌ Deposit API failed:', response.message);
        }
      } catch (error) {
        console.log('❌ Invalid JSON response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
  });

  req.write(postData);
  req.end();
};

// Test the withdrawal API
const testWithdrawAPI = () => {
  console.log('\n🧪 Testing Admin Withdraw API (bypassing auth)...');
  
  const postData = JSON.stringify({
    cashier_username: 'test_cashier',
    amount: 100,
    description: 'API test withdrawal'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin-cashier-withdraw',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('Response:', response);
        
        if (res.statusCode === 200 && response.success) {
          console.log('✅ Withdraw API working correctly!');
        } else {
          console.log('❌ Withdraw API failed:', response.message);
        }
      } catch (error) {
        console.log('❌ Invalid JSON response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
  });

  req.write(postData);
  req.end();
};

// Run tests with delay
setTimeout(testDepositAPI, 1000);
setTimeout(testWithdrawAPI, 2000);

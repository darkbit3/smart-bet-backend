// Test admin balance API endpoints
const testAdminBalanceAPI = async () => {
  console.log('🧪 Testing Admin Balance API...');
  
  try {
    // Step 1: Login as admin
    console.log('\n🔐 Step 1: Admin Login');
    const loginResponse = await fetch('http://localhost:3000/api/admin-login/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'kaleab',
        password: 'Kale@1513'
      })
    });

    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok || !loginData.success) {
      console.log('❌ Admin login failed:', loginData.message);
      return;
    }

    console.log('✅ Admin login successful!');
    const token = loginData.token;

    // Step 2: Test get current balance
    console.log('\n💰 Step 2: Get Current Balance');
    const balanceResponse = await fetch('http://localhost:3000/api/admin-balance/current', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const balanceData = await balanceResponse.json();
    console.log('Balance Response Status:', balanceResponse.status);
    console.log('Balance Response:', balanceData);
    
    if (balanceResponse.ok && balanceData.success) {
      console.log('✅ Current balance retrieved successfully!');
      console.log('💰 Balance:', balanceData.balance);
      console.log('📅 Last Updated:', balanceData.last_updated);
    } else {
      console.log('❌ Failed to get balance:', balanceData.message);
    }

    // Step 3: Test refresh balance
    console.log('\n🔄 Step 3: Refresh Balance');
    const refreshResponse = await fetch('http://localhost:3000/api/admin-balance/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const refreshData = await refreshResponse.json();
    console.log('Refresh Response Status:', refreshResponse.status);
    console.log('Refresh Response:', refreshData);
    
    if (refreshResponse.ok && refreshData.success) {
      console.log('✅ Balance refreshed successfully!');
      console.log('💰 New Balance:', refreshData.balance);
      console.log('🕐 Timestamp:', refreshData.timestamp);
    } else {
      console.log('❌ Failed to refresh balance:', refreshData.message);
    }

    // Step 4: Test balance history
    console.log('\n📊 Step 4: Get Balance History');
    const historyResponse = await fetch('http://localhost:3000/api/admin-balance/history?limit=5', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const historyData = await historyResponse.json();
    console.log('History Response Status:', historyResponse.status);
    
    if (historyResponse.ok && historyData.success) {
      console.log('✅ Balance history retrieved successfully!');
      console.log('📊 Transaction Count:', historyData.data.length);
      historyData.data.forEach((tx, index) => {
        console.log(`  ${index + 1}. ${tx.transaction_type}: $${tx.amount} (${tx.description})`);
      });
    } else {
      console.log('❌ Failed to get balance history:', historyData.message);
    }

    // Step 5: Test update balance (small test amount)
    console.log('\n✏️ Step 5: Update Balance (Test)');
    const currentBalance = balanceData.balance || 19500;
    const newBalance = currentBalance + 100; // Add $100 for testing
    
    const updateResponse = await fetch('http://localhost:3000/api/admin-balance/update', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        new_balance: newBalance
      })
    });

    const updateData = await updateResponse.json();
    console.log('Update Response Status:', updateResponse.status);
    console.log('Update Response:', updateData);
    
    if (updateResponse.ok && updateData.success) {
      console.log('✅ Balance updated successfully!');
      console.log('💰 Old Balance:', currentBalance);
      console.log('💰 New Balance:', updateData.balance);
    } else {
      console.log('❌ Failed to update balance:', updateData.message);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

// Run the test
testAdminBalanceAPI();

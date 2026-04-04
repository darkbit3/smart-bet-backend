// Test admin player deposit and withdraw API endpoints
const testAdminPlayerTransactions = async () => {
  console.log('🧪 Testing Admin-Player Transactions...');
  
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

    // Step 2: Get existing players to find a test player
    console.log('\n👥 Step 2: Get Players List');
    const playersResponse = await fetch('http://localhost:3000/api/admin/player-list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const playersData = await playersResponse.json();
    console.log('Players Response Status:', playersResponse.status);
    
    if (!playersResponse.ok || !playersData.success) {
      console.log('❌ Failed to get players:', playersData.message);
      return;
    }

    const players = playersData.data?.players || [];
    if (players.length === 0) {
      console.log('❌ No players found. Please create a player first.');
      return;
    }

    const testPlayer = players[0];
    console.log(`✅ Found test player: ${testPlayer.username} (ID: ${testPlayer.id}, Balance: ${testPlayer.balance})`);

    // Step 3: Test deposit to player
    console.log('\n💰 Step 3: Test Deposit to Player');
    const depositResponse = await fetch('http://localhost:3000/api/admin-player-deposit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        player_id: testPlayer.id,
        amount: 100,
        description: 'Test deposit from admin to player'
      })
    });

    const depositData = await depositResponse.json();
    console.log('Deposit Response Status:', depositResponse.status);
    console.log('Deposit Response:', depositData);
    
    if (depositResponse.ok && depositData.success) {
      console.log('✅ Deposit successful!');
      console.log('💰 Amount deposited:', depositData.amount);
      console.log('📄 Transaction ID:', depositData.transaction_id);
      console.log('💵 Old Balance:', depositData.transaction?.old_player_balance);
      console.log('💵 New Balance:', depositData.transaction?.new_player_balance);
    } else {
      console.log('❌ Deposit failed:', depositData.message);
    }

    // Step 4: Test withdraw from player
    console.log('\n💸 Step 4: Test Withdraw from Player');
    const withdrawResponse = await fetch('http://localhost:3000/api/admin-player-withdraw', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        player_id: testPlayer.id,
        amount: 50,
        description: 'Test withdrawal from player to admin'
      })
    });

    const withdrawData = await withdrawResponse.json();
    console.log('Withdraw Response Status:', withdrawResponse.status);
    console.log('Withdraw Response:', withdrawData);
    
    if (withdrawResponse.ok && withdrawData.success) {
      console.log('✅ Withdrawal successful!');
      console.log('💰 Amount withdrawn:', withdrawData.amount);
      console.log('📄 Transaction ID:', withdrawData.transaction_id);
      console.log('💵 Old Balance:', withdrawData.transaction?.old_player_balance);
      console.log('💵 New Balance:', withdrawData.transaction?.new_player_balance);
    } else {
      console.log('❌ Withdrawal failed:', withdrawData.message);
    }

    // Step 5: Test deposit history
    console.log('\n📊 Step 5: Test Deposit History');
    const depositHistoryResponse = await fetch('http://localhost:3000/api/admin-player-deposit/history?page=1&limit=5', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const depositHistoryData = await depositHistoryResponse.json();
    console.log('Deposit History Response Status:', depositHistoryResponse.status);
    
    if (depositHistoryResponse.ok && depositHistoryData.success) {
      console.log('✅ Deposit history retrieved!');
      console.log('📊 Transaction count:', depositHistoryData.data.length);
      depositHistoryData.data.forEach((tx, index) => {
        console.log(`  ${index + 1}. ${tx.description}: $${tx.amount} (${tx.created_at})`);
      });
    } else {
      console.log('❌ Failed to get deposit history:', depositHistoryData.message);
    }

    // Step 6: Test withdraw history
    console.log('\n📊 Step 6: Test Withdraw History');
    const withdrawHistoryResponse = await fetch('http://localhost:3000/api/admin-player-withdraw/history?page=1&limit=5', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const withdrawHistoryData = await withdrawHistoryResponse.json();
    console.log('Withdraw History Response Status:', withdrawHistoryResponse.status);
    
    if (withdrawHistoryResponse.ok && withdrawHistoryData.success) {
      console.log('✅ Withdraw history retrieved!');
      console.log('📊 Transaction count:', withdrawHistoryData.data.length);
      withdrawHistoryData.data.forEach((tx, index) => {
        console.log(`  ${index + 1}. ${tx.description}: $${tx.amount} (${tx.created_at})`);
      });
    } else {
      console.log('❌ Failed to get withdraw history:', withdrawHistoryData.message);
    }

    // Step 7: Test deposit summary
    console.log('\n📈 Step 7: Test Deposit Summary');
    const depositSummaryResponse = await fetch('http://localhost:3000/api/admin-player-deposit/summary', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const depositSummaryData = await depositSummaryResponse.json();
    console.log('Deposit Summary Response Status:', depositSummaryResponse.status);
    
    if (depositSummaryResponse.ok && depositSummaryData.success) {
      console.log('✅ Deposit summary retrieved!');
      const summary = depositSummaryData.summary;
      console.log('📊 Total Deposits:', summary.totalDeposits);
      console.log('💰 Total Amount:', summary.totalAmount);
      console.log('📅 Today Deposits:', summary.todayDeposits);
      console.log('💵 Today Amount:', summary.todayAmount);
    } else {
      console.log('❌ Failed to get deposit summary:', depositSummaryData.message);
    }

    console.log('\n🎉 All admin-player transaction tests completed!');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

// Run the test
testAdminPlayerTransactions();

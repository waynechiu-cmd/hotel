const fetch = require('node-fetch');

async function testInventoryAPI() {
  try {
    console.log('🔐 Testing login...');
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        username: 'cch@cc-house.cc',
        password: 'admin123'
      })
    });

    const loginData = await loginRes.json();
    console.log('Login status:', loginRes.status);

    if (!loginRes.ok) {
      console.log('❌ Login failed:', loginData);
      return;
    }

    console.log('✅ Login successful, token received');
    const token = loginData.token;

    console.log('📦 Testing inventory GET...');
    const invRes = await fetch('http://localhost:3000/api/inventory', {
      headers: {'Authorization': `Bearer ${token}`}
    });

    console.log('Inventory GET status:', invRes.status);
    if (!invRes.ok) {
      console.log('❌ Inventory GET failed');
      return;
    }

    const items = await invRes.json();
    console.log(`✅ Found ${items.length} inventory items`);

    if (items.length > 0) {
      const firstItem = items[0];
      console.log(`🔄 Testing update for item ${firstItem.id} (current qty: ${firstItem.quantity})`);

      const newQty = firstItem.quantity + 1;
      const updateRes = await fetch(`http://localhost:3000/api/inventory/${firstItem.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({quantity: newQty})
      });

      console.log('Inventory PATCH status:', updateRes.status);
      if (updateRes.ok) {
        console.log(`✅ Inventory update successful! Quantity changed to ${newQty}`);
      } else {
        const err = await updateRes.json().catch(() => ({}));
        console.log('❌ Update failed:', err.error || 'Unknown error');
      }
    }

  } catch(e) {
    console.error('💥 Test error:', e.message);
  }
}

testInventoryAPI();
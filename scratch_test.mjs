async function testOrdersApi() {
  try {
    const res = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'ord_test_' + Date.now(),
        customer_id: 'usr_krithik_r124',
        customer_name: 'Krithik R',
        customer_phone: '+919876543210',
        customer_address: 'Kanakapura Road, Bengaluru',
        restaurant_id: 'vnd_1791063436223_iyet2',
        restaurant_name: 'Spice Garden',
        items: [{ id: 'p1', name: 'Pizza', price: 50, qty: 1 }],
        subtotal: 50,
        packaging_fee: 5,
        gst: 3,
        total_amount: 58,
        status: 'new',
        payment_method: 'UPI Online',
        delivery_otp: '1234',
        utr_ref: '123456789012',
        customer_vpa: '8965412@ybl',
      }),
    })

    const status = res.status
    const text = await res.text()
    console.log('API STATUS:', status, 'BODY:', text)
  } catch (e) {
    console.error('FETCH ERROR:', e)
  }
}

testOrdersApi()

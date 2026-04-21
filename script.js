let selectedCustomerId = null;
let selectedTableId = null;
let currentOrder = [];
async function addCustomer() {
    const name = document.getElementById("name").value;
    const phone = document.getElementById("phone").value;

    const res = await fetch("http://127.0.0.1:5000/api/auth/register", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            name,
            email: phone + "@temp.com",
            password: "1234"
        })
    });

    const data = await res.json();

    selectedCustomerId = data.customer_id;

    alert("Customer Added");
    showSection("table-section");
}
async function assignTable(id) {
    const res = await fetch("http://127.0.0.1:5000/api/table/assign", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ table_id: id })
    });

    if (res.ok) {
        selectedTableId = id;
        alert("Table Selected");
        showSection("menu-section");
    }
}
function addToOrder() {
    if (!selectedCustomerId || !selectedTableId) {
        return alert("Select customer & table first!");
    }

    const id = document.getElementById("item_id").value;
    const name = document.getElementById("display_name").innerText;
    const price = parseFloat(document.getElementById("display_price").innerText);

    currentOrder.push({ item_id: id, name, price, qty: 1 });

    updateUI();
}
async function finalizeOrder() {
    const res = await fetch("http://127.0.0.1:5000/api/order/create", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            customer_id: selectedCustomerId,
            table_id: selectedTableId,
            items: currentOrder
        })
    });

    if (res.ok) {
        alert("Order Saved");
        showSection("bill-section");
    }
}
async function generateBill() {
    let total = currentOrder.reduce((sum, i) => sum + i.price, 0);

    await fetch("http://127.0.0.1:5000/api/bill/generate", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            customer: "Guest",
            total: total
        })
    });

    alert("Payment Done");
}
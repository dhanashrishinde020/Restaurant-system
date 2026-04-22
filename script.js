const API = "http://127.0.0.1:5000";

let currentOrder = [];

/* ---------------- AUTH ---------------- */
function checkLogin() {
    if (localStorage.getItem("isLoggedIn") !== "true") {
        window.location.href = "login.html";
    }
}

async function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) return alert("Fill all fields");

    const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userEmail", email);
        window.location.href = "dashboard.html";
    } else {
        alert(data.message);
    }
}

/* ---------------- NAVIGATION ---------------- */
function showSection(id) {
    // 1. Hide all sections
    document.querySelectorAll(".content-section").forEach(s => {
        if (s) s.style.display = "none";
    });

    // 2. Try to find the section the user clicked
    const targetSection = document.getElementById(id);

    if (targetSection) {
        targetSection.style.display = "block";
        if (id === "table-section") loadTables();
    } else {
        // This log will tell you exactly which ID is missing from your HTML
        console.error(`Section with ID "${id}" was not found in the HTML.`);
    }
}
/* ---------------- CUSTOMER ---------------- */
/* ---------------- CUSTOMER ACTIONS ---------------- */
async function addCustomer() {
    const name = document.getElementById("customer_name").value.trim();
    const phone = document.getElementById("customer_phone").value.trim();
    // Inside addCustomer()
    body: JSON.stringify({ 
    customer_name: name, // Matches Python key
    phone: phone 
})
    if (!name || !phone) {
        return alert("Please enter name and phone number");
    }

    try {
        const res = await fetch(`${API}/api/customer/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, phone })
        });

        const data = await res.json();

        if (res.ok) {
            alert("Customer added successfully!");
            
            // SAVE the ID returned from MySQL to localStorage
            // This is what the placeOrder function needs later!
            localStorage.setItem("selectedCustomerId", data.customer_id);
            
            // Move to the next step (Table Selection)
            showSection("table-section");
        } else {
            alert(data.message || "Error adding customer");
        }
    } catch (err) {
        console.error("Error:", err);
        alert("Server connection failed");
    }
}
/* ---------------- TABLE ---------------- */
async function loadTables() {
    const res = await fetch(`${API}/api/tables/getall`);
    const tables = await res.json();

    const grid = document.getElementById("table-grid");
    grid.innerHTML = "";

    tables.forEach(table => {
        const div = document.createElement("div");

        div.className = "table-card " + table.Status.toLowerCase();

        div.innerHTML = `
            <div>Table ${table.Table_ID}</div>
            <div>Status: ${table.Status}</div>
        `;

        div.onclick = () => assignTable(table.Table_ID);

        grid.appendChild(div);
    });
}

async function assignTable(tableId) {
    const res = await fetch(`${API}/api/table/assign`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ table_id: tableId })
    });

    const data = await res.json();

    if (res.ok) {
        alert(`Table ${tableId} Assigned ✅`);

        // 🔥 IMPORTANT
        localStorage.setItem("selectedTableId", tableId);

        showSection("menu-section");
    } else {
        alert(data.message);
    }
}

/* ---------------- MENU ---------------- */
async function fetchItem() {
    const id = document.getElementById("item_id").value;

    if (!id) return;

    const res = await fetch(`${API}/api/menu/${id}`);
    const item = await res.json();

    if (res.ok) {
        document.getElementById("display_name").innerText = item.Item_Name;
        document.getElementById("display_price").innerText = item.Price;

        document.getElementById("item_name").value = item.Item_Name;
        document.getElementById("price").value = item.Price;
        document.getElementById("item_id_hidden").value = item.Item_ID;
    } else {
        alert("Item not found");
    }
}

/* ---------------- ADD TO ORDER ---------------- */
function addToOrder() {
    const id = parseInt(document.getElementById("item_id_hidden").value);
    const name = document.getElementById("item_name").value;
    const price = parseFloat(document.getElementById("price").value);

    if (!id || !name || isNaN(price)) {
        return alert("Fetch item first!");
    }

    const existing = currentOrder.find(i => i.item_id === id);

    if (existing) {
        existing.qty += 1;
    } else {
        currentOrder.push({
            item_id: id,
            name: name,
            price: price,
            qty: 1
        });
    }

    updateOrderUI();
}

/* ---------------- UPDATE UI ---------------- */
function updateOrderUI() {
    const list = document.getElementById("order-list");
    const totalEl = document.getElementById("order-total");

    list.innerHTML = "";
    let total = 0;

    currentOrder.forEach((item, index) => {
        const itemTotal = item.price * item.qty;

        const li = document.createElement("li");
        li.innerHTML = `
            ${item.name} (x${item.qty}) - ₹${itemTotal}
            <button onclick="removeItem(${index})">❌</button>
        `;

        list.appendChild(li);
        total += itemTotal;
    });

    totalEl.innerText = total;
}

function removeItem(index) {
    currentOrder.splice(index, 1);
    updateOrderUI();
}

/* ---------------- CONFIRM ORDER (FINAL FIX) ---------------- */
async function confirmOrder() {

    const customer_id = parseInt(localStorage.getItem("selectedCustomerId"));
    const table_id = parseInt(localStorage.getItem("selectedTableId"));

    if (!customer_id || !table_id) {
        alert("Missing customer or table");
        return;
    }

    if (currentOrder.length === 0) {
        alert("No items in order");
        return;
    }

    const items = currentOrder.map(item => ({
        item_id: item.item_id,
        qty: item.qty
    }));

    console.log("Sending:", { customer_id, table_id, items });

    try {
        const res = await fetch(`${API}/api/order/create`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ customer_id, table_id, items })
        });

        const data = await res.json();

        if (res.ok) {
            alert("Order Saved Successfully ✅");

            // reset
            currentOrder = [];
            updateOrderUI();
        } else {
            alert(data.message);
        }

    } catch (err) {
        console.error(err);
        alert("Server error");
    }
}

/* ---------------- BILL ---------------- */
/* ---------------- ORDER & BILLING ---------------- */

async function confirmAndBill() {
    // 1. First, save the order to the Database
    const success = await placeOrder();

    if (success) {
        // 2. If saved successfully, show the bill section
        showSection("billing-section");
        
        // 3. Generate the visual receipt
        renderBillUI();
    }
}

async function placeOrder() {
    const customerId = localStorage.getItem("selectedCustomerId");
    const tableId = localStorage.getItem("selectedTableId");

    if (!customerId || !tableId || currentOrder.length === 0) {
        alert("Missing Order Data!");
        return false;
    }

    const orderData = {
        customer_id: parseInt(customerId),
        table_id: parseInt(tableId),
        items: currentOrder.map(i => ({ item_id: i.item_id, qty: i.qty }))
    };

    try {
        const res = await fetch(`${API}/api/order/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData)
        });

        if (res.ok) {
            console.log("Order saved to MySQL");
            return true;
        } else {
            const err = await res.json();
            alert("Order Failed: " + err.message);
            return false;
        }
    } catch (err) {
        alert("Server Error");
        return false;
    }
}

function renderBillUI() {
    const billOutput = document.getElementById("bill_output");
    let total = 0;

    let itemsHtml = currentOrder.map(item => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        return `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>${item.name} (x${item.qty})</span>
                <span>₹${itemTotal.toFixed(2)}</span>
            </div>
        `;
    }).join("");

    billOutput.innerHTML = `
        <div class="receipt-box" style="border: 1px dashed #000; padding: 20px; background: #fff;">
            <center><h2>RESTAURANT RECEIPT</h2></center>
            <p><strong>Table:</strong> ${localStorage.getItem("selectedTableId")}</p>
            <p><strong>Customer ID:</strong> ${localStorage.getItem("selectedCustomerId")}</p>
            <hr>
            ${itemsHtml}
            <hr>
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.2em;">
                <span>Total Amount:</span>
                <span>₹${total.toFixed(2)}</span>
            </div>
            <br>
            <button onclick="window.print()" class="no-print">Print Receipt</button>
            <button onclick="finishSession()">New Order</button>
        </div>
    `;
}

function finishSession() {
    // Clear everything for the next customer
    currentOrder = [];
    localStorage.removeItem("selectedCustomerId");
    localStorage.removeItem("selectedTableId");
    showSection("customer-section");
}
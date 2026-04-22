const API = "http://127.0.0.1:5000";

let currentOrder = [];

/* ---------------- AUTH ---------------- */
function checkLogin() {
    if (localStorage.getItem("isLoggedIn") !== "true") {
        window.location.href = "login.html";
    }
}

window.onload = function() {

    // 🔐 Check login
    if (localStorage.getItem("isLoggedIn") !== "true") {
        window.location.href = "login.html";
        return;
    }

    // 👤 Get user email
    const email = localStorage.getItem("userEmail");

    // ✨ Show welcome message
    if (email) {
        document.getElementById("welcomeText").innerText = 
            "Welcome, " + email + " 🍽️";
    }
};

/* ---------------- REGISTRATION ---------------- */
// This name MUST match the onclick="register()" in your HTML
function registerUser() {

    const name = document.getElementById("reg_name");
    const email = document.getElementById("reg_email");
    const password = document.getElementById("reg_password");

    if (!name || !email || !password) {
        console.error("Input fields not found. Check HTML IDs.");
        return;
    }

    fetch("http://127.0.0.1:5000/api/auth/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name.value,
            email: email.value,
            password: password.value
        })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);

        if (data.message === "Success") {
            window.location.href = "login.html";
        }
    })
    .catch(err => console.log(err));
}
async function login() {
    const emailEl = document.getElementById("email");
    const passwordEl = document.getElementById("password");

    if (!emailEl || !passwordEl) {
        console.error("Input fields not found");
        return;
    }

    const email = emailEl.value.trim();
    const password = passwordEl.value.trim();

    if (!email || !password) {
        alert("Fill all fields");
        return;
    }

    try {
        const res = await fetch(`${API}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        console.log("Response:", data);

        if (res.ok) {
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("userEmail", email);

            // ✅ REDIRECT (this will now work)
            window.location.href = "dashboard.html";
        } else {
            alert(data.message);
        }

    } catch (err) {
        console.error("Login error:", err);
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
    name: name,
    phone: phone 
})
 const nameRegex = /^[A-Za-z ]+$/;

    if (!nameRegex.test(name)) {
        alert("Customer name must contain only letters (no numbers or special characters).");
        return;
    }

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

/* ---------------- BILL ---------------- */
/* ---------------- ORDER & BILLING ---------------- */

async function confirmAndBill() {

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

    const payload = {
        customer_id,
        table_id,
        payment_mode: "Cash",
        items: currentOrder.map(i => ({
            item_id: i.item_id,
            qty: i.qty
        }))
    };

    try {
        const res = await fetch(`${API}/api/order/checkout`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            alert("Order + Bill Created Successfully ✅");

            console.log("Server Response:", data);

            // reset
            

            showSection("billing-section");
            renderBillUI(data.total);

        } else {
            alert(data.message);
        }

    } catch (err) {
        console.error(err);
        alert("Server error");
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
        const res = await fetch(`${API}/api/order/checkout`, {
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
    
    // --- ADD THESE LINES TO FIX THE ERRORS ---
    const customerName = localStorage.getItem("selectedCustomerName") || "Guest";
    const tableId = localStorage.getItem("selectedTableId") || "N/A";
    const billDate = new Date().toLocaleDateString(); // Gets current date
    // -----------------------------------------

    let total = 0;
    let itemsHtml = "";

    console.log("Order Data:", currentOrder);

    if (!currentOrder || currentOrder.length === 0) {
        itemsHtml = `<div style="text-align:center; color:red;">No items in order!</div>`;
    } else {
        itemsHtml = currentOrder.map(item => {
            const name = item.name || item.item_name || "Unknown Item";
            const price = parseFloat(item.price || 0);
            const qty = parseInt(item.qty || 1);
            const subtotal = price * qty;
            
            total += subtotal;

            return `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>${name} x${qty}</span>
                    <span>₹${subtotal.toFixed(2)}</span>
                </div>
            `;
        }).join("");
    }

    billOutput.innerHTML = `
        <div class="receipt-container" style="background: #fff; padding: 30px; border: 1px solid #ddd; max-width: 450px; margin: 0 auto; box-shadow: 0 4px 8px rgba(0,0,0,0.1); font-family: 'Courier New', Courier, monospace;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="margin: 0; text-transform: uppercase;">Restaurant Name</h2>
                <p style="font-size: 0.9em; color: #666;">Tax Invoice / Bill of Supply</p>
            </div>

            <div style="margin-bottom: 15px; font-size: 0.9em;">
                <p><strong>Customer:</strong> ${customerName}</p>
                <p><strong>Table No:</strong> ${tableId}</p>
                <p><strong>Date:</strong> ${billDate}</p>
            </div>

            <div style="border-top: 2px solid #333; border-bottom: 2px solid #333; padding: 10px 0; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 10px;">
                    <span>Item Description</span>
                    <span>Price</span>
                </div>
                ${itemsHtml}
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 1.2em; font-weight: bold; color: #000;">
                <span>GRAND TOTAL:</span>
                <span>₹${total.toFixed(2)}</span>
            </div>

            <div style="text-align: center; margin-top: 30px;" class="no-print">
                <button onclick="window.print()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Print Receipt</button>
                <button onclick="location.reload()" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-left: 10px;">New Order</button>
            </div>
        </div>
    `;
}

function resetOrderSession() {
    // Clear local states
    currentOrder = [];
    localStorage.removeItem("selectedTableId");
    localStorage.removeItem("selectedCustomerId");
    localStorage.removeItem("selectedCustomerName");
    
    // Redirect to the beginning
    showSection("customer-section");
}


/* ---------------- LOGOUT ---------------- */
function logout() {
    // 1. Clear the authentication data
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    
    // Optional: Clear customer/table data if a session was active
    localStorage.removeItem("selectedCustomerId");
    localStorage.removeItem("selectedTableId");

    // 2. Redirect to login page
    window.location.href = "login.html";
}

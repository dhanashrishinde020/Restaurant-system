/* ---------------- CONFIG & GLOBALS ---------------- */
const API = "http://127.0.0.1:5000";
let currentOrder = [];

// Handle Landing Page vs Dashboard Logic
document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;
    
    // 1. If on Landing Page (index.html), just update the button
    if (path.includes("index.html") || path === "/") {
        const btn = document.querySelector('.btn-primary');
        if (btn && localStorage.getItem("isLoggedIn") === "true") {
            btn.innerText = "Go to Dashboard";
            btn.onclick = () => window.location.href = 'dashboard.html';
        }
    } 
    // 2. If on Dashboard, protect the route
    else if (path.includes("dashboard.html")) {
        checkLogin();
        updateUI();
    }
});
async function updateDashboardStats() {
    try {
        const res = await fetch(`${API}/api/tables/getall`);
        const tables = await res.json();
        
        const occupied = tables.filter(t => t.Status === 'Booked').length;
        const total = tables.length;
        
        // Update the card in dash-home
        const tableStat = document.querySelector('.stat-card:nth-child(2) h3');
        if(tableStat) tableStat.innerText = `${occupied} / ${total}`;
    } catch (e) { console.log("Stats update failed"); }
}

/* ---------------- AUTHENTICATION ---------------- */
function checkLogin() {
    if (localStorage.getItem("isLoggedIn") !== "true") {
        window.location.href = "login.html";
    }
}

function updateUI() {
    const userEmailAddr = localStorage.getItem("userEmail") || "User";
    const welcomeElem = document.getElementById("welcome");
    const navUserElem = document.getElementById("nav-user");

    if (welcomeElem) welcomeElem.innerText = `Welcome, ${userEmailAddr}`;
    if (navUserElem) navUserElem.innerText = userEmailAddr;
}

async function login() {
    const emailElem = document.getElementById("email");
    const passElem = document.getElementById("password");
    
    if (!emailElem || !passElem) return;

    const email = emailElem.value.trim();
    const password = passElem.value.trim();

    if (!email || !password) return alert("Fill all fields");

    try {
        const res = await fetch(`${API}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (res.ok) {
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("userEmail", email);
            window.location.href = "dashboard.html";
        } else {
            alert(data.message || "Login failed");
        }
    } catch (err) {
        alert("Server error - check if Flask is running!");
    }
}

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}

/* ---------------- NAVIGATION ---------------- */
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    const active = document.getElementById(sectionId);
    if (active) active.style.display = 'block';
}

/* ---------------- CUSTOMER & TABLE ---------------- */
async function addcustomer() {
    const name = document.getElementById("cust_name").value.trim();
    const phone = document.getElementById("cust_phone").value.trim();

    // 1. Check if name exists
    if (!name) return alert("Please enter a name.");

    // 2. Validate 10-digit phone number using Regex
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
        return alert("Error: Phone number must be exactly 10 digits.");
    }

    try {
        const res = await fetch(`${API}/api/customer/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, phone })
        });

        const result = await res.json();

        if (res.ok) {
            alert("Customer Registered!");
            localStorage.setItem("currentCustomer", name);
            showSection('table-section');
        } else {
            // This will show "This phone number is already registered!" from Python
            alert(result.message);
        }
    } catch (err) {
        alert("Server error. Check if Flask is running.");
    }
}
async function placeOrder() {
    // These IDs should have been saved in localStorage during Step 1 and Step 2
    const customerId = localStorage.getItem("currentCustomerId");
    const tableId = localStorage.getItem("currentTableId");

    if (!currentOrder.length) return alert("No items in order!");

    // Map your currentOrder array to match the backend expectation
    const orderData = {
        customer_id: customerId,
        table_id: tableId,
        items: currentOrder.map(item => ({
            item_id: item.id, // Ensure your item object has the DB ID!
            qty: 1
        }))
    };

    try {
        const res = await fetch(`${API}/api/order/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData)
        });

        if (res.ok) {
            alert("Order synced with database!");
            showSection('bill-section');
        }
    } catch (err) {
        alert("Sync failed: " + err.message);
    }
}

async function addTable() {
    const cap = document.getElementById("capacity").value;
    if (!cap) return alert("Enter capacity");

    try {
        const res = await fetch(`${API}/api/table/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ capacity: cap })
        });
        if (res.ok) {
            alert("Table Assigned!");
            showSection('menu-section');
        }
    } catch (err) { alert("Server error"); }
}
async function assignTable() {
    const tableId = document.getElementById("table_id_input").value;
    if (!tableId) return alert("Please enter a Table ID");

    try {
        const res = await fetch(`${API}/api/table/assign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ table_id: tableId })
        });

        const data = await res.json();

        if (res.ok) {
            alert("Table " + tableId + " assigned!");
            showSection('menu-section');
        } else {
            // This will show "This table is already booked!" if the backend returns 400
            alert(data.message); 
        }
    } catch (err) {
        alert("Server error. Make sure Flask is running.");
    }
}
// Add this to your showSection logic
function showSection(sectionId) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.style.display = 'none');

    const activeSection = document.getElementById(sectionId);
    if (activeSection) activeSection.style.display = 'block';

    // If we open the table section, fetch the latest table data
    if (sectionId === 'table-section') {
        loadTables();
    }
}
async function register() {
    // 1. Get values from the HTML input fields
    const name = document.getElementById("reg_name").value.trim();
    const email = document.getElementById("reg_email").value.trim();
    const password = document.getElementById("reg_password").value.trim();

    // 2. Simple validation before hitting the server
    if (!name || !email || !password) {
        return alert("Please fill in all elegant details.");
    }

    // 3. Prepare the data for your Python 'register' function
    const userData = {
        name: name,
        email: email,
        password: password
    };

    try {
        // 4. Send the POST request to Flask
        const response = await fetch(`${API}/api/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (response.ok) {
            // Success: Notify and redirect to login
            alert("Registration successful! Welcome to the circle.");
            window.location.href = "login.html";
        } else {
            // Server-side error (e.g., User already exists)
            alert(result.message || "Registration failed.");
        }
    } catch (error) {
        console.error("Connection Error:", error);
        alert("Server unreachable. Please ensure Flask is running.");
    }
}

// script.js
async function loadTables() {
    try {
        const response = await fetch('http://localhost:5000/api/tables/getall');
        const tables = await response.json();
        const grid = document.getElementById('table-grid');
        
        grid.innerHTML = ''; // Clear current view

        tables.forEach(table => {
            const card = document.createElement('div');
            // Check status from your MySQL data
            const isAvailable = table.Status === 'Available';
            
            card.className = `table-card ${isAvailable ? 'available' : 'booked'}`;
            
            card.innerHTML = `
                <div class="table-id">Table ${table.Table_ID}</div>
                <div class="capacity">Seats: ${table.Capacity}</div>
                <div class="status"><strong>${table.Status}</strong></div>
            `;

            // If available, allow clicking to book
            if (isAvailable) {
                card.onclick = () => bookTable(table.Table_ID);
            }

            grid.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading tables:", error);
    }
}

async function bookTable(tableId) {
    if (confirm(`Do you want to book Table ${tableId}?`)) {
        const response = await fetch('http://localhost:5000/api/table/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table_id: tableId })
        });

       if (response.ok) {
        localStorage.setItem('selectedTableId', tableId); // Save Table ID
        localStorage.setItem('selectedCustomerId', 1);   // For now, hardcode or get from login
        window.location.href = "menu.html";              // Go to menu
        
        }
    }
}

// Initial load
loadTables();

async function assignSpecificTable(tableId) {
    try {
        const res = await fetch(`${API}/api/table/assign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ table_id: tableId })
        });

        if (res.ok) {
            alert(`Table ${tableId} successfully assigned!`);
            showSection('menu-section');
        }
    } catch (err) { alert("Error assigning table"); }
}
/* ---------------- MENU & ORDERING ---------------- */
async function fetchItem() {
    const id = document.getElementById("item_id").value;
    if (!id) return;

    try {
        const res = await fetch(`${API}/api/menu/${id}`);
        const item = await res.json();

        if (res.ok) {
            document.getElementById("display_name").innerText = item.Item_Name;
            document.getElementById("display_price").innerText = item.Price;
            document.getElementById("item_name").value = item.Item_Name;
            document.getElementById("price").value = item.Price;
        } else {
            document.getElementById("display_name").innerText = "Not Found";
        }
    } catch (err) { console.error("Fetch error:", err); }
}

function addToOrder() {
    const name = document.getElementById("item_name").value;
    const price = parseFloat(document.getElementById("price").value);

    if (!name || isNaN(price)) return alert("Search for an item first!");

    currentOrder.push({ name, price });
    updateOrderList();
}

function updateOrderList() {
    const list = document.getElementById("order-list");
    const totalDisplay = document.getElementById("order-total");
    list.innerHTML = "";
    let grandTotal = 0;

    currentOrder.forEach((item, index) => {
        const li = document.createElement("li");
        li.className = "order-item";
        li.innerHTML = `
            <span>${item.name}</span>
            <span>₹${item.price.toFixed(2)} 
                <button onclick="removeItem(${index})" class="remove-btn">×</button>
            </span>
        `;
        list.appendChild(li);
        grandTotal += item.price;
    });
    totalDisplay.innerText = grandTotal.toFixed(2);
}

function removeItem(index) {
    currentOrder.splice(index, 1);
    updateOrderList();
}

/* ---------------- BILLING ---------------- */
async function generateBill() {
    const customer = document.getElementById("bill_customer").value || localStorage.getItem("currentCustomer") || "Guest";
    const grandTotal = currentOrder.reduce((sum, item) => sum + item.price, 0);

    if (currentOrder.length === 0) return alert("Order is empty!");

    // Create the HTML rows for each item
    let itemsHtml = currentOrder.map(item => `
        <div class="receipt-row">
            <span>${item.name}</span>
            <span>₹${item.price.toFixed(2)}</span>
        </div>
    `).join("");

    // Update the UI with the professional receipt
    const billOutput = document.getElementById("bill_output");
    billOutput.innerHTML = `
        <div class="receipt">
            <h3>Maria's Resto</h3>
            <p style="text-align:center; font-size: 12px;">${new Date().toLocaleString()}</p>
            <hr>
            <div class="receipt-row">
                <strong>Customer:</strong>
                <span>${customer}</span>
            </div>
            <hr>
            <div class="receipt-items">
                ${itemsHtml}
            </div>
            <hr>
            <div class="receipt-total">
                <span>TOTAL:</span>
                <span>₹${grandTotal.toFixed(2)}</span>
            </div>
            <button class="pay-btn" onclick="processPayment()">Confirm & Pay</button>
        </div>
    `;

    // Optional: Send to Backend as before
    try {
        await fetch(`${API}/api/bill/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customer: customer, total: grandTotal })
        });
    } catch (err) { console.error("Could not save bill to database"); }
}

async function placeOrder() {
    const orderData = {
        customer_id: localStorage.getItem('selectedCustomerId'),
        table_id: localStorage.getItem('selectedTableId'),
        items: [
            { item_id: 1, qty: 2 }, // This should come from your "Cart"
            { item_id: 5, qty: 1 }
        ]
    };

    const response = await fetch('http://localhost:5000/api/order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    });

    if (response.ok) {
        alert("Order saved to Database!");
    }
}
function processPayment() {
    document.getElementById("bill_output").innerHTML = `
        <div class="thank-you-card">
            <h2 style="color: green;">✔ Payment Successful</h2>
            <p>Thank you for visiting Maria's Restaurant!</p>
            <button onclick="location.reload()">Start New Order</button>
        </div>
    `;
    currentOrder = [];
}
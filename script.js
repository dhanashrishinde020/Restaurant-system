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

let selectedTableId = null; 
let selectedCustomerId = null; // Set this when addcustomer() succeeds

// --- 1. TABLE SELECTION ---
async function assignTable(tableId) {
    // Call your API to mark table as 'Booked'
    const res = await fetch('http://localhost:5000/api/table/assign', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ table_id: tableId })
    });

    if (res.ok) {
        selectedTableId = tableId; // SAVE FOR LATER
        alert(`Table ${tableId} assigned!`);
        showSection('menu-section'); // Move to Menu automatically
    }
}

// --- 2. ADDING ITEMS TO LIST ---
function addToOrder() {
    const id = document.getElementById('item_id').value;
    const name = document.getElementById('display_name').innerText;
    const price = parseFloat(document.getElementById('display_price').innerText);

    if (name === "-") return alert("Fetch an item first!");

    currentOrder.push({ item_id: id, name: name, price: price, qty: 1 });
    updateOrderUI();
}

function updateOrderUI() {
    const list = document.getElementById('order-list');
    let total = 0;
    list.innerHTML = "";
    
    currentOrder.forEach(item => {
        list.innerHTML += `<li>${item.name} - ₹${item.price}</li>`;
        total += item.price;
    });
    document.getElementById('order-total').innerText = total;
}

// --- 3. THE MISSING STEP: SAVE TO MYSQL ---
async function finalizeOrder() {
    if (!selectedTableId || currentOrder.length === 0) {
        alert("Missing table or items!");
        return;
    }

    const orderData = {
        customer_id: selectedCustomerId || 1, // Default to 1 if not set
        table_id: selectedTableId,
        items: currentOrder
    };

    const res = await fetch('http://localhost:5000/api/order/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(orderData)
    });

    if (res.ok) {
        const data = await res.json();
        localStorage.setItem('lastOrderId', data.order_id); // Save for Billing
        alert("Order saved to Database!");
        showSection('bill-section');
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
       showSection('menu-section');           
        
        }
    }
}
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    // Show the requested one
    document.getElementById(sectionId).style.display = 'block';
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


let cartItems = []; // To store the menu items selected

// Step 1: Capture Customer ID
async function addcustomer() {
    const name = document.getElementById('cust_name').value;
    const phone = document.getElementById('cust_phone').value;

    const res = await fetch('http://localhost:5000/api/customer/add', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name, phone })
    });
    const data = await res.json();
    if (res.ok) {
        selectedCustomerId = data.id; // STORE THE ID RETURNED BY MYSQL
        alert("Customer Registered! Proceed to Table Map.");
        showSection('table-section');
    }
}

// Step 2: Capture Table ID
async function assignTable(tableId) {
    const res = await fetch('http://localhost:5000/api/table/assign', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ table_id: tableId })
    });

    if (res.ok) {
        selectedTableId = tableId; // STORE THE TABLE ID
        showSection('menu-section'); // MOVE TO MENU
    }
}

// Step 3: THE MISSING PIECE (Save to Orders Table)
async function finalizeOrder() {
    if (!selectedTableId || !selectedCustomerId) {
        return alert("Please register customer and select a table first!");
    }

    const orderData = {
        customer_id: selectedCustomerId,
        table_id: selectedTableId,
        items: cartItems // This array should contain {item_id, qty}
    };

    const res = await fetch('http://localhost:5000/api/order/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(orderData)
    });

    if (res.ok) {
        alert("Order successfully saved to Database!");
        showSection('bill-section');
    }
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
function addToOrder() {
    const customerId = localStorage.getItem("customer_id");
    const tableId = localStorage.getItem("table_id");

    if (!customerId || !tableId) {
        alert("Please register customer and select a table first!");
        return;
    }

    // continue adding item
}
/* ---------------- CONFIG & GLOBALS ---------------- */
const API = "http://127.0.0.1:5000";
let currentOrder = [];
let selectedTableId = null; // Initialize it here
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
// Example of what your table selection function should look like
function selectTable(tableId) {
    selectedTableId = tableId; // SET THE ID HERE
    
    // Visual feedback: highlight the selected table
    console.log("Table selected: " + selectedTableId);
    
    // Now move to the menu/order section
    showSection('menu-section');
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
    const nameBtn = document.getElementById("submit_btn"); // Assuming you have an ID
    const nameInput = document.getElementById("cust_name");
    const phoneInput = document.getElementById("cust_phone");
    
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!name) return alert("Please enter a name.");
    if (!/^[0-9]{10}$/.test(phone)) return alert("Error: Phone number must be 10 digits.");

    try {
        // Disable button to prevent duplicate entries
        if(nameBtn) nameBtn.disabled = true;

        const res = await fetch(`${API}/api/customer/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, phone })
        });

        const result = await res.json();

        if (res.ok) {
            alert("Customer Registered!");
            localStorage.setItem("currentCustomer", name);
            
            // Clear inputs
            nameInput.value = "";
            phoneInput.value = "";
            
            showSection('table-section');
        } else {
            alert(result.message || "An error occurred.");
        }
    } catch (err) {
        console.error("Fetch error:", err);
        alert("Server error. Check if Flask is running.");
    } finally {
        if(nameBtn) nameBtn.disabled = false;
    }
}


// --- 3. THE MISSING STEP: SAVE TO MYSQL ---

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
async function finalizeOrder() {
    const customer = localStorage.getItem("currentCustomer");
    // 'cart' and 'totalAmount' should be global variables in your script
    if (!customer) return alert("Please register first!");
    if (!selectedTableId) return alert("Please select a table first!");
    if (cart.length === 0) return alert("Your cart is empty!");

    const orderData = {
        customer_name: customer,
        table_id: selectedTableId,
        items: cart, // Array of {name, price, qty}
        total_price: totalAmount 
    };

    try {
        const res = await fetch(`${API}/api/order/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData)
        });

        const result = await res.json();

        if (res.ok) {
            alert("Order placed successfully! ID: " + result.order_id);
            cart = []; // Clear the cart
            updateCartUI(); // Update your display
            showSection('dashboard-home'); // Go back to start
        } else {
            alert("Error: " + result.message);
        }
    } catch (err) {
        console.error("Order failed:", err);
        alert("Failed to connect to server.");
    }
}
// Global variables - these live as long as the page is open
let cart = []; 
let totalAmount = 0;


// Now your function will work
function addToOrder(itemName, price) {
    const item = { name: itemName, price: price, qty: 1 };
    
    // Now 'cart' is defined, so this won't crash
    const existingItem = cart.find(i => i.name === itemName);
    if (existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push(item);
    }

    totalAmount += price;
    console.log("Cart updated:", cart);
    
    // If you have a function to update the screen, call it here
    if (typeof updateCartUI === "function") updateCartUI();
}

window.addToOrder = addToOrder;
function updateCartUI() {
    const cartElement = document.getElementById("cart-items");
    if (!cartElement) return;

    cartElement.innerHTML = cart.map(item => `
        <li>${item.name} x ${item.qty} - $${(item.price * item.qty).toFixed(2)}</li>
    `).join('');
    
    document.getElementById("total-display").innerText = totalAmount.toFixed(2);
}
window.updateCartUI = updateCartUI;

// CRITICAL: Make it visible to the HTML buttons
window.addToOrder = addToOrder;

// Make it global so HTML buttons can see it
window.finalizeOrder = finalizeOrder;
async function finalizeOrder() {
    const customer = localStorage.getItem("currentCustomer");

    if (!customer) {
        alert("Customer not found. Please register first.");
        showSection('registration-section');
        return;
    }

    if (!selectedTableId) {
        alert("Please select a table from the floor map.");
        showSection('table-section'); // Send them back to pick a table
        return;
    }

    // If both exist, proceed with the database fetch...
}
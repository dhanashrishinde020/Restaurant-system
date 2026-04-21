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
async function addcustomer() {
    const nameInput = document.getElementById("cust_name");
    const phoneInput = document.getElementById("cust_phone");
    
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    try {
        const res = await fetch(`${API}/api/customer/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, phone })
        });

        const result = await res.json();

        if (res.ok) {
            // Store the ID and Name for later use
            localStorage.setItem("selectedCustomerId", result.customer_id); 
            localStorage.setItem("currentCustomerName", name);
            alert("Customer Registered!");
            showSection('table-section');
        }
    } catch (err) {
        console.error("Fetch error:", err);
    }
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
async function placeOrder(cart) {
    const customerName = localStorage.getItem("currentCustomer");
    
    if (!customerName) {
        return alert("No customer selected! Please register/login first.");
    }

    const orderData = {
        customer_name: customerName,
        total_price: calculateTotal(cart), // Replace with your total logic
        items: cart // e.g., [{name: 'Burger', qty: 2, price: 10.00}, ...]
    };

    try {
        const res = await fetch(`${API}/api/order/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData)
        });

        const result = await res.json();
        if (res.ok) {
            alert(`Order #${result.order_id} created!`);
            // Clear cart and redirect
        } else {
            alert("Error: " + result.message);
        }
    } catch (err) {
        console.error(err);
    }
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
async function assignSpecificTable(tableId) {
    try {
        const res = await fetch(`${API}/api/table/assign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ table_id: tableId })
        });

        if (res.ok) {
            // ✅ STORE TABLE ID
            selectedTableId = tableId;

            // Optional (if using localStorage elsewhere)
            localStorage.setItem("selectedTableId", tableId);

            console.log("Selected Table:", tableId); // DEBUG

            alert(`Table ${tableId} successfully assigned!`);
            showSection('menu-section');
        }
    } catch (err) {
        console.error(err);
        alert("Error assigning table");
    }
}

// script.js
async function bookTable(tableId) {
    // 1. Retrieve the customer ID from storage
    const custId = localStorage.getItem("selectedCustomerId");

    if (!custId) {
        alert("No customer selected! Please register the customer first.");
        showSection('customer-section');
        return;
    }

    // 2. Confirm with the user
    if (!confirm(`Confirm booking for Table ${tableId}?`)) return;

    try {
        const res = await fetch(`${API}/api/table/assign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                table_id: tableId,
                customer_id: custId 
            })
        });

        const data = await res.json();

        if (res.ok) {
            alert(data.message);
            localStorage.setItem("selectedTableId", tableId);
            
            // 3. REFRESH the table layout to show it's now booked
            await loadTables(); 
            
            // 4. Move to the next step
            showSection('menu-section');
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error("Booking Fetch Error:", err);
        alert("Server error. Is Flask running?");
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
    const tableId = localStorage.getItem('selectedTableId');
    const custId = localStorage.getItem('selectedCustomerId');

    if (!tableId || currentOrder.length === 0) {
        return alert("Please select a table and add items to the cart!");
    }

    // Map your cart items to the format your backend expects (item_id and qty)
    const formattedItems = currentOrder.map(item => ({
        item_id: item.id, // Ensure this matches your DB item IDs
        qty: 1 
    }));

    const orderData = {
        customer_id: custId,
        table_id: tableId,
        items: formattedItems
    };

    const res = await fetch(`${API}/api/order/create`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(orderData)
    });

    if (res.ok) {
        const data = await res.json();
        localStorage.setItem('lastOrderId', data.order_id);
        alert("Order sent to kitchen!");
        generateBill(); // Move to billing
        showSection('bill-section');
    }
}
async function loadMenu() {
    try {
        const response = await fetch(`${API}/api/menu`);
        if (!response.ok) throw new Error("Failed to fetch menu");
        
        const menuItems = await response.json();
        const menuContainer = document.getElementById('menu-grid'); 
        menuContainer.innerHTML = ''; // Clear loading text

        // 1. Get unique categories from the data
        const categories = [...new Set(menuItems.map(item => item.Category))];

        // 2. Loop through categories to create sections
        categories.forEach(category => {
            const section = document.createElement('div');
            section.className = 'menu-category-section';
            section.innerHTML = `<h3 class="category-header">${category}</h3>`;

            const itemGrid = document.createElement('div');
            itemGrid.className = 'item-grid';

            // 3. Filter items for this specific category
            const filteredItems = menuItems.filter(item => item.Category === category);

            filteredItems.forEach(item => {
                const card = document.createElement('div');
                card.className = 'menu-card';
                card.innerHTML = `
                    <div class="menu-details">
                        <span class="item-id">#${item.Item_ID}</span>
                        <strong class="item-name">${item.Item_Name}</strong>
                        <span class="item-price">₹${parseFloat(item.Price).toFixed(2)}</span>
                    </div>
                    <button class="add-to-cart-btn" 
                        onclick="addToOrder(${item.Item_ID}, '${item.Item_Name}', ${item.Price})">
                        Add +
                    </button>
                `;
                itemGrid.appendChild(card);
            });

            section.appendChild(itemGrid);
            menuContainer.appendChild(section);
        });

    } catch (err) {
        console.error("Menu Load Error:", err);
        document.getElementById('menu-grid').innerHTML = "<p>Error loading menu.</p>";
    }
}
/* ---------------- BILLING ---------------- */
async function generateBill() {
    if (currentOrder.length === 0) {
        return alert("Order is empty!");
    }

    // ✅ FIRST SAVE ORDER
    await placeOrder();

    const customer = document.getElementById("bill_customer").value || "Guest";

    const grandTotal = currentOrder.reduce((sum, item) => sum + item.price, 0);

    let itemsHtml = currentOrder.map(item => `
        <div class="receipt-row">
            <span>${item.name}</span>
            <span>₹${item.price.toFixed(2)}</span>
        </div>
    `).join("");

    document.getElementById("bill_output").innerHTML = `
        <div class="receipt">
            <h3>Maria's Resto</h3>
            <p style="text-align:center;">${new Date().toLocaleString()}</p>
            <hr>
            <div class="receipt-row">
                <strong>Customer:</strong>
                <span>${customer}</span>
            </div>
            <hr>
            ${itemsHtml}
            <hr>
            <div class="receipt-total">
                <span>TOTAL:</span>
                <span>₹${grandTotal.toFixed(2)}</span>
            </div>
            <button onclick="processPayment()">Confirm & Pay</button>
        </div>
    `;

    // Save bill
    await fetch(`${API}/api/bill/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, total: grandTotal })
    });
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
// 1. Initialize an empty order array


// 2. Define the function that the HTML button is looking for
function addToOrder(id, name, price) {
    // Check if item already exists in currentOrder
    const existingItem = currentOrder.find(item => item.item_id === id);

    if (existingItem) {
        existingItem.qty += 1;
    } else {
        currentOrder.push({
            item_id: id,
            name: name,
            price: parseFloat(price),
            qty: 1
        });
    }

    alert(`${name} added to order!`);
    renderOrderSummary(); // Update your UI sidebar if you have one
}

   
function addToOrder(name, price, id) {
    currentOrder.push({ name, price, id });
    alert(`${name} added to order!`); // This is where the "undefined" was happening
}
// 3. Simple function to show the order on the page
function renderOrder() {
    const display = document.getElementById('order-summary');
    if (display) {
        display.innerText = `Items in cart: ${currentOrder.length}`;
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

async function fetchItem() {
    const id = document.getElementById("item_id").value;
    if (!id) return;

    try {
        const res = await fetch(`${API}/api/menu/${id}`);
        const item = await res.json();

        console.log("Item fetched:", item); // DEBUG

        if (res.ok && item) {
            document.getElementById("display_name").innerText = item.Item_Name;
            document.getElementById("display_price").innerText = item.Price;
            document.getElementById("item_name").value = item.Item_Name;
            document.getElementById("price").value = item.Price;
        } else {
            document.getElementById("display_name").innerText = "Not Found";
        }
    } catch (err) {
        console.error("Fetch error:", err);
    }
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

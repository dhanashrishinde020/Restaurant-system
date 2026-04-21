const API = "http://127.0.0.1:5000";

let currentOrder = [];
let selectedTableId = null;

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
    document.querySelectorAll(".content-section").forEach(s => s.style.display = "none");
    document.getElementById(id).style.display = "block";

    if (id === "table-section") loadTables();
}

/* ---------------- CUSTOMER ---------------- */
async function addcustomer() {
    const name = document.getElementById("cust_name").value.trim();
    const phone = document.getElementById("cust_phone").value.trim();

    if (!name) return alert("Enter name");
    if (!/^[0-9]{10}$/.test(phone)) return alert("Phone must be 10 digits");

    const res = await fetch(`${API}/api/customer/add`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ name, phone })
    });

    const data = await res.json();

    if (res.ok) {
        localStorage.setItem("selectedCustomerId", data.id);
        alert("Customer added!");
        showSection("table-section");
    } else {
        alert(data.message);
    }
}

/* ---------------- TABLES ---------------- */
async function loadTables() {
    const res = await fetch(`${API}/api/tables/getall`);
    const tables = await res.json();

    const grid = document.getElementById("table-grid");
    grid.innerHTML = "";

    tables.forEach(t => {
        const div = document.createElement("div");
        div.className = "table-card " + t.Status.toLowerCase();

        div.innerHTML = `
            <div class="table-id">Table ${t.Table_ID}</div>
            <div class="capacity">Capacity: ${t.Capacity}</div>
            <strong>${t.Status}</strong>
        `;

        div.onclick = () => assignTable(t.Table_ID);

        grid.appendChild(div);
    });
}

async function assignTable(id) {
    const res = await fetch(`${API}/api/table/assign`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ table_id: id })
    });

    const data = await res.json();

    if (res.ok) {
        selectedTableId = id;
        localStorage.setItem("selectedTableId", id);
        alert("Table selected");
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
        document.getElementById("item_name").value = item.Item_Name;
        document.getElementById("price").value = item.Price;

        // ✅ THIS FIXES "undefined" ISSUE
        document.getElementById("item_id_hidden").value = id;
    } else {
        alert("Item not found");
    }
}
/* ---------------- ORDER ---------------- */
async function fetchItem() {
    const id = document.getElementById("item_id").value;

    if (!id) return;

    const res = await fetch(`${API}/api/menu/${id}`);
    const item = await res.json();

    if (res.ok) {
        // Show on UI
        document.getElementById("display_name").innerText = item.Item_Name;
        document.getElementById("display_price").innerText = item.Price;

        // Store internally
        document.getElementById("item_name").value = item.Item_Name;
        document.getElementById("price").value = item.Price;
        document.getElementById("item_id_hidden").value = id;

    } else {
        alert("Item not found");
    }
}
function addToOrder() {
    const idEl = document.getElementById("item_id_hidden");
    const nameEl = document.getElementById("item_name");
    const priceEl = document.getElementById("price");

    if (!idEl || !nameEl || !priceEl) {
        return alert("❌ HTML elements missing!");
    }

    const id = parseInt(idEl.value);
    const name = nameEl.value;
    const price = parseFloat(priceEl.value);

    if (!id || !name || isNaN(price)) {
        return alert("⚠️ Fetch item first!");
    }

    const existing = currentOrder.find(item => item.item_id === id);

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

/* ---------------- SAVE ORDER ---------------- */
async function placeOrder() {
    const customer_id = localStorage.getItem("selectedCustomerId");
    const table_id = localStorage.getItem("selectedTableId");

    if (!customer_id || !table_id) {
        return alert("Missing customer or table");
    }

    const items = currentOrder.map(i => ({
        item_id: i.item_id,
        qty: i.qty
    }));

    const res = await fetch(`${API}/api/order/create`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ customer_id, table_id, items })
    });

    const data = await res.json();

    if (res.ok) {
        alert("Order saved!");
    } else {
        alert(data.message);
    }
}

/* ---------------- BILL ---------------- */
async function generateBill() {
    if (currentOrder.length === 0) {
        return alert("No items in order");
    }

    await placeOrder();

    let total = 0;

    const itemsHtml = currentOrder.map(i => {
        total += i.price * i.qty;
        return `
            <div class="receipt-row">
                <span>${i.name} x${i.qty}</span>
                <span>₹${(i.price * i.qty).toFixed(2)}</span>
            </div>
        `;
    }).join("");

    document.getElementById("bill_output").innerHTML = `
        <h3>Receipt</h3>
        ${itemsHtml}
        <hr>
        <strong>Total: ₹${total.toFixed(2)}</strong>
    `;
}
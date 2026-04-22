from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

# ---------------- DATABASE ----------------
def get_db():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="Dhanashree",
        database="restaurant_db"
    )

# ---------------- AUTH ----------------
@app.route("/api/auth/register", methods=["POST"])
def register():
    db = None
    try:
        data = request.get_json(force=True)

        name = data.get("name")
        email = data.get("email")
        password = data.get("password")

        if not all([name, email, password]):
            return jsonify({"message": "Missing fields"}), 400

        db = get_db()
        cursor = db.cursor()

        cursor.execute("SELECT email FROM users WHERE email=%s", (email,))
        if cursor.fetchone():
            return jsonify({"message": "User already exists"}), 400

        hashed_pw = generate_password_hash(password)

        cursor.execute(
            "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)",
            (name, email, hashed_pw)
        )

        db.commit()
        return jsonify({"message": "Success"}), 201

    except Exception as e:
        print(e)
        return jsonify({"message": "Internal server error"}), 500

    finally:
        if db:
            db.close()


@app.route("/api/auth/login", methods=["POST"])
def login():
    db = None
    try:
        data = request.get_json(force=True)
        email = data.get("email")
        password = data.get("password")

        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()

        if user and check_password_hash(user["password"], password):
            return jsonify({"message": "Login successful"}), 200

        return jsonify({"message": "Invalid credentials"}), 401

    except Exception as e:
        return jsonify({"message": str(e)}), 500

    finally:
        if db and db.is_connected():
            cursor.close()
            db.close()


# ---------------- CUSTOMER ----------------
@app.route("/api/customer/add", methods=["POST"])
def add_customer():
    db = None
    try:
        data = request.get_json(force=True)

        name = data.get("name")
        phone = data.get("phone")

        # Validation
        if not name:
            return jsonify({"message": "Name required"}), 400

        if not phone or not str(phone).isdigit() or len(str(phone)) != 10:
            return jsonify({"message": "Phone must be 10 digits"}), 400

        db = get_db()
        cursor = db.cursor()

        query = "INSERT INTO Customer (Name, Phone_No) VALUES (%s, %s)"
        cursor.execute(query, (name, phone))
        db.commit()

        return jsonify({
            "message": "Customer added",
            "customer_id": cursor.lastrowid
        }), 201

    except mysql.connector.Error as err:
        # Duplicate phone
        if err.errno == 1062:
            return jsonify({"message": "Phone already exists"}), 400

        return jsonify({"message": str(err)}), 500

    except Exception as e:
        return jsonify({"message": str(e)}), 500

    finally:
        if db and db.is_connected():
            cursor.close()
            db.close()


# ---------------- TABLE ----------------
@app.route("/api/tables/getall", methods=["GET"])
def get_tables():
    db = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT * FROM Restaurant_Table")
        tables = cursor.fetchall()

        return jsonify(tables), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500

    finally:
        if db and db.is_connected():
            cursor.close()
            db.close()


@app.route("/api/table/assign", methods=["POST"])
def assign_table():
    db = None
    try:
        data = request.get_json(force=True)
        table_id = data.get("table_id")

        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            "SELECT Status FROM Restaurant_Table WHERE Table_ID=%s",
            (table_id,)
        )
        table = cursor.fetchone()

        if not table:
            return jsonify({"message": "Table not found"}), 404

        if table["Status"] == "Booked":
            return jsonify({"message": "Table already booked"}), 400

        cursor.execute(
            "UPDATE Restaurant_Table SET Status='Booked' WHERE Table_ID=%s",
            (table_id,)
        )
        db.commit()

        return jsonify({"message": "Table assigned"}), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500

    finally:
        if db and db.is_connected():
            cursor.close()
            db.close()


# ---------------- MENU ----------------
@app.route("/api/menu/<int:item_id>", methods=["GET"])
def get_menu_item(item_id):
    db = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            "SELECT Item_ID, Item_Name, Price FROM Menu WHERE Item_ID=%s",
            (item_id,)
        )
        item = cursor.fetchone()

        if not item:
            return jsonify({"message": "Item not found"}), 404

        return jsonify(item), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500

    finally:
        if db and db.is_connected():
            cursor.close()
            db.close()


# ---------------- ORDER ----------------
@app.route("/api/order/create", methods=["POST"])
def create_order():
    db = None
    try:
        data = request.get_json(force=True)

        customer_id = data.get('customer_id')
        table_id = data.get('table_id')
        items = data.get('items')

        #  VALIDATION
        if not customer_id or not table_id or not items:
            return jsonify({"message": "Missing data"}), 400

        db = get_db()
        cursor = db.cursor()

        #  Insert order
        cursor.execute("""
            INSERT INTO Orders (customer_id, Table_ID, Order_Date, Order_Time)
            VALUES (%s, %s, CURDATE(), CURTIME())
        """, (customer_id, table_id))

        order_id = cursor.lastrowid

        #  Insert items
        for item in items:
            if not item.get('item_id'):
                continue

            cursor.execute("""
                INSERT INTO Order_Detail (Order_ID, Item_ID, Quantity)
                VALUES (%s, %s, %s)
            """, (order_id, item['item_id'], item.get('qty', 1)))

        db.commit()

        return jsonify({"message": "Order saved", "order_id": order_id}), 201

    except Exception as e:
        if db:
            db.rollback()
        print("ERROR:", str(e))  #  CHECK THIS IN TERMINAL
        return jsonify({"message": str(e)}), 500

    finally:
        if db:
            db.close()

# ---------------- BILL ----------------
@app.route("/api/bill/generate", methods=["POST"])
def generate_bill():
    db = None
    try:
        data = request.get_json()

        customer = data.get("customer")
        total = data.get("total")

        db = get_db()
        cursor = db.cursor()

        cursor.execute("""
            INSERT INTO Bill (Customer_Name, Total_Amount, Payment_Mode, Bill_Date)
            VALUES (%s, %s, %s, CURDATE())
        """, (customer, total, "Cash"))

        db.commit()

        return jsonify({"message": "Bill generated"}), 201

    except Exception as e:
        return jsonify({"message": str(e)}), 500

    finally:
        if db:
            db.close()

@app.route('/api/bill/create', methods=['POST'])
def create_bill():
    data = request.get_json()
    
    # Map the JS keys to your Python variables
    order_id = data.get('order_id')
    payment_mode = data.get('payment_mode')
    total = data.get('total_amount')
    cust_name = data.get('customer_name')
    bill_date = data.get('bill_date')

    cursor = mysql.connection.cursor()
    try:
        # Match your DESC Bill columns exactly:
        # Order_ID, Payment_Mode, Bill_Date, Total_Amount, Customer_Name
        query = """
            INSERT INTO Bill (Order_ID, Payment_Mode, Bill_Date, Total_Amount, Customer_Name) 
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(query, (order_id, payment_mode, bill_date, total, cust_name))
        
        # --- THE MOST IMPORTANT LINE ---
        mysql.connection.commit() 
        
        return jsonify({"message": "Bill record inserted!"}), 201
    except Exception as e:
        print(f"Error inserting bill: {e}")
        return jsonify({"message": str(e)}), 500
    finally:
        cursor.close()@app.route('/api/bill/create', methods=['POST'])
def create_bill():
    db = None
    try:
        data = request.get_json()

        order_id = data.get('order_id')
        payment_mode = data.get('payment_mode')
        total = data.get('total_amount')
        cust_name = data.get('customer_name')
        bill_date = data.get('bill_date')

        db = get_db()
        cursor = db.cursor()

        query = """
            INSERT INTO Bill 
            (Order_ID, Payment_Mode, Bill_Date, Total_Amount, Customer_Name) 
            VALUES (%s, %s, %s, %s, %s)
        """

        cursor.execute(query, (order_id, payment_mode, bill_date, total, cust_name))
        db.commit()

        return jsonify({"message": "Bill record inserted!"}), 201

    except Exception as e:
        if db:
            db.rollback()
        return jsonify({"message": str(e)}), 500

    finally:
        if db:
            cursor.close()
            db.close()
@app.route("/api/order/checkout", methods=["POST"])
def checkout():
    db = None
    try:
        data = request.get_json(force=True)

        customer_id = data.get("customer_id")
        table_id = data.get("table_id")
        items = data.get("items")
        payment_mode = data.get("payment_mode", "Cash")

        if not customer_id or not table_id or not items:
            return jsonify({"message": "Missing data"}), 400

        db = get_db()
        cursor = db.cursor(dictionary=True)

        # 1. Create Order
        cursor.execute("""
            INSERT INTO Orders (customer_id, Table_ID, Order_Date, Order_Time)
            VALUES (%s, %s, CURDATE(), CURTIME())
        """, (customer_id, table_id))

        order_id = cursor.lastrowid

        total = 0

        # 2. Insert Order Items + Calculate Total
        for item in items:
            item_id = item.get("item_id")
            qty = item.get("qty", 1)

            if not item_id:
                continue

            # get price from menu
            cursor.execute("SELECT Price FROM Menu WHERE Item_ID=%s", (item_id,))
            menu_item = cursor.fetchone()

            if not menu_item:
                continue

            price = menu_item["Price"]
            total += price * qty

            cursor.execute("""
                INSERT INTO Order_Detail (Order_ID, Item_ID, Quantity)
                VALUES (%s, %s, %s)
            """, (order_id, item_id, qty))

        # 3. Create Bill
        cursor.execute("""
            INSERT INTO Bill (Order_ID, Payment_Mode, Bill_Date, Total_Amount, Customer_Name)
            VALUES (%s, %s, CURDATE(), %s, %s)
        """, (order_id, payment_mode, total, f"Customer-{customer_id}"))

        db.commit()

        return jsonify({
            "message": "Order + Bill created successfully",
            "order_id": order_id,
            "total": total
        }), 201

    except Exception as e:
        if db:
            db.rollback()
        return jsonify({"message": str(e)}), 500

    finally:
        if db:
            cursor.close()
            db.close()
# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(debug=True, port=5000)
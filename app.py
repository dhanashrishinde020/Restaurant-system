from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

def get_db():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="Dhanashree",
        database="restaurant_db"
    )

# --- AUTHENTICATION ---

@app.route("/api/auth/register", methods=["POST"])
def register():
    db = None
    try:
        data = request.get_json(force=True)
        name, email, password = data.get("name"), data.get("email"), data.get("password")

        if not all([name, email, password]):
            return jsonify({"message": "Missing fields"}), 400

        db = get_db()
        cursor = db.cursor()

        cursor.execute("SELECT email FROM users WHERE email=%s", (email,))
        if cursor.fetchone():
            return jsonify({"message": "User already exists"}), 400

        hashed_pw = generate_password_hash(password)
        cursor.execute("INSERT INTO users (name, email, password) VALUES (%s, %s, %s)", 
                       (name, email, hashed_pw))
        db.commit()
        return jsonify({"message": "Success"}), 201
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if db: db.close()

@app.route("/api/auth/login", methods=["POST"])
def login():
    db = None
    try:
        data = request.get_json(force=True)
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email=%s", (data.get("email"),))
        user = cursor.fetchone()

        if user and check_password_hash(user["password"], data.get("password")):
            return jsonify({"message": "Login successful"}), 200
        return jsonify({"message": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if db: db.close()

# --- CUSTOMER & TABLES ---

@app.route("/api/customer/add", methods=["POST"])
def add_customer():
    db = None
    try:
        data = request.get_json(force=True)
        phone = data.get('phone')

        # Python-side validation for 10 digits
        if not phone or len(str(phone)) != 10 or not str(phone).isdigit():
            return jsonify({"message": "Phone number must be exactly 10 digits"}), 400

        db = get_db()
        cursor = db.cursor()
        
        query = "INSERT INTO Customer (Name, Phone_No) VALUES (%s, %s)"
        cursor.execute(query, (data['name'], phone))
        db.commit()
        
        return jsonify({"message": "Customer added", "id": cursor.lastrowid}), 200

    except mysql.connector.Error as err:
        if err.errno == 1062: # MySQL error code for Duplicate Entry
            return jsonify({"message": "This phone number is already registered!"}), 400
        return jsonify({"message": str(err)}), 500
    finally:
        if db: db.close()

@app.route("/api/table/add", methods=["POST"])
def add_table():
    db = None
    try:
        db = get_db()
        cursor = db.cursor()
        data = request.get_json(force=True)
        query = "INSERT INTO Restaurant_Table (Capacity, Status) VALUES (%s, %s)"
        cursor.execute(query, (data['capacity'], 'Available'))
        db.commit()
        return jsonify({"message": "Table assigned"}), 200
    finally:
        if db: db.close()
@app.route("/api/table/assign", methods=["POST"])
def assign_table():
    db = None
    try:
        data = request.get_json(force=True)
        table_id = data.get('table_id')
        
        db = get_db()
        cursor = db.cursor(dictionary=True)
        
        # 1. Check if the table is already booked
        cursor.execute("SELECT Status FROM Restaurant_Table WHERE Table_ID = %s", (table_id,))
        table = cursor.fetchone()
        
        if not table:
            return jsonify({"message": "Table does not exist"}), 404
            
        if table['Status'] == 'Booked':
            return jsonify({"message": "This table is already booked!"}), 400
            
        # 2. If available, update status to Booked
        cursor.execute("UPDATE Restaurant_Table SET Status = 'Booked' WHERE Table_ID = %s", (table_id,))
        db.commit()
        
        return jsonify({"message": "Table assigned successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if db: db.close()
@app.route("/api/tables/getall", methods=["GET"])
def get_all_tables():
    db = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Restaurant_Table")
        tables = cursor.fetchall()
        return jsonify(tables), 200
    finally:
        if db: db.close()
# --- MENU & BILLING ---

@app.route("/api/menu/<int:item_id>", methods=["GET"])
def get_menu_item(item_id):
    db = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Menu WHERE Item_ID = %s", (item_id,))
        item = cursor.fetchone()
        return jsonify(item) if item else (jsonify({"message": "Not found"}), 404)
    finally:
        if db: db.close()


@app.route("/api/bill/generate", methods=["POST"])
def generate_bill():
    db = None
    try:
        data = request.get_json(force=True)
        db = get_db()
        cursor = db.cursor()
        
        # Now we can save the name and total!
        query = """INSERT INTO bill (Customer_Name, Total_Amount, Payment_Mode, Bill_Date) 
                   VALUES (%s, %s, %s, CURDATE())"""
        
        # Ensure your frontend is sending 'customer' and 'total'
        values = (data.get('customer'), data.get('total'), "Cash")
        
        cursor.execute(query, values)
        db.commit()
        return jsonify({"message": "Bill Created Successfully"}), 201
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if db: db.close()
@app.route("/api/order/create", methods=["POST"])
def create_order():
    db = None
    try:
        data = request.get_json(force=True)
        # Expected JSON: { "customer_id": 1, "table_id": 2, "items": [{"item_id": 10, "qty": 2}] }
        
        db = get_db()
        cursor = db.cursor()

        # 1. Insert into 'Orders' table (Note: Changed from 'order' to 'Orders' to match your SQL)
        order_query = "INSERT INTO Orders (Customer_ID, Table_ID, Order_Date) VALUES (%s, %s, CURDATE())"
        cursor.execute(order_query, (data['customer_id'], data['table_id']))
        
        # 2. Get the Order_ID that was just created
        new_order_id = cursor.lastrowid

        # 3. Insert items into 'Order_Detail'
        detail_query = "INSERT INTO Order_Detail (Order_ID, Item_ID, Quantity) VALUES (%s, %s, %s)"
        
        for item in data['items']:
            cursor.execute(detail_query, (new_order_id, item['item_id'], item.get('qty', 1)))

        db.commit()
        return jsonify({"message": "Order placed!", "order_id": new_order_id}), 201

    except Exception as e:
        if db: 
            db.rollback() # Important: rolls back changes if the loop fails
        return jsonify({"message": str(e)}), 500
    finally:
        if db: 
            db.close()
if __name__ == "__main__":
    app.run(debug=True, port=5000)
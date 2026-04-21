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

# ---------------- AUTH ----------------
@app.route("/api/auth/register", methods=["POST"])
def register():
    db = get_db()
    cursor = db.cursor()

    data = request.json
    name = data["name"]
    email = data["email"]
    password = generate_password_hash(data["password"])

    cursor.execute("INSERT INTO users (name, email, password) VALUES (%s,%s,%s)",
                   (name, email, password))
    db.commit()

    user_id = cursor.lastrowid
    db.close()

    return jsonify({"customer_id": user_id}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    db = get_db()
    cursor = db.cursor(dictionary=True)

    data = request.json
    cursor.execute("SELECT * FROM users WHERE email=%s", (data["email"],))
    user = cursor.fetchone()

    db.close()

    if user and check_password_hash(user["password"], data["password"]):
        return jsonify({"message": "success"}), 200

    return jsonify({"message": "Invalid"}), 401


# ---------------- TABLE ----------------
@app.route("/api/table/assign", methods=["POST"])
def assign_table():
    db = get_db()
    cursor = db.cursor()

    table_id = request.json["table_id"]

    cursor.execute("""
        UPDATE Restaurant_Table 
        SET Status='Booked' 
        WHERE Table_ID=%s AND Status='Available'
    """, (table_id,))

    db.commit()

    if cursor.rowcount == 0:
        return jsonify({"message": "Already booked"}), 400

    return jsonify({"message": "Table assigned"}), 200


@app.route("/api/tables/getall", methods=["GET"])
def get_tables():
    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute("SELECT * FROM Restaurant_Table")
    data = cursor.fetchall()

    db.close()
    return jsonify(data)


# ---------------- MENU ----------------
@app.route("/api/menu/<int:item_id>", methods=["GET"])
def get_item(item_id):
    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute("SELECT * FROM Menu WHERE Item_ID=%s", (item_id,))
    item = cursor.fetchone()

    db.close()
    return jsonify(item)


# ---------------- ORDER ----------------
@app.route("/api/order/create", methods=["POST"])
def create_order():
    db = get_db()
    cursor = db.cursor()

    data = request.json

    cursor.execute("""
        INSERT INTO Orders (customer_id, Table_ID, Order_Date, Order_Time)
        VALUES (%s,%s,CURDATE(),CURTIME())
    """, (data["customer_id"], data["table_id"]))

    order_id = cursor.lastrowid

    for item in data["items"]:
        cursor.execute("""
            INSERT INTO Order_Detail (Order_ID, Item_ID, Quantity)
            VALUES (%s,%s,%s)
        """, (order_id, item["item_id"], item["qty"]))

    db.commit()
    db.close()

    return jsonify({"order_id": order_id}), 201


# ---------------- BILL ----------------
@app.route("/api/bill/generate", methods=["POST"])
def bill():
    db = get_db()
    cursor = db.cursor()

    data = request.json

    cursor.execute("""
        INSERT INTO bill (Customer_Name, Total_Amount, Payment_Mode, Bill_Date)
        VALUES (%s,%s,%s,CURDATE())
    """, (data["customer"], data["total"], "Cash"))

    db.commit()
    db.close()

    return jsonify({"message": "Bill saved"})


if __name__ == "__main__":
    app.run(debug=True)
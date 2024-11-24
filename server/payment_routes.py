from flask import Blueprint, request, jsonify, render_template, redirect, url_for
import razorpay
import sqlite3
from datetime import datetime
from uuid import uuid4
from config import Config


# Razorpay credentials (replace with your credentials)
RAZORPAY_KEY_ID = Config.RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET = Config.RAZORPAY_KEY_SECRET

# Razorpay client
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# Blueprint for payment routes
payment_routes = Blueprint("payment_routes", __name__)

DB_FILE = "app.db"

# Initialize the database for payments
def init_payment_db():
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        # Create payments table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            order_id TEXT NOT NULL,
            payment_id TEXT,
            signature TEXT,
            amount INTEGER NOT NULL,
            currency TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            timestamp TEXT NOT NULL
        )
        """)

# Call this during app initialization
init_payment_db()


# Route to show the buy credits page
@payment_routes.route('/buy-credits', methods=['GET'])
def buy_credits():
    return render_template("buy_credits.html", razorpay_key_id=RAZORPAY_KEY_ID)


# Route to initiate a payment
@payment_routes.route('/create-order', methods=['POST'])
def create_order():
    email = request.form.get("email")
    if not email:
        return jsonify({"status": "fail", "message": "Email is required"}), 400

    # Create Razorpay order
    amount = 800  # Amount in cents (for Rs. 8.00, this should be 800 paisa)
    currency = "INR"
    order_data = {
        "amount": amount * 100,  # Razorpay expects amount in the smallest currency unit
        "currency": currency,
        "receipt": str(uuid4()),
    }
    order = razorpay_client.order.create(order_data)

    # Log the payment in the database
    order_id = order.get("id")
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        timestamp = datetime.now().isoformat()
        cursor.execute("""
        INSERT INTO payments (id, email, order_id, amount, currency, status, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (str(uuid4()), email, order_id, amount, currency, "PENDING", timestamp))
        conn.commit()

    return jsonify({"order_id": order_id, "amount": amount, "currency": currency})


# Route to handle payment success callback
@payment_routes.route('/payment-success', methods=['POST'])
def payment_success():
    payload = request.json
    order_id = payload.get("order_id")
    payment_id = payload.get("payment_id")
    signature = payload.get("signature")

    if not all([order_id, payment_id, signature]):
        return jsonify({"status": "fail", "message": "Missing required fields"}), 400

    # Verify Razorpay signature
    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature
        })
    except razorpay.errors.SignatureVerificationError:
        return jsonify({"status": "fail", "message": "Invalid signature"}), 400

    # Update the payment status and credit the user
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()

        # Update payment status
        cursor.execute("""
        UPDATE payments
        SET payment_id = ?, signature = ?, status = 'COMPLETED'
        WHERE order_id = ?
        """, (payment_id, signature, order_id))

        # Retrieve the user's email
        cursor.execute("SELECT email FROM payments WHERE order_id = ?", (order_id,))
        result = cursor.fetchone()
        if not result:
            return jsonify({"status": "fail", "message": "Order not found"}), 404

        email = result[0]

        # Add 100 credits to the user's account
        cursor.execute("UPDATE users SET credits = credits + 100 WHERE email = ?", (email,))
        conn.commit()

    return jsonify({"status": "success", "message": "Payment successful, credits added"}), 200

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
    # Log the incoming request data for debugging
    print("Incoming create-order request data:", request.json)

    email = request.json.get("email")
    if not email:
        print("Missing email in request")
        return jsonify({"status": "fail", "message": "Email is required"}), 400

    # Create a unique transaction ID
    transaction_id = str(uuid4())

    # Define amount and currency
    amount = 8  # Amount in smallest currency unit (₹8.00 = 800 paisa)
    currency = "USD"

    # Log the payment in the database with PENDING status
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            timestamp = datetime.now().isoformat()
            cursor.execute("""
            INSERT INTO payments (id, email, order_id, amount, currency, status, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (transaction_id, email, "", amount, currency, "PENDING", timestamp))
            conn.commit()
    except Exception as e:
        print("Error saving payment in database:", str(e))
        return jsonify({"status": "fail", "message": "Error initializing payment"}), 500

    # Create Razorpay order
    try:
        order_data = {
            "amount": amount * 100,  # Razorpay expects amount in the smallest currency unit
            "currency": currency,
            "receipt": transaction_id,  # Use transaction_id as receipt
        }
        order = razorpay_client.order.create(order_data)

        # Update the payment record with the Razorpay order ID
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE payments
            SET order_id = ?
            WHERE id = ?
            """, (order.get("id"), transaction_id))
            conn.commit()

        # Log the Razorpay order for debugging
        print("Razorpay order created:", order)

        return jsonify({
            "order_id": order.get("id"),
            "transaction_id": transaction_id,
            "amount": amount,
            "currency": currency
        })
    except Exception as e:
        print("Error creating Razorpay order:", str(e))
        return jsonify({"status": "fail", "message": "Error creating payment order"}), 500




# Route to handle payment success callback
@payment_routes.route('/payment-success', methods=['POST'])
def payment_success():
    # Log the incoming request data for debugging
    print("Incoming payment-success request data:", request.json)

    payload = request.json
    order_id = payload.get("order_id")
    payment_id = payload.get("payment_id")
    signature = payload.get("signature")

    # Log individual fields
    print("Received order_id:", order_id)
    print("Received payment_id:", payment_id)
    print("Received signature:", signature)

    if not all([order_id, payment_id, signature]):
        print("Missing required fields in payment-success request")
        return jsonify({"status": "fail", "message": "Missing required fields"}), 400

    try:
        # Verify Razorpay signature
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature
        })
    except razorpay.errors.SignatureVerificationError as e:
        print("Signature verification failed:", str(e))
        return jsonify({"status": "fail", "message": "Invalid signature"}), 400

    try:
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
                print("Order not found in database")
                return jsonify({"status": "fail", "message": "Order not found"}), 404

            email = result[0]

            # Check if the user exists
            cursor.execute("SELECT 1 FROM users WHERE email = ?", (email,))
            user_exists = cursor.fetchone()

            if user_exists:
                # If the user exists, update their credits
                cursor.execute("UPDATE users SET credits = credits + 100 WHERE email = ?", (email,))
            else:
                # If the user does not exist, insert a new user with initial credits
                cursor.execute("INSERT INTO users (email, credits) VALUES (?, ?)", (email, 100))

            conn.commit()

        print("Payment successfully processed for email:", email)
        return jsonify({"status": "success", "message": "Payment successful, credits added"}), 200
    except Exception as e:
        print("Error in payment-success:", str(e))
        return jsonify({"status": "fail", "message": "Error processing payment"}), 500


@payment_routes.route('/payment-success-page', methods=['GET'])
def payment_success_page():
    return render_template("payment_success.html")

@payment_routes.route('/payment-failed', methods=['GET'])
def payment_failed():
    return render_template("payment_failed.html")
from flask import Flask, request, jsonify
import os
from werkzeug.utils import secure_filename
from config import Config
from handlers.openai_handler import OpenAIHandler
from handlers.gemini_handler import GeminiHandler
import requests

# Initialize Flask app
app = Flask(__name__)

# Setup API handlers based on config
if Config.DEFAULT_LLM == "OPENAI":
    handler = OpenAIHandler(api_key=Config.OPENAI_API_KEY)
elif Config.DEFAULT_LLM == "GEMINI":
    handler = GeminiHandler(api_key=Config.GEMINI_API_KEY)
else:
    raise ValueError("Unsupported LLM configuration. Set DEFAULT_LLM to 'OPENAI' or 'GEMINI'.")

# Ensure upload directory exists
UPLOAD_FOLDER = 'uploaded_images'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def validate_token(token, email):
    """
    Validates the OAuth token and checks if it corresponds to the provided email.

    Args:
        token (str): The OAuth token to validate.
        email (str): The expected email associated with the token.

    Returns:
        bool: True if the token is valid and matches the email, False otherwise.
    """
    google_token_info_url = "https://www.googleapis.com/oauth2/v3/tokeninfo"
    try:
        response = requests.get(google_token_info_url, params={"access_token": token})
        if response.status_code == 200:
            token_info = response.json()
            # Check if the email matches and the token is valid
            return token_info.get("email") == email
        else:
            print(f"Token validation failed: {response.json().get('error_description', 'Unknown error')}")
            return False
    except Exception as e:
        print(f"Error during token validation: {str(e)}")
        return False

@app.route('/upload-image', methods=['POST'])
def upload_image():
    # Check if the email and token are in the request
    email = request.form.get("email")
    token = request.form.get("authToken")

    if not email or not token:
        return jsonify({"status": "fail", "message": "Missing email or auth token"}), 400

    # Validate the token (you can implement token validation logic here)
    if not validate_token(token, email):
        return jsonify({"status": "fail", "message": "Invalid or expired auth token"}), 401

    # Check if the image is part of the request
    if 'image' not in request.files:
        return jsonify({"status": "fail", "message": "No image part in the request"}), 400

    image_file = request.files['image']
    if image_file.filename == '':
        return jsonify({"status": "fail", "message": "No selected file"}), 400

    # Save the image with a secure filename
    filename = secure_filename(image_file.filename)
    image_path = os.path.join(UPLOAD_FOLDER, filename)
    image_file.save(image_path)

    # Retrieve the question for the image or use a default question
    image_question = request.form.get("question", "Tell me about this image")
    image_question += " Note: Read the full text, also images, diagrams, charts etc, and use it wise to answer the question.  Get the result in proper spacing and proper punctuations."

    try:
        # Process the image using the chosen handler
        response_text = handler.process_image(image_path, image_question)
        print(response_text)
    except Exception as e:
        return jsonify({"status": "fail", "message": str(e)}), 500
    finally:
        # Remove the image after processing
        if os.path.exists(image_path):
            os.remove(image_path)
        else:
            print(f"Warning: File {image_path} not found when attempting to delete.")

    return jsonify({"status": "success", "message": response_text}), 200


if __name__ == '__main__':
    app.run(debug=True, port=7001, host='0.0.0.0')

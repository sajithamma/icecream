from flask import Flask, request, jsonify
import os
from dotenv import load_dotenv
from PIL import Image
import google.generativeai as genai
from werkzeug.utils import secure_filename

# Initialize Flask app and load environment variables
app = Flask(__name__)
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

# Configure the Gemini API client
genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-1.5-flash')

# Ensure upload directory exists
UPLOAD_FOLDER = 'uploaded_images'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/upload-image', methods=['POST'])
def upload_image():
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

    # Upload the image to Gemini API
    gemini_image_file = genai.upload_file(image_path)
    print(f"Uploaded image file reference: {gemini_image_file}")

    # Generate content from Gemini API without streaming
    result = model.generate_content([gemini_image_file, "\n\n", image_question])
    response_text = result.text  # Extract the result text

    # Remove the image after processing
    os.remove(image_path)

    return jsonify({"status": "success", "message": response_text.strip()}), 200

if __name__ == '__main__':
    app.run(debug=True, port=7001, host='0.0.0.0')

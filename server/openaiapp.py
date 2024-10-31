from flask import Flask, request, jsonify
import os
import base64
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
from openai import OpenAI

# Initialize Flask app and load environment variables
app = Flask(__name__)
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

# Configure the OpenAI client
client = OpenAI(api_key=api_key)

# Ensure upload directory exists
UPLOAD_FOLDER = 'uploaded_images'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Function to encode the image as base64
def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

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

    # Encode the image to base64
    base64_image = encode_image(image_path)

    # Call the OpenAI API with the image and question
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": image_question,
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            },
                        },
                    ],
                }
            ],
        )
        response_text = response.choices[0].message.content  # Extract the result text
    except Exception as e:
        return jsonify({"status": "fail", "message": str(e)}), 500

    # Remove the image after processing
    os.remove(image_path)

    return jsonify({"status": "success", "message": response_text.strip()}), 200

if __name__ == '__main__':
    app.run(debug=True, port=7001, host='0.0.0.0')

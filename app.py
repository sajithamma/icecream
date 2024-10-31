from flask import Flask, request, jsonify
import os
from datetime import datetime
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Folder to save uploaded images
UPLOAD_FOLDER = 'uploaded_images'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)  # Ensure the folder exists

@app.route('/upload-image', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({"status": "fail", "message": "No image part in the request"}), 400

    image_file = request.files['image']

    if image_file.filename == '':
        return jsonify({"status": "fail", "message": "No selected file"}), 400

    # Secure the filename and save the image
    filename = secure_filename(f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{image_file.filename}")
    image_path = os.path.join(UPLOAD_FOLDER, filename)
    image_file.save(image_path)

    return jsonify({"status": "success", "message": "File successfully uploaded", "filename": filename}), 200

if __name__ == '__main__':
    app.run(debug=True, port=7001, host='0.0.0.0')

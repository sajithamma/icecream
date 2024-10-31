import os
import google.generativeai as genai

class GeminiHandler:
    def __init__(self, api_key):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    def process_image(self, image_path, question):
        # Upload the image to Gemini API
        gemini_image_file = genai.upload_file(image_path)
        print(f"Uploaded image file reference: {gemini_image_file}")

        # Generate content from Gemini API
        result = self.model.generate_content([gemini_image_file, "\n\n", question])
        return result.text.strip()  # Extract and return the response text

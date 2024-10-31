import base64
from openai import OpenAI

class OpenAIHandler:
    def __init__(self, api_key):
        self.client = OpenAI(api_key=api_key)

    def process_image(self, image_path, question):
        # Encode the image as base64
        with open(image_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode('utf-8')

        # Call the OpenAI API with the image and question
        response = self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": question,
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
        return response.choices[0].message.content.strip()  # Extract the response text

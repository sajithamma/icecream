import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    DEFAULT_LLM = os.getenv("DEFAULT_LLM", "OPENAI")  # Default to OPENAI if not set
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

from flask import Flask
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Import your Flask app
from app import app

# This is required for Vercel serverless functions
if __name__ == '__main__':
    app.run()
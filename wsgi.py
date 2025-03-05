import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

# Print the directory contents to debug
print("Current directory:", os.getcwd())
print("Backend directory contents:", os.listdir(os.path.join(os.getcwd(), 'backend')))

from app import app as application

if __name__ == "__main__":
    application.run()
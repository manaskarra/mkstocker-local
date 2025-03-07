#!/bin/bash

# Display a welcome message
echo "Starting Stock Portfolio App..."
echo "------------------------------"

# Get the absolute path of the script directory
SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
echo "Script directory: $SCRIPT_DIR"

# Start the backend server
echo "Starting backend server..."
cd "$SCRIPT_DIR/backend"
echo "Changed to backend directory: $(pwd)"

# Activate the backend virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "Activated backend virtual environment"
else
    echo "Error: Backend virtual environment not found. Please make sure it exists."
    exit 1
fi

python app.py &
BACKEND_PID=$!
echo "Backend server started with PID: $BACKEND_PID"

# Wait a moment for the backend to initialize
sleep 3

# Start the frontend server
echo "Starting frontend server..."
cd "$SCRIPT_DIR/frontend"
echo "Changed to frontend directory: $(pwd)"

npm start &
FRONTEND_PID=$!
echo "Frontend server started with PID: $FRONTEND_PID"

# Function to handle termination
function cleanup {
  echo ""
  echo "Shutting down servers..."
  kill $BACKEND_PID
  kill $FRONTEND_PID
  echo "Servers stopped."
  exit
}

# Trap Ctrl+C and call cleanup
trap cleanup INT

# Keep the script running
echo ""
echo "Both servers are now running!"
echo "• Backend: http://localhost:5000"
echo "• Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers."
wait

# chmod +x mks.sh
# ln -s ~/Desktop/stock-portfolio-app/mks.sh ~/mks.sh
# echo 'alias mks="~/Desktop/stock-portfolio-app/mks.sh"' >> ~/.zshrc
# source ~/.zshrc
# run "mks" to start the servers
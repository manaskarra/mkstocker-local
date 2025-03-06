from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from stock_data import get_current_price, get_historical_data
from pymongo import MongoClient
import os
import time
import random

app = Flask(__name__)

# Configure CORS to allow requests from your local domain
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "https://mkstocker.onrender.com", "https://mkstocker-730k.onrender.com"]}})

# MongoDB connection
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/mkstocker')
print(f"Using MongoDB URI: {MONGO_URI.replace(MONGO_URI.split('@')[0] if '@' in MONGO_URI else MONGO_URI, '***')}")

# Extract database name from URI or use default
db_name = 'mkstocker'
if 'mongodb+srv://' in MONGO_URI or 'mongodb://' in MONGO_URI:
    try:
        # Parse the URI to extract the database name
        if '/' in MONGO_URI:
            parts = MONGO_URI.split('/')
            if len(parts) >= 4:
                potential_db = parts[3].split('?')[0]
                if potential_db:
                    db_name = potential_db
    except Exception as e:
        print(f"Error parsing database name from URI: {e}")

print(f"Using database name: {db_name}")

try:
    # Connect to MongoDB with a timeout
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    # Test the connection
    client.admin.command('ping')
    print("MongoDB connection successful!")
    
    # Get the database
    db = client[db_name]
    stocks_collection = db.stocks
    
    # Test the collection
    stocks_count = stocks_collection.count_documents({})
    print(f"Found {stocks_count} stocks in the database")
    
    # Set flag for MongoDB availability
    use_mongodb = True
except Exception as e:
    print(f"MongoDB connection error: {e}")
    print("Falling back to file storage")
    use_mongodb = False

# Fallback to file-based storage if MongoDB connection fails
PORTFOLIO_FILE = os.path.join(os.path.dirname(__file__), 'portfolio.json')

def load_portfolio():
    try:
        # Try to load from MongoDB if available
        if use_mongodb:
            stocks = list(stocks_collection.find({}, {'_id': 0}))
            if stocks:
                return {'stocks': stocks}
            
            # If MongoDB is empty but file exists, migrate data from file to MongoDB
            if os.path.exists(PORTFOLIO_FILE):
                with open(PORTFOLIO_FILE, 'r') as f:
                    portfolio = json.load(f)
                    if portfolio.get('stocks'):
                        for stock in portfolio['stocks']:
                            stocks_collection.insert_one(stock)
                    return portfolio
            return {'stocks': []}
    except Exception as e:
        print(f"MongoDB error in load_portfolio: {e}, falling back to file storage")
    
    # Fallback to file-based storage
    if os.path.exists(PORTFOLIO_FILE):
        with open(PORTFOLIO_FILE, 'r') as f:
            return json.load(f)
    return {'stocks': []}

def save_portfolio(portfolio):
    try:
        # Try to save to MongoDB if available
        if use_mongodb:
            # Clear existing stocks and insert new ones
            stocks_collection.delete_many({})
            if portfolio.get('stocks'):
                stocks_collection.insert_many(portfolio['stocks'])
            return
    except Exception as e:
        print(f"MongoDB error in save_portfolio: {e}, falling back to file storage")
    
    # Fallback to file-based storage
    with open(PORTFOLIO_FILE, 'w') as f:
        json.dump(portfolio, f)

# Improved function to get stock data with retry logic
def get_stock_data_with_retry(ticker):
    max_retries = 3
    base_delay = 2  # seconds
    
    for attempt in range(max_retries):
        try:
            # Add a random delay to avoid hitting rate limits
            time.sleep(random.uniform(1, 3))
            
            # Get current price data
            return get_current_price(ticker)
        except Exception as e:
            print(f"Attempt {attempt+1}/{max_retries} failed for {ticker}: {str(e)}")
            if attempt < max_retries - 1:
                # Exponential backoff
                delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                print(f"Retrying in {delay:.2f} seconds...")
                time.sleep(delay)
    
    print(f"All attempts failed for {ticker}. Using default values.")
    # Return default values
    return {
        "price": 0,
        "change_percent": 0,
        "name": ticker
    }

@app.route('/api/stocks', methods=['GET'])
def get_stocks():
    portfolio = load_portfolio()
    
    # Define fixed order for specific tickers
    fixed_order = {
        'SPLG': 1,
        'QQQM': 2,
        'BTC-USD': 3,
        'XRP-USD': 4
    }
    
    # Apply fixed order to stocks
    for stock in portfolio['stocks']:
        if stock['ticker'] in fixed_order:
            stock['order'] = fixed_order[stock['ticker']]
        elif 'order' not in stock:
            stock['order'] = 999  # Default high number for other stocks
    
    # Fetch current prices for all stocks
    for stock in portfolio['stocks']:
        try:
            current_data = get_stock_data_with_retry(stock['ticker'])
            stock['current_price'] = current_data['price']
            stock['price_change'] = current_data['change_percent']
            stock['current_value'] = stock['current_price'] * stock['quantity']
            stock['profit_loss'] = stock['current_value'] - (stock['buy_price'] * stock['quantity'])
            stock['profit_loss_percent'] = (stock['profit_loss'] / (stock['buy_price'] * stock['quantity'])) * 100
        except Exception as e:
            print(f"Error fetching data for {stock['ticker']}: {e}")
    
    # Save the updated portfolio with fixed orders
    save_portfolio(portfolio)
    
    return jsonify(portfolio)

@app.route('/api/stocks', methods=['POST'])
def add_stock():
    portfolio = load_portfolio()
    new_stock = request.json
    
    # Add current price data
    try:
        current_data = get_stock_data_with_retry(new_stock['ticker'])
        new_stock['current_price'] = current_data['price']
        new_stock['price_change'] = current_data['change_percent']
        new_stock['current_value'] = new_stock['current_price'] * new_stock['quantity']
        new_stock['profit_loss'] = new_stock['current_value'] - (new_stock['buy_price'] * new_stock['quantity'])
        new_stock['profit_loss_percent'] = (new_stock['profit_loss'] / (new_stock['buy_price'] * new_stock['quantity'])) * 100
    except Exception as e:
        print(f"Error fetching data for {new_stock['ticker']}: {e}")
        # Set default values if data fetch fails
        new_stock['current_price'] = 0
        new_stock['price_change'] = 0
        new_stock['current_value'] = 0
        new_stock['profit_loss'] = 0
        new_stock['profit_loss_percent'] = 0
    
    # Generate a unique ID
    new_stock['id'] = str(len(portfolio['stocks']) + 1)
    
    # Set default order if not provided
    if 'order' not in new_stock:
        new_stock['order'] = len(portfolio['stocks']) + 1
    
    portfolio['stocks'].append(new_stock)
    save_portfolio(portfolio)
    return jsonify(new_stock)

@app.route('/api/stocks/<stock_id>', methods=['PUT'])
def update_stock(stock_id):
    portfolio = load_portfolio()
    updated_stock = request.json
    
    for i, stock in enumerate(portfolio['stocks']):
        if stock['id'] == stock_id:
            # Update the stock
            portfolio['stocks'][i] = updated_stock
            save_portfolio(portfolio)
            return jsonify(updated_stock)
    
    return jsonify({"error": "Stock not found"}), 404

@app.route('/api/stocks/<stock_id>', methods=['DELETE'])
def delete_stock(stock_id):
    portfolio = load_portfolio()
    
    for i, stock in enumerate(portfolio['stocks']):
        if stock['id'] == stock_id:
            # Remove the stock
            deleted_stock = portfolio['stocks'].pop(i)
            save_portfolio(portfolio)
            return jsonify(deleted_stock)
    
    return jsonify({"error": "Stock not found"}), 404

@app.route('/api/stocks/<ticker>/history', methods=['GET'])
def get_stock_history(ticker):
    period = request.args.get('period', '1y')
    try:
        history = get_historical_data(ticker, period)
        return jsonify(history)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/exchange-rate', methods=['GET'])
def get_exchange_rate():
    # For simplicity, using a fixed exchange rate
    # In a real app, you would fetch this from an API
    return jsonify({"USD_to_AED": 3.67})

# Add redirect routes for endpoints without the /api/ prefix
@app.route('/stocks', methods=['GET'])
def redirect_get_stocks():
    return get_stocks()

@app.route('/stocks', methods=['POST'])
def redirect_add_stock():
    return add_stock()

@app.route('/stocks/<stock_id>', methods=['PUT'])
def redirect_update_stock(stock_id):
    return update_stock(stock_id)

@app.route('/stocks/<stock_id>', methods=['DELETE'])
def redirect_delete_stock(stock_id):
    return delete_stock(stock_id)

@app.route('/stocks/<ticker>/history', methods=['GET'])
def redirect_get_stock_history(ticker):
    return get_stock_history(ticker)

@app.route('/exchange-rate', methods=['GET'])
def redirect_get_exchange_rate():
    return get_exchange_rate()

# Add logging to help debug route issues
@app.before_request
def log_request_info():
    app.logger.info('Request Path: %s', request.path)
    app.logger.info('Request Method: %s', request.method)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    return jsonify({"message": "API endpoint not found"}), 404

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
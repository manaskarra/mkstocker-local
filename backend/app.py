from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from stock_data import get_current_price, get_historical_data
from pymongo import MongoClient
import os

app = Flask(__name__)

# Configure CORS to allow requests from your local domain
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "https://mkstocker.onrender.com", "https://mkstocker-730k.onrender.com"]}})

# MongoDB connection
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/mkstocker')
client = MongoClient(MONGO_URI)
db = client.get_database('mkstocker')
stocks_collection = db.stocks

# Fallback to file-based storage if MongoDB connection fails
PORTFOLIO_FILE = os.path.join(os.path.dirname(__file__), 'portfolio.json')

def load_portfolio():
    try:
        # Try to load from MongoDB
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
        print(f"MongoDB error: {e}, falling back to file storage")
        # Fallback to file-based storage
        if os.path.exists(PORTFOLIO_FILE):
            with open(PORTFOLIO_FILE, 'r') as f:
                return json.load(f)
        return {'stocks': []}

def save_portfolio(portfolio):
    try:
        # Clear existing stocks and insert new ones
        stocks_collection.delete_many({})
        if portfolio.get('stocks'):
            stocks_collection.insert_many(portfolio['stocks'])
    except Exception as e:
        print(f"MongoDB error: {e}, falling back to file storage")
        # Fallback to file-based storage
        with open(PORTFOLIO_FILE, 'w') as f:
            json.dump(portfolio, f)

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
            current_data = get_current_price(stock['ticker'])
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
        current_data = get_current_price(new_stock['ticker'])
        new_stock['current_price'] = current_data['price']
        new_stock['price_change'] = current_data['change_percent']
        new_stock['current_value'] = new_stock['current_price'] * new_stock['quantity']
        new_stock['profit_loss'] = new_stock['current_value'] - (new_stock['buy_price'] * new_stock['quantity'])
        new_stock['profit_loss_percent'] = (new_stock['profit_loss'] / (new_stock['buy_price'] * new_stock['quantity'])) * 100
    except Exception as e:
        print(f"Error fetching data for {new_stock['ticker']}: {e}")
    
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
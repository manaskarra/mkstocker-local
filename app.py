from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import pymongo
from bson.json_util import dumps, loads
from bson.objectid import ObjectId
from stock_data import get_current_price, get_historical_data

app = Flask(__name__)

# Configure CORS to allow requests from your domains
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "https://mkstocker.vercel.app"]}})

# Path to the original JSON file
PORTFOLIO_FILE = os.path.join(os.path.dirname(__file__), 'portfolio.json')

# MongoDB setup
mongo_uri = os.environ.get('MONGODB_URI', 'your_connection_string_for_local_development')
client = pymongo.MongoClient(mongo_uri)
db = client.portfolio_tracker  # database name
portfolio_collection = db.portfolios  # collection name

# Initialize portfolio and migrate data if needed
def init_portfolio():
    # Check if we need to initialize the database
    if portfolio_collection.count_documents({}) == 0:
        # Check if we have existing data to migrate
        if os.path.exists(PORTFOLIO_FILE):
            try:
                with open(PORTFOLIO_FILE, 'r') as f:
                    existing_portfolio = json.load(f)
                    # Migrate the data to MongoDB
                    portfolio_collection.insert_one(existing_portfolio)
                    print(f"Successfully migrated data from {PORTFOLIO_FILE} to MongoDB")
            except Exception as e:
                print(f"Error migrating data: {e}")
                # If migration fails, create an empty portfolio
                portfolio_collection.insert_one({"stocks": []})
        else:
            # No existing data, create empty portfolio
            portfolio_collection.insert_one({"stocks": []})

# Call init on startup
init_portfolio()

def get_portfolio():
    portfolio = portfolio_collection.find_one({})
    if not portfolio:
        init_portfolio()
        portfolio = portfolio_collection.find_one({})
    return portfolio

def update_portfolio(portfolio):
    portfolio_collection.replace_one({}, portfolio, upsert=True)

@app.route('/api/stocks', methods=['GET'])
def get_stocks():
    portfolio = get_portfolio()
    
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
    update_portfolio(portfolio)
    
    return dumps(portfolio)

@app.route('/api/stocks', methods=['POST'])
def add_stock():
    portfolio = get_portfolio()
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
    new_stock['id'] = str(ObjectId())
    
    # Set default order if not provided
    if 'order' not in new_stock:
        new_stock['order'] = len(portfolio['stocks']) + 1
    
    portfolio['stocks'].append(new_stock)
    update_portfolio(portfolio)
    return dumps(new_stock)

@app.route('/api/stocks/<stock_id>', methods=['PUT'])
def update_stock(stock_id):
    portfolio = get_portfolio()
    updated_stock = request.json
    
    for i, stock in enumerate(portfolio['stocks']):
        if stock['id'] == stock_id:
            # Update the stock
            portfolio['stocks'][i] = updated_stock
            update_portfolio(portfolio)
            return dumps(updated_stock)
    
    return jsonify({"error": "Stock not found"}), 404

@app.route('/api/stocks/<stock_id>', methods=['DELETE'])
def delete_stock(stock_id):
    portfolio = get_portfolio()
    
    for i, stock in enumerate(portfolio['stocks']):
        if stock['id'] == stock_id:
            # Remove the stock
            deleted_stock = portfolio['stocks'].pop(i)
            update_portfolio(portfolio)
            return dumps(deleted_stock)
    
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

if __name__ == '__main__':
    app.run(debug=True)
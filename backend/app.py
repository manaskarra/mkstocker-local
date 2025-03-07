from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from stock_data import get_current_price, get_historical_data
import time
import random
import pickle
from datetime import datetime, timedelta

app = Flask(__name__)

# Configure CORS to allow requests from your local domain only
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

# File-based storage
PORTFOLIO_FILE = os.path.join(os.path.dirname(__file__), 'portfolio.json')

# Create a cache directory if it doesn't exist
CACHE_DIR = os.path.join(os.path.dirname(__file__), 'cache')
os.makedirs(CACHE_DIR, exist_ok=True)

def load_portfolio():
    try:
        if os.path.exists(PORTFOLIO_FILE):
            with open(PORTFOLIO_FILE, 'r') as f:
                return json.load(f)
        return {'stocks': []}
    except Exception as e:
        print(f"Error loading portfolio: {e}")
        return {'stocks': []}

def save_portfolio(portfolio):
    try:
        with open(PORTFOLIO_FILE, 'w') as f:
            json.dump(portfolio, f)
    except Exception as e:
        print(f"Error saving portfolio: {e}")

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
            else:
                print(f"All retries failed for {ticker}")
                raise

# Cache stock data with a shorter expiration (5 minutes instead of 24 hours)
def get_cached_stock_data(ticker):
    cache_file = os.path.join(CACHE_DIR, f"{ticker}.pkl")
    
    # Check if cache exists and is fresh (less than 5 minutes old)
    if os.path.exists(cache_file):
        file_age = datetime.now() - datetime.fromtimestamp(os.path.getmtime(cache_file))
        if file_age < timedelta(minutes=5):  # Changed from hours=24 to minutes=5
            try:
                with open(cache_file, 'rb') as f:
                    return pickle.load(f)
            except Exception as e:
                print(f"Error loading cache for {ticker}: {e}")
    
    # If no cache or cache is stale, fetch new data
    try:
        data = get_stock_data_with_retry(ticker)
        # Save to cache
        with open(cache_file, 'wb') as f:
            pickle.dump(data, f)
        return data
    except Exception as e:
        print(f"Error fetching data for {ticker}: {e}")
        # If cache exists but is stale, return it anyway as fallback
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'rb') as f:
                    return pickle.load(f)
            except:
                pass
        raise

@app.route('/api/stocks', methods=['GET'])
def get_stocks():
    portfolio = load_portfolio()
    
    # Update current prices for all stocks
    for stock in portfolio['stocks']:
        try:
            current_data = get_cached_stock_data(stock['ticker'])
            stock['current_price'] = current_data['price']
            stock['price_change'] = current_data['change_percent']
            stock['current_value'] = stock['current_price'] * stock['quantity']
            stock['profit_loss'] = stock['current_value'] - (stock['buy_price'] * stock['quantity'])
            stock['profit_loss_percent'] = (stock['profit_loss'] / (stock['buy_price'] * stock['quantity'])) * 100
            # Add currentPrice for compatibility
            stock['currentPrice'] = current_data['price']
        except Exception as e:
            print(f"Error updating {stock['ticker']}: {e}")
            # Keep existing values if update fails
    
    # Save the updated portfolio with fixed orders
    save_portfolio(portfolio)
    
    return jsonify(portfolio)

@app.route('/api/stocks', methods=['POST'])
def add_stock():
    portfolio = load_portfolio()
    new_stock = request.json
    
    # Add current price data
    try:
        current_data = get_cached_stock_data(new_stock['ticker'])
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
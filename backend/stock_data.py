import yfinance as yf
import pandas as pd
import time
import random
import os
import json
from datetime import datetime, timedelta

# Create cache directory
CACHE_DIR = os.path.join(os.path.dirname(__file__), 'cache')
os.makedirs(CACHE_DIR, exist_ok=True)

# Cache expiration time (in seconds)
CACHE_EXPIRATION = 3600  # 1 hour

# Function to get mock price data for local development
def get_mock_price(ticker):
    # Generate realistic but random price data
    base_prices = {
        'AAPL': 175.0,
        'MSFT': 350.0,
        'GOOGL': 140.0,
        'AMZN': 130.0,
        'META': 300.0,
        'TSLA': 250.0,
        'NVDA': 400.0,
        'BTC-USD': 50000.0,
        'ETH-USD': 3000.0,
        'XRP-USD': 0.5,
        'SPLG': 55.0,
        'QQQM': 170.0,
        'DOGE-USD': 0.1,
        'ADA-USD': 0.4,
    }
    
    # Use base price or generate a random one
    base = base_prices.get(ticker, random.uniform(50, 500))
    change = random.uniform(-3, 3)
    
    return {
        'price': base * (1 + random.uniform(-0.05, 0.05)),
        'change_percent': change
    }

# Function to generate mock historical data
def get_mock_historical_data(ticker, period="1y"):
    # Generate realistic but random historical data
    base_prices = {
        'AAPL': 175.0,
        'MSFT': 350.0,
        'GOOGL': 140.0,
        'AMZN': 130.0,
        'META': 300.0,
        'TSLA': 250.0,
        'NVDA': 400.0,
        'BTC-USD': 50000.0,
        'ETH-USD': 3000.0,
        'XRP-USD': 0.5,
        'SPLG': 55.0,
        'QQQM': 170.0,
        'DOGE-USD': 0.1,
        'ADA-USD': 0.4,
    }
    
    # Use base price or generate a random one
    base_price = base_prices.get(ticker, random.uniform(50, 500))
    
    # Determine number of days based on period
    days = 365  # Default to 1y
    if period == '1mo':
        days = 30
    elif period == '3mo':
        days = 90
    elif period == '6mo':
        days = 180
    elif period == '2y':
        days = 730
    elif period == '5y':
        days = 1825
    
    # Generate data points
    data = []
    today = datetime.now()
    
    # Create a slightly upward trend with random fluctuations
    for i in range(days):
        date = today - timedelta(days=days-i)
        # Add some randomness but maintain a general trend
        random_factor = random.uniform(-0.02, 0.03)  # Daily fluctuation
        trend_factor = i / days * 0.2  # Overall upward trend (20% over the period)
        
        # Calculate price with trend and randomness
        price = base_price * (1 + trend_factor + random_factor)
        
        data.append({
            'date': date.strftime('%Y-%m-%d'),
            'price': price
        })
    
    return data

# Cache functions
def get_cache_path(ticker, data_type='price'):
    return os.path.join(CACHE_DIR, f"{ticker}_{data_type}_cache.json")

def get_from_cache(ticker, data_type='price'):
    cache_path = get_cache_path(ticker, data_type)
    if os.path.exists(cache_path):
        try:
            with open(cache_path, 'r') as f:
                cache_data = json.load(f)
                # Check if cache is still valid
                if time.time() - cache_data['timestamp'] < CACHE_EXPIRATION:
                    print(f"Using cached data for {ticker}")
                    return cache_data['data']
        except Exception as e:
            print(f"Error reading cache for {ticker}: {e}")
    return None

def save_to_cache(ticker, data, data_type='price'):
    cache_path = get_cache_path(ticker, data_type)
    try:
        with open(cache_path, 'w') as f:
            json.dump({
                'timestamp': time.time(),
                'data': data
            }, f)
    except Exception as e:
        print(f"Error saving cache for {ticker}: {e}")

# Get current price data for a ticker with retries and better error handling
def get_current_price(ticker, max_retries=3):
    # For local development, use mock data if environment variable is set
    if os.environ.get('USE_MOCK_DATA') == 'true':
        print(f"Using mock data for {ticker}")
        return get_mock_price(ticker)
    
    # Check cache first
    cached_data = get_from_cache(ticker)
    if cached_data:
        return cached_data
    
    base_delay = 2  # seconds
    
    for attempt in range(max_retries):
        try:
            # Add a random delay to avoid hitting rate limits
            time.sleep(random.uniform(1, 3))
            
            # Get ticker data
            ticker_data = yf.Ticker(ticker)
            
            # Try to get the most recent price data
            hist = ticker_data.history(period="1d")
            
            if hist.empty:
                # If history is empty, try a different approach
                quote_table = ticker_data.info
                if 'regularMarketPrice' in quote_table:
                    price = quote_table['regularMarketPrice']
                    change_percent = quote_table.get('regularMarketChangePercent', 0)
                    result = {
                        'price': price,
                        'change_percent': change_percent
                    }
                    # Save to cache
                    save_to_cache(ticker, result)
                    return result
                else:
                    raise ValueError(f"No price data available for {ticker}")
            
            # Get the last row for the most recent data
            latest = hist.iloc[-1]
            
            result = {
                'price': latest['Close'],
                'change_percent': ((latest['Close'] - latest['Open']) / latest['Open']) * 100 if latest['Open'] > 0 else 0
            }
            
            # Save to cache
            save_to_cache(ticker, result)
            
            return result
        
        except Exception as e:
            print(f"Attempt {attempt+1}/{max_retries} failed for {ticker}: {str(e)}")
            if attempt < max_retries - 1:
                # Exponential backoff
                delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                print(f"Retrying in {delay:.2f} seconds...")
                time.sleep(delay)
            else:
                # If all retries failed, return a default value
                print(f"All attempts failed for {ticker}. Using default values.")
                default_result = {
                    'price': 0,
                    'change_percent': 0
                }
                # Save default data to cache with shorter expiration
                save_to_cache(ticker, default_result)
                return default_result

# Get historical data for a ticker with retries
def get_historical_data(ticker, period="1y", max_retries=3):
    # For local development, use mock data if environment variable is set
    if os.environ.get('USE_MOCK_DATA') == 'true':
        print(f"Using mock historical data for {ticker}")
        return get_mock_historical_data(ticker, period)
    
    # Check cache first
    cache_key = f"history_{period}"
    cached_data = get_from_cache(ticker, cache_key)
    if cached_data:
        return cached_data
    
    base_delay = 2  # seconds
    
    for attempt in range(max_retries):
        try:
            # Add a random delay to avoid hitting rate limits
            time.sleep(random.uniform(1, 3))
            
            # Get ticker data
            ticker_data = yf.Ticker(ticker)
            
            # Get historical data
            hist = ticker_data.history(period=period)
            
            if hist.empty:
                raise ValueError(f"No historical data available for {ticker}")
            
            # Format the data for the frontend
            data = []
            for date, row in hist.iterrows():
                data.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'price': row['Close']
                })
            
            # Save to cache
            save_to_cache(ticker, data, cache_key)
            
            return data
        
        except Exception as e:
            print(f"Attempt {attempt+1}/{max_retries} failed for historical data of {ticker}: {str(e)}")
            if attempt < max_retries - 1:
                # Exponential backoff
                delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                print(f"Retrying in {delay:.2f} seconds...")
                time.sleep(delay)
            else:
                # If all retries failed, return empty data
                print(f"All attempts failed for historical data of {ticker}. Returning empty data.")
                # Save empty data to cache
                save_to_cache(ticker, [], cache_key)
                return []
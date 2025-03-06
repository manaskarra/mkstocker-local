import yfinance as yf
import pandas as pd
import time
import random
import os
from datetime import datetime, timedelta

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

# Get current price data for a ticker with retries and better error handling
def get_current_price(ticker, max_retries=3):
    # For local development, use mock data if environment variable is set
    if os.environ.get('USE_MOCK_DATA') == 'true':
        print(f"Using mock data for {ticker}")
        return get_mock_price(ticker)
    
    for attempt in range(max_retries):
        try:
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
                    return {
                        'price': price,
                        'change_percent': change_percent
                    }
                else:
                    raise ValueError(f"No price data available for {ticker}")
            
            # Get the last row for the most recent data
            latest = hist.iloc[-1]
            
            return {
                'price': latest['Close'],
                'change_percent': ((latest['Close'] - latest['Open']) / latest['Open']) * 100 if latest['Open'] > 0 else 0
            }
        
        except Exception as e:
            print(f"Attempt {attempt+1}/{max_retries} failed for {ticker}: {str(e)}")
            if attempt == max_retries - 1:
                # If all retries failed, return a default value
                print(f"All attempts failed for {ticker}. Using default values.")
                return {
                    'price': 0,
                    'change_percent': 0
                }
            # Wait before retrying
            time.sleep(1)

# Get historical data for a ticker with retries
def get_historical_data(ticker, period="1y", max_retries=3):
    # For local development, use mock data if environment variable is set
    if os.environ.get('USE_MOCK_DATA') == 'true':
        print(f"Using mock historical data for {ticker}")
        return get_mock_historical_data(ticker, period)
    
    for attempt in range(max_retries):
        try:
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
            
            return data
        
        except Exception as e:
            print(f"Attempt {attempt+1}/{max_retries} failed for historical data of {ticker}: {str(e)}")
            if attempt == max_retries - 1:
                # If all retries failed, return empty data
                print(f"All attempts failed for historical data of {ticker}. Returning empty data.")
                return []
            # Wait before retrying
            time.sleep(1)
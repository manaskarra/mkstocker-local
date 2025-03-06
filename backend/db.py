from pymongo import MongoClient
import os
from bson import ObjectId
import json

class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        return json.JSONEncoder.default(self, o)

def get_db():
    MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/mkstocker')
    client = MongoClient(MONGO_URI)
    return client.get_database('mkstocker')

def get_transactions():
    db = get_db()
    transactions = list(db.transactions.find({}))
    for transaction in transactions:
        if '_id' in transaction:
            transaction['_id'] = str(transaction['_id'])
    return transactions

def add_transaction(transaction):
    db = get_db()
    result = db.transactions.insert_one(transaction)
    transaction['_id'] = str(result.inserted_id)
    return transaction

def update_transaction(transaction_id, updated_transaction):
    db = get_db()
    db.transactions.update_one(
        {'id': transaction_id},
        {'$set': updated_transaction}
    )
    return updated_transaction

def delete_transaction(transaction_id):
    db = get_db()
    db.transactions.delete_one({'id': transaction_id})
    return {'id': transaction_id}
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import os
from bson import ObjectId
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# JWT Configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=1)
jwt = JWTManager(app)

# MongoDB Configuration
client = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27017/'))
db = client['exam_prep_db']

# Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Check if user already exists
    if db.users.find_one({'email': data['email']}):
        return jsonify({'error': 'Email already registered'}), 400
    
    # Create new user
    user = {
        'full_name': data['full_name'],
        'email': data['email'],
        'password': generate_password_hash(data['password']),
        'exam_type': data['exam_type'],
        'role': 'user',
        'created_at': datetime.utcnow()
    }
    
    db.users.insert_one(user)
    return jsonify({'message': 'Registration successful'}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    user = db.users.find_one({'email': data['email']})
    
    if not user or not check_password_hash(user['password'], data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    access_token = create_access_token(identity=str(user['_id']))
    return jsonify({
        'access_token': access_token,
        'user': {
            'id': str(user['_id']),
            'email': user['email'],
            'full_name': user['full_name'],
            'role': user['role']
        }
    })

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = db.users.find_one({'_id': ObjectId(user_id)})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'id': str(user['_id']),
        'email': user['email'],
        'full_name': user['full_name'],
        'role': user['role']
    })

@app.route('/api/tests', methods=['GET'])
@jwt_required()
def get_tests():
    tests = list(db.tests.find())
    return jsonify([{
        'id': str(test['_id']),
        'title': test['title'],
        'description': test['description'],
        'duration': test['duration'],
        'questions_count': test['questions_count'],
        'difficulty': test['difficulty'],
        'type': test['type']
    } for test in tests])

@app.route('/api/materials', methods=['GET'])
@jwt_required()
def get_materials():
    materials = list(db.materials.find())
    return jsonify([{
        'id': str(material['_id']),
        'title': material['title'],
        'description': material['description'],
        'type': material['type'],
        'subject': material['subject'],
        'file_url': material['file_url']
    } for material in materials])

@app.route('/api/leaderboard', methods=['GET'])
@jwt_required()
def get_leaderboard():
    leaderboard = list(db.leaderboard.find().sort('score', -1).limit(10))
    return jsonify([{
        'id': str(entry['_id']),
        'user_name': entry['user_name'],
        'score': entry['score'],
        'exam_type': entry['exam_type']
    } for entry in leaderboard])

if __name__ == '__main__':
    app.run(debug=True, port=5001) 
"""
SkillSwap Web Application - Main Application File
A platform where users can share skills and earn learning credits
"""

import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from extensions import db, migrate, jwt

# Load environment variables
load_dotenv()

def create_app(config_name='development'):
    """Application factory function"""
    
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    
    # Fix DATABASE_URL dialect for SQLAlchemy 2.x
    # Neon/hosting providers give 'postgresql://' but SQLAlchemy needs 'postgresql+psycopg2://'
    db_url = os.getenv('DATABASE_URL', 'sqlite:///skilstation_v2.db')
    if db_url.startswith('postgresql://'):
        db_url = db_url.replace('postgresql://', 'postgresql+psycopg2://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key')
    
    # Connection pool settings — important for Neon (serverless Postgres)
    is_postgres = 'postgresql' in db_url or 'neon.tech' in db_url
    if is_postgres:
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'pool_pre_ping': True,        # Reconnect if connection dropped
            'pool_recycle': 300,          # Recycle connections every 5 minutes
            'pool_timeout': 10,           # Don't hang forever waiting for a connection
            'connect_args': {'sslmode': 'require', 'connect_timeout': 10},
        }
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db, directory='../database/migrations')
    jwt.init_app(app)
    CORS(app)
    
    # Register blueprints
    from routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Register error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'message': 'Resource not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'message': 'Internal server error'}), 500
    
    # Basic health check route
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'OK',
            'message': 'SkillSwap API is running'
        }), 200
    
    # Set up database tables and seed data
    with app.app_context():
        try:
            import models
            db.create_all()
            print("OK  Database tables ready")

            # Seed default users if they don't exist
            from models import User
            from werkzeug.security import generate_password_hash
            seed_users = [
                {'username': 'krishna', 'email': 'krishnaagrawal898@gmail.com', 'password': '12345'},
                {'username': 'subham',  'email': 'subhamkewat482@gmail.com',  'password': '12345'},
                {'username': 'vikas',   'email': '23110572@outr.ac.in',   'password': '12345'},
            ]
            for u_info in seed_users:
                if not User.query.filter_by(username=u_info['username']).first():
                    pw_hash = generate_password_hash(u_info['password'])
                    db.session.add(User(
                        username=u_info['username'],
                        email=u_info['email'],
                        password_hash=pw_hash,
                        credits=5,
                        is_verified=True
                    ))
            db.session.commit()
            print("OK  Seed users ready")

        except Exception as e:
            db.session.rollback()
            print(f"\n!! DB setup warning: {e}")
            print("!! Server starting anyway — DB errors will appear per request.\n")
    
    return app

if __name__ == '__main__':
    app = create_app()
    debug_val = os.getenv('DEBUG', 'True').lower() not in ('false', '0', 'no')
    port = int(os.getenv('PORT', 5000))
    print(f"\n>>> SkillSwap backend running at http://127.0.0.1:{port}\n")
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug_val
    )

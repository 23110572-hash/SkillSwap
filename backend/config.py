"""
Configuration settings for SkillSwap application
"""

import os
from datetime import timedelta

def _fix_db_url(url: str) -> str:
    """Ensure the database URL uses the correct SQLAlchemy dialect.
    Neon/Heroku may provide 'postgresql://' which SQLAlchemy 2.x
    requires as 'postgresql+psycopg2://'.
    """
    if url and url.startswith('postgresql://'):
        return url.replace('postgresql://', 'postgresql+psycopg2://', 1)
    return url

class Config:
    """Base configuration"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT Configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    
    # API Configuration
    JSON_SORT_KEYS = False
    
    # CORS Configuration
    CORS_HEADERS = 'Content-Type'

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False
    SQLALCHEMY_DATABASE_URI = _fix_db_url(os.getenv(
        'DATABASE_URL',
        'sqlite:///skilstation_dev.db'
    ))
    SQLALCHEMY_ECHO = False  # Set True only for local debug; noisy in cloud logs

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    SQLALCHEMY_DATABASE_URI = _fix_db_url(os.getenv(
        'DATABASE_URL',
        'postgresql+psycopg2://user:password@localhost:5432/skilstation_prod'
    ))

class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

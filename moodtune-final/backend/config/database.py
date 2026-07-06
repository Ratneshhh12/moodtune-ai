"""Database configuration for MoodTune AI

Supports multiple database backends via the `DB_TYPE` environment
variable. Currently supports `mysql` (default) and `oracle`.
"""
import os
from urllib.parse import quote_plus
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def init_db(app):
    db_type = os.getenv('DB_TYPE', 'mysql').lower()
    user = os.getenv('DB_USER', 'root')
    password = os.getenv('DB_PASSWORD', '')
    host = os.getenv('DB_HOST', 'localhost')
    port = os.getenv('DB_PORT', '3306')

    if db_type in ('mysql', 'mysql+pymysql'):
        uri = (
            f"mysql+pymysql://{user}:{quote_plus(password)}@{host}:{port}/"
            f"{os.getenv('DB_NAME','moodtune_db')}"
        )
    elif db_type in ('postgresql', 'postgres', 'postgresql+pg8000'):
        uri = (
            f"postgresql+pg8000://{user}:{quote_plus(password)}@{host}:{port}/"
            f"{os.getenv('DB_NAME','postgres')}"
        )
    elif db_type in ('oracle', 'oracledb', 'oracle+oracledb'):
        # Oracle connection options. Prefer SERVICE name, fall back to SID.
        service = os.getenv('DB_SERVICE', '')
        sid = os.getenv('DB_SID', '')
        # Use the oracledb dialect for SQLAlchemy. Thin mode (no client lib)
        # is supported by the `oracledb` Python package.
        if service:
            # Use service_name parameter
            uri = (
                f"oracle+oracledb://{user}:{quote_plus(password)}@{host}:{port}/"
                f"?service_name={service}"
            )
        elif sid:
            uri = f"oracle+oracledb://{user}:{quote_plus(password)}@{host}:{port}/{sid}"
        else:
            # Fallback: allow DB_NAME to be used as service name
            dbname = os.getenv('DB_NAME', '')
            uri = (
                f"oracle+oracledb://{user}:{quote_plus(password)}@{host}:{port}/"
                f"?service_name={dbname}"
            )

    else:
        # Provide a lightweight SQLite fallback for local development.
        if db_type == 'sqlite':
            db_file = os.getenv('DB_NAME', 'moodtune.db')
            uri = f"sqlite:///{db_file}"
        else:
            raise ValueError(f"Unsupported DB_TYPE: {db_type}")

    app.config['SQLALCHEMY_DATABASE_URI'] = uri
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    engine_options = {'pool_recycle': 300, 'pool_pre_ping': True}
    if host not in ('localhost', '127.0.0.1'):
        from sqlalchemy.pool import NullPool
        engine_options['poolclass'] = NullPool
        if db_type in ('mysql', 'mysql+pymysql'):
            engine_options['connect_args'] = {'ssl': {}}
        
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = engine_options
    db.init_app(app)
    return db

#!/bin/bash

set -e

echo "🚀 CoeX Setup Starting..."

# Backend Setup
echo "📦 Setting up backend..."
cd backend

# Create requirements.txt if not exists
if [ ! -f requirements.txt ]; then
  cat > requirements.txt << 'EOF'
Flask==3.0.0
Flask-CORS==4.0.0
Flask-SQLAlchemy==3.1.1
SQLAlchemy==2.0.23
Alembic==1.13.0
python-dotenv==1.0.0
Werkzeug==3.0.1
EOF
fi

# Create .env if not exists
if [ ! -f .env ]; then
  cat > .env << 'EOF'
FLASK_ENV=development
FLASK_APP=backend/main.py
SQLALCHEMY_DATABASE_URI=sqlite:///storage/productos.db
EOF
fi

# Install Python dependencies
echo "📚 Installing Python dependencies..."
pip install -r requirements.txt

cd ..

# Frontend Setup
echo "🎨 Setting up frontend..."
cd frontend

# Create .env.local if not exists
if [ ! -f .env.local ]; then
  cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:5000/api
EOF
fi

# Install Node dependencies
echo "📚 Installing Node dependencies..."
npm install

cd ..

echo "✅ Setup complete!"
echo ""
echo "📖 To run the application:"
echo ""
echo "Terminal 1 - Backend:"
echo "  cd backend && python main.py"
echo ""
echo "Terminal 2 - Frontend:"
echo "  cd frontend && npm run dev"
echo ""
echo "Then open: http://localhost:3000"

#!/bin/bash

echo "Starting Hostel Ledger Backend Server..."
echo

cd backend-server

echo "Installing dependencies..."
npm install

echo
echo "Starting server on port 3000..."
echo "Backend API will be available at: http://localhost:3000"
echo "Health check: http://localhost:3000/health"
echo "Frontend should be running on: http://localhost:8080"
echo

npm start
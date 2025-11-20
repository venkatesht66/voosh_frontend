## RAG News - Frontend

This is the frontend for the News QA Chat application. It is built with React and communicates with the backend via a REST API to send chat messages, fetch session history, and manage sessions. It also supports streaming AI responses, local session caching, and session management.

# Features
	•	Chat interface to interact with the AI assistant
	•	Displays past messages per session
	•	Streaming bot responses (typed-out AI replies)
	•	Input box to send new messages
	•	Create / reset / clear sessions
	•	Persist conversation in local cache (TTL 1 hour)
	•	Fetch session history from backend
	•	Sidebar showing all active sessions

# Architecture

React Frontend  
   |  
   |-- api.js         <-- REST API wrapper  
   |-- App.js         <-- Main component & state management  
   |-- ChatMessage.js <-- Message display component  
   |-- SessionCache.js <-- Local caching using memory + localStorage  
   |  
Backend (Node.js Express)  
   |-- Session/Chat APIs  
   |-- Redis for in-memory sessions  
   |-- MongoDB for transcripts  
   |-- Gemini + RAG pipeline  

# Requirements  
	•	Node.js  
	•	npm  
	•	Backend server running (http://localhost:4000 or deployed url "https://voosh-backend-2.onrender.com" )  

# Installation

# Clone the repository
git clone https://github.com/venkatesht66/voosh_frontend  
cd frontend  

# Install dependencies
npm install  

# Start the development server
npm start  

	•	The app will open on http://localhost:3000 (default)
	•	Connects to backend via api.js (API_PREFIX)

# Folder Structure

frontend/  
│  
├── App.js              # Main app component, manages state & chat  
├── api.js              # API wrapper for chat/session endpoints  
├── ChatMessage.js      # Renders individual chat messages  
├── SessionCache.js     # In-memory + localStorage caching  
├── index.js            # React entry point  
├── styles.css          # Global styles  
└── package.json  

# Modules

1. api.js  
	•	Centralized wrapper for backend REST APIs  
	•	Methods: startSession(), listSessions(), getSessionHistory(), clearSession(), chat()  
	•	Handles JSON parsing and error handling  

2. App.js  
	•	Main React component  
	•	Manages state: sessionId, messages, input, sessions, statusMsg  
	•	Handles:  
	•	Sending messages to backend  
	•	Fetching session history  
	•	Creating / clearing sessions  
	•	Streaming AI responses  
	•	Persisting messages to SessionCache  
	•	Scrolls chat to bottom automatically  

3. ChatMessage.js  
	•	Displays individual chat messages  
	•	Styles messages differently for user, assistant, and system  
	•	Preserves line breaks  

4. SessionCache.js  
	•	Local caching with memory + localStorage   
	•	Supports TTL (default 1 hour)  
	•	Methods:  
	•	set(key, value) → store value with timestamp  
	•	get(key) → retrieve value if TTL not expired  
	•	del(key) → delete value  
	•	clearAll() → clear all cached sessions  
	•	keys() → list all cached session keys  

# Caching & Performance  
	•	In-memory cache (Map) for fast access  
	•	LocalStorage for persistence across reloads  
	•	TTL = 1 hour (configurable)  
	•	Persists last active session automatically  
	•	Reduces API calls to backend for repeated sessions  

# Environment
	•	Default backend API URL: https://voosh-backend-2.onrender.com or http://localhost:4000  
	•	Can be updated in api.js (API_PREFIX)  

# Usage
	1.	Create Session  
	    •	Click “Create Session” → generates new sessionId  
	2.	Send Messages  
	    •	Type your question → press Enter or click “Send”  
	    •	AI response will appear as a streamed message  
	3.	Fetch History  
	    •	Click “Fetch History” to reload messages from backend  
	4.	Reset Chat  
	    •	Clears the conversation for the current session in frontend cache  
	5.	Clear Server Session  
	    •	Deletes session from backend Redis  
	    •	Archives messages to MongoDB transcript  
	6.	View Sessions  
	    •	Sidebar lists all sessions  
	    •	Click to load any previous session  

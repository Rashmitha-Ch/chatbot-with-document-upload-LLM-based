# AI Document Upload Chatbot

An AI-powered document chatbot that allows users to upload documents and interact with them using natural language queries. The system uses Retrieval-Augmented Generation (RAG) to extract relevant information from uploaded files and generate context-aware responses.

---

# Features

- Upload and process documents (`PDF`, `DOCX`, `TXT`)
- AI-powered question answering using RAG
- Semantic search using embeddings
- FastAPI backend with REST APIs
- React frontend for interactive chat experience
- Context-aware responses using LLMs
- File upload and document indexing
- Real-time chatbot interaction

---

# Technologies Used

## Frontend
- React.js
- HTML
- CSS
- Axios

## Backend
- FastAPI
- Python
- Uvicorn

## AI / NLP
- LLMs
- RAG Pipeline
- SentenceTransformers
- Semantic Search

## Libraries
- Pandas
- NumPy
- PyPDF2
- python-docx

---

# Project Structure

```bash
project-folder/
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── ...
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
└── README.md
```

---

# How to Run

## Clone the Repository

```bash
git clone <your-repository-link>
cd <project-folder>
```

## Run Backend

## Install Backend Dependencies

```bash
pip install -r requirements.txt
```
```bash
cd backend
uvicorn main:app --reload --port 8000
```
Backend will run at:

```bash
http://localhost:8000
```

---

## Run Frontend

Open a new terminal:
# Frontend Setup

## Install Frontend Dependencies

```bash
npm install
```

```bash
cd chatbot
npm start
```
Frontend will run at:

```bash
http://localhost:3000
```

---

# How It Works

1. Upload a document (`PDF`, `DOCX`, or `TXT`)
2. Text is extracted and processed
3. Embeddings are generated using SentenceTransformers
4. Relevant content is retrieved using semantic similarity
5. The LLM generates context-aware responses based on uploaded documents

---

# Supported File Types

- PDF
- DOCX
- TXT

---

# Future Improvements

- Multi-document support
- Chat history management
- Authentication and user sessions
- Vector database integration
- Advanced summarization features
- Cloud deployment with Docker

---

# Author

Rashmi
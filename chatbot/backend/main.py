from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer
from pydantic import BaseModel
from typing import List, Optional
from uuid import uuid4
import os
import json
import requests
import numpy as np
from PyPDF2 import PdfReader
from docx import Document
import pandas as pd
import logging
import re 

# === Logger Setup ===
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# === App Setup ===
app = FastAPI()
embedder = SentenceTransformer('all-MiniLM-L6-v2')

# === CORS Setup ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Paths and Globals ===
BASE_DIR = os.path.dirname(__file__)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploaded_docs")
METADATA_FILE = os.path.join(BASE_DIR, "metadata.json")
os.makedirs(UPLOAD_DIR, exist_ok=True)

vector_store = {}

# === Models ===
class ChatRequest(BaseModel):
    message: str
    model: str
    document_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    document_context: Optional[str] = None

class DocumentMetadata(BaseModel):
    document_id: str
    filename: str
    file_path: str

# === Utility Functions ===
def load_documents() -> List[dict]:
    if not os.path.exists(METADATA_FILE):
        return []
    with open(METADATA_FILE, "r") as f:
        return json.load(f)

def save_documents(docs: List[dict]):
    with open(METADATA_FILE, "w") as f:
        json.dump(docs, f, indent=2)

def chunk_text(text: str, max_tokens: int = 300) -> List[str]:
    words = text.split()
    return [" ".join(words[i:i + max_tokens]) for i in range(0, len(words), max_tokens)]

def cosine_similarity(vec1, vec2) -> float:
    vec1, vec2 = np.array(vec1), np.array(vec2)
    return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

def extract_text_from_file(path: str, ext: str) -> str:
    try:
        if ext == ".pdf":
            reader = PdfReader(path)
            return "\n".join(page.extract_text() for page in reader.pages if page.extract_text())
        elif ext == ".txt":
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
        elif ext == ".docx":
            doc = Document(path)
            return "\n".join([para.text for para in doc.paragraphs])
        elif ext == ".csv":
            df = pd.read_csv(path)
            return df.to_string(index=False)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file format: {ext}")
    except Exception as e:
        logger.error(f"Failed to extract text from {path}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract text: {str(e)}")

def format_response(text: str) -> str:
    if not text:
        return text

    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"(?<!\n)(\d+\.\s)", r"\n\1", text)
    text = re.sub(r"(?<!\n)([-*•]\s)", r"\n\1", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


# === Endpoints ===
@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    doc_id = str(uuid4())
    save_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{file.filename}")

    # Save file to disk
    with open(save_path, "wb") as f:
        f.write(await file.read())

    ext = os.path.splitext(save_path)[1].lower()
    text = extract_text_from_file(save_path, ext)

    chunks = chunk_text(text)
    embeddings = embedder.encode(chunks)

    # Store in-memory
    vector_store[doc_id] = [{"chunk": c, "embedding": e.tolist()} for c, e in zip(chunks, embeddings)]

    # Save metadata
    docs = load_documents()
    docs.append({
        "document_id": doc_id,
        "filename": file.filename,
        "file_path": save_path,
    })
    save_documents(docs)

    return {"message": "File uploaded", "document_id": doc_id}

@app.get("/documents", response_model=List[DocumentMetadata])
def list_documents():
    return load_documents()

@app.post("/chat", response_model=ChatResponse)
def chat_with_ollama(request: ChatRequest):
    if not request.document_id:
        raise HTTPException(status_code=400, detail="No document selected")

    if request.document_id not in vector_store:
        raise HTTPException(status_code=404, detail="Document embeddings not found")

    question_embedding = embedder.encode([request.message])[0]
    chunks = vector_store[request.document_id]

    ranked = sorted(
        chunks,
        key=lambda x: cosine_similarity(question_embedding, x["embedding"]),
        reverse=True
    )

    top_chunks = [x["chunk"] for x in ranked[:3]]
    context = "\n---\n".join(top_chunks)

    full_prompt = (
        f"Use the following document content to answer the question:\n{context}\n\n"
        f"Question: {request.message}"
    )

    try:
        response = requests.post("http://localhost:11434/api/generate", json={
            "model": request.model,
            "prompt": full_prompt,
            "stream": False
        })
        response.raise_for_status()
        result = response.json()
        formatted_response = format_response(result.get("response", "No response"))
        return ChatResponse(
            response=formatted_response,
            document_context="Top relevant document chunks were used."
        )
    except requests.exceptions.RequestException as e:
        logger.error(f"Error calling LLM API: {e}")
        raise HTTPException(status_code=500, detail=str(e))

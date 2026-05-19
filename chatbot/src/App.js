import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faBars, 
  faPlus, 
  faPaperPlane, 
  faFileLines, 
  faRobot, 
  faCircleNotch,
  faXmark
} from "@fortawesome/free-solid-svg-icons";
import ReactMarkdown from "react-markdown";

function App() {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [message, setMessage] = useState("");
  const [responseList, setResponseList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const chatRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await axios.get("http://localhost:8000/documents");
      setDocuments(res.data);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const res = await axios.post("http://localhost:8000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // Immediately set the new doc as selected
      setSelectedDoc(res.data.document_id);
      fetchDocuments();
    } catch (err) {
      alert("Upload failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async (e) => {
    if (e) e.preventDefault();
    if (!message.trim()) return;
    
    if (!selectedDoc) {
      alert("Please select a document from the sidebar first!");
      return;
    }

    const userMessage = message;
    setMessage("");
    setResponseList((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:8000/chat", {
        message: userMessage,
        model: "llama3.2",
        document_id: selectedDoc,
      });

      setResponseList((prev) => [
        ...prev,
        { role: "assistant", content: res.data.response },
      ]);
    } catch (err) {
      setResponseList((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Error: Could not reach the AI model." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-slate-800 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? "w-72" : "w-0"
        } bg-[#1a1a1a] transition-all duration-300 flex flex-col text-white z-30 shadow-xl`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between min-w-[280px]">
          <span className="font-bold text-lg">AI Doc Assistant</span>
          <button onClick={() => setIsSidebarOpen(false)} className="hover:bg-white/10 p-2 rounded-lg">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto min-w-[280px]">
          <button 
            onClick={() => fileInputRef.current.click()}
            className="w-full mb-6 bg-blue-600 hover:bg-blue-700 transition-colors p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium shadow-lg shadow-blue-900/20"
          >
            <FontAwesomeIcon icon={faPlus} /> Upload New Doc
          </button>

          <div className="space-y-2">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2">Your Documents</p>
            {documents.length === 0 && <p className="px-2 text-sm text-gray-500 italic">No docs uploaded</p>}
            {documents.map((doc) => (
              <button
                key={doc.document_id}
                onClick={() => setSelectedDoc(doc.document_id)}
                className={`w-full text-left px-3 py-3 rounded-xl text-sm transition-all flex items-center gap-3 border ${
                  selectedDoc === doc.document_id 
                  ? "bg-white/10 border-white/20 text-white shadow-inner" 
                  : "border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`}
              >
                <FontAwesomeIcon icon={faFileLines} />
                <span className="truncate">{doc.filename}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-white overflow-hidden">
        {/* Toggle Sidebar (Only visible when sidebar closed) */}
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-40 p-3 bg-white border border-gray-200 shadow-xl rounded-xl hover:bg-gray-50 transition-all text-gray-700"
          >
            <FontAwesomeIcon icon={faBars} />
          </button>
        )}

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto pt-16 pb-32 px-4 scroll-smooth" ref={chatRef}>
          <div className="max-w-3xl mx-auto">
            {responseList.length === 0 ? (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                   <FontAwesomeIcon icon={faRobot} size="2xl" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Hello!</h2>
                <p className="text-gray-500 max-w-sm">
                  {selectedDoc 
                    ? "I'm ready. Ask me anything about the selected document!" 
                    : "Upload or select a document from the sidebar to begin."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
  {responseList.map((entry, index) => (
    <div key={index} className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${
        entry.role === 'user' 
        ? 'bg-blue-600 text-white shadow-md rounded-tr-none' 
        : 'bg-gray-100 text-gray-800 shadow-sm rounded-tl-none border border-gray-200'
      }`}>
        {/* ✅ Wrap ReactMarkdown in a div to apply the prose styling */}
        <div className="prose prose-sm max-w-none text-inherit">
          <ReactMarkdown>
            {entry.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  ))}
  
  {loading && (
    <div className="flex justify-start">
      <div className="bg-gray-100 rounded-2xl px-6 py-4 flex items-center gap-3 text-gray-400 border border-gray-200">
        <FontAwesomeIcon icon={faCircleNotch} className="animate-spin" />
        <span className="text-sm font-medium">AI is thinking...</span>
      </div>
    </div>
  )}
</div>
            )}
          </div>
        </div>

        {/* Input Form */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
          <form 
            onSubmit={handleChat}
            className="max-w-3xl mx-auto flex gap-3 pointer-events-auto"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask your document a question..."
                className="w-full bg-white border border-gray-300 rounded-2xl py-4 pl-5 pr-14 shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
              >
                <FontAwesomeIcon icon={faPaperPlane} />
              </button>
            </div>
          </form>
          <p className="text-center text-[10px] text-gray-400 mt-4 pointer-events-none">
            Selected Document: <span className="font-semibold">{documents.find(d => d.document_id === selectedDoc)?.filename || "None"}</span>
          </p>
        </div>
      </main>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.txt,.doc,.docx"
      />
    </div>
  );
}

export default App;

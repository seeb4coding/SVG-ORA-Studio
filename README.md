# 🎨 SVG ORA Studio – AI-Powered SVG Generator & Editor
**Frontend-Only | React + TypeScript | Google Gemini + OpenRouter AI**

SVG ORA Studio is a free, open-source AI-assisted vector design tool that generates, edits, and refines **beautiful SVG graphics** from natural language prompts — instantly and entirely in the browser.

No backend. No database. No server.

> 🔑 **Use Your Own API Key — Google Gemini 3.0 is Recommended**

Supports both **Google Gemini** and **OpenRouter multi-model AI**.

---

## 🔗 Links
**Live Demo:** https://seeb4coding.in/ai/svg-ora-studio/  
**GitHub Repository:** https://github.com/seeb4coding/SVG-ORA-Studio  

---

## ✨ Features

### 🧠 AI-Generated SVGs
Create stunning vectors using simple text prompts:
- Logos  
- Icons  
- Shapes  
- Patterns  
- Abstract illustrations  
- UI elements  

Generates clean, lightweight SVG code.

---

### 🎯 AI Refinement Tools
Modify existing SVGs with natural-language instructions:
- Change colors  
- Adjust strokes  
- Add/remove shapes  
- Clean & optimize SVG paths  
- Regenerate specific parts  

---

### 🖼️ Built-In SVG Editor
- Real-time preview  
- Editable code panel  
- Auto-format SVG  
- SVG download  
- Copy-to-clipboard  
- Multi-theme UI (Dark/Light)  

---

## ⚙️ Multi-Model AI Support

### Google Gemini
- Gemini 3.0 Pro (**recommended**)  
- Gemini 3.0 Pro Preview  
- Gemini 2.5 Pro  
- Gemini 2.5 Flash  
- Gemini 2.5 Flash Thinking  
- Gemini 2.0 Flash Lite  

### OpenRouter
- Gemini 2.0 Flash (Free)  
- Gemini 2.0 Pro (Free)  
- Claude 3.5 Sonnet  
- Claude 3 Opus  
- GPT-4o  
- DeepSeek R1  
- Grok 4.1 Fast (Free)  
- Qwen 2.5 VL 72B (Free)  

---

## 🧱 Project Structure

```
SVG-ORA-STUDIO
│
├── components/
│   ├── Header.tsx
│   ├── HistorySidebar.tsx
│   ├── InputSection.tsx
│   ├── SvgPreview.tsx
│   ├── EditorTools.tsx
│
├── services/
│   ├── geminiService.ts
│
├── App.tsx
├── index.tsx
├── constants.ts
├── metadata.json
├── types.ts
├── index.html
└── package.json
```

---

## 📥 Installation

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/seeb4coding/SVG-ORA-Studio
cd SVG-ORA-Studio
```

### 2️⃣ Install Dependencies
```bash
npm install
```

### 3️⃣ Add Your API Keys
Create a **.env.local** file:

```
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY
```

> 🔑 **Use Your Own API Key — Google Gemini 3.0 is Recommended**

---

## 🧪 Run Locally
```bash
npm run dev
```
Visit: **http://localhost:5173**

---

## 📦 Build for Production
```bash
npm run build
npm run preview
```

---

## 🛣️ Roadmap
- Drag-and-drop SVG canvas  
- Multi-layer vector editing  
- Export as PNG / WEBP  
- ZIP export  
- AI-powered SVG optimizer  
- Shape presets library  
- Chrome extension  

---

## ✅ Powered by Google AI Studio
All Gemini API calls run directly **client-side** inside the browser using Google AI Studio.  
No backend server is required — secure, fast, and lightweight.

---

## 👨‍💻 Author
**seeb4coding.in**  
📧 support@seeb4coding.in  
🌐 https://seeb4coding.in/

---

## ⭐ Support
If you find this project helpful, please **star the repo** to support future updates!

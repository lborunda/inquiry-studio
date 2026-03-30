# Inquiry Studio

**Inquiry Studio** is a three-layer epistemic scaffold supporting the transition from exploratory problem construction to formal research design and structured validation. It serves as an interactive, AI-powered workspace for researchers, students, and thinkers to develop their ideas from initial concepts to rigorous research proposals.

## 🌟 Features

- **Interactive Writing Canvas**: A distraction-free, editable canvas with drag-and-drop support for files (PDFs, images) and rich text formatting.
- **AI-Powered Tutor (TutorShell)**: Context-aware AI assistance powered by Gemini, offering critique, suggestions, and guidance based on the current inquiry stage and move.
- **Dynamic Concept Mapping**: Automatically generate and visualize concept nodes and relationships as your research evolves.
- **Knowledge Base & References (RAG)**: Upload and manage reference documents. The system uses Retrieval-Augmented Generation (RAG) to provide contextual insights and summaries.
- **Visual Analysis & Image Gallery**: Upload images to your "desk" and perform AI-driven visual analysis.
- **Researcher Network (Social)**: Connect your ideas with a simulated or real network of researchers to find overlapping interests.
- **Multi-Project Management**: Seamlessly switch between different research projects, saving your progress, chat history, and files locally.
- **Customizable Tutor Orientation**: Adjust the AI's feedback style using sliders for "Design-Oriented vs. Research-Oriented" and "Fundamental vs. Applied" approaches.

## 🛠 Tech Stack

- **Frontend Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **AI Integration**: Google Gemini API
- **Language**: TypeScript

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- A Google Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/inquiry-studio.git
   cd inquiry-studio
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Copy the `.env.example` file to `.env` and configure your environment variables (e.g., API keys).

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open the app:**
   Navigate to the local URL provided by Vite (usually `http://localhost:3000` or `http://localhost:5173`) in your browser.

## 📖 Usage

1. **Start a Project**: Open the app and begin typing in the central canvas.
2. **Upload References**: Drag and drop PDFs or images into the canvas, or use the "References" modal to build your knowledge base.
3. **Interact with the AI**: Highlight text to trigger contextual actions (Explore, Tell me more, Bookmark) or use the chat interface to talk directly with the AI Tutor.
4. **Adjust Inquiry Stage**: Use the left sidebar to transition between different phases of research (e.g., Problem Space -> Conceptual Model -> Research Design).
5. **Visualize**: Open the "Inquiry Map" to see a semantic network of your bookmarked concepts and references.

## 📁 Project Structure

```text
inquiry-studio/
├── components/       # Reusable React components (Modals, Icons, Canvas)
├── server/           # Backend server code (if applicable)
├── services/         # API integrations (Gemini, RAG)
├── types.ts          # TypeScript interfaces and types
├── App.tsx           # Main application component
├── index.css         # Global Tailwind styles
├── index.tsx         # React entry point
├── package.json      # Dependencies and scripts
├── vite.config.ts    # Vite configuration
└── README.md         # Project documentation
```

## 📄 License

This project is licensed under the MIT License.

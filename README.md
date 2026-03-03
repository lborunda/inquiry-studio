📘 Inquiry Studio

Structured Research & Thesis Development Platform

Inquiry Studio is a human–AI epistemic scaffold designed to support students in transitioning from exploratory problem construction to formal research design and structured argument validation.

Unlike generic AI writing assistants, Inquiry Studio operationalizes a three-layer inquiry model grounded in contemporary philosophy of science, research design pedagogy, and cognitive scaffolding.

🎯 Conceptual Framework

Inquiry Studio supports three epistemic layers:

Layer 1 — Problem Space Construction

Transform an indeterminate situation into a researchable problem.
Supports literature mapping, concept clustering, and tension identification.

Layer 2 — Model & Research Design Formation

Translate conceptual gaps into operational research design.
Supports hypothesis articulation, variable identification, and design alignment.

Layer 3 — Structural Argument & Validation

Stress-test claims and ensure coherence between evidence, method, and inference.

The system is cyclical rather than linear and supports iterative refinement.

🏗 Architecture
Frontend

React (Vite)

Writing interface

Inquiry stages

Concept map

Structured AI guidance

Backend (Cloud Run)

Node.js + Express

Gemini API proxy

Retrieval-Augmented Generation (RAG)

Secure API handling

Research design classification

Assumption detection logic

🚀 Deployment (Cloud Run + Docker)
1. Prerequisites

Google Cloud SDK installed

Docker configured

Billing enabled

Artifact Registry enabled

2. Build Container

From project root:

gcloud builds submit \
  --tag us-central1-docker.pkg.dev/YOUR_PROJECT/cloud-run-source-deploy/inquiry-studio
3. Deploy to Cloud Run
gcloud run deploy inquiry-studio \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT/cloud-run-source-deploy/inquiry-studio \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated
4. Add Environment Variables
gcloud run services update inquiry-studio \
  --region us-central1 \
  --update-env-vars GEMINI_API_KEY=YOUR_KEY

For production, use Google Secret Manager instead of raw environment variables.

🐳 Dockerfile

The backend uses a minimal production Dockerfile:

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]

Cloud Run requires listening on process.env.PORT.

🔐 Security Notes

API keys must not be exposed to the frontend.

RAG logic runs server-side.

Use Secret Manager for production environments.

Do not commit .env.local files.

📚 RAG Overview

Inquiry Studio implements Retrieval-Augmented Generation to:

Anchor AI responses in uploaded research materials

Detect literature gaps

Align research design to documented tensions

Reduce hallucinations

Vector storage can be implemented via:

pgvector

Pinecone

Chroma

FAISS

🎓 Institutional Positioning

Inquiry Studio is not an AI writing assistant.

It is:

A structured epistemic environment supporting the transition from exploratory inquiry to formal research design.

Designed for:

Undergraduate capstones

Master’s theses

Doctoral dissertations

Research methods courses

Design research studios

📈 Future Extensions

Structured variable mapping

Research design auto-classification

Assumption surfacing engine

Cross-document semantic comparison

Institutional analytics (privacy-preserving)

🧠 License

Specify your license here.

👤 Author

Luis Borunda
Assistant Professor of Advanced Building Design
Virginia Tech
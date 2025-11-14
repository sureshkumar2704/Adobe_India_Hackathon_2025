# Adobe Hackathon 2025 Challenges Overview

## Round-2 
### Challenge_1A-main
This folder contains a Python application designed for extracting structured data from semi-structured PDF documents, such as RFPs, program guidelines, and flyers. It uses a template-free, layout-aware parser built with PyMuPDF to analyze PDF layout metadata, including text positions, font sizes, and styles. The system groups content into logical sections, detects key-value pairs, and maps them to a predefined JSON schema (output_schema.json) that includes fields like title and outline with levels, text, and page numbers.

Key components:
- **process_pdfs.py**: Main script that parses PDFs, extracts titles and headings, handles special cases for specific files, and outputs JSON files.
- **Dockerfile**: Sets up a Python 3.10 environment, installs dependencies, and runs the script.
- **requirements.txt**: Lists PyMuPDF as the primary dependency.
- **README.md**: Details the problem statement, approach, key steps (PDF parsing, layout segmentation, field mapping, post-processing), libraries used, and build/run instructions.
- **output_schema.json**: Defines the JSON structure for extracted data, requiring title and outline arrays.

**Problem Solved:** Addresses the challenge of converting varied, unstructured PDF layouts into consistent, structured JSON without using machine learning or NLP, ensuring generalization across document types, normalization of text, and schema completeness for downstream processing.

### Challenge_1B-main
This folder houses a Dockerized system for persona-driven document intelligence, focusing on extracting and ranking relevant sections from PDF collections based on a user's persona and job-to-be-done. It leverages PyMuPDF for heading extraction, sentence-transformers for semantic similarity computation (using a small model like all-mpnet-base-v2), and outputs ranked top 5 sections with summaries in JSON format.

Key components:
- **readme.txt**: Provides overview, folder structure, setup instructions, input/output formats, and troubleshooting. Describes processing PDFs to extract headings, computing similarity, and generating outputs with metadata, extracted sections, and subsection analysis.
- **Dockerfile**: Builds a Python 3.10 image, installs dependencies, and runs the main pipeline script.
- **requirements.txt**: Includes PyMuPDF, sentence-transformers, and numpy.
- **input/**: Contains main_pipeline.py, process_pdfs.py, and sample collections with PDFs and input JSONs defining persona, job, and documents.

**Problem Solved:** Solves the issue of efficiently retrieving pertinent information from large document sets by aligning content with user-specific roles and tasks, producing ranked, summarized outputs for better decision-making, all while adhering to constraints like CPU-only operation, small model size, and offline capability.

## Round-3
This folder contains a full-stack web application that enables users to upload PDF documents and perform advanced AI-powered analysis on them. The application extracts specific sections from PDFs with page-level accuracy, generates intelligent insights using Google Gemini AI, provides an interactive PDF viewer with section highlighting, and even creates AI-generated podcast scripts that discuss the document's key insights. It's designed for users who need to quickly understand and derive value from large or complex PDF files, such as researchers, analysts, or professionals dealing with documentation.

Key functionalities and uses:
- **PDF Upload and Processing**: Users can securely upload PDFs (up to 50MB), which are processed to extract structured sections, titles, and metadata.
- **Section Extraction**: Intelligently identifies and extracts document sections, allowing users to navigate and focus on specific parts of the PDF.
- **AI-Powered Insights**: Leverages Google Gemini AI to analyze extracted text and provide recommendations, summaries, or deeper analysis tailored to the content.
- **Interactive Viewing**: Offers a real-time PDF viewer where users can highlight sections, zoom, and interact with the document seamlessly.
- **Podcast Generation**: Creates engaging podcast-style scripts based on the document's insights, turning static PDFs into dynamic audio content for better comprehension or sharing.
- **Multi-format Outputs**: Supports JSON responses for programmatic use, direct PDF serving, and structured data exports.

The application is built with a FastAPI backend for robust API handling and a React.js frontend for a responsive user interface, all containerized in a single Dockerfile for easy deployment. It includes features like health checks, error handling, and caching for optimal performance.

**Problem Solved:** Solves the challenge of making unstructured PDF content accessible and actionable by combining PDF parsing, AI analysis, and multimedia generation, enabling users to extract value from documents efficiently without manual reading or complex tools.

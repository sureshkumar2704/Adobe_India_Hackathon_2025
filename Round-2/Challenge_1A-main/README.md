# Adobe Hackathon 2025 - Challenge 1A  

# Problem Statement

The task in **Challenge 1A** is to **extract structured data** from a variety of **semi-structured PDF documents** (e.g., RFPs, program guidelines, flyers, etc.) and convert them into a **predefined JSON schema**. Each document may contain a unique layout and structure, requiring generalized extraction logic.

# Approach

We developed a **template-free, layout-aware parser** that leverages PDF layout metadata and heuristics to extract and organize content into structured JSON. Our system does not depend on hardcoded template matching or ML models, allowing it to generalize across diverse document types.

# Key Steps:

1. PDF Parsing using PyMuPDF
   - Extracts block, line, and span-level information including text, position (`bbox`), font size, and style attributes.

2. Layout Segmentation
   - Groups lines and blocks based on their vertical and horizontal proximity.
   - Detects section breaks and logical groupings using whitespace and font features.

3. Field Mapping to Schema
   - Detects key-value pairs (e.g., "Deadline: August 2025") and infers fields like:
     -  title
     -  objective
     -  deadline
     -  eligibility_criteria
     -  submission_guidelines
   - Handles multi-line fields and bullet-style formatting.

4. Post-Processing
   - Normalizes extracted text
   - Ensures schema completeness (fills missing keys with null or empty values)
   - Cleans up noisy data


# Libraries Used

| Library     | Purpose                                |
|-------------|----------------------------------------|
| `PyMuPDF`   | PDF text and layout extraction         |
| `re`        | Regular expression matching for field identification |
| `json`      | Schema generation and output writing   |
| `os`        | File and directory management          |

No machine learning or NLP libraries were used to maintain low memory and offline compliance.



# How to Build and Run

This project is Dockerized for portability.

Challenge_1a/
├── input/ # Folder containing PDFs
├── output/ # Extracted structured JSON files
├── pdf_extractor.py # Main script to parse and extract fields
├── Dockerfile
├── requirements.txt
└── README.md

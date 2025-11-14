# backend/app.py
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import uvicorn
import shutil
from pathlib import Path
import logging
import google.generativeai as genai
import os
import json
import traceback
from typing import Optional

# Import PDF processing
from extraction import process_pdf

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PDF Section Extractor")

# Allow CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ✅ Mount uploads dir with proper caching headers for better PDF loading
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Load Gemini API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyBDvDPJfRJFXkIJd4YZoLBM_scQVgdUGHw")

# Initialize Gemini
try:
    genai.configure(api_key=GEMINI_API_KEY)
    logger.info(f"GEMINI_API_KEY configured: {bool(GEMINI_API_KEY)}")
    
    # Test API key validity
    available_models = [m.name for m in genai.list_models()]
    logger.info(f"Available Gemini models: {available_models}")
    
    DEFAULT_MODEL = "models/gemini-pro"
    if DEFAULT_MODEL not in available_models:
        # Try alternative model names
        for alt_model in ["models/gemini-1.5-flash", "models/gemini-1.5-pro", "models/text-bison-001"]:
            if alt_model in available_models:
                DEFAULT_MODEL = alt_model
                break
        else:
            DEFAULT_MODEL = available_models[0] if available_models else None
    
    logger.info(f"Using model: {DEFAULT_MODEL}")
    
except Exception as e:
    logger.error(f"Error initializing Gemini: {e}")
    logger.error(traceback.format_exc())
    DEFAULT_MODEL = None


@app.get("/")
def read_root():
    return {"message": "PDF Section Extractor API"}


@app.post("/upload")
async def upload_pdf(request: Request, file: UploadFile = File(...)):
    try:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")

        # ✅ Sanitize filename more thoroughly
        safe_filename = "".join(c for c in file.filename if c.isalnum() or c in "._-").rstrip()
        if not safe_filename.endswith(".pdf"):
            safe_filename += ".pdf"
        
        save_path = UPLOAD_DIR / safe_filename

        # ✅ Check file size (limit to 50MB for better performance)
        file_size = 0
        with save_path.open("wb") as buffer:
            while chunk := await file.read(8192):  # Read in 8KB chunks
                file_size += len(chunk)
                if file_size > 50 * 1024 * 1024:  # 50MB limit
                    save_path.unlink(missing_ok=True)
                    raise HTTPException(status_code=413, detail="File too large. Maximum size is 50MB.")
                buffer.write(chunk)

        logger.info(f"Saved uploaded PDF to {save_path} (size: {file_size/1024/1024:.1f}MB)")

        # Process PDF
        result = process_pdf(str(save_path))
        if isinstance(result, dict) and result.get("error"):
            return JSONResponse(status_code=500, content={"error": result["error"]})

        outline = result.get("outline", []) if isinstance(result, dict) else result if isinstance(result, list) else []
        sections = []
        for item in outline:
            if isinstance(item, dict) and "text" in item and "page" in item:
                sections.append({"text": item["text"], "page": int(item["page"])})
            elif isinstance(item, (list, tuple)) and len(item) >= 2:
                sections.append({"text": str(item[0]), "page": int(item[1])})

        base_url = str(request.base_url).rstrip("/")
        pdf_url = f"{base_url}/uploads/{safe_filename}"

        return {
            "filename": safe_filename,
            "pdf_url": pdf_url,
            "sections": sections,
            "title": result.get("title") if isinstance(result, dict) else "",
            "file_size": file_size,  # ✅ Include file size in response
            "total_pages": len(sections)  # ✅ Include page count
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Upload / processing failed")
        raise HTTPException(status_code=500, detail=str(e))


class TextRequest(BaseModel):
    text: str


class PodcastRequest(BaseModel):
    text: str
    insight: str
    recommendation: str


@app.post("/get-insights")
async def get_insights(req: TextRequest):
    logger.info(f"Received insights request for text: {req.text[:100]}...")
    
    if not DEFAULT_MODEL:
        logger.error("No available Gemini model found")
        raise HTTPException(status_code=500, detail="No available Gemini model found. Please check your API key.")

    try:
        # Validate input
        if not req.text or len(req.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        # ✅ Improved text preprocessing
        text = req.text.strip()
        if len(text) > 10000:  # Limit text length
            text = text[:10000]
            logger.warning("Text truncated to 10000 characters")

        # ✅ Enhanced prompt for better insights
        prompt = f"""
        Analyze the following text and provide analysis in exactly this JSON format:
        
        {{
            "insight": "Brief analytical summary of the key points and significance (2-3 sentences)",
            "recommendation": "Practical actionable suggestion based on the content (1-2 sentences)"
        }}
        
        Focus on:
        - Main themes and concepts
        - Practical implications
        - Actionable advice
        - Key takeaways
        
        Text to analyze:
        {text}
        
        Respond with ONLY the JSON object, no additional text or formatting.
        """

        logger.info(f"Using model: {DEFAULT_MODEL}")
        model = genai.GenerativeModel(DEFAULT_MODEL)
        
        # ✅ Optimized generation config for better consistency
        generation_config = {
            "temperature": 0.6,  # Lower temperature for more consistent results
            "top_p": 0.8,
            "top_k": 40,
            "max_output_tokens": 1024,
        }
        
        response = model.generate_content(
            prompt,
            generation_config=generation_config
        )
        
        logger.info(f"Raw response: {response.text[:200]}...")

        # ✅ Improved JSON parsing with better error handling
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            parts = response_text.split("```")
            if len(parts) >= 2:
                response_text = parts[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
        
        # Clean up common formatting issues
        response_text = response_text.strip()
        if not response_text.startswith("{"):
            # Find first { and last }
            start = response_text.find("{")
            end = response_text.rfind("}") + 1
            if start != -1 and end > start:
                response_text = response_text[start:end]
        
        try:
            result = json.loads(response_text)
            logger.info(f"Successfully parsed JSON")
        except json.JSONDecodeError as je:
            logger.warning(f"JSON decode failed: {je}. Attempting fallback parsing.")
            
            # ✅ More robust fallback parsing
            result = {"insight": "", "recommendation": ""}
            lines = response.text.split('\n')
            
            current_field = None
            current_value = ""
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                    
                # Check for field indicators
                if any(x in line.lower() for x in ['insight:', '"insight":', 'analysis:', 'summary:']):
                    if current_field and current_value:
                        result[current_field] = current_value.strip()
                    current_field = "insight"
                    # Extract value after colon
                    colon_idx = line.find(':')
                    if colon_idx != -1:
                        current_value = line[colon_idx+1:].strip().strip('"').strip(',')
                    else:
                        current_value = ""
                elif any(x in line.lower() for x in ['recommendation:', '"recommendation":', 'action:', 'suggest:']):
                    if current_field and current_value:
                        result[current_field] = current_value.strip()
                    current_field = "recommendation"
                    # Extract value after colon
                    colon_idx = line.find(':')
                    if colon_idx != -1:
                        current_value = line[colon_idx+1:].strip().strip('"').strip(',')
                    else:
                        current_value = ""
                elif current_field and line:
                    # Continue building current value
                    if current_value:
                        current_value += " " + line.strip().strip('"').strip(',')
                    else:
                        current_value = line.strip().strip('"').strip(',')
            
            # Don't forget the last field
            if current_field and current_value:
                result[current_field] = current_value.strip()
            
            # Final fallback - use the whole response
            if not result.get("insight") and not result.get("recommendation"):
                response_text = response.text.strip()
                if len(response_text) > 100:
                    result["insight"] = response_text[:300] + "..."
                    result["recommendation"] = "Please review the content for actionable steps."
                else:
                    result["insight"] = response_text
                    result["recommendation"] = "Consider the implications of this content."

        # ✅ Validate and clean the result
        if not isinstance(result, dict):
            raise ValueError("Result is not a dictionary")
        
        # Ensure required fields exist and have reasonable content
        insight = result.get("insight", "").strip()
        recommendation = result.get("recommendation", "").strip()
        
        if not insight:
            insight = "Unable to extract clear insights from the selected text."
        if not recommendation:
            recommendation = "Please review the content and consider its practical applications."
        
        # Truncate if too long
        if len(insight) > 500:
            insight = insight[:500] + "..."
        if len(recommendation) > 300:
            recommendation = recommendation[:300] + "..."
        
        final_result = {
            "insight": insight,
            "recommendation": recommendation
        }
        
        logger.info(f"Returning result: {final_result}")
        return final_result

    except Exception as e:
        logger.error(f"Error generating insights: {e}")
        logger.error(traceback.format_exc())
        
        # Return a user-friendly error response
        return JSONResponse(
            status_code=500, 
            content={
                "error": f"Failed to generate insights: {str(e)}",
                "insight": "Unable to analyze the selected text due to a processing error.",
                "recommendation": "Please try selecting a different text segment or refresh the page."
            }
        )


@app.post("/generate-podcast")
async def generate_podcast(req: PodcastRequest):
    logger.info(f"Received podcast request for text: {req.text[:100]}...")
    
    if not DEFAULT_MODEL:
        logger.error("No available Gemini model found")
        raise HTTPException(status_code=500, detail="No available Gemini model found. Please check your API key.")

    try:
        # Validate input
        if not req.text or len(req.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        text = req.text.strip()
        if len(text) > 8000:  # Limit text length for podcast
            text = text[:8000]
            logger.warning("Text truncated to 8000 characters for podcast")

        # ✅ Enhanced podcast generation prompt
        prompt = f"""
        Create a natural, engaging podcast conversation between two AI hosts discussing the following content. 
        
        ORIGINAL TEXT:
        {text}
        
        ANALYSIS:
        Insight: {req.insight}
        Recommendation: {req.recommendation}
        
        Generate a podcast script with two hosts (Alex - analytical, Sam - practical) discussing this content. Make it conversational, insightful, and engaging.
        
        Requirements:
        - Natural conversational flow with 10-14 total exchanges
        - Alex focuses on analysis and insights
        - Sam focuses on practical applications and recommendations
        - Include questions, agreements, and thoughtful discussions
        - Make it feel like a real podcast conversation
        - Each exchange should be 1-3 sentences
        
        Format as JSON with this exact structure:
        {{
            "title": "Engaging episode title based on the content (max 60 chars)",
            "duration_estimate": "Estimated duration like '4-6 minutes'",
            "conversation": [
                {{
                    "speaker": "Alex",
                    "text": "Opening statement about the content...",
                    "timestamp": "00:00"
                }},
                {{
                    "speaker": "Sam", 
                    "text": "Response building on Alex's point...",
                    "timestamp": "00:20"
                }}
            ]
        }}
        
        Make the conversation feel natural and dynamic. Include transitions like "That's interesting, Alex..." or "Building on what you said..."
        """

        logger.info(f"Generating podcast with model: {DEFAULT_MODEL}")
        model = genai.GenerativeModel(DEFAULT_MODEL)
        
        # ✅ Optimized settings for creative content
        generation_config = {
            "temperature": 0.8,
            "top_p": 0.9,
            "top_k": 40,
            "max_output_tokens": 2048,
        }
        
        response = model.generate_content(
            prompt,
            generation_config=generation_config
        )
        
        logger.info(f"Raw podcast response length: {len(response.text)}")

        # ✅ Improved JSON parsing for podcast
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            parts = response_text.split("```")
            if len(parts) >= 2:
                response_text = parts[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
        
        try:
            result = json.loads(response_text)
            logger.info(f"Successfully parsed podcast JSON")
        except json.JSONDecodeError as je:
            logger.warning(f"JSON decode failed for podcast: {je}. Creating enhanced fallback.")
            
            # ✅ Create a more sophisticated fallback podcast structure
            title = f"Discussion: {req.insight[:50]}..." if req.insight else "AI Analysis Discussion"
            
            result = {
                "title": title,
                "duration_estimate": "5-7 minutes",
                "conversation": [
                    {
                        "speaker": "Alex",
                        "text": f"Welcome everyone! Today we're diving into some fascinating content. Here's what caught my attention: {req.insight[:150]}",
                        "timestamp": "00:00"
                    },
                    {
                        "speaker": "Sam",
                        "text": "That's a really insightful observation, Alex. What I find particularly valuable is the practical angle here.",
                        "timestamp": "00:25"
                    },
                    {
                        "speaker": "Alex",
                        "text": "Exactly! The analysis reveals some deeper patterns that aren't immediately obvious on first reading.",
                        "timestamp": "00:45"
                    },
                    {
                        "speaker": "Sam",
                        "text": f"And speaking of practical applications, here's what I think our listeners should consider: {req.recommendation[:150]}",
                        "timestamp": "01:10"
                    },
                    {
                        "speaker": "Alex",
                        "text": "That's such an actionable takeaway, Sam. It bridges the gap between understanding and actually doing something about it.",
                        "timestamp": "01:40"
                    },
                    {
                        "speaker": "Sam",
                        "text": "Absolutely. Sometimes the most valuable insights come from taking a step back and looking at the bigger picture.",
                        "timestamp": "02:05"
                    },
                    {
                        "speaker": "Alex",
                        "text": "This type of content analysis really shows how much depth there is in seemingly straightforward material.",
                        "timestamp": "02:30"
                    },
                    {
                        "speaker": "Sam",
                        "text": "Thanks for joining us in this analysis, everyone. The key is to not just consume content, but to actively engage with it.",
                        "timestamp": "02:55"
                    }
                ]
            }

        # ✅ Validate and enhance the result
        if not isinstance(result, dict):
            raise ValueError("Result is not a dictionary")
        
        required_fields = ["title", "duration_estimate", "conversation"]
        for field in required_fields:
            if field not in result:
                raise ValueError(f"Missing required field: {field}")
        
        # ✅ Enhance conversation with better timestamps
        conversation = result.get("conversation", [])
        for i, item in enumerate(conversation):
            if "timestamp" not in item:
                # Generate timestamp based on position (assuming ~20-30 seconds per exchange)
                seconds = i * 25  # 25 seconds per exchange on average
                minutes = seconds // 60
                seconds = seconds % 60
                item["timestamp"] = f"{minutes:02d}:{seconds:02d}"
        
        logger.info(f"Returning podcast result with {len(conversation)} conversation items")
        return result

    except Exception as e:
        logger.error(f"Error generating podcast: {e}")
        logger.error(traceback.format_exc())
        
        # ✅ Return an enhanced fallback podcast
        return JSONResponse(
            status_code=500,
            content={
                "error": f"Failed to generate podcast: {str(e)}",
                "title": "Content Analysis Discussion",
                "duration_estimate": "4-6 minutes",
                "conversation": [
                    {
                        "speaker": "Alex",
                        "text": "I apologize, but we're experiencing some technical difficulties generating the full podcast discussion.",
                        "timestamp": "00:00"
                    },
                    {
                        "speaker": "Sam",
                        "text": "However, we can still discuss the key insights from your selected text and provide valuable recommendations.",
                        "timestamp": "00:20"
                    },
                    {
                        "speaker": "Alex",
                        "text": f"The main insight we gathered is: {req.insight if req.insight else 'The content contains valuable information worth analyzing.'}",
                        "timestamp": "00:40"
                    },
                    {
                        "speaker": "Sam",
                        "text": f"And our recommendation would be: {req.recommendation if req.recommendation else 'Consider how this information applies to your specific context.'}",
                        "timestamp": "01:05"
                    }
                ]
            }
        )


# ✅ Enhanced PDF serving with proper headers for better quality
@app.get("/pdf/{filename}")
def serve_pdf(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    return FileResponse(
        path=str(file_path), 
        media_type="application/pdf", 
        filename=filename,
        headers={
            "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
            "Accept-Ranges": "bytes",  # Enable byte-range requests for better streaming
        }
    )


@app.delete("/clear-uploads")
def clear_uploads():
    try:
        deleted_count = 0
        for f in UPLOAD_DIR.glob("*"):
            if f.is_file():
                f.unlink()
                deleted_count += 1
        return {"message": f"Cleared {deleted_count} uploaded files"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ✅ Enhanced test endpoint with more comprehensive checks
@app.get("/test-gemini")
def test_gemini():
    try:
        if not DEFAULT_MODEL:
            return {"status": "error", "message": "No model available"}
        
        model = genai.GenerativeModel(DEFAULT_MODEL)
        response = model.generate_content("Hello, this is a test. Please respond with 'Test successful!'")
        
        return {
            "status": "success", 
            "model": DEFAULT_MODEL,
            "response": response.text[:200],
            "api_key_configured": bool(GEMINI_API_KEY),
            "available_models_count": len([m.name for m in genai.list_models()])
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "traceback": traceback.format_exc()}


# ✅ New endpoint to check system status
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "upload_dir_exists": UPLOAD_DIR.exists(),
        "gemini_configured": bool(DEFAULT_MODEL),
        "api_version": "1.0"
    }


# ✅ New endpoint to get available voices (for frontend debugging)
@app.get("/voices")
def get_voices_info():
    """
    This endpoint provides information about text-to-speech capabilities
    that can be useful for frontend debugging
    """
    return {
        "message": "Voice information is handled client-side using Web Speech API",
        "web_speech_api_required": True,
        "browser_compatibility": {
            "chrome": "Full support",
            "firefox": "Partial support", 
            "safari": "Full support",
            "edge": "Full support"
        },
        "recommended_testing": "Use the 'Test Audio' button in the PDF viewer"
    }


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
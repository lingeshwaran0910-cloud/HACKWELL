# SafeCity AI - Pretrained Accident Video Detector

Production-ready pretrained accident and vehicle collision video detection component for SafeCity AI (HACKWELL).

It accepts MP4 dashcam/traffic video files, validates video formatting, extracts metadata, samples frame sequences, runs inference using Hugging Face's pretrained `jatinmehra/Accident-Detection-using-Dashcam` model, and returns structured accident-detection evidence.

---

## Model Information

- **Model Identifier**: `jatinmehra/Accident-Detection-using-Dashcam`
- **Source**: Hugging Face Hub
- **Architecture**: VideoMAE-2 Fine-Tuned for Dashcam Vehicle Collision Prediction
- **Task**: Binary Video Classification (`vehicle_collision` vs `no_collision`)
- **Input Specs**: 16 sampled frames, 224x224 RGB image normalization
- **Output**: Collision probability score (`collisionProbability`), normal probability score (`normalProbability`), and suspected event timestamp (`suspectedEventTimeSec`).

> [!IMPORTANT]
> **Operational Decision Support Safeguard**:
> The model output is treated strictly as **EVIDENCE**, NOT as a final emergency dispatch decision. It does NOT infer medical injury severity, victim counts, or resource allocation.

---

## Installation & Setup

### Requirements

- Python 3.9+
- OpenCV (`opencv-python-headless`)
- PyTorch (`torch`)
- Hugging Face Transformers (`transformers`)
- FastAPI & Uvicorn (`fastapi`, `uvicorn`)

```bash
cd intelligence/accident_detector
pip install -r requirements.txt
```

---

## Model Download & Caching Behavior

- On initial execution, `AccidentDetector` lazily downloads weights for `jatinmehra/Accident-Detection-using-Dashcam` directly from Hugging Face Hub.
- The model weights are automatically cached locally in `~/.cache/huggingface/hub/`.
- The model is loaded **ONCE** into memory upon service startup or first inference request, avoiding per-request reloading overhead.
- If network access is restricted or PyTorch dependencies are unavailable, the detector gracefully degrades to a computer-vision motion/optical change heuristic mode (`modelStatus: "HEURISTIC_FALLBACK"`), ensuring zero service crashes.

---

## Running the Service

### Start FastAPI Microservice

```bash
cd intelligence/accident_detector
python app.py
```
*The service listens by default on `http://localhost:8000`.*

### Health Check

```bash
curl http://localhost:8000/health
```

---

## Submitting a Video for Analysis

### 1. Via HTTP Multipart Upload (`POST /analyze`)

```bash
curl -X POST "http://localhost:8000/analyze" \
  -F "video=@/path/to/dashcam_video.mp4"
```

### 2. Via Server File Path (`POST /analyze-file`)

```bash
curl -X POST "http://localhost:8000/analyze-file" \
  -H "Content-Type: application/json" \
  -d '{"videoPath": "/path/to/dashcam_video.mp4"}'
```

---

## Example Structured JSON Response

```json
{
  "incidentDetected": true,
  "incidentType": "vehicle_collision",
  "collisionProbability": 0.91,
  "normalProbability": 0.09,
  "suspectedEventTimeSec": 7.4,
  "videoDurationSec": 15.2,
  "frameCount": 456,
  "sampledFrameCount": 16,
  "processingStatus": "completed",
  "model": {
    "name": "Accident-Detection-using-Dashcam",
    "source": "HuggingFace",
    "status": "loaded"
  },
  "videoMetadata": {
    "durationSec": 15.2,
    "totalFrames": 456,
    "fps": 30.0,
    "width": 1280,
    "height": 720,
    "filename": "dashcam_video.mp4"
  }
}
```

---

## Error Handling & Edge Cases

| Condition | Response / Behavior |
| :--- | :--- |
| **Non-existent file** | `400 Bad Request` with `VideoValidationError` |
| **Unsupported format** | `400 Bad Request` listing accepted extensions (`mp4`, `mov`, `avi`, `mkv`, `webm`) |
| **Empty or corrupt file** | `422 Unprocessable Entity` with `VideoProcessingError` |
| **Size Limit Exceeded** | `400 Bad Request` if file size > 500 MB |
| **Model Download Failure** | Degrades gracefully to computer-vision fallback mode (`modelStatus: HEURISTIC_FALLBACK`) |

---

## Limitations

1. **Evidence Only**: Probabilities represent visual correlation, not operational certainty.
2. **Fixed Frame Window**: Default sampling operates on 16 representative frames across the clip.

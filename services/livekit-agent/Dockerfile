FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Include every local module imported by agent.py in the runtime image.
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY agent.py idle_watch.py speech_style.py voice_rewrite.py transcript_filter.py voice_style_guide.md ./

CMD ["python", "agent.py", "start"]

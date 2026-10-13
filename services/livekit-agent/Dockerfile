FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY agent.py idle_watch.py speech_style.py voice_rewrite.py voice_style_guide.md ./

CMD ["python", "agent.py", "start"]

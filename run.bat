@echo off
if not exist ".venv" (
    echo Creating virtualenv...
    python -m venv .venv
)

call .venv\Scripts\activate.bat
pip install -r requirements.txt
playwright install
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
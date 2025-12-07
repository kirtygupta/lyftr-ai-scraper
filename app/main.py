# .venv\Scripts\activate.bat
# python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
# http://localhost:8000

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, HttpUrl
from datetime import datetime, timezone
import asyncio

from .scraper import universal_scrape

app = FastAPI(title="Universal Website Scraper (MVP)")

templates = Jinja2Templates(directory="app/templates")
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


class ScrapeRequest(BaseModel):
    url: HttpUrl


@app.post("/scrape")
async def scrape(req: ScrapeRequest):
    url = str(req.url)
    # Run scraping with a timeout guard to avoid hanging
    try:
        result = await asyncio.wait_for(universal_scrape(url), timeout=120)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Scrape timed out after 120s")
    return JSONResponse({"result": result})

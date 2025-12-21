from fastapi import FastAPI, Request, Form, Depends, status
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.orm import Session
import string, random

import models
from database import engine, get_db
from auth import hash_password, verify_password, get_current_user

models.Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(SessionMiddleware, secret_key="super-secret-key")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


def generate_code(length=6):
    return "".join(random.choices(string.ascii_letters + string.digits, k=length))


@app.get("/")
def root():
    return RedirectResponse("/login")


# ---------- AUTH ----------

@app.get("/login")
def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@app.post("/login")
def login(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        return templates.TemplateResponse(
            "login.html",
            {"request": request, "error": "Invalid credentials"}
        )

    request.session["user_id"] = user.id
    return RedirectResponse("/dashboard", status_code=status.HTTP_302_FOUND)


@app.get("/register")
def register_page(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})


@app.post("/register")
def register(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    if db.query(models.User).filter(models.User.email == email).first():
        return templates.TemplateResponse(
            "register.html",
            {"request": request, "error": "User already exists"}
        )

    user = models.User(
        email=email,
        hashed_password=hash_password(password)
    )
    db.add(user)
    db.commit()

    return RedirectResponse("/login", status_code=status.HTTP_302_FOUND)


@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/login")


# ---------- DASHBOARD ----------

@app.get("/dashboard")
def dashboard(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse("/login")

    urls = db.query(models.URL).filter(models.URL.user_id == user.id).all()
    return templates.TemplateResponse(
        "dashboard.html",
        {"request": request, "urls": urls, "user": user}
    )


@app.post("/create")
def create_url(
    request: Request,
    original_url: str = Form(...),
    db: Session = Depends(get_db)
):
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse("/login")

    short_code = generate_code()
    url = models.URL(
        original_url=original_url,
        short_code=short_code,
        user_id=user.id
    )
    db.add(url)
    db.commit()

    return RedirectResponse("/dashboard", status_code=status.HTTP_302_FOUND)


# ---------- REDIRECT ----------

@app.get("/{code}")
def redirect(code: str, db: Session = Depends(get_db)):
    url = db.query(models.URL).filter(
        models.URL.short_code == code,
        models.URL.is_active == True
    ).first()

    if not url:
        return RedirectResponse("/")

    url.click_count += 1
    db.commit()
    return RedirectResponse(url.original_url)

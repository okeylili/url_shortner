import random, string
from sqlalchemy.orm import Session
import models

def generate_code(length=6):
    return "".join(random.choices(string.ascii_letters + string.digits, k=length))

def create_url(db: Session, original_url: str, user_id: int):
    code = generate_code()
    url = models.URL(
        original_url=original_url,
        short_code=code,
        user_id=user_id
    )
    db.add(url)
    db.commit()
    db.refresh(url)
    return url

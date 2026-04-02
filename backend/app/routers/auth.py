from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.db import User, Tenant
from app.auth import verify_password, create_access_token
from pydantic import BaseModel
import uuid

router = APIRouter()

class Token(BaseModel):
    access_token: str
    token_type: str

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    # For now, we expect username to be "tenant_id:username" because we are multi-tenant
    # or we expect a header for tenant_id.
    # Let's assume the user provides tenant_id in the request or we use a separate field.
    # To keep it simple for now, let's use a custom header or just split username.
    
    parts = form_data.username.split(":")
    if len(parts) != 2:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username must be in format 'tenant_id:username'",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    tenant_id_str, username = parts
    try:
        tenant_id = uuid.UUID(tenant_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Tenant ID in username",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(
        select(User).where(User.username == username).where(User.tenant_id == tenant_id)
    )
    user = result.scalar_one_or_none()
    
    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.id), "tenant_id": str(tenant_id)})
    return {"access_token": access_token, "token_type": "bearer"}

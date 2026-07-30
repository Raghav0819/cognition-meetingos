from fastapi import APIRouter, HTTPException, Depends, Request
from firebase_config import db
from auth_middleware import get_current_user_uid
from slowapi import Limiter
from slowapi.util import get_remote_address
from datetime import datetime, timezone

router = APIRouter(prefix="/companies", tags=["companies"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/lookup")
@limiter.limit("5/minute")
def lookup_invite_code(request: Request, invite_code: str, uid: str = Depends(get_current_user_uid)):
    """
    Look up a company by invite code.

    Returns only the company ID and name — never the full document.
    This replaces the client-side Firestore query that was insecure because
    Firestore rules cannot restrict which fields a list/query filters on.
    Using the Admin SDK on the backend keeps invite code lookups secure.
    """
    if not invite_code or len(invite_code.strip()) < 4:
        raise HTTPException(status_code=400, detail="Invalid invite code format")

    code = invite_code.strip().upper()

    docs = list(
        db.collection('companies')
        .where('inviteCode', '==', code)
        .limit(1)
        .stream()
    )

    if not docs:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    company_data = docs[0].to_dict()
    
    # Check if the invite code has expired
    expires_at = company_data.get('expiresAt')
    if expires_at:
        # expires_at is a DatetimeWithNanoseconds from Firestore SDK
        # We can compare it directly with datetime.now(timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="This invite code has expired")

    return {
        "companyId": docs[0].id,
        "companyName": company_data.get("name", "")
    }

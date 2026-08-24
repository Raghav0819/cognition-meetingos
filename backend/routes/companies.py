from fastapi import APIRouter, HTTPException, Depends, Request
from firebase_admin import firestore
from firebase_config import db
from auth_middleware import get_current_user_uid, get_current_company_id
from slowapi import Limiter
from slowapi.util import get_remote_address
from datetime import datetime, timezone, timedelta
import random, string

router = APIRouter(prefix="/companies", tags=["companies"])
limiter = Limiter(key_func=get_remote_address)


def _gen_invite_code():
    """Generate a 6-character uppercase alphanumeric invite code."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


def _get_user_profile(uid: str):
    """Fetch a user profile from Firestore by UID."""
    doc = db.collection('users').document(uid).get()
    if not doc.exists:
        raise HTTPException(status_code=403, detail="User profile not found")
    return doc.to_dict()


def _require_role(profile: dict, allowed_roles: list):
    """Raise 403 if the user's role is not in the allowed list."""
    if profile.get('role') not in allowed_roles:
        raise HTTPException(status_code=403, detail="You do not have permission to access this resource")


# ── Invite code lookup (existing) ──────────────────────────────────────────────

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


# ── Team list ──────────────────────────────────────────────────────────────────

@router.get("/team")
def get_company_team(
    uid: str = Depends(get_current_user_uid),
    company_id: str = Depends(get_current_company_id),
):
    """
    Returns all users belonging to the caller's company.
    Only PM and Manager roles can access this.
    """
    profile = _get_user_profile(uid)
    _require_role(profile, ['pm', 'manager'])

    users_ref = db.collection('users').where('companyId', '==', company_id).stream()

    team = []
    for doc in users_ref:
        data = doc.to_dict()
        created_at = data.get('createdAt')
        team.append({
            "uid": doc.id,
            "name": data.get("name", ""),
            "email": data.get("email", ""),
            "role": data.get("role", ""),
            "createdAt": created_at.isoformat() if hasattr(created_at, 'isoformat') else str(created_at) if created_at else None,
        })

    # Sort: PMs first, then managers, then employees; alphabetical within each group
    role_order = {'pm': 0, 'manager': 1, 'employee': 2}
    team.sort(key=lambda u: (role_order.get(u['role'], 99), u['name'].lower()))

    return team


# ── Company info ───────────────────────────────────────────────────────────────

@router.get("/info")
def get_company_info(
    uid: str = Depends(get_current_user_uid),
    company_id: str = Depends(get_current_company_id),
):
    """
    Returns company details including invite code and member count.
    Only PM and Manager roles can access this.
    """
    profile = _get_user_profile(uid)
    _require_role(profile, ['pm', 'manager'])

    company_doc = db.collection('companies').document(company_id).get()
    if not company_doc.exists:
        raise HTTPException(status_code=404, detail="Company not found")

    data = company_doc.to_dict()
    expires_at = data.get('expiresAt')

    # Count members
    members = list(db.collection('users').where('companyId', '==', company_id).stream())

    return {
        "companyId": company_id,
        "name": data.get("name", ""),
        "inviteCode": data.get("inviteCode", ""),
        "expiresAt": expires_at.isoformat() if hasattr(expires_at, 'isoformat') else str(expires_at) if expires_at else None,
        "memberCount": len(members),
    }


# ── Regenerate invite code (PM only) ──────────────────────────────────────────

@router.post("/regenerate-invite")
def regenerate_invite_code(
    uid: str = Depends(get_current_user_uid),
    company_id: str = Depends(get_current_company_id),
):
    """
    Generates a new invite code for the company.
    PM-only endpoint. The old code is immediately invalidated.
    """
    profile = _get_user_profile(uid)
    _require_role(profile, ['pm'])

    company_ref = db.collection('companies').document(company_id)
    company_doc = company_ref.get()
    if not company_doc.exists:
        raise HTTPException(status_code=404, detail="Company not found")

    new_code = _gen_invite_code()
    new_expiry = datetime.now(timezone.utc) + timedelta(days=7)

    company_ref.update({
        "inviteCode": new_code,
        "expiresAt": new_expiry,
    })

    return {
        "inviteCode": new_code,
        "expiresAt": new_expiry.isoformat(),
    }


# ── Remove Team Member ────────────────────────────────────────────────────────

@router.delete("/team/{target_uid}")
def remove_team_member(
    target_uid: str,
    uid: str = Depends(get_current_user_uid),
    company_id: str = Depends(get_current_company_id),
):
    """
    Remove a user from the company.
    PM can remove anyone except themselves.
    Manager can only remove employees.
    """
    if target_uid == uid:
        raise HTTPException(status_code=400, detail="You cannot remove yourself")

    caller_profile = _get_user_profile(uid)
    _require_role(caller_profile, ['pm', 'manager'])

    target_profile = _get_user_profile(target_uid)
    
    if target_profile.get('companyId') != company_id:
        raise HTTPException(status_code=404, detail="User not found in your company")
        
    caller_role = caller_profile.get('role')
    target_role = target_profile.get('role')

    if caller_role == 'manager' and target_role != 'employee':
        raise HTTPException(status_code=403, detail="Managers can only remove employees")
    
    if caller_role == 'pm' and target_role == 'pm':
        raise HTTPException(status_code=403, detail="PMs cannot remove other PMs")

    # Remove the user from the company by deleting the companyId field entirely.
    # Setting it to "" instead would leave the field present-but-empty, which
    # breaks the Firestore rule for re-joining (it requires the field to be
    # genuinely absent before a user can set companyId for the first time).
    db.collection('users').document(target_uid).update({
        "companyId": firestore.DELETE_FIELD
    })

    return {"message": "User removed from company successfully"}

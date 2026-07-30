from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
from firebase_config import db
from cachetools import TTLCache
import logging

security = HTTPBearer()

# Cache uid -> companyId for 5 minutes (300 seconds) to avoid hitting Firestore on every request
company_id_cache = TTLCache(maxsize=1000, ttl=300)

def get_current_user_uid(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Verifies the Firebase Auth ID Token and returns the user's UID.
    Use this dependency for endpoints that require authentication but not necessarily a company.
    """
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token['uid']
    except Exception as e:
        logging.error(f"Auth token verification failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")


def get_current_company_id(uid: str = Depends(get_current_user_uid)) -> str:
    """
    Retrieves the company ID for the authenticated user.
    Checks the cache first, then Firestore.
    Use this dependency for endpoints that require company authorization.
    """
    if uid in company_id_cache:
        return company_id_cache[uid]

    try:
        user_doc = db.collection('users').document(uid).get()
        if not user_doc.exists:
            raise HTTPException(status_code=403, detail="User profile not found")
        
        user_data = user_doc.to_dict()
        company_id = user_data.get('companyId')
        
        if not company_id:
            raise HTTPException(status_code=403, detail="User does not belong to any company")
            
        company_id_cache[uid] = company_id
        return company_id
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Failed to fetch user profile for uid {uid}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while verifying authorization")

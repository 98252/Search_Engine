import pytest
from app.core.security import get_password_hash, verify_password, create_access_token, decode_token

def test_password_hashing():
    raw = "super_secure_pass_123"
    hashed = get_password_hash(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("wrong_password", hashed) is False

def test_jwt_token_flow():
    user_id = "test-user-uuid-123"
    token = create_access_token(subject=user_id)
    assert isinstance(token, str)
    
    payload = decode_token(token)
    assert payload is not None
    assert payload.get("sub") == user_id

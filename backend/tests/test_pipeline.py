from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.database.connection import SessionLocal
from app.database.models import User
import pyotp, io

client = TestClient(app)

# 1. Login step 1
print('[1] Testing Login...')
r = client.post('/api/auth/login', json={'username': settings.ADMIN_USERNAME, 'password': settings.ADMIN_PASSWORD})
assert r.status_code == 200, f'Login failed: {r.text}'
data = r.json()
temp_token = data['temp_token']
is_setup = data['is_totp_setup']
print(f"Login successful. Requires OTP: {data['requires_otp']}, TOTP Setup: {is_setup}")

# 2. Setup or verify TOTP
if not is_setup:
    print('[2] Setting up TOTP for the first time...')
    r_qr = client.get(f'/api/auth/setup-otp?temp_token={temp_token}')
    assert r_qr.status_code == 200, f'Setup OTP failed: {r_qr.text}'
    qr_data = r_qr.json()
    secret = qr_data['secret']
    code = pyotp.TOTP(secret).now()
    r_enable = client.post('/api/auth/enable-otp', json={'temp_token': temp_token, 'secret': secret, 'otp_code': code})
    assert r_enable.status_code == 200, f'Enable OTP failed: {r_enable.text}'
    token_data = r_enable.json()
else:
    print('[2] Verifying existing TOTP...')
    db = SessionLocal()
    u = db.query(User).filter(User.username == settings.ADMIN_USERNAME).first()
    code = pyotp.TOTP(u.totp_secret).now()
    db.close()
    r_verify = client.post('/api/auth/verify-otp', json={'temp_token': temp_token, 'otp_code': code})
    assert r_verify.status_code == 200, f'Verify OTP failed: {r_verify.text}'
    token_data = r_verify.json()

jwt_token = token_data['access_token']
print('JWT Token received:', jwt_token[:25] + '...')

headers = {'Authorization': f'Bearer {jwt_token}'}

# 3. Upload evidence
print('[3] Uploading evidence file...')
test_content = b'FORENSIC EVIDENCE DUMP: Honeypot trap detected unauthorized port scan at 08:30:15 UTC.'
files = {'file': ('evidence_dump.log', io.BytesIO(test_content), 'text/plain')}
upload_res = client.post('/api/evidence/upload', headers=headers, data={'title': 'Honeypot Scan Log', 'description': 'Automated honeypot capture'}, files=files)
assert upload_res.status_code == 200, f'Upload failed: {upload_res.text}'
evidence = upload_res.json()
eid = evidence['id']
print(f"Evidence #{eid} encrypted with AES-256-GCM. SHA-256: {evidence['file_hash'][:20]}...")

# 4. Check integrity
print('[4] Checking integrity...')
verify_res = client.get(f'/api/evidence/{eid}/verify', headers=headers)
assert verify_res.status_code == 200, f'Verify failed: {verify_res.text}'
vdata = verify_res.json()
assert vdata['is_valid'] == True
print(f"Integrity verification result: {vdata['status']} - {vdata['message']}")

# 5. Download and decrypt
print('[5] Decrypting and downloading...')
dl_res = client.get(f'/api/evidence/{eid}/download', headers=headers)
assert dl_res.status_code == 200
assert dl_res.content == test_content
print('Decrypted bytes match original plaintext perfectly!')

# 6. Delete test evidence
print('[6] Cleaning up test evidence...')
del_res = client.delete(f'/api/evidence/{eid}', headers=headers)
assert del_res.status_code == 200
print('Full End-to-End Pipeline Passed 100%!')

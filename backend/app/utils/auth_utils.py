import uuid
import bcrypt

def create_uuid_session():
    return str(uuid.uuid4())

def get_password_hash(password: str) -> str:
    # On encode la string en bytes (UTF-8)
    password_bytes = password.encode('utf-8')
    # On génère le sel et on hache
    # bcrypt.hashpw gère nativement la limite de 72 octets sans planter (il tronque lui-même)
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    # On retourne une string pour le stockage en BDD
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception as e:
        print(f"Erreur vérification : {e}")
        return False
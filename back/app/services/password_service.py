import bcrypt

class PasswordService:
    def __init__(self, rounds: int = 12) -> None:
        self.rounds = rounds

    def hash_password(self, plain: str) -> str:
        password_bytes = plain.encode("utf-8")
        salt = bcrypt.gensalt(rounds=self.rounds)
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode("utf-8")

    def verify_password(self, plain: str, hashed: str) -> bool:
        password_bytes = plain.encode("utf-8")
        hashed_bytes = hashed.encode("utf-8")
        try:
            return bcrypt.checkpw(password_bytes, hashed_bytes)
        except Exception:
            return False

_password_service = PasswordService()

def get_password_service() -> PasswordService:
    return _password_service

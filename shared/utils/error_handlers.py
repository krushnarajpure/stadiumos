class ApplicationError(Exception):
    def __init__(self, message: str, status_code: int = 500, code: str = "INTERNAL_ERROR"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code

class ValidationError(ApplicationError):
    def __init__(self, message: str):
        super().__init__(message, status_code=400, code="VALIDATION_ERROR")

class AuthorizationError(ApplicationError):
    def __init__(self, message: str = "Insufficient permission scopes"):
        super().__init__(message, status_code=403, code="AUTHORIZATION_ERROR")

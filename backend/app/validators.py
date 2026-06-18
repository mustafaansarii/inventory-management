import re

from .errors import APIError

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def require_json(data) -> dict:
    if not isinstance(data, dict):
        raise APIError("Request body must be a JSON object.", 400)
    return data


def require_str(data: dict, field: str, *, required: bool = True, max_len: int | None = None):
    value = data.get(field)
    if value is None or (isinstance(value, str) and not value.strip()):
        if required:
            raise APIError(f"'{field}' is required.", 422)
        return None
    if not isinstance(value, str):
        raise APIError(f"'{field}' must be a string.", 422)
    value = value.strip()
    if max_len and len(value) > max_len:
        raise APIError(f"'{field}' must be at most {max_len} characters.", 422)
    return value


def require_number(data: dict, field: str, *, required: bool = True, minimum=None):
    value = data.get(field)
    if value is None:
        if required:
            raise APIError(f"'{field}' is required.", 422)
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise APIError(f"'{field}' must be a number.", 422)
    if minimum is not None and value < minimum:
        raise APIError(f"'{field}' must be >= {minimum}.", 422)
    return value


def require_int(data: dict, field: str, *, required: bool = True, minimum=None):
    value = require_number(data, field, required=required, minimum=minimum)
    if value is None:
        return None
    if int(value) != value:
        raise APIError(f"'{field}' must be an integer.", 422)
    return int(value)


def validate_email(value: str) -> str:
    if not EMAIL_RE.match(value):
        raise APIError("Invalid email address.", 422)
    return value

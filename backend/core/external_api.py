"""
[CONTEXT: INTEGRATIONS] - Helper genérico para consumir APIs externas con httpx.

Uso típico:
    from core.external_api import ExternalAPIClient

    client = ExternalAPIClient(
        base_url=os.getenv("MI_API_URL"),
        api_key=os.getenv("MI_API_KEY"),
        auth_type="header",          # "header" | "bearer" | "basic" | "query" | "none"
        auth_header_name="X-API-Key" # solo si auth_type == "header"
    )

    data = client.get("/usuarios", params={"page": 1})
    nuevo = client.post("/usuarios", json={"name": "Juan"})

Toda llamada lanza ExternalAPIError con status + cuerpo si la respuesta no es 2xx.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional, Tuple, Union

import httpx

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 30.0


class ExternalAPIError(Exception):
    """Error al consumir una API externa."""

    def __init__(self, message: str, status_code: Optional[int] = None, body: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.body = body

    def __str__(self) -> str:
        base = super().__str__()
        if self.status_code is not None:
            return f"[{self.status_code}] {base}"
        return base


class ExternalAPIClient:
    """Cliente httpx reutilizable para una API externa concreta."""

    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        auth_type: str = "none",
        auth_header_name: str = "X-API-Key",
        auth_query_param: str = "api_key",
        basic_username: Optional[str] = None,
        basic_password: Optional[str] = None,
        default_headers: Optional[Dict[str, str]] = None,
        timeout: float = DEFAULT_TIMEOUT,
        verify_ssl: bool = True,
    ):
        if not base_url:
            raise ValueError("base_url es requerido")

        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.auth_type = auth_type.lower()
        self.auth_header_name = auth_header_name
        self.auth_query_param = auth_query_param
        self.basic_username = basic_username
        self.basic_password = basic_password
        self.default_headers = default_headers or {}
        self.timeout = timeout
        self.verify_ssl = verify_ssl

    # ------------------------------------------------------------------
    # Construcción de auth
    # ------------------------------------------------------------------
    def _build_auth(
        self,
        extra_headers: Optional[Dict[str, str]],
        extra_params: Optional[Dict[str, Any]],
    ) -> Tuple[Dict[str, str], Dict[str, Any], Optional[httpx.BasicAuth]]:
        headers = {**self.default_headers, **(extra_headers or {})}
        params = {**(extra_params or {})}
        basic_auth: Optional[httpx.BasicAuth] = None

        if self.auth_type == "header" and self.api_key:
            headers[self.auth_header_name] = self.api_key
        elif self.auth_type == "bearer" and self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        elif self.auth_type == "query" and self.api_key:
            params[self.auth_query_param] = self.api_key
        elif self.auth_type == "basic":
            if not (self.basic_username and self.basic_password):
                raise ValueError("auth_type=basic requiere basic_username y basic_password")
            basic_auth = httpx.BasicAuth(self.basic_username, self.basic_password)
        elif self.auth_type == "none":
            pass
        else:
            raise ValueError(f"auth_type desconocido: {self.auth_type}")

        return headers, params, basic_auth

    # ------------------------------------------------------------------
    # Request principal
    # ------------------------------------------------------------------
    def request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        json: Optional[Any] = None,
        data: Optional[Any] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: Optional[float] = None,
    ) -> Union[Dict[str, Any], list, str]:
        url = path if path.startswith("http") else f"{self.base_url}/{path.lstrip('/')}"
        merged_headers, merged_params, basic_auth = self._build_auth(headers, params)

        try:
            with httpx.Client(timeout=timeout or self.timeout, verify=self.verify_ssl) as c:
                response = c.request(
                    method.upper(),
                    url,
                    params=merged_params or None,
                    json=json,
                    data=data,
                    headers=merged_headers or None,
                    auth=basic_auth,
                )
        except httpx.TimeoutException as e:
            raise ExternalAPIError(f"Timeout llamando a {url}: {e}") from e
        except httpx.RequestError as e:
            raise ExternalAPIError(f"Error de red llamando a {url}: {e}") from e

        return self._parse_response(response, url)

    def _parse_response(self, response: httpx.Response, url: str) -> Union[Dict[str, Any], list, str]:
        try:
            body: Any = response.json()
        except ValueError:
            body = response.text

        if not response.is_success:
            logger.warning("API externa %s respondió %s: %s", url, response.status_code, body)
            raise ExternalAPIError(
                f"Respuesta no exitosa de {url}",
                status_code=response.status_code,
                body=body,
            )
        return body

    # ------------------------------------------------------------------
    # Atajos por verbo
    # ------------------------------------------------------------------
    def get(self, path: str, **kwargs):
        return self.request("GET", path, **kwargs)

    def post(self, path: str, **kwargs):
        return self.request("POST", path, **kwargs)

    def put(self, path: str, **kwargs):
        return self.request("PUT", path, **kwargs)

    def patch(self, path: str, **kwargs):
        return self.request("PATCH", path, **kwargs)

    def delete(self, path: str, **kwargs):
        return self.request("DELETE", path, **kwargs)

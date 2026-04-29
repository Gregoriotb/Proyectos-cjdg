/**
 * Helper para extraer mensajes de error de respuestas axios.
 *
 * El backend FastAPI puede devolver `detail` como string o como dict
 * (ej: PROFILE_INCOMPLETE → {code, message, missing_fields}).
 * Si renderizamos el dict directamente en JSX, React revienta con error #31
 * "Objects are not valid as a React child".
 *
 * Uso:
 *   setError(formatApiError(err, 'Mensaje de fallback'));
 */

const FIELD_LABELS: Record<string, string> = {
  full_name: 'Nombre completo',
  email: 'Email',
  phone: 'Teléfono',
  account_type: 'Tipo de cuenta',
  company_name: 'Nombre de empresa',
  fiscal_address: 'Dirección fiscal',
  rif: 'RIF',
};

export function formatApiError(err: any, fallback = 'Ocurrió un error inesperado'): string {
  const detail = err?.response?.data?.detail;
  if (!detail) return err?.message || fallback;

  if (typeof detail === 'string') return detail;

  if (typeof detail === 'object') {
    // Caso PROFILE_INCOMPLETE / DELETION_NOT_ALLOWED / etc.
    const message = typeof detail.message === 'string' ? detail.message : null;
    const missing: string[] = Array.isArray(detail.missing_fields) ? detail.missing_fields : [];
    if (message && missing.length > 0) {
      const labels = missing.map((f) => FIELD_LABELS[f] || f).join(', ');
      return `${message} Faltan: ${labels}.`;
    }
    if (message) return message;
    // Si Pydantic validation error: lista de objetos
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((d: any) => d?.msg || d?.message).filter(Boolean).join('; ') || fallback;
    }
  }

  return fallback;
}

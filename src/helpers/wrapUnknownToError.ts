export function wrapUnknownToError(errorToWrap: unknown): Error {
  if (errorToWrap instanceof Error) {
    return errorToWrap;
  }

  if (errorToWrap instanceof Object && 'message' in (errorToWrap as object)) {
    return new Error(String((errorToWrap as { message: unknown }).message), { cause: errorToWrap });
  }

  return new Error(String(errorToWrap), { cause: errorToWrap });
}

export interface ApiError extends Error {
  statusCode?: number;
}

export default function errorHandlingMiddlware(
  err: ApiError,
  req: any,
  res: any,
  next: any
) {
  return res.status(err.statusCode).json({ message: err.message });
}

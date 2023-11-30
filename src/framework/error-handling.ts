export interface ApiError extends Error {
  statusCode?: number;
}

export default function errorHandlingMiddlware(
	err: ApiError,
	req: any,
	res: any,
	next: any,
) {
	if (!err.statusCode) {
		if (err.message.toLowerCase().includes('not found')) {
			err.statusCode = 404;
		} else if (err.message.toLowerCase().includes('don\'t have permission')) {
			err.statusCode = 403;
		} else {
			err.statusCode = 400;
		}
	}

	return res.status(err.statusCode).json({ message: err.message });
}

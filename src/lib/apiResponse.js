import { NextResponse } from "next/server";

/**
 * Standard success response helper for API routes.
 * 
 * Supports both signatures:
 *   success(data, status)
 *   success(data, message, status)
 * 
 * @param {any} [data=null] - Payload to return in the 'data' field.
 * @param {number|string} [statusOrMessage=200] - HTTP status code (number) or custom message (string).
 * @param {number} [customStatus=200] - HTTP status code if second argument was a message string.
 * @returns {NextResponse}
 */
export function success(data = null, statusOrMessage = 200, customStatus = 200) {
  let message = "Request successful";
  let status = 200;

  if (typeof statusOrMessage === "number") {
    status = statusOrMessage;
  } else if (typeof statusOrMessage === "string") {
    message = statusOrMessage;
    if (typeof customStatus === "number") {
      status = customStatus;
    }
  }

  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status }
  );
}

/**
 * Standard failure response helper for API routes.
 * 
 * @param {string} [message="An unexpected error occurred"] - User-safe error description.
 * @param {number} [status=500] - HTTP status code (e.g. 400, 401, 403, 404, 500).
 * @param {any} [details=null] - Optional structured validation errors or error details (never stack traces in production).
 * @returns {NextResponse}
 */
export function failure(message = "An unexpected error occurred", status = 500, details = null) {
  const safeMessage = typeof message === "string" ? message : "An error occurred";
  const responseBody = {
    success: false,
    message: safeMessage,
  };

  if (details !== null && details !== undefined) {
    responseBody.details = details;
  }

  return NextResponse.json(responseBody, { status });
}

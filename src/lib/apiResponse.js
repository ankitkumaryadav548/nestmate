import { NextResponse } from "next/server";

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

import { NextResponse } from "next/server";

export function ok<T>(data: T) {
  return NextResponse.json({ success: true, data });
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status },
  );
}

export type ServiceErrorLike = {
  code: string;
  message: string;
  name?: string;
};

export function isServiceErrorLike(
  error: unknown,
  expectedName?: string,
): error is ServiceErrorLike {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    name?: unknown;
  };

  if (
    typeof candidate.code !== "string" ||
    typeof candidate.message !== "string"
  ) {
    return false;
  }

  return expectedName ? candidate.name === expectedName : true;
}


import axios from "axios";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const api = axios.create({
  baseURL: configuredApiUrl
    ? configuredApiUrl.replace(/\/+$/, "")
    : "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const apiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }

  return error instanceof Error ? error.message : fallback;
};

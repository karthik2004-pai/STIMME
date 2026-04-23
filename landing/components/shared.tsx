"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

// Toast types
interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });
export const useToast = () => useContext(ToastContext);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-5 py-3 rounded-xl text-sm font-medium backdrop-blur-xl border animate-fade-up ${
              t.type === "success"
                ? "bg-green-500/10 border-green-500/20 text-green-400"
                : t.type === "error"
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-white/5 border-white/10 text-apple-white"
            }`}
          >
            {t.type === "success" ? "✓ " : t.type === "error" ? "✕ " : "ℹ "}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// API base
const API = "";

// API helper
export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API}${path}`, options);
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export async function apiPost(
  path: string,
  body: FormData | string,
  isJson = false
) {
  const headers: Record<string, string> = {};
  if (isJson) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers,
    body,
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

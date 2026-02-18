const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Returns the configured API base URL.
 * Uses REACT_APP_API_BASE if available, otherwise falls back to REACT_APP_BACKEND_URL.
 */
function getApiBaseUrl() {
  return (
    process.env.REACT_APP_API_BASE ||
    process.env.REACT_APP_BACKEND_URL ||
    "http://localhost:3001"
  );
}

/**
 * Basic fetch wrapper with timeout and JSON parsing.
 * Throws an Error with a friendly message for UI display.
 */
async function request(path, { method = "GET", body, signal } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: signal ?? controller.signal
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await res.json().catch(() => null) : await res.text();

    if (!res.ok) {
      const message =
        (payload && payload.detail && String(payload.detail)) ||
        (typeof payload === "string" && payload) ||
        `Request failed (${res.status})`;
      throw new Error(message);
    }

    return payload;
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Notes API wrapper.
 * IMPORTANT: The downloaded OpenAPI spec only advertises a root health endpoint today.
 * This client targets the expected notes endpoints for this project; if backend routes differ,
 * adjust paths here only.
 */
export const notesApi = {
  // PUBLIC_INTERFACE
  async health() {
    /** Check backend availability. */
    return request("/", { method: "GET" });
  },

  // PUBLIC_INTERFACE
  async listNotes({ q, tag, pinned, favorite } = {}) {
    /** List/search notes. */
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tag) params.set("tag", tag);
    if (typeof pinned === "boolean") params.set("pinned", String(pinned));
    if (typeof favorite === "boolean") params.set("favorite", String(favorite));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request(`/notes${qs}`, { method: "GET" });
  },

  // PUBLIC_INTERFACE
  async createNote({ title, content, tags = [], pinned = false, favorite = false }) {
    /** Create a note. */
    return request("/notes", {
      method: "POST",
      body: { title, content, tags, pinned, favorite }
    });
  },

  // PUBLIC_INTERFACE
  async updateNote(id, { title, content, tags, pinned, favorite }) {
    /** Update a note by id. */
    return request(`/notes/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: { title, content, tags, pinned, favorite }
    });
  },

  // PUBLIC_INTERFACE
  async deleteNote(id) {
    /** Delete a note by id. */
    return request(`/notes/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  // PUBLIC_INTERFACE
  async togglePinned(id, pinned) {
    /** Toggle pinned flag. */
    return request(`/notes/${encodeURIComponent(id)}/pin`, {
      method: "POST",
      body: { pinned }
    });
  },

  // PUBLIC_INTERFACE
  async toggleFavorite(id, favorite) {
    /** Toggle favorite flag. */
    return request(`/notes/${encodeURIComponent(id)}/favorite`, {
      method: "POST",
      body: { favorite }
    });
  }
};

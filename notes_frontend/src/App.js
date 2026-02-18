import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { notesApi } from "./api/notesApi";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { Sidebar } from "./components/Sidebar";
import { NoteCard } from "./components/NoteCard";
import { NoteModal } from "./components/NoteModal";

/**
 * Normalize possible backend note shapes into the UI shape this app expects.
 * Supports both snake_case and camelCase keys.
 */
function normalizeNote(n) {
  if (!n) return null;
  return {
    id: n.id ?? n.note_id ?? n.noteId,
    title: n.title ?? "",
    content: n.content ?? n.body ?? "",
    tags: Array.isArray(n.tags) ? n.tags : [],
    pinned: Boolean(n.pinned ?? n.is_pinned ?? n.isPinned),
    favorite: Boolean(n.favorite ?? n.is_favorite ?? n.isFavorite),
    created_at: n.created_at ?? n.createdAt,
    updated_at: n.updated_at ?? n.updatedAt
  };
}

/**
 * Ensure list response is always an array.
 * Some APIs wrap: {items: [...]}.
 */
function normalizeList(payload) {
  if (Array.isArray(payload)) return payload.map(normalizeNote).filter(Boolean);
  if (payload && Array.isArray(payload.items)) return payload.items.map(normalizeNote).filter(Boolean);
  if (payload && Array.isArray(payload.notes)) return payload.notes.map(normalizeNote).filter(Boolean);
  return [];
}

// PUBLIC_INTERFACE
function App() {
  /** Main Notes app UI. */
  const [theme, setTheme] = useState("light");

  const [notes, setNotes] = useState([]);
  const [selectedTag, setSelectedTag] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);

  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' | 'edit'
  const [activeNote, setActiveNote] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [mutatingIds, setMutatingIds] = useState(() => new Set());

  const abortRef = useRef(null);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function setMutating(id, on) {
    setMutatingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function loadNotes() {
    setIsLoading(true);
    setGlobalError("");

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const payload = await notesApi.listNotes({
        q: debouncedSearch || undefined,
        tag: selectedTag || undefined,
        pinned: showPinnedOnly ? true : undefined,
        favorite: showFavoritesOnly ? true : undefined
      });
      setNotes(normalizeList(payload));
    } catch (e) {
      setGlobalError(e?.message || "Failed to load notes.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, selectedTag, showPinnedOnly, showFavoritesOnly]);

  const filteredNotes = useMemo(() => {
    // If backend already filtered, this is mostly pass-through; still useful if backend ignores query params.
    let out = [...notes];

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      out = out.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          (n.tags || []).some((t) => String(t).toLowerCase().includes(q))
      );
    }
    if (selectedTag) out = out.filter((n) => (n.tags || []).includes(selectedTag));
    if (showPinnedOnly) out = out.filter((n) => n.pinned);
    if (showFavoritesOnly) out = out.filter((n) => n.favorite);

    // Retro UX: show pinned first, then favorites, then most recently updated/created
    out.sort((a, b) => {
      const ap = a.pinned ? 1 : 0;
      const bp = b.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;

      const af = a.favorite ? 1 : 0;
      const bf = b.favorite ? 1 : 0;
      if (af !== bf) return bf - af;

      const ad = new Date(a.updated_at || a.created_at || 0).getTime();
      const bd = new Date(b.updated_at || b.created_at || 0).getTime();
      return bd - ad;
    });

    return out;
  }, [notes, debouncedSearch, selectedTag, showPinnedOnly, showFavoritesOnly]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    /** Switch between light/dark theme. */
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  function openCreate() {
    setModalMode("create");
    setActiveNote(null);
    setIsModalOpen(true);
  }

  function openEdit(note) {
    setModalMode("edit");
    setActiveNote(note);
    setIsModalOpen(true);
  }

  async function handleModalSubmit(payload) {
    setIsSaving(true);
    setGlobalError("");

    try {
      if (modalMode === "create") {
        const created = await notesApi.createNote(payload);
        const createdNote = normalizeNote(created) || normalizeNote(payload);
        // optimistic insert; then refresh to reconcile server ids/timestamps
        setNotes((prev) => [createdNote, ...prev].filter((n) => n && n.id !== undefined));
      } else if (modalMode === "edit" && activeNote?.id != null) {
        const updated = await notesApi.updateNote(activeNote.id, payload);
        const updatedNote = normalizeNote(updated) || { ...activeNote, ...payload };
        setNotes((prev) => prev.map((n) => (n.id === activeNote.id ? updatedNote : n)));
      }

      setIsModalOpen(false);
      setActiveNote(null);

      // Refresh list to ensure accurate server state
      await loadNotes();
    } catch (e) {
      setGlobalError(e?.message || "Save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(note) {
    if (!note?.id && note?.id !== 0) return;
    const ok = window.confirm(`Delete "${note.title}"? This cannot be undone.`);
    if (!ok) return;

    setMutating(note.id, true);
    setGlobalError("");

    try {
      await notesApi.deleteNote(note.id);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
    } catch (e) {
      setGlobalError(e?.message || "Delete failed.");
    } finally {
      setMutating(note.id, false);
    }
  }

  async function handleTogglePinned(note) {
    if (!note?.id && note?.id !== 0) return;

    setMutating(note.id, true);
    setGlobalError("");

    const nextPinned = !note.pinned;
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, pinned: nextPinned } : n)));

    try {
      await notesApi.togglePinned(note.id, nextPinned);
    } catch (e) {
      // rollback
      setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, pinned: !nextPinned } : n)));
      setGlobalError(e?.message || "Pin update failed.");
    } finally {
      setMutating(note.id, false);
    }
  }

  async function handleToggleFavorite(note) {
    if (!note?.id && note?.id !== 0) return;

    setMutating(note.id, true);
    setGlobalError("");

    const nextFavorite = !note.favorite;
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, favorite: nextFavorite } : n)));

    try {
      await notesApi.toggleFavorite(note.id, nextFavorite);
    } catch (e) {
      // rollback
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, favorite: !nextFavorite } : n))
      );
      setGlobalError(e?.message || "Favorite update failed.");
    } finally {
      setMutating(note.id, false);
    }
  }

  return (
    <div className="App">
      <div className="appFrame">
        <header className="topbar">
          <div className="brand">
            <div className="brandMark" aria-hidden="true">
              ▣
            </div>
            <div className="brandText">
              <div className="brandName">Retro Notes</div>
              <div className="brandTagline">Neon sticky notes for your brainwaves</div>
            </div>
          </div>

          <div className="topbarActions">
            <div className="searchBox">
              <span className="searchIcon" aria-hidden="true">
                ⌕
              </span>
              <input
                className="searchInput"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes, text, tags..."
                aria-label="Search notes"
              />
            </div>

            <button className="btn btnPrimary" onClick={openCreate}>
              + New
            </button>

            <button
              className="btn btnGhost"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? "Dark" : "Light"}
            </button>
          </div>
        </header>

        <div className="content">
          <Sidebar
            notes={notes}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
            showPinnedOnly={showPinnedOnly}
            setShowPinnedOnly={setShowPinnedOnly}
            showFavoritesOnly={showFavoritesOnly}
            setShowFavoritesOnly={setShowFavoritesOnly}
          />

          <main className="main" aria-label="Notes">
            {globalError ? (
              <div className="alert alertError" role="alert">
                <div className="alertTitle">Uh-oh!</div>
                <div className="alertBody">{globalError}</div>
                <div className="alertActions">
                  <button className="btn btnGhost" onClick={loadNotes}>
                    Retry
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mainHeader">
              <div className="mainHeaderLeft">
                <div className="sectionTitle">Notes</div>
                <div className="sectionSubtitle">
                  {isLoading ? "Loading..." : `${filteredNotes.length} shown`}
                  {selectedTag ? ` • tag: #${selectedTag}` : ""}
                  {showPinnedOnly ? " • pinned" : ""}
                  {showFavoritesOnly ? " • favorites" : ""}
                </div>
              </div>

              <div className="mainHeaderRight">
                <button className="btn btnGhost" onClick={loadNotes} disabled={isLoading}>
                  Refresh
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div className="skeletonCard" key={i} aria-hidden="true">
                    <div className="skLine skTitle" />
                    <div className="skLine" />
                    <div className="skLine" />
                    <div className="skLine skShort" />
                    <div className="skChips">
                      <span className="skChip" />
                      <span className="skChip" />
                      <span className="skChip" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="emptyState">
                <div className="emptyTitle">No notes found</div>
                <div className="emptyBody">
                  {search.trim() || selectedTag || showPinnedOnly || showFavoritesOnly
                    ? "Try clearing filters or changing your search."
                    : "Create your first note and start collecting ideas."}
                </div>
                <div className="emptyActions">
                  <button className="btn btnPrimary" onClick={openCreate}>
                    + New note
                  </button>
                  <button
                    className="btn btnGhost"
                    onClick={() => {
                      setSearch("");
                      setSelectedTag("");
                      setShowPinnedOnly(false);
                      setShowFavoritesOnly(false);
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid">
                {filteredNotes.map((n) => (
                  <NoteCard
                    key={n.id ?? `${n.title}-${n.created_at ?? ""}`}
                    note={n}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onTogglePinned={handleTogglePinned}
                    onToggleFavorite={handleToggleFavorite}
                    isMutating={n.id != null ? mutatingIds.has(n.id) : false}
                  />
                ))}
              </div>
            )}
          </main>
        </div>

        <footer className="footer">
          <span className="footerText">
            API: <code className="mono">{process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL}</code>
          </span>
          <span className="footerTextDim">•</span>
          <span className="footerTextDim">No login • All vibes</span>
        </footer>
      </div>

      <NoteModal
        isOpen={isModalOpen}
        mode={modalMode}
        initialNote={activeNote}
        onClose={() => {
          if (isSaving) return;
          setIsModalOpen(false);
          setActiveNote(null);
        }}
        onSubmit={handleModalSubmit}
        isSaving={isSaving}
      />
    </div>
  );
}

export default App;

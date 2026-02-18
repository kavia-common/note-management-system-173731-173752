import React, { useEffect, useMemo, useState } from "react";

/**
 * Parse a comma-separated tag string into normalized unique tags.
 */
function parseTags(input) {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.replace(/\s+/g, " "))
    .reduce((acc, t) => (acc.includes(t) ? acc : [...acc, t]), []);
}

// PUBLIC_INTERFACE
export function NoteModal({ isOpen, mode, initialNote, onClose, onSubmit, isSaving }) {
  /** Modal for creating or editing a note. */
  const isEdit = mode === "edit";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [pinned, setPinned] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTouched(false);

    if (initialNote) {
      setTitle(initialNote.title || "");
      setContent(initialNote.content || "");
      setPinned(Boolean(initialNote.pinned));
      setFavorite(Boolean(initialNote.favorite));
      setTagsText((initialNote.tags || []).join(", "));
    } else {
      setTitle("");
      setContent("");
      setPinned(false);
      setFavorite(false);
      setTagsText("");
    }
  }, [isOpen, initialNote]);

  const tags = useMemo(() => parseTags(tagsText), [tagsText]);

  const titleError = touched && title.trim().length === 0 ? "Title is required." : "";
  const contentError = touched && content.trim().length === 0 ? "Note text is required." : "";
  const canSubmit = !isSaving && !titleError && !contentError;

  if (!isOpen) return null;

  return (
    <div className="modalOverlay" role="presentation" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit note" : "Create note"}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div className="modalTitle">{isEdit ? "Edit Note" : "New Note"}</div>
          <button className="iconBtn" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        <div className="modalBody">
          <label className="field">
            <div className="fieldLabel">Title</div>
            <input
              className={`input ${titleError ? "inputError" : ""}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="e.g. Call the arcade repair shop"
              maxLength={120}
            />
            {titleError ? <div className="fieldError">{titleError}</div> : null}
          </label>

          <label className="field">
            <div className="fieldLabel">Note</div>
            <textarea
              className={`textarea ${contentError ? "inputError" : ""}`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Write something rad..."
              rows={8}
              maxLength={5000}
            />
            {contentError ? <div className="fieldError">{contentError}</div> : null}
          </label>

          <label className="field">
            <div className="fieldLabel">Tags (comma-separated)</div>
            <input
              className="input"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="retro, todo, idea"
            />
            <div className="tagPreview">
              {tags.length ? (
                tags.map((t) => (
                  <span key={t} className="chip chipTag">
                    #{t}
                  </span>
                ))
              ) : (
                <span className="hintText">No tags yet</span>
              )}
            </div>
          </label>

          <div className="toggleRow">
            <label className="toggle">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
              />
              <span>Pin</span>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={favorite}
                onChange={(e) => setFavorite(e.target.checked)}
              />
              <span>Favorite</span>
            </label>
          </div>
        </div>

        <div className="modalFooter">
          <button className="btn btnGhost" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button
            className="btn btnPrimary"
            onClick={() => {
              setTouched(true);
              if (!canSubmit) return;
              onSubmit({
                title: title.trim(),
                content: content.trim(),
                tags,
                pinned,
                favorite
              });
            }}
            disabled={!canSubmit}
          >
            {isSaving ? "Saving..." : isEdit ? "Save changes" : "Create note"}
          </button>
        </div>
      </div>
    </div>
  );
}

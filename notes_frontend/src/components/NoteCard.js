import React from "react";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

// PUBLIC_INTERFACE
export function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePinned,
  onToggleFavorite,
  isMutating
}) {
  /** Displays a note with actions. */
  return (
    <article className={`noteCard ${note.pinned ? "noteCardPinned" : ""}`}>
      <header className="noteCardHeader">
        <div className="noteCardTitleRow">
          <h3 className="noteCardTitle" title={note.title}>
            {note.title}
          </h3>
          <div className="noteBadges">
            {note.pinned ? <span className="badge badgePin">PINNED</span> : null}
            {note.favorite ? <span className="badge badgeFav">FAVE</span> : null}
          </div>
        </div>

        <div className="noteCardMeta">
          {note.updated_at || note.created_at ? (
            <span className="metaText">
              {note.updated_at ? `Updated ${formatDate(note.updated_at)}` : `Created ${formatDate(note.created_at)}`}
            </span>
          ) : (
            <span className="metaText metaTextDim">—</span>
          )}
        </div>
      </header>

      <div className="noteCardBody">
        <p className="noteCardContent">{note.content}</p>
      </div>

      <footer className="noteCardFooter">
        <div className="noteTags">
          {(note.tags || []).slice(0, 6).map((t) => (
            <span key={t} className="chip chipTag">
              #{t}
            </span>
          ))}
          {(note.tags || []).length > 6 ? (
            <span className="chip chipMore">+{(note.tags || []).length - 6}</span>
          ) : null}
        </div>

        <div className="noteActions">
          <button
            className="iconBtn"
            onClick={() => onTogglePinned(note)}
            disabled={isMutating}
            aria-label={note.pinned ? "Unpin note" : "Pin note"}
            title={note.pinned ? "Unpin" : "Pin"}
          >
            📌
          </button>
          <button
            className="iconBtn"
            onClick={() => onToggleFavorite(note)}
            disabled={isMutating}
            aria-label={note.favorite ? "Unfavorite note" : "Favorite note"}
            title={note.favorite ? "Unfavorite" : "Favorite"}
          >
            ★
          </button>
          <button
            className="iconBtn"
            onClick={() => onEdit(note)}
            disabled={isMutating}
            aria-label="Edit note"
            title="Edit"
          >
            ✎
          </button>
          <button
            className="iconBtn danger"
            onClick={() => onDelete(note)}
            disabled={isMutating}
            aria-label="Delete note"
            title="Delete"
          >
            🗑
          </button>
        </div>
      </footer>
    </article>
  );
}

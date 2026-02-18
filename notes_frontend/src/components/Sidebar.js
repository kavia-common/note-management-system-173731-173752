import React, { useMemo } from "react";

function uniqueSortedTags(notes) {
  const set = new Set();
  (notes || []).forEach((n) => (n.tags || []).forEach((t) => set.add(t)));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

// PUBLIC_INTERFACE
export function Sidebar({
  notes,
  selectedTag,
  onSelectTag,
  showPinnedOnly,
  setShowPinnedOnly,
  showFavoritesOnly,
  setShowFavoritesOnly
}) {
  /** Sidebar for filters and tag list. */
  const tags = useMemo(() => uniqueSortedTags(notes), [notes]);

  return (
    <aside className="sidebar" aria-label="Filters and tags">
      <div className="sidebarSection">
        <div className="sidebarTitle">Filters</div>

        <label className="toggle sidebarToggle">
          <input
            type="checkbox"
            checked={showPinnedOnly}
            onChange={(e) => setShowPinnedOnly(e.target.checked)}
          />
          <span>Pinned only</span>
        </label>

        <label className="toggle sidebarToggle">
          <input
            type="checkbox"
            checked={showFavoritesOnly}
            onChange={(e) => setShowFavoritesOnly(e.target.checked)}
          />
          <span>Favorites only</span>
        </label>
      </div>

      <div className="sidebarSection">
        <div className="sidebarTitle">Tags</div>

        <button
          className={`tagBtn ${!selectedTag ? "tagBtnActive" : ""}`}
          onClick={() => onSelectTag("")}
        >
          All notes
        </button>

        {tags.length ? (
          tags.map((t) => (
            <button
              key={t}
              className={`tagBtn ${selectedTag === t ? "tagBtnActive" : ""}`}
              onClick={() => onSelectTag(t)}
            >
              #{t}
            </button>
          ))
        ) : (
          <div className="hintText">No tags yet</div>
        )}
      </div>
    </aside>
  );
}

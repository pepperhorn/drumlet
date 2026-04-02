import { memo } from 'react';

function PageTabs({
  pages,
  currentPageIndex,
  stepsPerPage,
  chainMode,
  onSetPage,
  onAddPage,
  onRemovePage,
  onSetStepsPerPage,
  onToggleChainMode,
  onClearPage,
}) {
  return (
    <div className="page-tabs flex items-center gap-3 bg-card rounded-2xl shadow-sm border border-border px-4 py-2.5">
      {/* Page tabs */}
      <div className="page-tab-list flex items-center gap-1">
        {pages.map((page, i) => (
          <button
            key={page.id}
            className={`page-tab px-3 py-1 rounded-lg text-sm lg:text-base font-medium cursor-pointer transition-all
              ${i === currentPageIndex
                ? 'bg-sky text-white shadow-sm'
                : 'bg-gray-50 text-muted hover:bg-gray-100 hover:text-text'
              }`}
            onClick={() => onSetPage(i)}
            onContextMenu={(e) => {
              e.preventDefault();
              if (pages.length > 1) onRemovePage(i);
            }}
            title={`${page.name}${pages.length > 1 ? ' (right-click to remove)' : ''}`}
          >
            {page.name}
          </button>
        ))}
        <button
          className="page-add-btn w-7 h-7 rounded-lg bg-gray-50 text-muted hover:bg-gray-100 hover:text-text text-sm cursor-pointer transition-colors flex items-center justify-center"
          onClick={onAddPage}
          title="Add page"
        >
          +
        </button>
      </div>

      <div className="page-divider w-px h-6 bg-border" />

      {/* Steps per page */}
      <div className="steps-selector flex items-center gap-1">
        <span className="text-[10px] lg:text-xs text-muted font-semibold uppercase tracking-wide mr-1">Steps</span>
        {[16, 24, 32].map((n) => (
          <button
            key={n}
            className={`steps-option px-2 py-0.5 rounded text-xs lg:text-sm font-mono cursor-pointer transition-colors
              ${stepsPerPage === n
                ? 'bg-sky/10 text-sky font-bold'
                : 'text-muted hover:text-text'
              }`}
            onClick={() => onSetStepsPerPage(n)}
          >
            {n}
          </button>
        ))}
      </div>


      <div className="page-divider w-px h-6 bg-border" />

      {/* Chain mode */}
      <button
        className={`chain-mode-btn px-3 py-1 rounded-lg text-xs lg:text-sm font-semibold cursor-pointer transition-all
          ${chainMode
            ? 'bg-amber/15 text-amber border border-amber/30'
            : 'bg-gray-50 text-muted hover:bg-gray-100'
          }`}
        onClick={onToggleChainMode}
        title={chainMode ? 'Chain: plays pages in order' : 'Loop: repeats current page'}
      >
        {chainMode ? 'Chain' : 'Loop'}
      </button>

      {/* Clear page */}
      <button
        className="clear-page-btn px-3 py-1 rounded-lg text-xs text-muted bg-gray-50 hover:bg-red-50 hover:text-stop cursor-pointer transition-colors"
        onClick={onClearPage}
        title="Clear all steps on this page"
      >
        Clear
      </button>
    </div>
  );
}

export default memo(PageTabs);

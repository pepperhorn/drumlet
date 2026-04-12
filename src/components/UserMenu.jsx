import { memo, useEffect, useRef } from 'react';

function UserMenu({ isOpen, onClose, user, onSignOut }) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  return (
    <div
      ref={menuRef}
      className="user-menu absolute top-full right-0 mt-2 bg-card rounded-xl shadow-lg border border-border p-3 min-w-[200px] z-50"
    >
      <div className="user-menu-info mb-3">
        <p className="user-menu-handle text-sm font-display font-bold text-text">
          {user.user_handle}
        </p>
        <p className="user-menu-email text-xs text-muted font-mono truncate">
          {user.email}
        </p>
        {(user.first_name || user.last_name) && (
          <p className="user-menu-name text-xs text-muted mt-0.5">
            {[user.first_name, user.last_name].filter(Boolean).join(' ')}
          </p>
        )}
      </div>
      <div className="user-menu-divider border-t border-border mb-2" />
      <button
        className="user-menu-signout w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium text-muted hover:bg-gray-100 hover:text-text cursor-pointer transition-colors"
        onClick={() => { onSignOut(); onClose(); }}
      >
        Sign out
      </button>
    </div>
  );
}

export default memo(UserMenu);

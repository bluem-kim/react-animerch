import React, { useEffect, useRef, useState } from 'react';

// Hook: detect outside click
function useClickOutside(onClose) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);
  return ref;
}

// Generic Dropdown component
// Props: label (string), items [{label,value}], value, onChange(value)
export default function Dropdown({ label, items = [], value, onChange, buttonClass = '', menuClass = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const activeItem = items.find(i => i.value === value);
  return (
    <div ref={ref} className="relative inline-block text-left w-full">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex w-full items-center justify-between rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 focus:outline-none ${buttonClass}`}
      >
        <span className="truncate">{activeItem ? activeItem.label : label}</span>
        <svg width={18} height={18} viewBox="0 0 20 20" fill="currentColor" className={`ml-2 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.27a.75.75 0 0 1 .02-1.06z" />
        </svg>
      </button>
      <div
        className={`absolute left-0 right-0 z-40 mt-2 origin-top rounded-md bg-indigo-600 py-1 shadow-lg ring-1 ring-black/5 transition-all ${open ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'} ${menuClass}`}
      >
        {items.map(it => (
          <button
            type="button"
            key={it.value}
            onClick={() => { onChange(it.value); setOpen(false); }}
            className={`block w-full px-4 py-2 text-left text-sm text-white/80 hover:bg-indigo-500 hover:text-white ${value === it.value ? 'bg-indigo-500 text-white' : ''}`}
          >
            {it.label}
          </button>
        ))}
        {!items.length && (
          <div className="px-4 py-2 text-sm text-white/60">No options</div>
        )}
      </div>
    </div>
  );
}

export default function TGSelect({ value, onChange, children, className = '', ...props }) {
  return (
    <div className={`tg-select relative inline-block ${className}`}>
      <select
        value={value}
        onChange={onChange}
        style={{ backgroundImage: 'none' }}
        className="w-full appearance-none rounded-md border px-3 py-2 pr-8 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-500 dark:text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9.75L12 13.5l3.75-3.75" />
        </svg>
      </span>
    </div>
  );
}

// Sample HyperUI-inspired product card converted to React JSX
export default function HyperUICard() {
  return (
    <div className="max-w-sm rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="p-4">
        <span className="inline-block rounded bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">New</span>
        <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">Sample Product</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">A short description showing Tailwind utilities working.</p>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-base font-semibold text-gray-900 dark:text-white">$29.00</p>
          <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 1 0 6 0m-6 0h6m-6 0H4.772a2.25 2.25 0 0 1-2.205-1.803L2.25 3m5.25 11.25 1.5-8.25h6.428a1.125 1.125 0 0 1 1.1.892l1.17 5.388a2.25 2.25 0 0 1-2.205 2.77H13.5m-6 0 1.5-8.25M9 21h6" />
            </svg>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const TGAlertContext = createContext(null);

export function TGAlertProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [resolver, setResolver] = useState(null);

  const close = useCallback((result) => {
    setDialog(null);
    if (resolver) {
      resolver(result);
      setResolver(null);
    }
  }, [resolver]);

  const show = useCallback((options) => {
    return new Promise((resolve) => {
      setResolver(() => resolve);
      setDialog({
        title: options.title ?? 'localhost says',
        message: options.message ?? '',
        variant: options.variant ?? 'info',
        confirmText: options.confirmText ?? 'OK',
        cancelText: options.cancelText ?? 'Cancel',
        mode: options.mode ?? 'alert', // 'alert' | 'confirm'
      });
    });
  }, []);

  const api = useMemo(() => ({
    alert: (message, opts = {}) => show({ ...opts, message, mode: 'alert' }).then(() => true),
    confirm: (message, opts = {}) => show({ ...opts, message, mode: 'confirm' }),
  }), [show]);

  return (
    <TGAlertContext.Provider value={api}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => close(false)} />
          <div className="relative mx-4 w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-start gap-3">
              <div className={
                `mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-white ${
                  dialog.variant === 'success' ? 'bg-emerald-500' : dialog.variant === 'danger' ? 'bg-rose-500' : dialog.variant === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'
                }`
              }>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.007M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{dialog.title}</div>
                <div className="mt-1 text-sm text-gray-800 dark:text-gray-100">{dialog.message}</div>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              {dialog.mode === 'confirm' && (
                <button type="button" onClick={() => close(false)} className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                  {dialog.cancelText}
                </button>
              )}
              <button type="button" onClick={() => close(true)} className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400">
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </TGAlertContext.Provider>
  );
}

export function useTGAlert() {
  const ctx = useContext(TGAlertContext);
  if (!ctx) throw new Error('useTGAlert must be used within TGAlertProvider');
  return ctx;
}

/**
 * LoadingFallback Component
 *
 * Displays loading state for lazy-loaded components
 * Used with React.Suspense for code splitting
 */

export default function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]">
          <span className="sr-only">Loading...</span>
        </div>
        <p className="mt-4 text-sm text-gray-600">Loading page...</p>
      </div>
    </div>
  );
}

/**
 * Minimal loading fallback for nested components
 */
export function MinimalLoadingFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent">
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
}

/**
 * Inline loading fallback for small components
 */
export function InlineLoadingFallback() {
  return (
    <div className="flex items-center gap-2 p-2">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent">
        <span className="sr-only">Loading...</span>
      </div>
      <span className="text-sm text-gray-600">Loading...</span>
    </div>
  );
}

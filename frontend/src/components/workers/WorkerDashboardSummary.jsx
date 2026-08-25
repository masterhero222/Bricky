export default function WorkerDashboardSummary({
  stats,
  loadingRequests,
  requestError,
  actionMessage,
  ratingInfo,
  ratingLoading,
  ratingError,
  onRefresh,
}) {
  const statusEntries = Object.entries(stats.byStatus);
  const categoryEntries = Object.entries(stats.byCategory);

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-black">Контрол панел</h1>

        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl bg-green-500 px-5 py-3 font-black text-white shadow-lg shadow-green-950/30 transition hover:bg-green-400"
        >
          Обнови
        </button>
      </div>

      {loadingRequests && <p className="text-gray-400">Зареждане на заявки...</p>}
      {requestError && <p className="text-red-400">{requestError}</p>}
      {actionMessage && <p className="mt-2 text-yellow-300">{actionMessage}</p>}

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-cyan-400/15 bg-[#0b2033]/85 p-5 shadow-inner shadow-cyan-950/20">
          <p className="text-sm text-cyan-100/70">Общо заявки</p>
          <p className="mt-2 text-3xl font-black">{stats.total}</p>
        </div>

        <div className="rounded-2xl border border-cyan-400/15 bg-[#0b2033]/85 p-5 shadow-inner shadow-cyan-950/20">
          <p className="text-sm text-cyan-100/70">Рейтинг</p>
          {ratingLoading ? (
            <p className="mt-2 text-gray-400">Зареждане...</p>
          ) : ratingError ? (
            <p className="mt-2 text-red-400">{ratingError}</p>
          ) : (
            <div className="mt-2">
              <div className="text-2xl font-bold">{ratingInfo.average} ⭐</div>
              <div className="text-sm text-gray-400">{ratingInfo.total} отзива</div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-cyan-400/15 bg-[#0b2033]/85 p-5 shadow-inner shadow-cyan-950/20">
          <p className="text-sm text-cyan-100/70">По статус</p>
          <div className="mt-3 space-y-2 text-sm">
            {statusEntries.length === 0 ? (
              <p className="text-gray-500">—</p>
            ) : (
              statusEntries.map(([status, count]) => (
                <div key={status} className="flex justify-between">
                  <span className="capitalize">{status}</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-400/15 bg-[#0b2033]/85 p-5 shadow-inner shadow-cyan-950/20">
          <p className="text-sm text-cyan-100/70">По категория</p>
          <div className="mt-3 space-y-2 text-sm">
            {categoryEntries.length === 0 ? (
              <p className="text-gray-500">—</p>
            ) : (
              categoryEntries.map(([category, count]) => (
                <div key={category} className="flex justify-between">
                  <span>{category}</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

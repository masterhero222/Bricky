export default function WorkerReferralPanel({
  referralInfo,
  loading,
  error,
  message,
  onRefresh,
  onCreateCode,
  onCopyLink,
  onShareLink,
  formatDate,
}) {
  const invites = referralInfo?.invites || [];
  const rewards = referralInfo?.rewards || [];

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Покани майстор</h1>
          <p className="mt-2 text-gray-400">
            Покани добър майстор в Bricky. След като завърши успешно 2 ремонта от различни клиенти,
            получаваш 30 дни подсилена видимост.
          </p>
        </div>
        <button onClick={onRefresh} className="rounded-lg bg-blue-600 px-5 py-2 font-bold hover:bg-blue-700">
          Обнови
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
          <h2 className="mb-4 text-xl font-bold">Твоят referral линк</h2>

          {loading ? <p className="text-gray-400">Зареждане...</p> : null}
          {error ? <p className="mb-3 text-red-400">{error}</p> : null}
          {message ? <p className="mb-3 text-green-300">{message}</p> : null}

          {!referralInfo?.referralUrl ? (
            <button
              onClick={onCreateCode}
              className="rounded-lg bg-green-600 px-5 py-3 font-bold hover:bg-green-700"
            >
              Създай линк за покана
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-400">Код</div>
                <div className="mt-1 rounded-lg bg-gray-900 px-4 py-3 text-2xl font-extrabold tracking-wider">
                  {referralInfo.code}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400">Линк</div>
                <div className="mt-1 break-all rounded-lg bg-gray-900 px-4 py-3 text-sm text-blue-200">
                  {referralInfo.referralUrl}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button onClick={onCopyLink} className="rounded-lg bg-blue-600 px-5 py-2 font-bold hover:bg-blue-700">
                  Копирай линк
                </button>
                <button onClick={onShareLink} className="rounded-lg bg-green-600 px-5 py-2 font-bold hover:bg-green-700">
                  Сподели
                </button>
              </div>

              <p className="text-sm text-gray-400">
                Наградата не гарантира постоянно първо място. Тя дава подсилена видимост в ротация
                за релевантни категории.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
          <h2 className="mb-4 text-xl font-bold">Прогрес</h2>
          {invites.length === 0 ? (
            <p className="text-gray-400">Още няма поканени майстори.</p>
          ) : (
            <div className="space-y-3">
              {invites.map((invite) => (
                <div key={invite.id} className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-bold">Код {invite.code}</div>
                      <div className="text-sm text-gray-400">Статус: {invite.status}</div>
                    </div>
                    <div className="rounded-full border border-red-500/40 bg-red-600/20 px-4 py-2 font-bold text-red-200">
                      {Math.min(Number(invite.qualifiedRepairCount || 0), 2)}/2 ремонта
                    </div>
                  </div>
                  {invite.rejectionReason ? (
                    <p className="mt-2 text-sm text-red-300">{invite.rejectionReason}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {rewards.length > 0 ? (
            <div className="mt-6">
              <h3 className="mb-3 font-bold">Активни/исторически награди</h3>
              <div className="space-y-2">
                {rewards.map((reward) => (
                  <div key={reward.id} className="rounded-lg bg-gray-900 px-4 py-3 text-sm">
                    <div className="font-bold">{reward.rewardType}</div>
                    <div className="text-gray-400">
                      {reward.status} до {formatDate(reward.endsAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

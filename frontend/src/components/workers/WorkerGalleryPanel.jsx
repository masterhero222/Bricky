function GalleryViewer({
  album,
  photo,
  photoIndex,
  deletingId,
  canDelete,
  onDelete,
  onClose,
  onStep,
  onSelectPhoto,
}) {
  if (!album || !photo) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 px-4 py-6">
      <div className="w-full max-w-5xl">
        <div className="mb-3 flex items-center justify-between gap-3 text-white">
          <div>
            <div className="font-bold">{album.title}</div>
            <div className="text-sm text-gray-300">
              {photoIndex + 1} / {album.photos.length} • {album.subtitle}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canDelete ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={deletingId === photo.id}
                className={
                  deletingId === photo.id
                    ? "cursor-not-allowed rounded-lg bg-red-950 px-4 py-2 font-bold text-red-200"
                    : "rounded-lg bg-red-600 px-4 py-2 font-bold hover:bg-red-700"
                }
              >
                {deletingId === photo.id ? "Трия..." : "Изтрий снимката"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-800 px-4 py-2 font-bold hover:bg-gray-700"
            >
              Затвори
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-gray-700 bg-gray-950">
          <img
            src={photo.url}
            alt={photo.name || album.title}
            className="max-h-[72vh] w-full object-contain"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />

          {album.photos.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => onStep(-1)}
                aria-label="Предишна снимка"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/70 px-4 py-3 text-2xl font-bold hover:bg-black"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => onStep(1)}
                aria-label="Следваща снимка"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/70 px-4 py-3 text-2xl font-bold hover:bg-black"
              >
                ›
              </button>
            </>
          ) : null}
        </div>

        {album.photos.length > 1 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {album.photos.map((item, index) => (
              <button
                key={item.id || item.url || index}
                type="button"
                onClick={() => onSelectPhoto(index)}
                className={
                  index === photoIndex
                    ? "h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 border-blue-500"
                    : "h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-700 opacity-70 hover:opacity-100"
                }
              >
                <img
                  src={item.url}
                  alt={item.name || album.title}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function WorkerGalleryPanel({
  albums,
  loading,
  error,
  message,
  selectedFiles,
  uploading,
  deletingId,
  activeAlbum,
  activePhoto,
  activePhotoIndex,
  canDeleteActivePhoto,
  onRefresh,
  onPickFiles,
  onUpload,
  onOpenAlbum,
  onCloseAlbum,
  onStepPhoto,
  onSelectPhoto,
  onDeleteActivePhoto,
  formatDate,
}) {
  return (
    <>
      <section className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Галерия</h1>
          <button onClick={onRefresh} className="rounded-lg bg-blue-600 px-5 py-2 font-bold hover:bg-blue-700">
            Обнови
          </button>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
          <h2 className="mb-3 text-xl font-bold">Качи снимки от обекти</h2>
          <div className="flex flex-col items-start gap-3 md:flex-row md:items-center">
            <input type="file" accept="image/*" multiple onChange={onPickFiles} className="block" />
            <button
              onClick={onUpload}
              disabled={uploading || !selectedFiles.length}
              className={
                uploading || !selectedFiles.length
                  ? "cursor-not-allowed rounded-lg bg-gray-700 px-5 py-2 font-bold text-gray-300"
                  : "rounded-lg bg-green-600 px-5 py-2 font-bold hover:bg-green-700"
              }
            >
              {uploading ? "Качвам..." : "Качи"}
            </button>
            {selectedFiles.length > 0 ? (
              <span className="text-sm text-gray-300">
                Избрани: <strong>{selectedFiles.length}</strong>
              </span>
            ) : null}
          </div>

          {error ? <p className="mt-3 text-red-400">{error}</p> : null}
          {message ? <p className="mt-3 text-yellow-300">{message}</p> : null}
        </div>

        <div className="mt-6">
          {loading ? (
            <p className="text-gray-400">Зареждане...</p>
          ) : albums.length === 0 ? (
            <p className="text-gray-400">Няма качени снимки.</p>
          ) : (
            <div className="space-y-3">
              {albums.map((album, albumIndex) => (
                <button
                  key={album.id}
                  type="button"
                  onClick={() => onOpenAlbum(albumIndex)}
                  className="w-full rounded-xl border border-gray-700 bg-gray-800 p-4 text-left transition hover:border-blue-500"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-green-500/40 bg-green-600/20 px-3 py-1 text-xs font-bold text-green-300">
                          Реален обект
                        </span>
                        <span className="rounded-full border border-blue-500/40 bg-blue-600/20 px-3 py-1 text-xs font-bold text-blue-200">
                          {album.photos.length} снимки
                        </span>
                      </div>

                      <div className="mt-3 text-xl font-extrabold leading-tight">
                        {album.title.replace(/^Обект #\d+\s•\s/, "")}
                      </div>
                      <div className="mt-1 text-sm text-gray-300">{album.subtitle}</div>

                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                        <div className="rounded-lg bg-gray-900 px-3 py-2">
                          <div className="text-xs text-gray-500">Статус</div>
                          <div className="font-bold text-green-400">
                            {album.type === "job" ? "Завършен" : "Портфолио"}
                          </div>
                        </div>
                        <div className="rounded-lg bg-gray-900 px-3 py-2">
                          <div className="text-xs text-gray-500">Време</div>
                          <div className="font-bold">{album.meta}</div>
                        </div>
                        <div className="rounded-lg bg-gray-900 px-3 py-2">
                          <div className="text-xs text-gray-500">Дата</div>
                          <div className="font-bold">{formatDate(album.date)}</div>
                        </div>
                      </div>

                      <div className="mt-4 text-sm font-bold text-blue-300">Виж всички снимки →</div>
                    </div>

                    <div className="grid h-32 grid-cols-2 gap-2 md:h-36 md:w-72 lg:w-80">
                      <div className="overflow-hidden rounded-lg bg-gray-900">
                        <img
                          src={album.cover.url}
                          alt={album.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                      <div className="relative overflow-hidden rounded-lg bg-gray-900">
                        <img
                          src={(album.photos[1] || album.cover).url}
                          alt={album.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                        {album.photos.length > 2 ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-lg font-extrabold">
                            +{album.photos.length - 2}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <GalleryViewer
        album={activeAlbum}
        photo={activePhoto}
        photoIndex={activePhotoIndex}
        deletingId={deletingId}
        canDelete={canDeleteActivePhoto}
        onDelete={onDeleteActivePhoto}
        onClose={onCloseAlbum}
        onStep={onStepPhoto}
        onSelectPhoto={onSelectPhoto}
      />
    </>
  );
}

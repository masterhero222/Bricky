// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { apiGet, apiPost } from '../../services/api';
import { mediaUrl, photoMediaUrl } from '../../utils/mediaUrls';
import WorkerPreviewPremium from '../../components/workers/WorkerPreviewPremium';
import ReportContentButton from '../../components/ReportContentButton';
import useDocumentMeta from '../../hooks/useDocumentMeta';

export default function WorkerPreview() {
  const params = useParams();
  const [sp] = useSearchParams();
  const requestId = Number(sp.get('requestId') || 0);
  const userId = Number(params.id || params.userId || sp.get('userId') || 0);

  const [worker, setWorker] = useState(null);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [ratingInfo, setRatingInfo] = useState({ total: 0, average: 0, items: [] });
  const [albumViewer, setAlbumViewer] = useState(null);

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [err, setErr] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [selectError, setSelectError] = useState('');
  const loadSequence = useRef(0);

  const publicName = worker?.fullName || worker?.name || 'Профил на майстор';
  const publicDescription =
    worker?.description || `Разгледайте профила на ${publicName} в Bricky.`;
  useDocumentMeta({
    title: `${publicName} | Майстор в Bricky`,
    description: publicDescription,
    canonicalPath: userId ? `/worker/${userId}` : '/workers',
    image: worker?.avatarUrl || worker?.avatarThumbnailUrl,
    robots: worker ? 'index,follow' : 'noindex,follow',
    structuredData: worker
      ? {
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: publicName,
          description: publicDescription,
          homeLocation: worker.city || undefined,
          image: worker.avatarUrl || worker.avatarThumbnailUrl || undefined,
          url: `${window.location.origin}/worker/${userId}`,
        }
      : undefined,
  });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, userId]);

  async function load() {
    const sequence = ++loadSequence.current;
    let profileLoaded = false;
    try {
      setErr('');
      setLoading(true);
      setDetailsLoading(true);

      if (!userId) {
        setErr('Липсва userId в URL.');
        setWorker(null);
        setCompletedJobs([]);
        setRatingInfo({ total: 0, average: 0, items: [] });
        return;
      }

      const wRes = await apiGet(`/workers/${userId}`);
      if (sequence !== loadSequence.current) return;
      setWorker(wRes.data || null);
      profileLoaded = true;
    } catch (e) {
      if (sequence !== loadSequence.current) return;
      console.error(e);
      setErr('Не успях да заредя профила на майстора.');
      setWorker(null);
      setCompletedJobs([]);
      setRatingInfo({ total: 0, average: 0, items: [] });
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }

    if (sequence !== loadSequence.current) return;
    if (!profileLoaded) {
      setDetailsLoading(false);
      return;
    }

    try {
      const [hRes, rRes] = await Promise.all([
        apiGet(`/workers/${userId}/history`).catch(() => ({ data: [] })),
        apiGet(`/reviews/worker/${userId}`).catch(() => ({
          data: { total: 0, average: 0 },
        })),
      ]);

      if (sequence !== loadSequence.current) return;
      setCompletedJobs(Array.isArray(hRes.data) ? hRes.data : []);

      const info = rRes?.data || {};
      const total = Number(info.total);
      const average = Number(info.average);
      setRatingInfo({
        total: Number.isFinite(total) ? total : 0,
        average: Number.isFinite(average) ? average : 0,
        items: Array.isArray(info.items) ? info.items : [],
      });
    } finally {
      if (sequence === loadSequence.current) setDetailsLoading(false);
    }
  }

  async function assign() {
    try {
      setSelectError('');
      if (!requestId) {
        setSelectError('Липсва requestId в URL.');
        return;
      }
      if (!userId) {
        setSelectError('Липсва userId в URL.');
        return;
      }

      setSelecting(true);
      await apiPost(`/requests/${requestId}/assign`, { workerUserId: userId });
      window.location.href = '/client/profile';
    } catch (e) {
      console.error(e?.response?.data || e);
      setSelectError(
        e?.response?.data?.message ||
          'Грешка при назначаване. Провери дали си логнат като client и дали майсторът е кандидатствал.',
      );
    } finally {
      setSelecting(false);
    }
  }

  function cancel() {
    window.location.href = '/client/profile';
  }

  const avatarSrc = useMemo(() => {
    const url = worker?.avatarUrl ? mediaUrl(worker.avatarUrl) : '';
    return url || '/media_files/Snejan.jpg';
  }, [worker]);

  const workerAlbums = useMemo(() => {
    const cleanPhotos = (items = []) =>
      (Array.isArray(items) ? items : [])
        .map((photo) => ({
          ...(typeof photo === 'object' && photo ? photo : {}),
          url: photoMediaUrl(photo),
        }))
        .filter((photo) => !!photo.url);

    const jobAlbums = (Array.isArray(completedJobs) ? completedJobs : [])
      .map((job) => {
        const ordered = cleanPhotos(job.portfolioPhotos);
        const before = cleanPhotos(job.beforePhotos || job.photos);
        const after = cleanPhotos(job.afterPhotos);
        const photos = ordered.length > 0 ? ordered : [...after, ...before];
        const id = job.requestId || job.id;

        return {
          id: `job-${id}`,
          type: 'job',
          title: job.category || 'Ремонт',
          subtitle: job.address || 'Завършен обект през Bricky',
          meta: `${job.durationDays || 1} дни`,
          date: job.completedAt || job.created_at || job.createdAt,
          photos,
          cover: photos[0],
        };
      })
      .filter((album) => album.photos.length > 0);

    return jobAlbums;
  }, [completedJobs]);

  const activeAlbum =
    albumViewer && workerAlbums[albumViewer.albumIndex]
      ? workerAlbums[albumViewer.albumIndex]
      : null;
  const activePhoto =
    activeAlbum && activeAlbum.photos[albumViewer?.photoIndex || 0]
      ? activeAlbum.photos[albumViewer?.photoIndex || 0]
      : null;

  function openAlbum(albumIndex, photoIndex = 0) {
    setAlbumViewer({ albumIndex, photoIndex });
  }

  function closeAlbum() {
    setAlbumViewer(null);
  }

  function stepAlbumPhoto(delta) {
    setAlbumViewer((viewer) => {
      if (!viewer) return viewer;
      const album = workerAlbums[viewer.albumIndex];
      if (!album?.photos?.length) return viewer;
      return {
        ...viewer,
        photoIndex:
          (viewer.photoIndex + delta + album.photos.length) %
          album.photos.length,
      };
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Зареждане...
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-6">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 max-w-xl w-full text-center">
          <div className="text-red-400 font-bold">{err}</div>
          <button
            className="mt-6 bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-bold"
            onClick={() => (window.location.href = '/client/profile')}
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Няма данни.
      </div>
    );
  }

  return (
    <>
      <WorkerPreviewPremium
        worker={worker}
        avatarSrc={avatarSrc}
        ratingInfo={ratingInfo}
        detailsLoading={detailsLoading}
        completedProjects={workerAlbums}
        mode={requestId ? 'candidateSelection' : 'public'}
        isSubmitting={selecting}
        error={selectError}
        onBack={cancel}
        onSelect={assign}
        onOpenProject={openAlbum}
      />

      <div className="mx-auto -mt-10 mb-10 flex max-w-7xl justify-end px-6">
        <ReportContentButton targetType="worker_profile" targetId={userId} />
      </div>

      {activeAlbum && activePhoto && (
        <div className="fixed inset-0 z-[80] bg-black/85 px-4 py-6 flex items-center justify-center">
          <div className="w-full max-w-5xl">
            <div className="mb-3 flex items-center justify-between gap-3 text-white">
              <div>
                <div className="font-bold">{activeAlbum.title}</div>
                <div className="text-sm text-gray-300">
                  {(albumViewer?.photoIndex || 0) + 1} /{' '}
                  {activeAlbum.photos.length} • {activeAlbum.subtitle}
                </div>
              </div>
              <button
                type="button"
                onClick={closeAlbum}
                className="rounded-lg bg-gray-800 hover:bg-gray-700 px-4 py-2 font-bold"
              >
                Затвори
              </button>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-gray-700 bg-gray-950">
              <img
                src={activePhoto.url}
                alt={activePhoto.name || activeAlbum.title}
                decoding="async"
                className="max-h-[72vh] w-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />

              {activeAlbum.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => stepAlbumPhoto(-1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/70 hover:bg-black px-4 py-3 text-2xl font-bold"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => stepAlbumPhoto(1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/70 hover:bg-black px-4 py-3 text-2xl font-bold"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {activeAlbum.photos.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {activeAlbum.photos.map((photo, idx) => (
                  <button
                    key={photo.id || photo.url || idx}
                    type="button"
                    onClick={() =>
                      setAlbumViewer((viewer) => ({
                        ...viewer,
                        photoIndex: idx,
                      }))
                    }
                    className={
                      idx === albumViewer.photoIndex
                        ? 'h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 border-red-500'
                        : 'h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-700 opacity-70 hover:opacity-100'
                    }
                  >
                    <img
                      src={photo.url}
                      alt={photo.name || activeAlbum.title}
                      loading="lazy"
                      fetchPriority="low"
                      decoding="async"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

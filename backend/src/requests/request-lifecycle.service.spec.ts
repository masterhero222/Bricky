import { RequestLifecycleService } from './request-lifecycle.service';

describe('RequestLifecycleService', () => {
  const service = new RequestLifecycleService();

  it('allows the complete controlled lifecycle', () => {
    const request: any = { status: 'нова', statusKey: 'approved' };
    for (const next of ['assigned', 'worker_arrived', 'in_progress', 'waiting_client_confirmation', 'client_confirmed', 'completed']) {
      service.transition(request, next as any);
      expect(request.statusKey).toBe(next);
    }
    expect(request.status).toBe('завършена');
  });

  it.each([
    ['approved', 'in_progress'],
    ['assigned', 'completed'],
    ['worker_arrived', 'waiting_client_confirmation'],
    ['in_progress', 'completed'],
    ['waiting_client_confirmation', 'completed'],
    ['client_confirmed', 'in_progress'],
    ['completed', 'approved'],
    ['disputed', 'completed'],
  ])('rejects invalid transition %s -> %s', (current, next) => {
    expect(() => service.transition({ status: 'нова', statusKey: current } as any, next as any)).toThrow('Invalid request transition');
  });
});

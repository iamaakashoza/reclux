// A steady clock that a hidden tab cannot slow down (page timers are throttled to once a second).
// Send the interval in ms to start, 0 to stop. It answers with a tick every interval.
const worker = self as unknown as Worker;
let timer: ReturnType<typeof setInterval> | undefined;

worker.onmessage = (e: MessageEvent<number>) => {
  clearInterval(timer);
  if (e.data > 0) timer = setInterval(() => worker.postMessage(0), e.data);
};

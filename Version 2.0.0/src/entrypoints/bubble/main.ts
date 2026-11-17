// The live webcam picture in the circle. Small (480 px) on purpose: it is shown about 180 px wide.
const video = document.querySelector('video')!;
navigator.mediaDevices
  .getUserMedia({ video: { width: { ideal: 480 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false })
  .then((stream) => {
    video.srcObject = stream;
    // Let go of the camera when the circle is removed from the page.
    addEventListener('pagehide', () => stream.getTracks().forEach((t) => t.stop()));
  })
  .catch(() => {
    const p = document.createElement('p');
    p.textContent = 'Camera is blocked. Allow it for Reclux.';
    document.body.append(p);
  });

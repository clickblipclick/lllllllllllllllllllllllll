// The travel. One key. It goes down, it comes back up, and that is all it is for.
(function () {
  var k = document.getElementById('k');
  var ac = null, down = false;

  function click(up) {
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      var t = ac.currentTime, n = Math.floor(ac.sampleRate * 0.03);
      var buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
      var src = ac.createBufferSource(); src.buffer = buf;
      var bp = ac.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.value = (up ? 3100 : 1700) * (0.94 + Math.random() * 0.12); bp.Q.value = 1.4;
      var g = ac.createGain(); g.gain.value = up ? 0.28 : 0.6;
      src.connect(bp); bp.connect(g); g.connect(ac.destination); src.start(t);
      // the body of the key landing: a short low thump, lighter on the way up
      var o = ac.createOscillator(), og = ac.createGain();
      o.frequency.setValueAtTime(up ? 210 : 150, t);
      o.frequency.exponentialRampToValueAtTime(up ? 120 : 70, t + 0.07);
      og.gain.setValueAtTime(up ? 0.12 : 0.45, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      o.connect(og); og.connect(ac.destination); o.start(t); o.stop(t + 0.1);
    } catch (e) {}
  }

  function set(v) {
    if (v === down) return;
    down = v;
    k.classList.toggle('d', v);
    click(!v);
  }

  k.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    try { k.setPointerCapture(e.pointerId); } catch (x) {}
    set(true);
  });
  k.addEventListener('pointerup', function () { set(false); });
  k.addEventListener('pointercancel', function () { set(false); });
  k.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  addEventListener('keydown', function (e) {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); set(true); }
  });
  addEventListener('keyup', function (e) {
    if (e.key === ' ' || e.key === 'Enter') set(false);
  });
  addEventListener('blur', function () { set(false); });
})();

// The light comes on a moment after you arrive, the way one does when
// something has just started looking. It goes off when you leave the tab
// and takes the same moment to come back. It is not connected to anything.
const light = document.getElementById('light');
let t;
function look() {
  clearTimeout(t);
  light.classList.remove('on');
  if (!document.hidden) t = setTimeout(() => light.classList.add('on'), 1400);
}
document.addEventListener('visibilitychange', look);
look();

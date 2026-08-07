export default function useHaptic() {
  const v = (p) => { if ('vibrate' in navigator) { try { navigator.vibrate(p) } catch {} } }
  return {
    tap:         () => v([20]),
    correct:     () => v([50]),
    wrong:       () => v([100, 50, 100]),
    success:     () => v([50, 50, 100]),
    warning:     () => v([150, 50, 150]),
    celebration: () => v([50, 30, 50, 30, 100, 30, 50]),
    timerEnd:    () => v([200, 100, 200]),
  }
}
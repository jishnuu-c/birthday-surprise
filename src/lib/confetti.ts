import confetti from 'canvas-confetti';

export const fireConfettiCannon = (colors = ['#ec4899', '#f43f5e', '#fbbf24', '#a855f7', '#38bdf8']) => {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    colors,
    zIndex: 9999
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio)
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
};

export const fireHeartBurst = () => {
  confetti({
    particleCount: 60,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#ec4899', '#f43f5e', '#fda4af', '#fb7185'],
    shapes: ['star'],
    scalar: 1.2,
    zIndex: 9999
  });
};

export const fireGrandFinale = () => {
  const duration = 4 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = window.setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    // since particles fall down, start a bit higher than random
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#ec4899', '#fbbf24', '#a855f7', '#38bdf8', '#34d399']
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#ec4899', '#fbbf24', '#a855f7', '#38bdf8', '#34d399']
    });
  }, 250);
};

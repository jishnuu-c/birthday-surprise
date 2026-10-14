import confetti from 'canvas-confetti';

const isMobileScreen = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1 && window.innerWidth < 1024);
};

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const fireConfettiCannon = (colors = ['#ec4899', '#f43f5e', '#fbbf24', '#a855f7', '#38bdf8']) => {
  const reduced = prefersReducedMotion();
  const mobile = isMobileScreen();

  // On mobile screens, 80 particles look just as packed and rich as 200 on a large monitor,
  // while preventing frame drops during the gift lid fly-off animation.
  const count = reduced ? 30 : mobile ? 85 : 200;
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

  if (reduced) {
    fire(1, { spread: 60, startVelocity: 20, decay: 0.95 });
    return;
  }

  fire(0.25, {
    spread: 26,
    startVelocity: mobile ? 45 : 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: mobile ? 80 : 100,
    decay: 0.91,
    scalar: mobile ? 0.7 : 0.8
  });
  fire(0.1, {
    spread: mobile ? 90 : 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: mobile ? 1.0 : 1.2
  });
  fire(0.1, {
    spread: mobile ? 90 : 120,
    startVelocity: mobile ? 35 : 45,
  });
};

export const fireHeartBurst = () => {
  const reduced = prefersReducedMotion();
  const mobile = isMobileScreen();

  confetti({
    particleCount: reduced ? 15 : mobile ? 35 : 60,
    spread: mobile ? 55 : 70,
    origin: { y: 0.6 },
    colors: ['#ec4899', '#f43f5e', '#fda4af', '#fb7185'],
    shapes: ['star'],
    scalar: mobile ? 1.0 : 1.2,
    zIndex: 9999
  });
};

export const fireGrandFinale = () => {
  const reduced = prefersReducedMotion();
  const mobile = isMobileScreen();

  if (reduced) {
    confetti({
      particleCount: 40,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#ec4899', '#fbbf24', '#a855f7', '#38bdf8', '#34d399'],
      zIndex: 9999
    });
    return;
  }

  const duration = (mobile ? 2.5 : 4) * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: mobile ? 22 : 30, spread: 360, ticks: mobile ? 45 : 60, zIndex: 9999 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval = window.setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const baseBatch = mobile ? 25 : 50;
    const particleCount = baseBatch * (timeLeft / duration);
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
  }, mobile ? 350 : 250);
};

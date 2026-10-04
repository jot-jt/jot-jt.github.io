$(document).ready(function() {
    const intro = document.querySelector('.intro-section');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (intro) {
        const canvas = document.createElement('canvas');
        canvas.className = 'intro-dots';
        canvas.setAttribute('aria-hidden', 'true');
        const context = canvas.getContext('2d');
        if (context) {
            intro.prepend(canvas);
            intro.classList.add('has-interactive-dots');
            let dots = [], width = 0, height = 0;
            let pointer = null, frame = null, lastTime = null;
            let visible = true;
            let motionTime = 0;
            const radius = 110;
            let dotsColor = getComputedStyle(intro).getPropertyValue('--dots-color').trim();
            window.addEventListener('theme-preview-change', function() {
                dotsColor = getComputedStyle(intro).getPropertyValue('--dots-color').trim();
                schedule();
            });

            function draw(time) {
                frame = null;
                const elapsed = lastTime === null ? 16 : Math.min(time - lastTime, 64);
                lastTime = time;
                if (!reducedMotion.matches) motionTime += elapsed / 1000;
                const easing = reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 120);
                let moving = false;
                context.clearRect(0, 0, width, height);
                context.fillStyle = dotsColor;
                context.beginPath();
                for (const dot of dots) {
                    let targetX = dot.homeX, targetY = dot.homeY;
                    if (!reducedMotion.matches) {
                        // Low-amplitude traveling waves give each dot its own gentle motion.
                        targetX += Math.sin(motionTime * 0.65 + dot.homeY * 0.018 + dot.homeX * 0.006) * 3;
                        targetY += Math.cos(motionTime * 0.55 + dot.homeX * 0.018 + dot.homeY * 0.006) * 3;
                    }
                    if (pointer && !reducedMotion.matches) {
                        const dx = pointer.x - targetX;
                        const dy = pointer.y - targetY;
                        const distance = Math.hypot(dx, dy);
                        if (distance < radius) {
                            // A smooth falloff gathers nearby dots without collapsing the grid.
                            const falloff = 1 - distance / radius;
                            const attraction = falloff * falloff * 0.65;
                            targetX += dx * attraction;
                            targetY += dy * attraction;
                        }
                    }
                    dot.x += (targetX - dot.x) * easing;
                    dot.y += (targetY - dot.y) * easing;
                    if (Math.abs(targetX - dot.x) + Math.abs(targetY - dot.y) > 0.03) moving = true;
                    context.moveTo(dot.x + 1, dot.y);
                    context.arc(dot.x, dot.y, 1, 0, Math.PI * 2);
                }
                context.fill();
                if (moving || !reducedMotion.matches) schedule();
                else lastTime = null;
            }

            function schedule() {
                if (frame === null && visible && !document.hidden) frame = requestAnimationFrame(draw);
            }

            function resize() {
                width = intro.clientWidth;
                height = intro.clientHeight;
                const scale = Math.min(window.devicePixelRatio || 1, 2);
                canvas.width = Math.round(width * scale);
                canvas.height = Math.round(height * scale);
                context.setTransform(scale, 0, 0, scale, 0, 0);
                dots = [];
                for (let y = 12; y < height; y += 24) {
                    for (let x = 12; x < width; x += 24) {
                        dots.push({ homeX: x, homeY: y, x, y });
                    }
                }
                schedule();
            }

            intro.addEventListener('pointermove', function(event) {
                if (event.pointerType === 'touch' || reducedMotion.matches) return;
                const bounds = canvas.getBoundingClientRect();
                pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
                schedule();
            });
            function release() { pointer = null; schedule(); }
            intro.addEventListener('pointerleave', release);
            window.addEventListener('blur', release);
            window.addEventListener('scroll', release, { passive: true });
            reducedMotion.addEventListener('change', release);
            document.addEventListener('visibilitychange', function() {
                lastTime = null;
                if (!document.hidden) release();
            });
            new ResizeObserver(resize).observe(intro);
            new IntersectionObserver(function(entries) {
                visible = entries[0].isIntersecting;
                if (visible) schedule();
                else { pointer = null; lastTime = null; }
            }).observe(intro);
            resize();
        }
    }

    $('.publication-mousecell').mouseover(function() {
        $(this).find('video').css('display', 'inline-block');
        $(this).find('img').css('display', 'none');
    });
    $('.publication-mousecell').mouseout(function() {
        $(this).find('video').css('display', 'none');
        $(this).find('img').css('display', 'inline-block');
    });
});

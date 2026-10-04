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
            const radius = 145;
            const modes = ['gather', 'repel', 'ripples', 'contours', 'constellation', 'lens', 'shear', 'crosswave', 'tide'];
            const requestedMode = new URLSearchParams(location.search).get('background');
            const gridModes = ['gather', 'repel', 'ripples', 'lens', 'shear', 'crosswave', 'tide'];
            const idleModes = ['original', 'slow', 'sway', 'breath', 'contours'];
            let idleMode = new URLSearchParams(location.search).get('idle') || 'original';
            if (!idleModes.includes(idleMode)) idleMode = 'original';
            window.addEventListener('idle-preview-change', function(event) {
                if (!idleModes.includes(event.detail)) return;
                idleMode = event.detail;
                pointer = null;
                schedule();
            });
            // Shelved weighted mix: retained for future use; the homepage defaults to constellation.
            function chooseBackground() {
                const roll = Math.random();
                return roll < 0.5 ? 'constellation' : gridModes[Math.min(gridModes.length - 1, Math.floor((roll - 0.5) * 2 * gridModes.length))];
            }
            let mode = modes.includes(requestedMode) ? requestedMode : 'constellation';
            intro.dataset.background = mode;
            window.addEventListener('background-preview-change', function(event) {
                if (!modes.includes(event.detail)) return;
                mode = event.detail;
                intro.dataset.background = mode;
                pointer = null;
                resize();
            });
            let dotsColor = getComputedStyle(intro).getPropertyValue('--dots-color').trim();
            function updateDotsColor() {
                dotsColor = getComputedStyle(intro).getPropertyValue('--dots-color').trim();
                schedule();
            }
            window.addEventListener('theme-preview-change', updateDotsColor);
            window.addEventListener('theme-change', updateDotsColor);

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
                        if (gridModes.includes(mode) && idleMode !== 'original') {
                            if (idleMode === 'slow') {
                                targetX += Math.sin(motionTime * 0.16 + dot.homeY * 0.012) * 2;
                                targetY += Math.cos(motionTime * 0.14 + dot.homeX * 0.012) * 2;
                            } else if (idleMode === 'sway') {
                                targetX += Math.sin(motionTime * 0.18) * 3;
                                targetY += Math.sin(motionTime * 0.12) * 1.5;
                            } else if (idleMode === 'breath') {
                                const scale = Math.sin(motionTime * 0.2) * 0.004;
                                targetX += (dot.homeX - width / 2) * scale;
                                targetY += (dot.homeY - height / 2) * scale;
                            } else if (idleMode === 'contours') {
                                targetY += Math.sin(dot.homeX * 0.011 + motionTime * 0.12 + dot.homeY * 0.009) * 6;
                            }
                        } else {
                            // Original low-amplitude traveling waves.
                            targetX += Math.sin(motionTime * 0.65 + dot.homeY * 0.018 + dot.homeX * 0.006) * 3;
                            targetY += Math.cos(motionTime * 0.55 + dot.homeX * 0.018 + dot.homeY * 0.006) * 3;
                        }
                    }
                    if (!reducedMotion.matches) {
                        if (mode === 'contours') {
                            targetY += Math.sin(dot.homeX * 0.011 + motionTime * 0.12 + dot.homeY * 0.009) * 8;
                        } else if (mode === 'crosswave' && idleMode === 'original') {
                            targetX += Math.sin(dot.homeY * 0.022 + motionTime * 0.7) * 4;
                            targetY += Math.sin(dot.homeX * 0.022 - motionTime * 0.7) * 4;
                        } else if (mode === 'tide' && idleMode === 'original') {
                            targetX += Math.sin(motionTime * 0.5 + dot.homeY * 0.008) * 5;
                        } else if (mode === 'constellation') {
                            targetX += Math.sin(motionTime * 0.3 + dot.phase) * 10;
                            targetY += Math.cos(motionTime * 0.25 + dot.phase) * 10;
                        }
                    }
                    if (pointer && !reducedMotion.matches) {
                        const dx = targetX - pointer.x, dy = targetY - pointer.y;
                        const distance = Math.hypot(dx, dy);
                        const falloff = Math.max(0, 1 - distance / radius);
                        const unitX = dx / Math.max(distance, 1), unitY = dy / Math.max(distance, 1);
                        if (mode === 'ripples') {
                            const wave = Math.sin(distance * 0.045 - motionTime * 2.5) * 6 * Math.exp(-distance / 190);
                            targetX += unitX * wave;
                            targetY += unitY * wave;
                        } else if (mode === 'lens') {
                            // A small magnifying bulge opens the grid around the cursor.
                            targetX += dx * falloff * falloff * 0.35;
                            targetY += dy * falloff * falloff * 0.35;
                        } else if (mode === 'shear') {
                            // Rows slide in opposite directions above and below the cursor.
                            targetX += Math.tanh(dy / 28) * falloff * falloff * 20;
                        } else if (mode === 'crosswave') {
                            targetX += Math.sin(dy * 0.04 - motionTime * 1.5) * falloff * 8;
                            targetY += Math.sin(dx * 0.04 - motionTime * 1.5) * falloff * 8;
                        } else if (mode === 'tide') {
                            // Local tangential flow gently bends rows around the cursor.
                            targetX -= unitY * falloff * falloff * 16;
                            targetY += unitX * falloff * falloff * 16;
                        } else if (mode === 'repel' || mode === 'contours') {
                            targetX += unitX * falloff * falloff * 60;
                            targetY += unitY * falloff * falloff * 60;
                        } else {
                            targetX -= dx * falloff * falloff * 0.65;
                            targetY -= dy * falloff * falloff * 0.65;
                        }
                    }
                    dot.x += (targetX - dot.x) * easing;
                    dot.y += (targetY - dot.y) * easing;
                    if (Math.abs(targetX - dot.x) + Math.abs(targetY - dot.y) > 0.03) moving = true;
                    context.moveTo(dot.x + 1, dot.y);
                    context.arc(dot.x, dot.y, 1, 0, Math.PI * 2);
                }
                context.fill();
                if (mode === 'constellation' && pointer && !reducedMotion.matches) {
                    context.strokeStyle = dotsColor;
                    context.lineWidth = 0.45;
                    const connectionRadius = 140;
                    const connectionLength = 45;
                    for (let i = 0; i < dots.length; i++) {
                        const dot = dots[i];
                        const proximity = Math.hypot(dot.x - pointer.x, dot.y - pointer.y);
                        if (proximity >= connectionRadius) continue;
                        for (let j = i + 1; j < dots.length; j++) {
                            const other = dots[j];
                            const otherProximity = Math.hypot(other.x - pointer.x, other.y - pointer.y);
                            if (otherProximity >= connectionRadius) continue;
                            const distance = Math.hypot(dot.x - other.x, dot.y - other.y);
                            if (distance >= connectionLength) continue;
                            // Fade both toward the cursor region's edge and for longer links.
                            context.globalAlpha = 0.55 * (1 - distance / connectionLength)
                                * (1 - Math.max(proximity, otherProximity) / connectionRadius);
                            context.beginPath();
                            context.moveTo(dot.x, dot.y);
                            context.lineTo(other.x, other.y);
                            context.stroke();
                        }
                    }
                    context.globalAlpha = 1;
                }
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
                const add = (x, y, phase = 0) => dots.push({ homeX: x, homeY: y, x, y, phase });
                if (mode === 'constellation') {
                    // Seeded scatter keeps the pattern stable across preview switches.
                    let seed = 71;
                    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
                    for (let i = 0; i < Math.min(1000, width * height / 700); i++) {
                        add(random() * width, random() * height, random() * Math.PI * 2);
                    }
                } else {
                    // Extra rows and columns keep wave patterns filled through the canvas edges.
                    const overscan = mode === 'contours' ? 90 : mode === 'ripples' ? 48 : 0;
                    for (let y = 12 - overscan; y < height + overscan; y += mode === 'contours' ? 30 : 24) {
                        for (let x = 12 - overscan; x < width + overscan; x += mode === 'contours' ? 18 : 24) add(x, y);
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

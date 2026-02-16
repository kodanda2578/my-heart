document.addEventListener('DOMContentLoaded', () => {

    /* --- MUSIC PLAYBACK LOGIC (Moved to top for hoisting) --- */
    const audio = document.getElementById('bg-music');
    const musicBtn = document.getElementById('music-control');
    let musicSettings = { startTime: 0, endTime: 0, volume: 50 };
    let isPlaying = false;

    function loadMusicSettings(settings) {
        if (!audio || !musicBtn) return;

        if (!settings || !settings.url) {
            musicBtn.style.display = 'none';
            return;
        }

        console.log("Loading music settings:", settings);
        musicBtn.style.display = 'flex';
        audio.src = settings.url;
        audio.volume = (settings.volume || 50) / 100;
        musicSettings = settings;
        audio.currentTime = parseFloat(settings.startTime) || 0;
    }

    if (audio && musicBtn) {
        const musicIcon = musicBtn.querySelector('.music-icon');
        const musicText = musicBtn.querySelector('.music-text');

        // Loop Logic
        audio.addEventListener('timeupdate', () => {
            const endTime = parseFloat(musicSettings.endTime) || 0;
            if (endTime > 0 && audio.currentTime >= endTime) {
                audio.currentTime = parseFloat(musicSettings.startTime) || 0;
                audio.play();
            }
        });

        // Play/Pause Toggle
        musicBtn.addEventListener('click', () => {
            if (isPlaying) {
                audio.pause();
                isPlaying = false;
                musicBtn.classList.remove('playing');
                musicIcon.textContent = "🎶";
                musicText.textContent = "Play Our Song";
            } else {
                audio.play().then(() => {
                    isPlaying = true;
                    musicBtn.classList.add('playing');
                    musicIcon.textContent = "⏸️";
                    musicText.textContent = "Pause Music";
                }).catch(err => console.error("Audio play failed:", err));
            }
        });
    }

    /* --- HELPER: RENDER MEDIA --- */

    function renderMedia(url, alt, className = "") {
        if (!url) return '';
        const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i);
        if (isVideo) {
            return `<video src="${url}" class="${className}" autoplay muted loop playsinline></video>`;
        } else {
            return `<img src="${url}" alt="${alt}" class="${className}">`;
        }
    }


    /* --- 0. INITIALIZE OBSERVERS & FETCH DATA --- */
    initObservers(); // Run immediately so static content (like "Loading...") is visible
    initTypingEffect();

    fetch('/api/content')
        .then(response => response.json())
        .then(data => {
            if (!data || Object.keys(data).length === 0) return;

            // Hero
            if (data.hero) {
                document.getElementById('hero-title').textContent = data.hero.title;
                document.getElementById('hero-subtitle').textContent = data.hero.subtitle;
                document.getElementById('hero-button').textContent = data.hero.buttonText;

                if (data.hero.backgroundImage) {
                    const container = document.getElementById('hero-media-container');
                    if (container) {
                        container.innerHTML = renderMedia(data.hero.backgroundImage, "Hero Background");
                    }
                }
            }

            // Story
            if (data.story) {
                document.getElementById('story-title').textContent = data.story.title;
                document.getElementById('story-date').textContent = data.story.date;
                document.getElementById('story-text').textContent = data.story.text;

                const storyImgContainer = document.querySelector('.image-content');
                // Replace the hardcoded img with dynamic media
                if (storyImgContainer && data.story.imageUrl) {
                    storyImgContainer.innerHTML = renderMedia(data.story.imageUrl, "Our Story", "rounded-img shadow-dreamy");
                }
            }

            // Timeline
            if (data.timeline && Array.isArray(data.timeline)) {
                const timelineContainer = document.getElementById('timeline-container');
                timelineContainer.innerHTML = ''; // Clear loading placeholder
                data.timeline.forEach((item, index) => {
                    const side = index % 2 === 0 ? 'left' : 'right';
                    const anim = index % 2 === 0 ? 'slide-in-left' : 'slide-in-right';
                    const mediaHtml = renderMedia(item.imageUrl, item.title);

                    const html = `
                        <div class="timeline-item ${side} ${anim}">
                            <div class="timeline-content">
                                <span class="date">${item.date}</span>
                                <h3>${item.title}</h3>
                                <p>${item.description}</p>
                                ${mediaHtml}
                            </div>
                        </div>
                    `;
                    timelineContainer.insertAdjacentHTML('beforeend', html);
                });
            }

            // Gallery
            if (data.gallery && Array.isArray(data.gallery)) {
                const galleryGrid = document.getElementById('gallery-grid');
                galleryGrid.innerHTML = '';
                data.gallery.forEach(item => {
                    const mediaHtml = renderMedia(item.imageUrl, item.caption);
                    const html = `
                        <div class="gallery-item fade-in">
                            ${mediaHtml}
                            <div class="caption">${item.caption}</div>
                        </div>
                    `;
                    galleryGrid.insertAdjacentHTML('beforeend', html);
                });
            }

            // Letter
            if (data.letter) {
                document.getElementById('letter-title').textContent = data.letter.title;
                document.getElementById('source-text').innerHTML = data.letter.text;
                // Note: typeWriter uses source-text content
            }

            // Future
            if (data.future) {
                document.getElementById('future-title').textContent = data.future.title;
                document.getElementById('future-intro').textContent = data.future.intro;
                document.getElementById('reveal-btn').textContent = data.future.buttonText;
                document.getElementById('secret-title').textContent = data.future.secretTitle;
                document.getElementById('secret-body').innerHTML = data.future.secretMessage;

                // Store password and video for checking later
                window.secretPassword = data.future.password;
                window.secretVideoUrl = data.future.secretVideoUrl;
            }

            // Collage
            if (data.collage) {
                const captionEl = document.getElementById('collage-caption-text');
                if (captionEl) captionEl.textContent = data.collage.caption || "Cherished Memories";

                if (data.collage.images && Array.isArray(data.collage.images)) {
                    // Update 3 slots
                    [0, 1, 2].forEach(index => {
                        const container = document.getElementById(`collage-img-${index + 1}-container`);
                        if (container && data.collage.images[index]) {
                            container.innerHTML = renderMedia(data.collage.images[index], `Collage Photo ${index + 1}`);
                        }
                    });
                }
            }


            // Vibes
            if (data.vibes) {
                const vibeCards = document.querySelectorAll('.vibe-card');
                if (vibeCards.length >= 5) {
                    [1, 2, 3, 4, 5].forEach((num, index) => {
                        const url = data.vibes[`vibe${num}`];
                        if (url) {
                            vibeCards[index].style.backgroundImage = `url('${url}')`;
                            vibeCards[index].style.backgroundSize = 'cover';
                            vibeCards[index].style.backgroundPosition = 'center';
                            // Add a dark overlay so text pops
                            vibeCards[index].style.boxShadow = 'inset 0 0 0 2000px rgba(0,0,0,0.3)';
                        }
                    });
                }
            }

            // MUSIC (Integrated)
            if (data.music) {
                loadMusicSettings(data.music);
            }



            /* --- RE-INITIALIZE OBSERVERS AFTER DOM UPDATES --- */
            initObservers();
            initTypingEffect(); // Start observing for typing effect
        })

        .catch(err => {
            console.error('Error loading content:', err);
            // Ensure content is visible even if fetch fails
            initObservers();
            document.getElementById('hero-title').textContent = "Welcome";
            document.getElementById('hero-subtitle').textContent = "Music Playback & Content System";
        });


    /* --- 1. FALLING HEARTS ANIMATION --- */
    function createHeart() {
        const container = document.querySelector('.hearts-container');
        if (!container) return; // Guard clause

        const heart = document.createElement('div');
        heart.classList.add('heart');
        heart.innerHTML = '❤';
        heart.style.left = Math.random() * 100 + 'vw';
        heart.style.animationDuration = Math.random() * 5 + 10 + 's'; // 10-15s duration (Slow Motion)
        heart.style.fontSize = Math.random() * 20 + 10 + 'px';

        container.appendChild(heart);

        setTimeout(() => { heart.remove(); }, 16000); // Cleanup after animation
    }
    setInterval(createHeart, 800); // Spawn less frequently

    /* --- 1.5 CURSOR TRAIL --- */
    document.addEventListener('mousemove', function (e) {
        const heart = document.createElement('span');
        heart.classList.add('cursor-heart');
        heart.innerHTML = '❤️';
        heart.style.left = e.pageX + 'px';
        heart.style.top = e.pageY + 'px';
        const size = Math.random() * 10 + 10;
        heart.style.fontSize = size + 'px';
        document.body.appendChild(heart);
        setTimeout(() => { heart.remove(); }, 1000);
    });

    /* --- 2. SMOOTH SCROLL --- */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
    });

    /* --- 3. SCROLL ANIMATIONS --- */
    function initObservers() {
        const observerOptions = { threshold: 0.15 };
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        document.querySelectorAll('.fade-in, .fade-in-up, .slide-in-left, .slide-in-right').forEach(el => {
            observer.observe(el);
        });
    }

    /* --- 4. TYPING EFFECT --- */
    function initTypingEffect() {
        const letterCard = document.querySelector('.letter-card');
        if (!letterCard) return;

        const letterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !window.typingStarted) {
                    window.typingStarted = true;
                    typeWriter();
                }
            });
        }, { threshold: 0.5 });

        letterObserver.observe(letterCard);
    }

    function typeWriter() {
        const textElement = document.getElementById('typing-text');
        const sourceElement = document.getElementById('source-text');
        if (!textElement || !sourceElement) return;

        const sourceText = sourceElement.innerText.trim().replace(/\s+/g, ' ');
        let charIndex = 0;

        function type() {
            if (charIndex < sourceText.length) {
                textElement.innerHTML += sourceText.charAt(charIndex);
                charIndex++;
                setTimeout(type, 50);
            } else {
                const cursor = document.querySelector('.cursor');
                if (cursor) cursor.style.display = 'none';
            }
        }
        type();
    }

    /* --- 5. PASSWORD REVEAL --- */
    const revealBtn = document.getElementById('reveal-btn');
    const hiddenMessage = document.getElementById('hidden-message');

    if (revealBtn) {
        revealBtn.addEventListener('click', () => {
            let password = prompt("What is the secret password?");
            let correctPassword = window.secretPassword || 'love'; // Fallback

            if (password && password.toLowerCase().trim() === correctPassword.toLowerCase()) {
                alert("Correct! ❤️");
                hiddenMessage.style.display = 'block';
                revealBtn.style.display = 'none';

                // Show Secret Video if available
                if (window.secretVideoUrl) {
                    const videoContainer = document.getElementById('secret-video-container');
                    const videoPlayer = document.getElementById('secret-video-player');
                    if (videoContainer && videoPlayer) {
                        videoContainer.style.display = 'block';
                        videoPlayer.src = window.secretVideoUrl;
                        videoPlayer.play().catch(e => console.log("Autoplay blocked", e));
                    }
                }

                setTimeout(() => {
                    hiddenMessage.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            } else if (password !== null) {
                alert("Oops! That's not it. Try again!");
            }
        });
    }

    /* --- 6. LIGHTBOX LOGIC --- */
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxVideo = document.getElementById('lightbox-video');
    const captionText = document.getElementById('caption');
    const closeBtn = document.querySelector('.close-lightbox');

    if (lightbox && lightboxImg && lightboxVideo && closeBtn) {
        // Delegate event listener for dynamic content
        document.body.addEventListener('click', (e) => {
            // Check if clicked element is an image or video (excluding lightbox itself)
            const isImg = e.target.tagName === 'IMG';
            const isVideo = e.target.tagName === 'VIDEO';

            if ((isImg || isVideo) && !e.target.closest('.lightbox')) {
                lightbox.style.display = "block";

                if (isImg) {
                    lightboxImg.src = e.target.src;
                    lightboxImg.style.display = 'block';
                    lightboxVideo.style.display = 'none';
                    lightboxVideo.pause();
                    captionText.innerHTML = e.target.alt || "";
                } else if (isVideo) {
                    lightboxVideo.src = e.target.src;
                    lightboxVideo.style.display = 'block';
                    lightboxImg.style.display = 'none';
                    // Auto-play safely
                    lightboxVideo.play().catch(err => console.log('Autoplay blocked:', err));
                    captionText.innerHTML = ""; // Videos might not have alt
                }
            }
        });

        // Close when clicking X
        closeBtn.onclick = function () {
            lightbox.style.display = "none";
            lightboxVideo.pause();
        }

        // Close when clicking outside image
        lightbox.onclick = function (e) {
            if (e.target === lightbox) {
                lightbox.style.display = "none";
                lightboxVideo.pause();
            }
        }

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === "Escape") {
                lightbox.style.display = "none";
                lightboxVideo.pause();
            }
        });
    }

    /* --- 7. SPOTLIGHT EFFECT (Love Vibes) --- */
    const cards = document.querySelectorAll(".vibe-card");
    document.getElementById("love-vibes").onmousemove = e => {
        for (const card of cards) {
            const rect = card.getBoundingClientRect(),
                x = e.clientX - rect.left,
                y = e.clientY - rect.top;

            card.style.setProperty("--mouse-x", `${x}px`);
            card.style.setProperty("--mouse-y", `${y}px`);
        };
    };

    // LIGHTBOX FOR VIBE CARDS
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const style = window.getComputedStyle(card);
            const bgImage = style.backgroundImage;
            // Extract URL from "url('...')"
            if (bgImage && bgImage !== 'none') {
                const url = bgImage.slice(5, -2); // Remove url(" and ")
                if (url) {
                    lightbox.style.display = "block";
                    lightboxImg.src = url;
                    lightboxImg.classList.add('glowing-img'); // Add glow class
                    captionText.innerHTML = card.querySelector('h3').innerText;
                }
            }
        });
    });


    /* --- MUSIC LOGIC MOVED TO TOP --- */
});

import { db, doc, getDoc } from "./firebase-config.js";

document.addEventListener('DOMContentLoaded', async () => {

    // --- 1. FETCH CONTENT FROM FIRESTORE ---
    const CONTENT_DOC_ID = "main";
    let siteData = {};

    try {
        const docRef = doc(db, "content", CONTENT_DOC_ID);
        const docSnap = await getDoc(docRef);
        console.log("Firestore Auth Check:", db.app.options.projectId);

        if (docSnap.exists()) {
            siteData = docSnap.data();
            console.log("Site data loaded:", siteData);
            renderContent(siteData);
            // Initialize Music after content load
            if (siteData.music) initMusicSystem(siteData.music);
        } else {
            console.log("No content found in Firestore!");
        }
    } catch (error) {
        console.error("Error fetching content:", error);
    }

    // --- 2. RENDER CONTENT TO UI ---
    function renderContent(data) {
        // Helper to safely set text/src
        const setText = (id, text) => { if (data && text) document.getElementById(id).innerText = text; };
        const setSrc = (id, src) => {
            const el = document.getElementById(id);
            if (el && src) {
                el.src = src;
                el.style.display = 'block';
            }
        };

        // Hero
        if (data.hero) {
            setText('hero-title', data.hero.title);
            setText('hero-subtitle', data.hero.subtitle);
            setText('hero-btn', data.hero.buttonText);

            const heroSection = document.querySelector('.hero');
            if (data.hero.backgroundImage) {
                // Determine if video or image
                if (data.hero.backgroundImage.match(/\.(mp4|webm|ogg|mov)$/i)) {
                    // Create video background if not exists
                    let videoBg = heroSection.querySelector('.hero-video-bg');
                    if (!videoBg) {
                        videoBg = document.createElement('video');
                        videoBg.className = 'hero-video-bg';
                        videoBg.autoplay = true;
                        videoBg.muted = true;
                        videoBg.loop = true;
                        videoBg.playsInline = true;
                        videoBg.style.position = 'absolute';
                        videoBg.style.top = '0';
                        videoBg.style.left = '0';
                        videoBg.style.width = '100%';
                        videoBg.style.height = '100%';
                        videoBg.style.objectFit = 'cover';
                        videoBg.style.zIndex = '-1';
                        heroSection.insertBefore(videoBg, heroSection.firstChild);
                    }
                    videoBg.src = data.hero.backgroundImage;
                } else {
                    heroSection.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('${data.hero.backgroundImage}')`;
                }
            }
        }

        // Story
        if (data.story) {
            setText('story-title', data.story.title);
            setText('story-date', data.story.date);
            setText('story-text', data.story.text);

            const storyImgContainer = document.querySelector('.story-img');
            if (data.story.imageUrl && storyImgContainer) {
                if (data.story.imageUrl.match(/\.(mp4|webm|ogg|mov)$/i)) {
                    storyImgContainer.innerHTML = `<video src="${data.story.imageUrl}" autoplay muted loop playsinline></video>`;
                } else {
                    storyImgContainer.innerHTML = `<img src="${data.story.imageUrl}" alt="Our Story">`;
                }
            }
        }

        // Timeline
        const timelineContainer = document.querySelector('.timeline');
        if (timelineContainer && data.timeline) {
            timelineContainer.innerHTML = ''; // Clear defaults
            data.timeline.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = `timeline-item ${index % 2 === 0 ? 'left' : 'right'}`;

                let mediaHtml = '';
                if (item.imageUrl) {
                    if (item.imageUrl.match(/\.(mp4|webm|ogg|mov)$/i)) {
                        mediaHtml = `<video src="${item.imageUrl}" autoplay muted loop playsinline onclick="openLightbox('${item.imageUrl}', true)"></video>`;
                    } else {
                        mediaHtml = `<img src="${item.imageUrl}" alt="${item.title}" onclick="openLightbox('${item.imageUrl}')">`;
                    }
                }

                div.innerHTML = `
                    <div class="content glow-box">
                        <h3>${item.title}</h3>
                        <span class="date">${item.date}</span>
                        <p>${item.description}</p>
                        ${mediaHtml}
                    </div>
                `;
                timelineContainer.appendChild(div);
            });
            initItemAnimations(); // Re-trigger observers
        }

        // Gallery
        const galleryGrid = document.querySelector('.gallery-grid');
        if (galleryGrid && data.gallery) {
            galleryGrid.innerHTML = '';
            data.gallery.forEach(item => {
                const div = document.createElement('div');
                div.className = 'gallery-item glow-box';
                div.innerHTML = `
                    <img src="${item.imageUrl}" alt="${item.caption}" onclick="openLightbox('${item.imageUrl}')">
                    <p style="text-align: center; padding: 10px; font-family: 'Poppins', sans-serif;">${item.caption}</p>
                `;
                galleryGrid.appendChild(div);
            });
            initItemAnimations();
        }

        // Collage
        if (data.collage) {
            setText('collage-caption', data.collage.caption);
            if (data.collage.images && data.collage.images.length === 3) {
                setSrc('collage-img-1', data.collage.images[0]);
                setSrc('collage-img-2', data.collage.images[1]);
                setSrc('collage-img-3', data.collage.images[2]);
            }
        }

        // Letter
        if (data.letter) {
            setText('letter-title', data.letter.title);
            // Handle newlines for letter body
            const letterBody = document.getElementById('letter-body');
            if (letterBody) letterBody.innerText = data.letter.text;
        }

        // Future / Secret
        if (data.future) {
            setText('future-title', data.future.title);
            setText('future-intro', data.future.intro);
            const btn = document.querySelector('.btn-secret');
            if (btn) btn.innerText = data.future.buttonText;

            // Password logic
            window.secretPassword = data.future.password; // Store for check
            window.secretContent = {
                title: data.future.secretTitle,
                message: data.future.secretMessage,
                video: data.future.secretVideoUrl
            };
        }

        // Vibes
        if (data.vibes) {
            [1, 2, 3, 4, 5].forEach(i => {
                const card = document.querySelector(`.vibe-card:nth-child(${i})`);
                if (card && data.vibes[`vibe${i}`]) {
                    card.style.backgroundImage = `url('${data.vibes[`vibe${i}`]}')`;
                    card.classList.add('has-image');
                }
            });
        }
    }

    // --- 3. ANIMATIONS & INTERACTIONS ---

    function initItemAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.timeline-item, .gallery-item, .vibe-card, .letter-content').forEach(el => {
            observer.observe(el);
        });
    }

    // Modal / Lightbox Logic
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxVideo = document.getElementById('lightbox-video');
    const closeLightbox = document.querySelector('.close-lightbox');

    window.openLightbox = (src, isVideo = false) => {
        lightbox.style.display = 'flex';
        if (isVideo) {
            lightboxImg.style.display = 'none';
            lightboxVideo.style.display = 'block';
            lightboxVideo.src = src;
        } else {
            lightboxVideo.style.display = 'none';
            lightboxVideo.pause();
            lightboxImg.style.display = 'block';
            lightboxImg.src = src;
        }
    };

    if (closeLightbox) {
        closeLightbox.addEventListener('click', () => {
            lightbox.style.display = 'none';
            lightboxVideo.pause();
        });
    }

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            lightbox.style.display = 'none';
            lightboxVideo.pause();
        }
    });

    // Secret Section Logic
    const secretBtn = document.querySelector('.btn-secret');
    if (secretBtn) {
        secretBtn.addEventListener('click', () => {
            const userPass = prompt("Enter the secret password:");
            if (userPass === window.secretPassword) {
                // Reveal Secret
                const container = document.querySelector('.future-container');
                container.innerHTML = `
                    <div class="secret-reveal glow-box" style="animation: fadeIn 1s forwards;">
                        <h2>${window.secretContent.title}</h2>
                        <div style="margin: 20px 0;">${window.secretContent.message}</div>
                        ${window.secretContent.video ? `
                        <div class="video-wrapper">
                            <video src="${window.secretContent.video}" controls style="width:100%; border-radius:10px; box-shadow: 0 0 20px rgba(139,92,246,0.5);"></video>
                        </div>` : ''}
                    </div>
                `;
            } else {
                alert("Incorrect password. This secret remains locked. 🔒");
            }
        });
    }

    // --- 4. MUSIC SYSTEM ---
    function initMusicSystem(musicData) {
        if (!musicData || !musicData.url) return;

        const audio = new Audio(musicData.url);
        audio.volume = (musicData.volume || 50) / 100;

        const startTime = parseFloat(musicData.startTime) || 0;
        const endTime = parseFloat(musicData.endTime) || 0;

        audio.currentTime = startTime;

        // Loop Logic
        if (endTime > 0 && endTime > startTime) {
            audio.addEventListener('timeupdate', () => {
                if (audio.currentTime >= endTime) {
                    audio.currentTime = startTime;
                    audio.play();
                }
            });
        } else {
            audio.loop = true;
        }

        // Floating Button Logic
        const musicBtn = document.querySelector('.music-floating-btn');
        let isPlaying = false;

        if (musicBtn) {
            musicBtn.style.display = 'flex'; // Show button only if music exists
            musicBtn.addEventListener('click', () => {
                if (isPlaying) {
                    audio.pause();
                    musicBtn.classList.remove('playing');
                    musicBtn.innerHTML = '🎵';
                } else {
                    audio.play().catch(e => console.log("Autoplay blocked", e));
                    musicBtn.classList.add('playing');
                    musicBtn.innerHTML = '⏸️';
                }
                isPlaying = !isPlaying;
            });
        }

        // Optional: Auto-play interaction (browsers block auto-audio)
        document.body.addEventListener('click', () => {
            if (!isPlaying && musicBtn) {
                // specific behavior if desired, or leave manual
            }
        }, { once: true });
    }

    // --- 5. CURSOR TRAIL ---
    const coords = { x: 0, y: 0 };
    const hearts = document.querySelectorAll(".heart");

    // Initial Color Reset
    hearts.forEach(function (heart) {
        heart.x = 0;
        heart.y = 0;
        heart.style.position = 'fixed';
        heart.style.pointerEvents = 'none';
        heart.style.zIndex = '9999';
    });

    window.addEventListener("mousemove", function (e) {
        coords.x = e.clientX;
        coords.y = e.clientY;
    });

    function animateHearts() {
        let x = coords.x;
        let y = coords.y;

        hearts.forEach(function (heart, index) {
            heart.style.left = x - 12 + "px";
            heart.style.top = y - 12 + "px";

            heart.style.opacity = (hearts.length - index) / hearts.length;

            heart.x = x;
            heart.y = y;

            const nextHeart = hearts[index + 1] || hearts[0];
            x += (nextHeart.x - x) * 0.3;
            y += (nextHeart.y - y) * 0.3;
        });

        requestAnimationFrame(animateHearts);
    }

    if (hearts.length > 0) animateHearts();

});

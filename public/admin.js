document.addEventListener('DOMContentLoaded', () => {
    // --- STATE VARIABLES ---
    let currentData = {};
    const saveBtn = document.getElementById('save-btn');

    const API_URL = '/api/content';
    let originalData = {};
    let cropper; // Cropper instance
    const cropperModal = document.getElementById('cropper-modal');
    const cropperImage = document.getElementById('cropper-image');
    const btnCancelCrop = document.getElementById('btn-cancel-crop');
    const btnSaveCrop = document.getElementById('btn-save-crop');

    // Ensure modal is hidden initially
    if (cropperModal) cropperModal.style.display = 'none';

    // Helper to open Cropper
    function openCropper(file) {
        console.log('Opening cropper for file:', file.name);
        return new Promise((resolve, reject) => {
            // If not an image, bypass cropper and return original file
            if (!file.type.startsWith('image/')) {
                console.log('File is not an image, bypassing cropper');
                resolve(file);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                cropperImage.src = e.target.result;
                cropperModal.style.display = 'flex';

                // Destroy previous instance if exists
                if (cropper) {
                    cropper.destroy();
                    cropper = null;
                }

                // Initialize Cropper
                cropper = new Cropper(cropperImage, {
                    aspectRatio: NaN, // Free crop
                    viewMode: 1,
                    autoCropArea: 0.8,
                    responsive: true,
                });

                // Handle Save
                btnSaveCrop.onclick = () => {
                    console.log('Crop saved');
                    if (!cropper) {
                        reject('Cropper not initialized');
                        return;
                    }
                    cropper.getCroppedCanvas().toBlob((blob) => {
                        cropperModal.style.display = 'none';
                        resolve(blob);
                    });
                };

                // Handle Cancel
                btnCancelCrop.onclick = () => {
                    console.log('Crop cancelled');
                    cropperModal.style.display = 'none';
                    reject('Cropping cancelled');
                };
            };
            reader.readAsDataURL(file);
        });
    }

    // --- 1. INITIALIZATION: FETCH CONTENT ---
    fetch(API_URL)
        .then(response => response.json())
        .then(data => {
            currentData = data;
            populateForm(data);
        })
        .catch(err => console.error('Error fetching data:', err));

    // --- 2. TAB NAVIGATION LOGIC ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.admin-view');
    const pageTitle = document.getElementById('page-title');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            console.log('Clicked nav:', item.textContent);
            navItems.forEach(nav => nav.classList.remove('active'));
            views.forEach(view => view.classList.remove('active'));
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            console.log('Target ID:', targetId);
            const targetEl = document.getElementById(targetId);
            if (targetEl) targetEl.classList.add('active');
            else console.error('Target element not found:', targetId);
            pageTitle.textContent = item.textContent;
        });
    });

    // --- HELPER: FILE UPLOAD SETUP ---
    function setupFileUpload(areaId, inputId, urlId, previewId) {
        const area = document.getElementById(areaId);
        const input = document.getElementById(inputId);
        const urlInput = document.getElementById(urlId);

        if (!area || !input) return;

        // Click to open file dialog
        area.addEventListener('click', () => input.click());

        // File change
        input.addEventListener('change', () => {
            const file = input.files[0];
            if (file) handleUpload(file);
        });

        // Drag & Drop
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.style.borderColor = '#d4af37';
        });
        area.addEventListener('dragleave', () => {
            area.style.borderColor = '#333';
        });
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.style.borderColor = '#333';
            const file = e.dataTransfer.files[0];
            if (file) handleUpload(file);
        });

        function handleUpload(file) {
            const pText = area.querySelector('p');
            const originalText = pText ? pText.textContent : "Uploading...";
            if (pText) pText.textContent = "Uploading...";

            const formData = new FormData();
            formData.append('image', file);

            fetch('/api/upload', { method: 'POST', body: formData })
                .then(r => r.text().then(text => {
                    try {
                        return JSON.parse(text);
                    } catch (e) {
                        throw new Error("Server returned non-JSON response (likely Vercel Read-Only Error). Please use Localhost.");
                    }
                }))
                .then(data => {
                    if (data.url) {
                        if (urlInput) urlInput.value = data.url;
                        updatePreview(previewId, data.url);
                        showToast('Upload Successful!');
                    } else if (data.error) {
                        throw new Error(data.error);
                    }
                })
                .catch(err => {
                    console.error('Upload Error:', err);
                    showToast('Upload Failed', true);
                    alert("⚠️ UPLOAD FAILED ⚠️\n\nIf you are on Vercel/Live Site: You CANNOT upload files here.\nPlease use the Local Admin Panel (http://localhost:3000/admin) to upload photos.");
                })
                .finally(() => {
                    if (pText) pText.textContent = originalText;
                });
        }
    }

    // --- HELPER: GET MEDIA HTML ---
    function getMediaPreview(url, id, style = "") {
        if (!url) {
            return `<img id="${id}" src="" style="display:none; ${style}">`;
        }
        const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i);
        if (isVideo) {
            return `<video id="${id}" src="${url}" controls style="${style}"></video>`;
        } else {
            return `<img id="${id}" src="${url}" style="${style}">`;
        }
    }

    // --- HELPER: UPDATE PREVIEW ELEMENT ---
    function updatePreview(id, url) {
        const el = document.getElementById(id);
        if (!el) return;

        const parent = el.parentElement;
        const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i);
        const currentTag = el.tagName.toLowerCase();

        if ((isVideo && currentTag === 'img') || (!isVideo && currentTag === 'video')) {
            const newEl = document.createElement(isVideo ? 'video' : 'img');
            newEl.id = id;
            newEl.style.cssText = el.style.cssText;
            newEl.style.display = 'block';
            if (isVideo) newEl.controls = true;
            newEl.src = url;
            parent.replaceChild(newEl, el);
        } else {
            el.src = url;
            el.style.display = 'block';
        }
    }

    // --- 3. POPULATE FORM ---
    function populateForm(data) {
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };

        // Hero
        setVal('hero-title', data.hero?.title);
        setVal('hero-subtitle', data.hero?.subtitle);
        setVal('hero-buttonText', data.hero?.buttonText);
        setVal('hero-backgroundImage', data.hero?.backgroundImage);
        if (data.hero?.backgroundImage) {
            updatePreview('hero-image-preview', data.hero.backgroundImage);
        }

        // Story
        setVal('story-title', data.story?.title);
        setVal('story-date', data.story?.date);
        setVal('story-text', data.story?.text);

        // Story Image Handling
        setVal('story-imageUrl', data.story?.imageUrl);
        if (data.story?.imageUrl) {
            updatePreview('story-image-preview', data.story.imageUrl);
        }

        renderTimeline();
        renderGallery();

        // Collage
        setVal('collage-caption', data.collage?.caption);
        if (data.collage?.images) {
            // 1
            setVal('collage-url-1', data.collage.images[0]);
            updatePreview('collage-preview-1', data.collage.images[0]);
            // 2
            setVal('collage-url-2', data.collage.images[1]);
            updatePreview('collage-preview-2', data.collage.images[1]);
            // 3
            setVal('collage-url-3', data.collage.images[2]);
            updatePreview('collage-preview-3', data.collage.images[2]);
        }

        setVal('letter-title', data.letter?.title);
        setVal('letter-text', data.letter?.text);

        setVal('future-title', data.future?.title);
        setVal('future-intro', data.future?.intro);
        setVal('future-buttonText', data.future?.buttonText);
        setVal('future-password', data.future?.password);
        setVal('future-secretTitle', data.future?.secretTitle);
        setVal('future-secretTitle', data.future?.secretTitle);
        setVal('future-secretMessage', data.future?.secretMessage);
        setVal('future-videoUrl', data.future?.secretVideoUrl);
        if (data.future?.secretVideoUrl) {
            updatePreview('future-video-preview', data.future.secretVideoUrl);
        }

        // Vibes
        if (data.vibes) {
            [1, 2, 3, 4, 5].forEach(i => {
                setVal(`vibe-url-${i}`, data.vibes[`vibe${i}`]);
                updatePreview(`vibe-preview-${i}`, data.vibes[`vibe${i}`]);
            });
        }

        // Emotional Video

    }

    // --- RENDERERS ---
    function renderTimeline() {
        const container = document.getElementById('timeline-list');
        if (!container) return;
        container.innerHTML = '';

        (currentData.timeline || []).forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'item-card';
            div.innerHTML = `
                <div class="item-header">
                    <span>Event #${index + 1}</span>
                    <button type="button" class="btn-remove" onclick="removeTimeline(${index})">Remove</button>
                </div>
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" value="${item.title || ''}" onchange="updateTimeline(${index}, 'title', this.value)">
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <input type="text" value="${item.date || ''}" onchange="updateTimeline(${index}, 'date', this.value)">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea rows="2" onchange="updateTimeline(${index}, 'description', this.value)">${item.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Image</label>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="hidden" value="${item.imageUrl || ''}" id="timeline-url-${index}">
                        <img src="${item.imageUrl || ''}" id="timeline-preview-${index}" style="width: 40px; height: 40px; object-fit: cover; display: ${item.imageUrl ? 'block' : 'none'}; border-radius: 4px;">
                        <input type="file" id="timeline-file-${index}" style="display:none" onchange="uploadItemImage('timeline', ${index})">
                        <button type="button" class="btn-primary" style="padding: 5px 10px; font-size: 0.8rem;" onclick="document.getElementById('timeline-file-${index}').click()">📁 Upload</button>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    function renderGallery() {
        const container = document.getElementById('gallery-list');
        if (!container) return;
        container.innerHTML = '';

        (currentData.gallery || []).forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'item-card gallery-card';
            div.innerHTML = `
                <button type="button" class="btn-remove" style="position:absolute; top:5px; right:5px; z-index:10;" onclick="removeGallery(${index})">X</button>
                <img src="${item.imageUrl || 'https://placehold.co/100?text=No+Image'}" id="gallery-preview-${index}" style="width:100%; height:120px; object-fit:cover; margin-bottom:10px;">
                
                <div class="form-group" style="text-align: center;">
                    <input type="hidden" value="${item.imageUrl || ''}" id="gallery-url-${index}">
                    <input type="file" id="gallery-file-${index}" style="display:none" onchange="uploadItemImage('gallery', ${index})">
                    <button type="button" class="btn-primary" style="width:100%; padding: 5px;" onclick="document.getElementById('gallery-file-${index}').click()">📁 Upload Photo</button>
                </div>
                
                <div class="form-group">
                    <label>Caption</label>
                    <input type="text" value="${item.caption || ''}" onchange="updateGallery(${index}, 'caption', this.value)">
                </div>
            `;
            container.appendChild(div);
        });
    }

    // --- GLOBAL ACTIONS ---
    window.removeTimeline = i => { currentData.timeline.splice(i, 1); renderTimeline(); };
    window.removeGallery = i => { currentData.gallery.splice(i, 1); renderGallery(); };

    window.updateTimeline = (i, f, v) => currentData.timeline[i][f] = v;
    window.updateGallery = (i, f, v) => currentData.gallery[i][f] = v;

    // ADD BUTTONS
    const addTimelineBtn = document.getElementById('add-timeline-btn');
    if (addTimelineBtn) {
        addTimelineBtn.addEventListener('click', () => {
            if (!currentData.timeline) currentData.timeline = [];
            currentData.timeline.push({ title: "New Event", date: "", description: "" });
            renderTimeline();
        });
    }

    const addGalleryBtn = document.getElementById('add-gallery-btn');
    if (addGalleryBtn) {
        addGalleryBtn.addEventListener('click', () => {
            if (!currentData.gallery) currentData.gallery = [];
            currentData.gallery.push({ caption: "", imageUrl: "" });
            renderGallery();
        });
    }

    // GENERIC UPLOAD WITH CROP
    window.uploadItemImage = (type, index) => {
        const fileInput = document.getElementById(`${type}-file-${index}`);
        if (!fileInput || !fileInput.files[0]) return;

        openCropper(fileInput.files[0]).then(blob => {
            const btn = fileInput.nextElementSibling;
            const originalText = btn.textContent;
            btn.textContent = "Uploading...";

            const formData = new FormData();
            formData.append('image', blob, `${type}-${index}.jpg`); // Use cropped blob

            fetch('/api/upload', { method: 'POST', body: formData })
                .then(r => r.json())
                .then(data => {
                    if (data.url) {
                        if (type === 'timeline') currentData.timeline[index].imageUrl = data.url;
                        if (type === 'gallery') currentData.gallery[index].imageUrl = data.url;

                        // Update UI
                        const urlInput = document.getElementById(`${type}-url-${index}`);
                        if (urlInput) urlInput.value = data.url;

                        // Add timestamp to force refresh if URL is same
                        const timestampedUrl = `${data.url}?t=${new Date().getTime()}`;
                        updatePreview(`${type}-preview-${index}`, timestampedUrl);

                        showToast("Uploaded!");
                    }
                })
                .catch(err => console.error('Upload failed:', err))
                .finally(() => btn.textContent = originalText);

        }).catch(err => {
            console.log('Cropping cancelled or failed:', err);
            // Optionally clear input if cancelled so change event can fire again
            fileInput.value = '';
        });
    };

    // STORY UPLOAD
    const storyUploadBtn = document.getElementById('story-upload-btn');
    const storyFileInput = document.getElementById('story-file-input');

    if (storyUploadBtn && storyFileInput) {
        storyUploadBtn.addEventListener('click', () => storyFileInput.click());
        storyFileInput.addEventListener('change', function () {
            if (!this.files[0]) return;
            const formData = new FormData();
            formData.append('image', this.files[0]);

            storyUploadBtn.textContent = "Uploading...";
            fetch('/api/upload', { method: 'POST', body: formData })
                .then(r => r.json())
                .then(data => {
                    if (data.url) {
                        const hiddenInput = document.getElementById('story-imageUrl');
                        if (hiddenInput) hiddenInput.value = data.url;

                        updatePreview('story-image-preview', data.url);
                        showToast("Uploaded!");
                    }
                })
                .finally(() => storyUploadBtn.textContent = "📁 Upload Image");
        });
    }

    // HERO UPLOAD
    const heroUploadBtn = document.getElementById('hero-upload-btn');
    const heroInput = document.getElementById('hero-file-input');

    heroUploadBtn.addEventListener('click', () => heroInput.click());
    heroInput.addEventListener('change', function () {
        if (!this.files[0]) return;
        openCropper(this.files[0]).then(blob => {
            const formData = new FormData();
            formData.append('image', blob, 'hero-image.jpg'); // Rename to ensure correct type
            heroUploadBtn.textContent = "Uploading...";
            fetch('/api/upload', { method: 'POST', body: formData })
                .then(r => r.text().then(text => {
                    try { return JSON.parse(text); }
                    catch (e) { throw new Error("Server returned non-JSON. Use Localhost."); }
                }))
                .then(data => {
                    if (data.url) {
                        const heroBgInput = document.getElementById('hero-backgroundImage');
                        if (heroBgInput) heroBgInput.value = data.url;

                        // Add timestamp to bypass browser cache
                        const timestampedUrl = `${data.url}?t=${new Date().getTime()}`;
                        updatePreview('hero-image-preview', timestampedUrl);
                        showToast('Hero Image Updated!');
                    } else { throw new Error(data.error); }
                })
                .catch(err => {
                    console.error('Upload failed:', err);
                    alert('⚠️ Upload Failed: You are likely on the Live Site.\nPlease use http://localhost:3000/admin to upload photos.');
                })
                .finally(() => heroUploadBtn.textContent = "📁 Upload New Photo");
        }).catch(err => {
            console.error('Cropper error:', err);
            if (err !== 'Cropping cancelled') alert('Error: ' + err);
        });
    });

    // COLLAGE UPLOADS (1, 2, 3)
    [1, 2, 3].forEach(num => {
        const btn = document.getElementById(`btn-upload-collage-${num}`);
        const input = document.getElementById(`file-collage-${num}`);
        if (btn && input) {
            // Remove old listeners by cloning
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener('click', () => {
                console.log(`Clicked upload collage ${num}`);
                input.click();
            });

            input.addEventListener('change', function () {
                console.log(`File changed for collage ${num}`);
                if (!this.files[0]) return;
                openCropper(this.files[0]).then(blob => {
                    console.log('Got cropped blob, uploading...');
                    const formData = new FormData();
                    formData.append('image', blob, `collage-${num}.jpg`);
                    newBtn.textContent = "Uploading...";
                    fetch('/api/upload', { method: 'POST', body: formData })
                        .then(r => r.text().then(text => {
                            try { return JSON.parse(text); }
                            catch (e) { throw new Error("Server returned non-JSON. Use Localhost."); }
                        }))
                        .then(data => {
                            if (data.url) {
                                document.getElementById(`collage-url-${num}`).value = data.url;
                                const timestampedUrl = `${data.url}?t=${new Date().getTime()}`;
                                updatePreview(`collage-preview-${num}`, timestampedUrl);
                                showToast(`Photo ${num} Uploaded!`);
                            } else { throw new Error(data.error); }
                        })
                        .catch(err => {
                            console.error('Upload failed:', err);
                            alert('⚠️ Upload Failed: You are likely on the Live Site.\nPlease use http://localhost:3000/admin to upload photos.');
                        })
                        .finally(() => newBtn.textContent = `📁 Upload Photo ${num}`);
                }).catch(err => console.log(err));
            });
        }
    });

    // VIBES UPLOADS (1-5)
    [1, 2, 3, 4, 5].forEach(num => {
        const btn = document.getElementById(`btn-upload-vibe-${num}`);
        const input = document.getElementById(`file-vibe-${num}`);
        if (btn && input) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener('click', () => {
                console.log(`Clicked upload vibe ${num}`);
                input.click();
            });

            input.addEventListener('change', function () {
                console.log(`File changed for vibe ${num}`);
                if (!this.files[0]) return;
                openCropper(this.files[0]).then(blob => {
                    const formData = new FormData();
                    formData.append('image', blob, `vibe-${num}.jpg`);
                    newBtn.textContent = "Uploading...";
                    fetch('/api/upload', { method: 'POST', body: formData })
                        .then(r => r.text().then(text => {
                            try { return JSON.parse(text); }
                            catch (e) { throw new Error("Server returned non-JSON. Use Localhost."); }
                        }))
                        .then(data => {
                            if (data.url) {
                                document.getElementById(`vibe-url-${num}`).value = data.url;
                                const timestampedUrl = `${data.url}?t=${new Date().getTime()}`;
                                updatePreview(`vibe-preview-${num}`, timestampedUrl);
                                showToast(`Vibe ${num} Uploaded!`);
                            } else { throw new Error(data.error); }
                        })
                        .catch(err => {
                            console.error('Upload failed:', err);
                            alert('⚠️ Upload Failed: You are likely on the Live Site.\nPlease use http://localhost:3000/admin to upload photos.');
                        })
                        .finally(() => newBtn.textContent = `📁 Upload Photo`);
                }).catch(err => console.log(err));
            });
        }
    });


    // SECRET VIDEO UPLOAD
    const secretVideoUploadBtn = document.getElementById('future-video-upload-btn');
    const secretVideoInput = document.getElementById('future-video-input');

    if (secretVideoUploadBtn && secretVideoInput) {
        secretVideoUploadBtn.addEventListener('click', () => secretVideoInput.click());
        secretVideoInput.addEventListener('change', function () {
            if (!this.files[0]) return;
            const formData = new FormData();
            formData.append('image', this.files[0]);

            secretVideoUploadBtn.textContent = "Uploading...";
            fetch('/api/upload', { method: 'POST', body: formData })
                .then(r => r.text().then(text => {
                    try { return JSON.parse(text); }
                    catch (e) { throw new Error("Server returned non-JSON. Use Localhost."); }
                }))
                .then(data => {
                    if (data.url) {
                        const hiddenInput = document.getElementById('future-videoUrl');
                        if (hiddenInput) hiddenInput.value = data.url;

                        const videoPreview = document.getElementById('future-video-preview');
                        if (videoPreview) {
                            videoPreview.src = data.url;
                            videoPreview.style.display = 'block';
                        }
                        showToast("Secret Video Uploaded!");
                    } else { throw new Error(data.error); }
                })
                .catch(err => {
                    console.error('Upload failed:', err);
                    alert('⚠️ Upload Failed: You are likely on the Live Site.\nPlease use http://localhost:3000/admin to upload video.');
                })
                .finally(() => secretVideoUploadBtn.textContent = "📁 Upload Secret Video");
        });
    }

    // --- 4. SAVE LOGIC ---
    if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();

            const updatedData = {
                ...currentData,
                hero: {
                    title: document.getElementById('hero-title').value,
                    subtitle: document.getElementById('hero-subtitle').value,
                    buttonText: document.getElementById('hero-buttonText').value,
                    backgroundImage: document.getElementById('hero-backgroundImage') ? document.getElementById('hero-backgroundImage').value : ''
                },
                story: {
                    title: document.getElementById('story-title').value,
                    date: document.getElementById('story-date').value,
                    text: document.getElementById('story-text').value,
                    imageUrl: document.getElementById('story-imageUrl') ? document.getElementById('story-imageUrl').value : ''
                },
                collage: {
                    caption: document.getElementById('collage-caption').value,
                    images: [
                        document.getElementById('collage-url-1').value,
                        document.getElementById('collage-url-2').value,
                        document.getElementById('collage-url-3').value
                    ]
                },
                letter: {
                    title: document.getElementById('letter-title').value,
                    text: document.getElementById('letter-text').value
                },
                future: {
                    title: document.getElementById('future-title').value,
                    intro: document.getElementById('future-intro').value,
                    buttonText: document.getElementById('future-buttonText').value,
                    password: document.getElementById('future-password').value,
                    secretTitle: document.getElementById('future-secretTitle').value,
                    secretMessage: document.getElementById('future-secretMessage').value,
                    secretVideoUrl: document.getElementById('future-videoUrl') ? document.getElementById('future-videoUrl').value : ''
                },
                vibes: {
                    vibe1: document.getElementById('vibe-url-1').value,
                    vibe2: document.getElementById('vibe-url-2').value,
                    vibe3: document.getElementById('vibe-url-3').value,
                    vibe4: document.getElementById('vibe-url-4').value,
                    vibe5: document.getElementById('vibe-url-5').value
                },
                music: {
                    url: document.getElementById('music-url').value,
                    startTime: document.getElementById('music-startTime').value,
                    endTime: document.getElementById('music-endTime').value,
                    volume: document.getElementById('music-volume').value
                }
            };

            fetch('/api/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            })
                .then(response => response.json())
                .then(result => {
                    showToast('Saved Successfully!');
                    currentData = updatedData;
                    saveBtn.textContent = "💾 Save All Changes";
                })
                .catch(err => {
                    console.error(err);
                    showToast('Error saving data.', true);
                    saveBtn.textContent = "💾 Save All Changes";
                });
        });
    }

    // --- BACKGROUND MUSIC LOGIC ---
    const musicUploadBtn = document.getElementById('music-upload-btn');
    const musicFileInput = document.getElementById('music-file-input');
    const musicUrlInput = document.getElementById('music-url');
    const musicAudio = document.getElementById('music-preview');
    const startTimeInput = document.getElementById('music-startTime');
    const endTimeInput = document.getElementById('music-endTime');
    const volumeInput = document.getElementById('music-volume');
    const volumeDisplay = document.getElementById('volume-display');
    const testLoopBtn = document.getElementById('btn-preview-loop');

    if (musicUploadBtn && musicFileInput) {
        musicUploadBtn.addEventListener('click', () => musicFileInput.click());

        musicFileInput.addEventListener('change', function () {
            if (!this.files[0]) return;
            const btn = musicUploadBtn;
            const originalText = btn.textContent;
            btn.textContent = "Uploading...";

            const formData = new FormData();
            formData.append('file', this.files[0]);

            fetch('/api/upload-audio', { method: 'POST', body: formData })
                .then(r => r.text().then(text => {
                    try { return JSON.parse(text); }
                    catch (e) { throw new Error("Server returned non-JSON. Use Localhost."); }
                }))
                .then(data => {
                    if (data.url) {
                        musicUrlInput.value = data.url;
                        musicAudio.src = data.url;
                        showToast("Music Uploaded!");
                    } else { throw new Error(data.error); }
                })
                .catch(err => {
                    console.error('Upload failed:', err);
                    alert('⚠️ Upload Failed: You are likely on the Live Site.\nPlease use http://localhost:3000/admin to upload music.');
                    showToast("Upload Failed", true);
                })
                .finally(() => btn.textContent = originalText);
        });
    }

    // Volume Control
    if (volumeInput && volumeDisplay) {
        volumeInput.addEventListener('input', (e) => {
            const val = e.target.value;
            volumeDisplay.textContent = val + "%";
            if (musicAudio) musicAudio.volume = val / 100;
        });
    }

    // Preview Logic
    if (musicAudio) {
        musicAudio.addEventListener('timeupdate', () => {
            const start = parseFloat(startTimeInput.value) || 0;
            const end = parseFloat(endTimeInput.value) || 0;

            if (end > 0 && musicAudio.currentTime >= end) {
                musicAudio.currentTime = start;
                musicAudio.play();
            }
        });
    }

    if (testLoopBtn) {
        testLoopBtn.addEventListener('click', () => {
            const end = parseFloat(endTimeInput.value) || 0;
            if (end > 5) {
                musicAudio.currentTime = end - 5;
                musicAudio.play();
            } else {
                musicAudio.currentTime = 0;
                musicAudio.play();
            }
        });
    }

    // --- TOAST NOTIFICATION ---
    function showToast(message, isError = false) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.style.backgroundColor = isError ? '#ef4444' : '#10b981';
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    // Bottom Upload Manager (Optional fallback)
    const fileInput = document.getElementById('image-upload-input');
    const uploadBtn = document.getElementById('upload-btn');
    if (fileInput && uploadBtn) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) uploadBtn.style.display = 'inline-block';
        });
        uploadBtn.addEventListener('click', () => {
            const file = fileInput.files[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('image', file);
            fetch('/api/upload', { method: 'POST', body: formData })
                .then(res => res.json())
                .then(data => {
                    const urlInput = document.getElementById('uploaded-url');
                    if (urlInput && data.url) {
                        urlInput.value = data.url;
                        document.getElementById('uploaded-url-container').style.display = 'block';
                        showToast("Uploaded!");
                    }
                });
        });
    }
}); // End of DOMContentLoaded

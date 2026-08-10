/**
 * Media Categorizer Pro - Client Application Logic
 * Studio Edition - Native Browser Directory Picker
 */

document.addEventListener('DOMContentLoaded', () => {

    // Global App State
    const state = {
        folderPath: '',
        folderName: '',
        targetBasePath: localStorage.getItem('media_categorizer_target_base') || '',
        files: [],
        filteredFiles: [],
        activeFileIndex: -1,
        activeFilter: 'all',
        searchQuery: '',
        selectedFileIds: new Set(),
        selectionMode: 'manual',
        reviewDirection: 'right',
        categories: [],
        theme: localStorage.getItem('media_categorizer_theme') || 'light',
        deleteConfirmEnabled: localStorage.getItem('media_categorizer_delete_confirm_enabled') !== 'false',
        imageScale: 1.0,
        imageRotation: 0,
        draggedFilePath: null,
        browserFolderHandle: null,
        browserTargetHandle: null,
        browserScanMode: false,
        activeObjectUrl: null,
        backendEnabled: location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:',
        isBrowsing: false  // debounce lock for browse buttons
    };

    // DOM Elements
    const elements = {
        btnThemeToggle: document.getElementById('btnThemeToggle'),
        themeToggleText: document.getElementById('themeToggleText'),
        activePathDisplay: document.getElementById('activePathDisplay'),
        currentFolderPath: document.getElementById('currentFolderPath'),
        btnBrowseFolder: document.getElementById('btnBrowseFolder'),
        btnUndo: document.getElementById('btnUndo'),
        btnHotkeysHelp: document.getElementById('btnHotkeysHelp'),
        // Native folder selection is handled by the backend dialog helper
        sidebar: document.getElementById('sidebar'),
        fileCountPill: document.getElementById('fileCountPill'),
        searchInput: document.getElementById('searchInput'),
        btnClearSearch: document.getElementById('btnClearSearch'),
        filterPills: document.querySelectorAll('.filter-pill'),
        selectAllCheckbox: document.getElementById('selectAllCheckbox'),
        selectedCountBadge: document.getElementById('selectedCountBadge'),
        batchActionMenu: document.getElementById('batchActionMenu'),
        fileListContainer: document.getElementById('fileListContainer'),
        sidebarResizer: document.getElementById('sidebarResizer'),
        upperPane: document.getElementById('upperPane'),
        mediaTitle: document.getElementById('mediaTitle'),
        mediaTypeBadge: document.getElementById('mediaTypeBadge'),
        mediaSizeBadge: document.getElementById('mediaSizeBadge'),
        mediaIndexBadge: document.getElementById('mediaIndexBadge'),
        btnDeleteMedia: document.getElementById('btnDeleteMedia'),
        btnPrevMedia: document.getElementById('btnPrevMedia'),
        btnNextMedia: document.getElementById('btnNextMedia'),
        btnToggleDeleteConfirm: document.getElementById('btnToggleDeleteConfirm'),
        deleteConfirmToggleText: document.getElementById('deleteConfirmToggleText'),
        deleteConfirmModal: document.getElementById('deleteConfirmModal'),
        deleteConfirmText: document.getElementById('deleteConfirmText'),
        btnConfirmDeleteModal: document.getElementById('btnConfirmDeleteModal'),
        btnCancelDeleteModal: document.getElementById('btnCancelDeleteModal'),
        btnCloseDeleteModal: document.getElementById('btnCloseDeleteModal'),
        viewerEmptyState: document.getElementById('viewerEmptyState'),
        imageViewerMode: document.getElementById('imageViewerMode'),
        activeImageViewer: document.getElementById('activeImageViewer'),
        imageContainer: document.getElementById('imageContainer'),
        videoViewerMode: document.getElementById('videoViewerMode'),
        activeVideoPlayer: document.getElementById('activeVideoPlayer'),
        audioViewerMode: document.getElementById('audioViewerMode'),
        activeAudioPlayer: document.getElementById('activeAudioPlayer'),
        audioDisc: document.getElementById('audioDisc'),
        waveformAnim: document.getElementById('waveformAnim'),
        audioFileName: document.getElementById('audioFileName'),
        audioFileMeta: document.getElementById('audioFileMeta'),
        btnZoomIn: document.getElementById('btnZoomIn'),
        btnZoomOut: document.getElementById('btnZoomOut'),
        btnZoomReset: document.getElementById('btnZoomReset'),
        btnRotateLeft: document.getElementById('btnRotateLeft'),
        btnRotateRight: document.getElementById('btnRotateRight'),
        paneVerticalResizer: document.getElementById('paneVerticalResizer'),
        lowerPane: document.getElementById('lowerPane'),
        btnCreateCategory: document.getElementById('btnCreateCategory'),
        categoryTilesGrid: document.getElementById('categoryTilesGrid'),
        categoryScrollContainer: document.getElementById('categoryScrollContainer'),
        categoryCountBadge: document.getElementById('categoryCountBadge'),
        btnScrollCategoriesLeft: document.getElementById('btnScrollCategoriesLeft'),
        btnScrollCategoriesRight: document.getElementById('btnScrollCategoriesRight'),
        btnFullScreenMedia: document.getElementById('btnFullScreenMedia'),
        targetBaseBadge: document.getElementById('targetBaseBadge'),
        targetBasePathDisplay: document.getElementById('targetBasePathDisplay'),
        btnChangeTargetBase: document.getElementById('btnChangeTargetBase'),
        targetBaseModal: document.getElementById('targetBaseModal'),
        targetBasePathInput: document.getElementById('targetBasePathInput'),
        btnBrowseTargetOs: document.getElementById('btnBrowseTargetOs'),
        btnConfirmTargetBaseModal: document.getElementById('btnConfirmTargetBaseModal'),
        btnCancelTargetBaseModal: document.getElementById('btnCancelTargetBaseModal'),
        btnCloseTargetBaseModal: document.getElementById('btnCloseTargetBaseModal'),
        folderPickerModal: document.getElementById('folderPickerModal'),
        folderPathInput: document.getElementById('folderPathInput'),
        btnConfirmFolderModal: document.getElementById('btnConfirmFolderModal'),
        btnCancelFolderModal: document.getElementById('btnCancelFolderModal'),
        btnCloseFolderModal: document.getElementById('btnCloseFolderModal'),
        btnBrowseSourceOs: document.getElementById('btnBrowseSourceOs'),
        createCategoryModal: document.getElementById('createCategoryModal'),
        newCategoryNameInput: document.getElementById('newCategoryNameInput'),
        btnConfirmCategoryModal: document.getElementById('btnConfirmCategoryModal'),
        btnCancelCategoryModal: document.getElementById('btnCancelCategoryModal'),
        btnCloseCategoryModal: document.getElementById('btnCloseCategoryModal'),
        hotkeysModal: document.getElementById('hotkeysModal'),
        btnCloseHotkeysModal: document.getElementById('btnCloseHotkeysModal'),
        btnCloseHotkeysModalBtn: document.getElementById('btnCloseHotkeysModalBtn'),
        toastContainer: document.getElementById('toastContainer')
    };

    // ==========================================
    // INITIALIZATION
    // ==========================================
    function init() {
        applyTheme(state.theme);
        setupEventListeners();
        setupDragAndDrop();
        setupResizers();
        setupModalBackdropClicks();
        setupCategoryCarouselScroll();
        clearMediaViewer();
        updateDeleteConfirmToggleUI();
        updateTargetBaseUI();
        renderCategoryTiles();
        loadQuickFolders();
        if (state.targetBasePath) {
            fetchCategories();
        }
    }

    function applyTheme(themeName) {
        state.theme = themeName;
        localStorage.setItem('media_categorizer_theme', themeName);
        document.body.className = `${themeName}-theme`;
        if (elements.themeToggleText) {
            elements.themeToggleText.textContent = themeName === 'dark' ? 'Dark' : 'Light';
        }
        if (elements.btnThemeToggle) {
            const icon = elements.btnThemeToggle.querySelector('i');
            if (icon) icon.className = themeName === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
        }
    }

    // ==========================================
    // NATIVE WINDOWS FOLDER BROWSER
    // ==========================================

    /**
     * Opens native Windows Folder Selector window via backend helper.
     * ZERO Chrome 'Upload' warnings.
     */
    async function browseSourceFolder() {
        // If running on localhost, prefer the server-side native dialog (server has access to filesystem).
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:') {
            showToast('Opening native folder selector on server...', 'info');
            try {
                const res = await fetch('/api/open-folder-dialog', { method: 'POST' });
                const data = await res.json();
                if (data.success && data.path) {
                    elements.folderPathInput.value = data.path;
                    showToast('Folder selected. Click Scan Folder to load files.', 'success');
                    return;
                }
                showToast(data.message || 'Unable to open folder picker on server.', 'error');
                return;
            } catch (err) {
                console.warn('Native dialog error:', err);
                showToast('Native folder picker failed. Please try again.', 'error');
                return;
            }
        }

        if (state.backendEnabled) {
            showToast('Opening native folder selector on server...', 'info');
            try {
                const res = await fetch('/api/open-folder-dialog', { method: 'POST' });
                const data = await res.json();
                if (data.success && data.path) {
                    elements.folderPathInput.value = data.path;
                    showToast('Folder selected. Click Scan Folder to load files.', 'success');
                    return;
                }
                showToast(data.message || 'Unable to open folder picker on server.', 'error');
                return;
            } catch (err) {
                console.warn('Native dialog error:', err);
                showToast('Native folder picker failed. Please try again.', 'error');
                return;
            }
        }

        if (!window.showDirectoryPicker) {
            showModal(elements.folderPickerModal);
            showToast('Your browser does not support folder access. Paste the full folder path into the dialog and click Scan Folder, or run the app locally for native browsing.', 'info');
            return;
        }

        try {
            const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
            state.browserFolderHandle = dirHandle;
            state.browserTargetHandle = null;
            state.browserScanMode = true;
            elements.folderPathInput.value = dirHandle.name;
            elements.folderPathInput.title = `Local folder selected: ${dirHandle.name}`;
            await scanBrowserFolder(dirHandle);
        } catch (err) {
            if (err.name === 'AbortError') {
                showToast('Folder selection cancelled.', 'info');
            } else {
                console.error('Browser folder picker error:', err);
                showToast('Unable to access folder in browser. Please run locally for full filesystem access.', 'error');
            }
        }
    }

    async function browseTargetFolder() {
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:') {
            showToast('Opening native folder selector on server...', 'info');
            try {
                const res = await fetch('/api/open-folder-dialog', { method: 'POST' });
                const data = await res.json();
                if (data.success && data.path) {
                    elements.targetBasePathInput.value = data.path;
                    showToast(`Selected target base: ${data.path}`, 'success');
                    return;
                }
                showToast(data.message || 'Unable to open folder picker on server.', 'error');
                return;
            } catch (err) {
                console.warn('Native dialog error:', err);
                showToast('Native folder picker failed. Please try again.', 'error');
                return;
            }
        }

        if (state.backendEnabled) {
            showToast('Opening native folder selector on server...', 'info');
            try {
                const res = await fetch('/api/open-folder-dialog', { method: 'POST' });
                const data = await res.json();
                if (data.success && data.path) {
                    elements.targetBasePathInput.value = data.path;
                    showToast(`Selected target base: ${data.path}`, 'success');
                    return;
                }
                showToast(data.message || 'Unable to open folder picker on server.', 'error');
                return;
            } catch (err) {
                console.warn('Native dialog error:', err);
                showToast('Native folder picker failed. Please try again.', 'error');
                return;
            }
        }

        if (!window.showDirectoryPicker) {
            showModal(elements.targetBaseModal);
            showToast('Your browser does not support folder access. Paste the full target base path into the dialog and confirm, or run the app locally for native browsing.', 'info');
            return;
        }

        try {
            const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
            state.browserTargetHandle = dirHandle;
            state.browserFolderHandle = null;
            elements.targetBasePathInput.value = dirHandle.name;
            elements.targetBasePathInput.title = `Local folder selected: ${dirHandle.name}`;
            showModal(elements.targetBaseModal);
            showToast('Local target selected in browser. Paste the full absolute path here if you want server-side category configuration, or run the app locally.', 'info');
        } catch (err) {
            if (err.name === 'AbortError') {
                showToast('Folder selection cancelled.', 'info');
            } else {
                console.error('Browser folder picker error:', err);
                showToast('Unable to access target folder in browser. Please run locally for full filesystem access.', 'error');
            }
        }
    }

    /**
     * Loads common Windows system directories as quick select chips inside modals.
     */
    async function loadQuickFolders() {
        if (!state.backendEnabled) {
            return;
        }

        try {
            const res = await fetch('/api/quick-folders');
            const data = await res.json();
            const folders = data.folders || [];

            const srcContainer = document.getElementById('sourceQuickFolders');
            const tgtContainer = document.getElementById('targetQuickFolders');

            if (srcContainer) {
                srcContainer.innerHTML = folders.map(f => `
                    <button class="chip-preset" data-path="${f.path}">
                        <i class="fa-regular fa-folder"></i> ${f.name}
                    </button>
                `).join('');

                srcContainer.querySelectorAll('.chip-preset').forEach(btn => {
                    btn.addEventListener('click', () => {
                        elements.folderPathInput.value = btn.dataset.path;
                    });
                });
            }

            if (tgtContainer) {
                tgtContainer.innerHTML = folders.map(f => `
                    <button class="chip-preset" data-path="${f.path}">
                        <i class="fa-regular fa-folder"></i> ${f.name}
                    </button>
                `).join('');

                tgtContainer.querySelectorAll('.chip-preset').forEach(btn => {
                    btn.addEventListener('click', () => {
                        elements.targetBasePathInput.value = btn.dataset.path;
                    });
                });
            }

        } catch (err) {
            console.warn('Failed to load quick folders:', err);
        }
    }


    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    function setupEventListeners() {
        // Theme Toggle
        elements.btnThemeToggle?.addEventListener('click', () => {
            applyTheme(state.theme === 'dark' ? 'light' : 'dark');
            showToast(`Switched to ${state.theme.toUpperCase()} theme`, 'info');
        });

        // ─── Target Base Location ───
        elements.btnChangeTargetBase?.addEventListener('click', openTargetBaseModal);
        elements.targetBaseBadge?.addEventListener('click', openTargetBaseModal);

        elements.btnCancelTargetBaseModal?.addEventListener('click', () => hideModal(elements.targetBaseModal));
        elements.btnCloseTargetBaseModal?.addEventListener('click', () => hideModal(elements.targetBaseModal));

        elements.btnConfirmTargetBaseModal?.addEventListener('click', () => {
            const path = elements.targetBasePathInput.value.trim();
            if (path) {
                state.targetBasePath = path;
                localStorage.setItem('media_categorizer_target_base', path);
                updateTargetBaseUI();
                fetchCategories();
                hideModal(elements.targetBaseModal);
                showToast(`Target base directory set: ${path}`, 'success');
            } else {
                showToast('Please enter or browse a valid target base folder path.', 'error');
            }
        });

        // Browse Target OS button
        elements.btnBrowseTargetOs?.addEventListener('click', browseTargetFolder);


        // ─── Source Folder Dialog ───
        elements.btnBrowseFolder?.addEventListener('click', () => showModal(elements.folderPickerModal));
        elements.btnCancelFolderModal?.addEventListener('click', () => hideModal(elements.folderPickerModal));
        elements.btnCloseFolderModal?.addEventListener('click', () => hideModal(elements.folderPickerModal));

        // Browse Source OS button
        elements.btnBrowseSourceOs?.addEventListener('click', browseSourceFolder);


        // Manual path confirm
        elements.btnConfirmFolderModal?.addEventListener('click', () => {
            const inputPath = elements.folderPathInput.value.trim();
            if (inputPath) {
                if (!state.browserFolderHandle || inputPath !== state.folderPath) {
                    state.browserFolderHandle = null;
                    state.browserScanMode = false;
                }
                hideModal(elements.folderPickerModal);
                scanFolder(inputPath);
            } else {
                showToast('Please enter or browse a folder path.', 'error');
            }
        });

        // ─── Sidebar Search & Filters ───
        elements.searchInput?.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.toLowerCase().trim();
            elements.btnClearSearch.hidden = !state.searchQuery;
            applyFilters();
        });

        elements.btnClearSearch?.addEventListener('click', () => {
            elements.searchInput.value = '';
            state.searchQuery = '';
            elements.btnClearSearch.hidden = true;
            applyFilters();
        });

        elements.filterPills.forEach(pill => {
            pill.addEventListener('click', () => {
                elements.filterPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                state.activeFilter = pill.dataset.type;
                if (state.selectionMode === 'auto') {
                    state.selectedFileIds.clear();
                }
                applyFilters();
            });
        });

        elements.selectAllCheckbox?.addEventListener('change', (e) => {
            state.selectedFileIds.clear();
            state.selectionMode = e.target.checked ? 'auto' : 'manual';
            if (e.target.checked) {
                state.filteredFiles.forEach(f => state.selectedFileIds.add(f.id));
            }
            renderFileList();
            updateSelectionUI();
        });

        // ─── Carousel Scroll Buttons ───
        elements.btnScrollCategoriesLeft?.addEventListener('click', () => {
            elements.categoryScrollContainer.scrollBy({ left: -320, behavior: 'smooth' });
        });
        elements.btnScrollCategoriesRight?.addEventListener('click', () => {
            elements.categoryScrollContainer.scrollBy({ left: 320, behavior: 'smooth' });
        });

        // ─── Delete, Prev, Next ───
        elements.btnDeleteMedia?.addEventListener('click', handleDeleteMediaClick);
        elements.btnPrevMedia?.addEventListener('click', () => {
            state.reviewDirection = 'left';
            navigatePrevMedia();
        });
        elements.btnNextMedia?.addEventListener('click', () => {
            state.reviewDirection = 'right';
            navigateNextMedia();
        });
        elements.btnToggleDeleteConfirm?.addEventListener('click', toggleDeleteConfirmSetting);

        // ─── Image Zoom & Rotate ───
        elements.btnZoomIn?.addEventListener('click', () => transformImage(0.25, 0));
        elements.btnZoomOut?.addEventListener('click', () => transformImage(-0.25, 0));
        elements.btnZoomReset?.addEventListener('click', resetImageTransform);
        elements.btnRotateLeft?.addEventListener('click', () => transformImage(0, -90));
        elements.btnRotateRight?.addEventListener('click', () => transformImage(0, 90));

        // ─── Category Creation ───
        elements.btnCreateCategory?.addEventListener('click', () => {
            if (!state.targetBasePath) {
                showToast('Please configure your Target Base Directory first.', 'error');
                openTargetBaseModal();
                return;
            }
            elements.newCategoryNameInput.value = '';
            showModal(elements.createCategoryModal);
        });
        elements.btnCancelCategoryModal?.addEventListener('click', () => hideModal(elements.createCategoryModal));
        elements.btnCloseCategoryModal?.addEventListener('click', () => hideModal(elements.createCategoryModal));
        elements.btnConfirmCategoryModal?.addEventListener('click', handleCreateCategory);

        // ─── Delete Confirmation Modal ───
        elements.btnCancelDeleteModal?.addEventListener('click', () => hideModal(elements.deleteConfirmModal));
        elements.btnCloseDeleteModal?.addEventListener('click', () => hideModal(elements.deleteConfirmModal));
        elements.btnConfirmDeleteModal?.addEventListener('click', confirmDeleteFile);

        // ─── Hotkeys Modal ───
        elements.btnHotkeysHelp?.addEventListener('click', () => showModal(elements.hotkeysModal));
        elements.btnCloseHotkeysModal?.addEventListener('click', () => hideModal(elements.hotkeysModal));
        elements.btnCloseHotkeysModalBtn?.addEventListener('click', () => hideModal(elements.hotkeysModal));

        // ─── Undo ───
        elements.btnUndo?.addEventListener('click', handleUndo);
        elements.btnFullScreenMedia?.addEventListener('click', toggleFullScreenView);
        document.addEventListener('fullscreenchange', updateFullScreenIcon);

        // ─── Global Keyboard Shortcuts ───
        document.addEventListener('keydown', handleGlobalHotkeys);

        // ─── Audio Visualizer Sync ───
        elements.activeAudioPlayer?.addEventListener('play', () => {
            elements.audioDisc.classList.add('playing');
            elements.waveformAnim.classList.add('playing');
        });
        elements.activeAudioPlayer?.addEventListener('pause', () => {
            elements.audioDisc.classList.remove('playing');
            elements.waveformAnim.classList.remove('playing');
        });
        elements.activeAudioPlayer?.addEventListener('ended', () => {
            elements.audioDisc.classList.remove('playing');
            elements.waveformAnim.classList.remove('playing');
            navigateNextMedia();
        });
    }

    function openTargetBaseModal() {
        elements.targetBasePathInput.value = state.targetBasePath || '';
        showModal(elements.targetBaseModal);
    }

    function setupModalBackdropClicks() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) hideModal(modal);
            });
        });
    }

    // ==========================================
    // CAROUSEL SCROLL & DRAG-TO-SCROLL
    // ==========================================
    function setupCategoryCarouselScroll() {
        const container = elements.categoryScrollContainer;
        if (!container) return;

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const rect = container.getBoundingClientRect();
            const edge = 70;
            if (e.clientX - rect.left < edge) container.scrollLeft -= 15;
            else if (rect.right - e.clientX < edge) container.scrollLeft += 15;
        });

        let isMouseDown = false, startX, scrollLeftPos;

        container.addEventListener('mousedown', (e) => {
            if (e.target.closest('.category-tile')) return;
            isMouseDown = true;
            startX = e.pageX - container.offsetLeft;
            scrollLeftPos = container.scrollLeft;
            container.style.cursor = 'grabbing';
        });

        container.addEventListener('mouseleave', () => { isMouseDown = false; container.style.cursor = 'default'; });
        container.addEventListener('mouseup', () => { isMouseDown = false; container.style.cursor = 'default'; });

        container.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;
            e.preventDefault();
            container.scrollLeft = scrollLeftPos - ((e.pageX - container.offsetLeft) - startX) * 2;
        });
    }

    // ==========================================
    // FULL SCREEN MEDIA VIEW
    // ==========================================

    function getViewerContainer() {
        return document.getElementById('viewerCanvasWrapper');
    }

    function updateFullScreenIcon() {
        const icon = elements.btnFullScreenMedia?.querySelector('i');
        if (!elements.btnFullScreenMedia || !icon) return;
        if (document.fullscreenElement) {
            icon.className = 'fa-solid fa-compress';
            elements.btnFullScreenMedia.title = 'Exit full screen';
        } else {
            icon.className = 'fa-solid fa-expand';
            elements.btnFullScreenMedia.title = 'Toggle full screen view';
        }
    }

    async function toggleFullScreenView() {
        const viewer = getViewerContainer();
        if (!viewer) return;

        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await viewer.requestFullscreen();
            }
        } catch (err) {
            console.error('Full screen toggle failed:', err);
            showToast('Cannot enter full screen mode.', 'error');
        }
    }

    // ==========================================
    // FOLDER SCANNING & API CALLS
    // ==========================================
    async function scanFolder(folderPath = '') {
        if (!folderPath) {
            if (state.browserFolderHandle) {
                await scanBrowserFolder(state.browserFolderHandle);
                return;
            }
            showModal(elements.folderPickerModal);
            return;
        }

        const scanButton = elements.btnConfirmFolderModal;
        const originalButtonText = scanButton?.textContent;
        if (scanButton) {
            scanButton.disabled = true;
            scanButton.textContent = 'Scanning...';
        }

        try {
            showToast('Scanning folder contents...', 'info');
            if (state.browserScanMode && state.browserFolderHandle) {
                await scanBrowserFolder(state.browserFolderHandle);
                return;
            }

            if (!state.backendEnabled) {
                showToast('Server-side scanning is unavailable on this deployment. Use the browser folder picker or run the app locally.', 'error');
                return;
            }

            const res = await fetch('/api/scan-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder_path: folderPath })
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Failed to scan folder', 'error'); return; }

            state.folderPath = data.folder_path;
            state.folderName = data.folder_name;
            state.files = data.files || [];
            state.selectedFileIds.clear();
            state.activeFileIndex = -1;
            state.selectionMode = 'manual';
            state.searchQuery = '';
            state.activeFilter = 'all';
            if (elements.searchInput) elements.searchInput.value = '';
            if (elements.btnClearSearch) elements.btnClearSearch.hidden = true;

            elements.currentFolderPath.textContent = state.folderPath;
            elements.currentFolderPath.title = state.folderPath;

            updateTargetBaseUI();
            fetchCategories();
            updateCategoryCounts(data.summary);
            applyFilters();
            clearMediaViewer();

            showToast(`Loaded ${data.files.length} media files from ${data.folder_name}`, 'success');
        } catch (err) {
            console.error(err);
            showToast('Server connection error.', 'error');
        } finally {
            if (scanButton) {
                scanButton.disabled = false;
                scanButton.textContent = originalButtonText || 'Scan Folder';
            }
        }
    }

    async function scanBrowserFolder(dirHandle) {
        const files = [];
        const rootName = dirHandle.name;

        async function walkDirectory(handle, relativePath = '') {
            for await (const entry of handle.values()) {
                if (entry.kind === 'directory') {
                    await walkDirectory(entry, `${relativePath}${entry.name}/`);
                    continue;
                }

                const ext = entry.name.split('.').pop()?.toLowerCase();
                const mediaType = getBrowserMediaType(entry.name);
                if (!mediaType) continue;

                try {
                    const file = await entry.getFile();
                    files.push({
                        id: `${relativePath}${entry.name}`,
                        name: entry.name,
                        path: `${rootName}/${relativePath}${entry.name}`,
                        size: file.size,
                        formatted_size: formatBytes(file.size),
                        media_type: mediaType,
                        mime_type: file.type || `${mediaType}/*`,
                        extension: `.${ext}`,
                        modified_time: file.lastModified,
                        modified_formatted: new Date(file.lastModified).toLocaleString(),
                        fileObject: file
                    });
                } catch (err) {
                    console.warn('Failed to read file from browser handle:', err);
                }
            }
        }

        try {
            await walkDirectory(dirHandle);
            files.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

            state.folderPath = rootName;
            state.folderName = rootName;
            state.files = files;
            state.selectedFileIds.clear();
            state.activeFileIndex = -1;
            state.selectionMode = 'manual';
            state.searchQuery = '';
            state.activeFilter = 'all';
            if (elements.searchInput) elements.searchInput.value = '';
            if (elements.btnClearSearch) elements.btnClearSearch.hidden = true;

            elements.currentFolderPath.textContent = `${rootName} (Local)`;
            elements.currentFolderPath.title = `${rootName} (Local browser folder)`;

            updateTargetBaseUI();
            updateCategoryCounts({
                total_count: files.length,
                image_count: files.filter(f => f.media_type === 'image').length,
                video_count: files.filter(f => f.media_type === 'video').length,
                audio_count: files.filter(f => f.media_type === 'audio').length
            });

            applyFilters();
            clearMediaViewer();

            showToast(`Loaded ${files.length} local media files from ${rootName}`, 'success');
        } catch (err) {
            console.error('Browser folder scan failed:', err);
            showToast('Failed to scan folder in browser.', 'error');
        }
    }

    function getBrowserMediaType(filename) {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (!ext) return null;
        const imageExts = ['jpg','jpeg','png','gif','webp','bmp','svg','tiff'];
        const videoExts = ['mp4','webm','ogg','mov','mkv','avi','wmv','m4v'];
        const audioExts = ['mp3','wav','flac','m4a','aac','ogg','wma'];
        if (imageExts.includes(ext)) return 'image';
        if (videoExts.includes(ext)) return 'video';
        if (audioExts.includes(ext)) return 'audio';
        return null;
    }

    function formatBytes(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }

    async function fetchCategories() {
        if (!state.targetBasePath) {
            state.categories = [];
            renderCategoryTiles();
            return;
        }

        try {
            state.categories = [];
            renderCategoryTiles();

            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_base_path: state.targetBasePath })
            });
            const data = await res.json();
            state.categories = data.categories || [];
            renderCategoryTiles();
        } catch (err) {
            console.error('Error loading categories:', err);
            renderCategoryTiles();
        }
    }

    function updateTargetBaseUI() {
        if (elements.targetBasePathDisplay) {
            elements.targetBasePathDisplay.textContent = state.targetBasePath || 'Not Configured';
            elements.targetBasePathDisplay.title = state.targetBasePath || '';
        }
    }

    // ==========================================
    // SIDEBAR QUEUE & FILTERING
    // ==========================================
    function applyFilters() {
        const currentPath = state.filteredFiles[state.activeFileIndex]?.path;

        state.filteredFiles = state.files.filter(file => {
            if (state.activeFilter !== 'all' && file.media_type !== state.activeFilter) return false;
            if (state.searchQuery && !file.name.toLowerCase().includes(state.searchQuery)) return false;
            return true;
        });
        elements.fileCountPill.textContent = state.filteredFiles.length;

        if (state.selectionMode === 'auto') {
            state.selectedFileIds.clear();
            state.filteredFiles.forEach(f => state.selectedFileIds.add(f.id));
        }

        renderFileList();
        updateSelectionUI();

        if (state.filteredFiles.length === 0) {
            clearMediaViewer();
            state.activeFileIndex = -1;
            return;
        }

        const nextIndex = state.filteredFiles.findIndex(f => f.path === currentPath);
        if (nextIndex >= 0) {
            selectMediaIndex(nextIndex);
        } else {
            selectMediaIndex(0);
        }
    }

    function renderFileList() {
        const container = elements.fileListContainer;
        container.innerHTML = '';

        if (state.filteredFiles.length === 0) {
            container.innerHTML = `
                <div class="empty-sidebar-state">
                    <i class="fa-solid fa-folder-open empty-icon"></i>
                    <p>No media files found</p>
                    <small>Click <strong>Open Local Folder</strong> to scan and review files.</small>
                </div>`;
            return;
        }

        state.filteredFiles.forEach((file, index) => {
            const row = document.createElement('div');
            row.className = `file-item-row ${index === state.activeFileIndex ? 'active' : ''}`;
            row.draggable = true;

            const iconClass = file.media_type === 'image' ? 'fa-regular fa-image' :
                              file.media_type === 'video' ? 'fa-solid fa-film' : 'fa-solid fa-music';

            row.innerHTML = `
                <label class="checkbox-container" onclick="event.stopPropagation()">
                    <input type="checkbox" class="file-select-cb" data-id="${file.id}" ${state.selectedFileIds.has(file.id) ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>
                <div class="file-icon ${file.media_type}">
                    <i class="${iconClass}"></i>
                </div>
                <div class="file-details">
                    <span class="file-name" title="${file.name}">${file.name}</span>
                    <div class="file-meta-sub">
                        <span>${file.formatted_size}</span>
                        <span>&bull;</span>
                        <span>${file.extension.toUpperCase()}</span>
                    </div>
                </div>
            `;

            row.addEventListener('click', () => selectMediaIndex(index));
            row.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', file.path);
                state.draggedFilePath = file.path;
                row.style.opacity = '0.5';
            });
            row.addEventListener('dragend', () => { row.style.opacity = '1'; state.draggedFilePath = null; });

            const cb = row.querySelector('.file-select-cb');
            cb.addEventListener('change', (e) => {
                if (e.target.checked) state.selectedFileIds.add(file.id);
                else state.selectedFileIds.delete(file.id);
                updateSelectionUI();
            });

            container.appendChild(row);
        });
    }

    function updateCategoryCounts(summary) {
        if (!summary) return;
        document.getElementById('cntAll').textContent = summary.total_count || 0;
        document.getElementById('cntImage').textContent = summary.image_count || 0;
        document.getElementById('cntVideo').textContent = summary.video_count || 0;
        document.getElementById('cntAudio').textContent = summary.audio_count || 0;
    }

    function updateSelectionUI() {
        const count = state.selectedFileIds.size;
        elements.selectedCountBadge.textContent = `${count} selected`;
        elements.batchActionMenu.hidden = count === 0;
        elements.selectAllCheckbox.checked = state.selectionMode === 'auto' || (count > 0 && count === state.filteredFiles.length);

        // Update selection mode when user manually changes selection
        if (count > 0 && state.selectionMode === 'auto' && count !== state.filteredFiles.length) {
            state.selectionMode = 'manual';
        }

        // Update Upper Section Placeholder Card depending on selection state
        if (state.activeFileIndex === -1 && elements.viewerEmptyState) {
            if (count > 0) {
                const firstSelectedFile = state.filteredFiles.find(f => state.selectedFileIds.has(f.id));
                const firstIdx = state.filteredFiles.indexOf(firstSelectedFile);
                const targetIdx = firstIdx >= 0 ? firstIdx : 0;

                elements.viewerEmptyState.innerHTML = `
                    <div class="empty-graphic">
                        <i class="fa-solid fa-play"></i>
                    </div>
                    <h3>Start Reviewing Selected Files</h3>
                    <p><strong>${count} file(s) selected</strong> from the left queue.</p>
                    <button class="btn btn-primary" id="btnStartReviewingTrigger" style="margin-top: 8px;">
                        <i class="fa-solid fa-circle-play"></i> Start Reviewing (${count} Selected)
                    </button>`;

                document.getElementById('btnStartReviewingTrigger')?.addEventListener('click', () => {
                    selectMediaIndex(targetIdx);
                });
            } else {
                elements.viewerEmptyState.innerHTML = `
                    <div class="empty-graphic">
                        <i class="fa-solid fa-photo-film"></i>
                    </div>
                    <h3>Media Inspection Canvas</h3>
                    <p>Select any item from the left queue to preview, inspect, or organize into categories below.</p>`;
            }
        }
    }

    // ==========================================
    // UPPER PANE - MEDIA VIEWER
    // ==========================================
    function revokeActiveObjectUrl() {
        if (state.activeObjectUrl) {
            URL.revokeObjectURL(state.activeObjectUrl);
            state.activeObjectUrl = null;
        }
    }

    function selectMediaIndex(index) {
        if (index < 0 || index >= state.filteredFiles.length) return;
        state.activeFileIndex = index;
        const file = state.filteredFiles[index];

        elements.mediaTitle.textContent = file.name;
        elements.mediaTitle.title = file.path;
        elements.mediaTypeBadge.textContent = file.media_type.toUpperCase();
        elements.mediaSizeBadge.textContent = file.formatted_size;
        elements.mediaIndexBadge.textContent = `${index + 1} of ${state.filteredFiles.length}`;
        elements.btnDeleteMedia.disabled = !!file.fileObject;

        elements.viewerEmptyState.hidden = true;
        elements.imageViewerMode.hidden = true;
        elements.videoViewerMode.hidden = true;
        elements.audioViewerMode.hidden = true;
        elements.activeVideoPlayer.pause();
        elements.activeAudioPlayer.pause();

        revokeActiveObjectUrl();

        const mediaUrl = file.fileObject ? URL.createObjectURL(file.fileObject) : `/api/media?path=${encodeURIComponent(file.path)}`;
        if (file.fileObject) {
            state.activeObjectUrl = mediaUrl;
        }

        if (file.media_type === 'image') {
            resetImageTransform();
            elements.activeImageViewer.src = mediaUrl;
            elements.imageViewerMode.hidden = false;
        } else if (file.media_type === 'video') {
            elements.activeVideoPlayer.src = mediaUrl;
            elements.videoViewerMode.hidden = false;
            elements.activeVideoPlayer.play().catch(() => {});
        } else if (file.media_type === 'audio') {
            elements.audioFileName.textContent = file.name;
            elements.audioFileMeta.textContent = `${file.formatted_size} • ${file.extension.toUpperCase()}`;
            elements.activeAudioPlayer.src = mediaUrl;
            elements.audioViewerMode.hidden = false;
            elements.activeAudioPlayer.play().catch(() => {});
        }

        if (file.fileObject) {
            showToast('Previewing browser-selected file. Delete and categorize actions require local server access.', 'info');
        }

        renderFileList();
        const activeRow = elements.fileListContainer.children[index];
        if (activeRow) activeRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function clearMediaViewer() {
        state.activeFileIndex = -1;
        elements.mediaTitle.textContent = 'Select a File from Left Queue to Review';
        elements.mediaTypeBadge.textContent = 'None';
        elements.mediaSizeBadge.textContent = '-';
        elements.mediaIndexBadge.textContent = '0 of 0';
        elements.btnDeleteMedia.disabled = true;
        elements.viewerEmptyState.hidden = false;
        elements.imageViewerMode.hidden = true;
        elements.videoViewerMode.hidden = true;
        elements.audioViewerMode.hidden = true;
        elements.activeVideoPlayer.pause();
        elements.activeAudioPlayer.pause();

        updateSelectionUI();
    }

    function openDeleteConfirmModal() {
        if (state.activeFileIndex === -1) return;
        const activeFile = state.filteredFiles[state.activeFileIndex];
        elements.deleteConfirmText.textContent = `Are you sure you want to delete "${activeFile.name}"?`;
        showModal(elements.deleteConfirmModal);
    }

    function handleDeleteMediaClick() {
        if (state.activeFileIndex === -1) return;
        if (state.deleteConfirmEnabled) {
            openDeleteConfirmModal();
        } else {
            confirmDeleteFile();
        }
    }

    function toggleDeleteConfirmSetting() {
        state.deleteConfirmEnabled = !state.deleteConfirmEnabled;
        localStorage.setItem('media_categorizer_delete_confirm_enabled', state.deleteConfirmEnabled);
        updateDeleteConfirmToggleUI();
        showToast(state.deleteConfirmEnabled ? 'Delete confirmation enabled' : 'Delete confirmation disabled', 'info');
    }

    function updateDeleteConfirmToggleUI() {
        if (!elements.btnToggleDeleteConfirm || !elements.deleteConfirmToggleText) return;
        elements.deleteConfirmToggleText.textContent = state.deleteConfirmEnabled ? 'Confirm Delete' : 'Delete Directly';
        elements.btnToggleDeleteConfirm.classList.toggle('btn-active', state.deleteConfirmEnabled);
    }

    async function confirmDeleteFile() {
        if (state.activeFileIndex === -1) return;
        const activeFile = state.filteredFiles[state.activeFileIndex];

        try {
            const res = await fetch('/api/delete-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_path: activeFile.path })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`Deleted ${activeFile.name}`, 'info');
                elements.btnUndo.disabled = false;
                const deletedIndex = state.activeFileIndex;
                const direction = state.reviewDirection || 'right';
                state.selectedFileIds.delete(activeFile.id);
                state.files = state.files.filter(f => f.path !== activeFile.path);
                hideModal(elements.deleteConfirmModal);
                applyFilters();
                if (state.filteredFiles.length > 0) {
                    let nextIndex = direction === 'left' ? deletedIndex - 1 : deletedIndex;
                    if (nextIndex < 0) nextIndex = 0;
                    if (nextIndex >= state.filteredFiles.length) nextIndex = state.filteredFiles.length - 1;
                    selectMediaIndex(nextIndex);
                } else {
                    clearMediaViewer();
                }
            } else {
                showToast(data.error || 'Failed to delete file', 'error');
            }
        } catch (err) {
            console.error('Delete file error:', err);
            showToast('Failed to delete file.', 'error');
        }
    }

    function navigatePrevMedia() { if (state.activeFileIndex > 0) selectMediaIndex(state.activeFileIndex - 1); }
    function navigateNextMedia() { if (state.activeFileIndex < state.filteredFiles.length - 1) selectMediaIndex(state.activeFileIndex + 1); }

    function transformImage(scaleDelta, rotateDelta) {
        state.imageScale = Math.max(0.5, Math.min(3.0, state.imageScale + scaleDelta));
        state.imageRotation = (state.imageRotation + rotateDelta) % 360;
        elements.activeImageViewer.style.transform = `scale(${state.imageScale}) rotate(${state.imageRotation}deg)`;
    }

    function resetImageTransform() {
        state.imageScale = 1.0;
        state.imageRotation = 0;
        elements.activeImageViewer.style.transform = 'scale(1) rotate(0deg)';
    }

    // ==========================================
    // LOWER PANE - CATEGORY TILES
    // ==========================================
    function renderCategoryTiles() {
        const grid = elements.categoryTilesGrid;
        grid.innerHTML = '';

        if (elements.categoryCountBadge) {
            elements.categoryCountBadge.textContent = `(${state.categories.length} categories)`;
        }

        // PLACEHOLDER: No base target configured
        if (!state.targetBasePath) {
            grid.innerHTML = `
                <div class="empty-category-notice">
                    <div class="empty-graphic">
                        <i class="fa-solid fa-location-dot"></i>
                    </div>
                    <h3>Target Base Directory Not Configured</h3>
                    <p>Set a base folder location where all your category sub-folders will be created.</p>
                    <button class="btn btn-primary btn-sm" onclick="document.getElementById('targetBaseBadge').click()">
                        <i class="fa-solid fa-gear"></i> Configure Target Base Directory
                    </button>
                </div>`;
            return;
        }

        // PLACEHOLDER: Base configured but no categories created yet
        if (state.categories.length === 0) {
            grid.innerHTML = `
                <div class="empty-category-notice">
                    <div class="empty-graphic">
                        <i class="fa-solid fa-folder-plus"></i>
                    </div>
                    <h3>No Category Folders Yet</h3>
                    <p>Create your first category folder to start organizing media files.</p>
                    <button class="btn btn-primary btn-sm" onclick="document.getElementById('btnCreateCategory').click()">
                        <i class="fa-solid fa-plus"></i> Create First Category
                    </button>
                </div>`;
            return;
        }

        // Render category tile cards
        state.categories.forEach((cat, index) => {
            const hotkeyNum = index < 9 ? index + 1 : null;
            const tile = document.createElement('div');
            tile.className = 'category-tile';
            tile.dataset.path = cat.path;

            tile.innerHTML = `
                <div class="category-tile-header">
                    <div class="category-name-wrapper">
                        <div class="category-folder-icon"><i class="fa-solid fa-folder"></i></div>
                        <div class="category-name" title="${cat.name}">${cat.name}</div>
                    </div>
                    ${hotkeyNum ? `<span class="hotkey-badge">[${hotkeyNum}]</span>` : ''}
                </div>
                <div class="category-stats-breakdown">
                    <div class="stat-item img-stat"><i class="fa-regular fa-image"></i> ${cat.image_count}</div>
                    <div class="stat-item vid-stat"><i class="fa-solid fa-film"></i> ${cat.video_count}</div>
                    <div class="stat-item aud-stat"><i class="fa-solid fa-music"></i> ${cat.audio_count}</div>
                    <div class="stat-item" style="margin-left:auto;"><i class="fa-solid fa-hard-drive"></i> ${cat.formatted_size}</div>
                </div>
                <div class="category-drop-target-area">
                    <i class="fa-solid fa-cloud-arrow-down"></i> Drop items here
                </div>
            `;

            tile.addEventListener('click', () => {
                if (state.activeFileIndex !== -1) {
                    categorizeFile(state.filteredFiles[state.activeFileIndex].path, cat.path);
                }
            });

            tile.addEventListener('dragover', (e) => { e.preventDefault(); tile.classList.add('drag-over'); });
            tile.addEventListener('dragleave', () => tile.classList.remove('drag-over'));
            tile.addEventListener('drop', (e) => {
                e.preventDefault();
                tile.classList.remove('drag-over');
                const filePath = e.dataTransfer.getData('text/plain') || state.draggedFilePath;
                if (filePath) categorizeFile(filePath, cat.path);
            });

            grid.appendChild(tile);
        });
    }

    async function categorizeFile(sourcePath, categoryPath) {
        try {
            const movedFileId = state.files.find(f => f.path === sourcePath)?.id;

            const res = await fetch('/api/categorize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source_path: sourcePath, category_path: categoryPath, action: 'move' })
            });
            const data = await res.json();

            if (data.success) {
                showToast(`Moved ${data.filename} into category`, 'success');
                elements.btnUndo.disabled = false;
                if (movedFileId) state.selectedFileIds.delete(movedFileId);
                state.files = state.files.filter(f => f.path !== sourcePath);
                applyFilters();
                fetchCategories();

                if (state.filteredFiles.length > 0) {
                    const nextIndex = Math.min(state.activeFileIndex, state.filteredFiles.length - 1);
                    selectMediaIndex(nextIndex);
                } else {
                    clearMediaViewer();
                }
            } else {
                showToast(data.error || 'Failed to move file', 'error');
            }
        } catch (err) {
            console.error('Categorize error:', err);
            showToast('Failed to categorize file.', 'error');
        }
    }

    async function handleCreateCategory() {
        const catName = elements.newCategoryNameInput.value.trim();
        if (!catName) { showToast('Category name cannot be empty.', 'error'); return; }
        if (!state.targetBasePath) {
            showToast('Configure Target Base Directory first.', 'error');
            openTargetBaseModal();
            return;
        }

        try {
            const res = await fetch('/api/create-category', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parent_folder: state.targetBasePath, category_name: catName })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`Created category "${catName}"`, 'success');
                hideModal(elements.createCategoryModal);
                fetchCategories();
            } else {
                showToast(data.error || 'Failed to create category', 'error');
            }
        } catch (err) { console.error(err); }
    }

    async function handleUndo() {
        try {
            const res = await fetch('/api/undo', { method: 'POST' });
            const data = await res.json();
            if (data.success) { showToast(data.message, 'info'); scanFolder(state.folderPath); }
            else { showToast(data.error || 'Undo failed', 'error'); elements.btnUndo.disabled = true; }
        } catch (err) { console.error(err); }
    }

    // ==========================================
    // DRAG & DROP
    // ==========================================
    function setupDragAndDrop() {
        const canvas = document.getElementById('viewerCanvasWrapper');
        canvas?.addEventListener('dragstart', (e) => {
            if (state.activeFileIndex !== -1) {
                e.dataTransfer.setData('text/plain', state.filteredFiles[state.activeFileIndex].path);
                state.draggedFilePath = state.filteredFiles[state.activeFileIndex].path;
            }
        });
        canvas?.addEventListener('dragend', () => { state.draggedFilePath = null; });
    }

    // ==========================================
    // GLOBAL KEYBOARD SHORTCUTS
    // ==========================================
    function handleGlobalHotkeys(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay').forEach(m => hideModal(m));
            return;
        }
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

        if (e.key >= '1' && e.key <= '9') {
            const idx = parseInt(e.key) - 1;
            if (idx < state.categories.length && state.activeFileIndex !== -1)
                categorizeFile(state.filteredFiles[state.activeFileIndex].path, state.categories[idx].path);
        } else if (e.key === 'Delete') { e.preventDefault(); handleDeleteMediaClick(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); state.reviewDirection = 'left'; navigatePrevMedia(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); state.reviewDirection = 'right'; navigateNextMedia(); }
        else if (e.key === ' ') {
            e.preventDefault();
            if (!elements.videoViewerMode.hidden) {
                elements.activeVideoPlayer.paused ? elements.activeVideoPlayer.play() : elements.activeVideoPlayer.pause();
            } else if (!elements.audioViewerMode.hidden) {
                elements.activeAudioPlayer.paused ? elements.activeAudioPlayer.play() : elements.activeAudioPlayer.pause();
            }
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); handleUndo(); }
        else if (e.key.toLowerCase() === 'r' && !elements.imageViewerMode.hidden) { transformImage(0, 90); }
    }

    // ==========================================
    // LAYOUT RESIZERS
    // ==========================================
    function setupResizers() {
        let isResizingSidebar = false, isResizingPane = false;

        elements.sidebarResizer?.addEventListener('mousedown', () => {
            isResizingSidebar = true;
            elements.sidebarResizer.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
        });

        elements.paneVerticalResizer?.addEventListener('mousedown', () => {
            isResizingPane = true;
            elements.paneVerticalResizer.classList.add('resizing');
            document.body.style.cursor = 'row-resize';
        });

        document.addEventListener('mousemove', (e) => {
            if (isResizingSidebar) {
                elements.sidebar.style.width = `${Math.max(220, Math.min(480, e.clientX))}px`;
            } else if (isResizingPane) {
                const rect = elements.upperPane.parentElement.getBoundingClientRect();
                const pct = Math.max(25, Math.min(75, ((e.clientY - rect.top) / rect.height) * 100));
                elements.upperPane.style.height = `${pct}%`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizingSidebar || isResizingPane) {
                isResizingSidebar = false;
                isResizingPane = false;
                elements.sidebarResizer?.classList.remove('resizing');
                elements.paneVerticalResizer?.classList.remove('resizing');
                document.body.style.cursor = 'default';
            }
        });
    }

    // ==========================================
    // UTILITY HELPERS
    // ==========================================
    function showModal(modal) {
        if (!modal) return;
        modal.hidden = false;
        modal.style.display = 'flex';
    }

    function hideModal(modal) {
        if (!modal) return;
        modal.hidden = true;
        modal.style.display = 'none';
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const iconClass = type === 'success' ? 'fa-solid fa-circle-check' :
                          type === 'error' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-info';
        toast.innerHTML = `<i class="${iconClass}"></i> <span>${message}</span>`;
        elements.toastContainer.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
    }

    init();
});

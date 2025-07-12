// Jobs page specific functionality

class JobsPage {
    constructor() {
        this.currentPage = 1;
        this.currentFilters = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadJobs();
        this.updateJobCount();
    }

    setupEventListeners() {
        // Search form
        const searchForm = document.getElementById('jobSearchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', this.handleAdvancedSearch.bind(this));
        }

        // Clear filters
        const clearBtn = document.querySelector('.clear-filters-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', this.clearFilters.bind(this));
        }

        // Sort dropdown
        const sortBy = document.getElementById('sortBy');
        if (sortBy) {
            sortBy.addEventListener('change', this.handleSort.bind(this));
        }

        // View toggle
        const viewBtns = document.querySelectorAll('.view-btn');
        viewBtns.forEach(btn => {
            btn.addEventListener('click', this.handleViewToggle.bind(this));
        });

        // Filter checkboxes
        const filterCheckboxes = document.querySelectorAll('.filter-checkbox input');
        filterCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', this.handleFilterChange.bind(this));
        });

        // Popular search tags
        const searchTags = document.querySelectorAll('.search-tag');
        searchTags.forEach(tag => {
            tag.addEventListener('click', (e) => {
                e.preventDefault();
                const searchTerm = new URL(e.target.href).searchParams.get('search');
                this.performSearch({ search: searchTerm });
            });
        });
    }

    async loadJobs(filters = {}, page = 1) {
        const container = document.getElementById('jobsResults');
        if (!container) return;

        try {
            // Show loading
            container.innerHTML = '<div class="loading">Loading jobs...</div>';

            // Build query parameters
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key]) {
                    params.append(key, filters[key]);
                }
            });
            params.append('limit', '20');
            params.append('page', page.toString());

            const response = await fetch(`/api/jobs?${params.toString()}`);
            const jobs = await response.json();

            if (jobs.length === 0) {
                container.innerHTML = '<p class="no-data">No jobs found matching your criteria.</p>';
                return;
            }

            // Render jobs
            container.innerHTML = jobs.map(job => this.createJobCard(job)).join('');
            
            // Setup job card interactions
            this.setupJobCardListeners();

            // Update job count
            this.updateJobCount(jobs.length);

        } catch (error) {
            console.error('Error loading jobs:', error);
            container.innerHTML = '<p class="error">Failed to load jobs. Please try again.</p>';
        }
    }

    createJobCard(job) {
        const lastDate = new Date(job.last_date).toLocaleDateString();
        const isBookmarked = this.isJobBookmarked(job.id);
        
        return `
            <div class="job-card" data-job-id="${job.id}">
                <div class="job-header">
                    <h3 class="job-title">${this.escapeHtml(job.title)}</h3>
                    <div class="job-department">${this.escapeHtml(job.department)}</div>
                </div>
                
                <div class="job-details">
                    <div class="job-detail">
                        <span>📍</span>
                        <span>${this.escapeHtml(job.location || 'Not specified')}</span>
                    </div>
                    <div class="job-detail">
                        <span>🎓</span>
                        <span>${this.escapeHtml(job.qualification || 'Not specified')}</span>
                    </div>
                    <div class="job-detail">
                        <span>👥</span>
                        <span>${job.posts || 'Not specified'} Posts</span>
                    </div>
                    <div class="job-detail">
                        <span>📅</span>
                        <span>Last Date: ${lastDate}</span>
                    </div>
                </div>
                
                <div class="job-tags">
                    <span class="job-tag">${this.escapeHtml(job.category)}</span>
                    ${job.department ? `<span class="job-tag">${this.escapeHtml(job.department)}</span>` : ''}
                </div>
                
                <div class="job-actions">
                    <a href="${job.application_link}" class="apply-btn" target="_blank" rel="noopener">
                        Apply Now
                    </a>
                    <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" 
                            data-job-id="${job.id}" 
                            title="${isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}">
                        ${isBookmarked ? '❤️' : '🤍'}
                    </button>
                    <button class="share-btn" data-job-id="${job.id}" title="Share job">
                        📤
                    </button>
                </div>
            </div>
        `;
    }

    setupJobCardListeners() {
        // Bookmark buttons
        const bookmarkBtns = document.querySelectorAll('.bookmark-btn');
        bookmarkBtns.forEach(btn => {
            btn.addEventListener('click', this.handleBookmark.bind(this));
        });

        // Share buttons
        const shareBtns = document.querySelectorAll('.share-btn');
        shareBtns.forEach(btn => {
            btn.addEventListener('click', this.handleShare.bind(this));
        });
    }

    handleAdvancedSearch(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const filters = {
            search: document.getElementById('jobSearch').value.trim(),
            category: document.getElementById('categoryFilter').value,
            location: document.getElementById('locationFilter').value,
            qualification: document.getElementById('qualificationFilter').value
        };

        // Remove empty filters
        Object.keys(filters).forEach(key => {
            if (!filters[key]) delete filters[key];
        });

        this.performSearch(filters);
    }

    performSearch(filters) {
        this.currentFilters = { ...this.currentFilters, ...filters };
        this.currentPage = 1;
        this.loadJobs(this.currentFilters, this.currentPage);
        
        // Update URL without page reload
        const params = new URLSearchParams(this.currentFilters);
        window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    }

    clearFilters() {
        // Reset form
        document.getElementById('jobSearchForm').reset();
        
        // Clear filter checkboxes
        const checkboxes = document.querySelectorAll('.filter-checkbox input');
        checkboxes.forEach(cb => cb.checked = false);

        // Reset filters and reload
        this.currentFilters = {};
        this.currentPage = 1;
        this.loadJobs();
        
        // Update URL
        window.history.pushState({}, '', window.location.pathname);
    }

    handleSort(e) {
        const sortBy = e.target.value;
        this.currentFilters.sort = sortBy;
        this.loadJobs(this.currentFilters, this.currentPage);
    }

    handleViewToggle(e) {
        const viewBtns = document.querySelectorAll('.view-btn');
        const container = document.getElementById('jobsResults');
        
        viewBtns.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        const view = e.target.dataset.view;
        if (view === 'list') {
            container.classList.add('list-view');
            container.classList.remove('grid-view');
        } else {
            container.classList.add('grid-view');
            container.classList.remove('list-view');
        }
    }

    handleFilterChange(e) {
        const filterType = e.target.value;
        const isChecked = e.target.checked;
        
        if (isChecked) {
            this.currentFilters[filterType] = true;
        } else {
            delete this.currentFilters[filterType];
        }
        
        this.loadJobs(this.currentFilters, this.currentPage);
    }

    handleBookmark(e) {
        e.preventDefault();
        const btn = e.target;
        const jobId = parseInt(btn.dataset.jobId);
        
        let bookmarkedJobs = JSON.parse(localStorage.getItem('bookmarkedJobs') || '[]');
        
        if (bookmarkedJobs.includes(jobId)) {
            // Remove bookmark
            bookmarkedJobs = bookmarkedJobs.filter(id => id !== jobId);
            btn.classList.remove('bookmarked');
            btn.innerHTML = '🤍';
            btn.title = 'Add to bookmarks';
        } else {
            // Add bookmark
            bookmarkedJobs.push(jobId);
            btn.classList.add('bookmarked');
            btn.innerHTML = '❤️';
            btn.title = 'Remove from bookmarks';
        }
        
        localStorage.setItem('bookmarkedJobs', JSON.stringify(bookmarkedJobs));
        this.showNotification('Bookmark updated successfully!');
    }

    handleShare(e) {
        e.preventDefault();
        const jobCard = e.target.closest('.job-card');
        const jobTitle = jobCard.querySelector('.job-title').textContent;
        const jobUrl = `${window.location.origin}/jobs/${e.target.dataset.jobId}`;
        
        if (navigator.share) {
            navigator.share({
                title: jobTitle,
                text: `Check out this government job: ${jobTitle}`,
                url: jobUrl
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(jobUrl).then(() => {
                this.showNotification('Job link copied to clipboard!');
            });
        }
    }

    async updateJobCount(count = null) {
        const countElement = document.getElementById('jobCount');
        if (!countElement) return;

        if (count !== null) {
            countElement.textContent = count;
            return;
        }

        try {
            const params = new URLSearchParams(this.currentFilters);
            const response = await fetch(`/api/jobs?${params.toString()}&limit=1000`);
            const jobs = await response.json();
            countElement.textContent = jobs.length;
        } catch (error) {
            countElement.textContent = '0';
        }
    }

    isJobBookmarked(jobId) {
        const bookmarkedJobs = JSON.parse(localStorage.getItem('bookmarkedJobs') || '[]');
        return bookmarkedJobs.includes(jobId);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            backgroundColor: type === 'success' ? '#2ecc71' : '#e74c3c',
            color: 'white',
            borderRadius: '5px',
            zIndex: '10000',
            animation: 'slideInRight 0.3s ease'
        });
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize jobs page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/jobs') {
        window.jobsPage = new JobsPage();
    }
});
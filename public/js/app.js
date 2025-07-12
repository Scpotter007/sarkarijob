// SarkariJob Portal - Main JavaScript

class SarkariJob {
    constructor() {
        this.init();
        this.bookmarkedJobs = JSON.parse(localStorage.getItem('bookmarkedJobs') || '[]');
    }

    init() {
        this.setupEventListeners();
        this.loadData();
        this.setupSearch();
        this.setupNavigation();
    }

    setupEventListeners() {
        // Search form
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', this.handleSearch.bind(this));
        }

        // Category items
        const categoryItems = document.querySelectorAll('.category-item');
        categoryItems.forEach(item => {
            item.addEventListener('click', this.handleCategoryClick.bind(this));
        });

        // Mobile navigation toggle
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navToggle.classList.toggle('active');
                navMenu.classList.toggle('active');
            });
        }

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (navMenu && navToggle && 
                !navMenu.contains(e.target) && 
                !navToggle.contains(e.target) && 
                navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            }
        });
    }

    setupNavigation() {
        // Update active nav link based on current page
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === currentPath || 
                (currentPath === '/' && link.getAttribute('href') === '/')) {
                link.classList.add('active');
            }
        });
    }

    async loadData() {
        try {
            // Load latest jobs for homepage
            if (document.getElementById('latestJobs')) {
                await this.loadLatestJobs();
            }

            // Load recent results for homepage
            if (document.getElementById('recentResults')) {
                await this.loadRecentResults();
            }

            // Load job counts for categories
            await this.loadJobCounts();

        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load data. Please refresh the page.');
        }
    }

    async loadLatestJobs(limit = 6) {
        const container = document.getElementById('latestJobs');
        if (!container) return;

        try {
            const response = await fetch(`/api/jobs?limit=${limit}`);
            const jobs = await response.json();

            if (jobs.length === 0) {
                container.innerHTML = '<p class="no-data">No jobs available at the moment.</p>';
                return;
            }

            container.innerHTML = jobs.map(job => this.createJobCard(job)).join('');
            this.setupJobCardListeners();

        } catch (error) {
            console.error('Error loading jobs:', error);
            container.innerHTML = '<p class="error">Failed to load jobs.</p>';
        }
    }

    async loadRecentResults(limit = 5) {
        const container = document.getElementById('recentResults');
        if (!container) return;

        try {
            const response = await fetch(`/api/results?limit=${limit}`);
            const results = await response.json();

            if (results.length === 0) {
                container.innerHTML = '<p class="no-data">No recent results available.</p>';
                return;
            }

            container.innerHTML = results.map(result => this.createResultItem(result)).join('');

        } catch (error) {
            console.error('Error loading results:', error);
            container.innerHTML = '<p class="error">Failed to load results.</p>';
        }
    }

    async loadJobCounts() {
        const categories = [
            { id: 'centralCount', category: 'Central Government' },
            { id: 'stateCount', category: 'State Government' },
            { id: 'railwayCount', category: 'Railway' },
            { id: 'bankingCount', category: 'Banking' },
            { id: 'defenceCount', category: 'Defence' },
            { id: 'teachingCount', category: 'Teaching' }
        ];

        try {
            for (const cat of categories) {
                const response = await fetch(`/api/jobs?category=${encodeURIComponent(cat.category)}&limit=1000`);
                const jobs = await response.json();
                const element = document.getElementById(cat.id);
                if (element) {
                    element.textContent = `${jobs.length} Jobs`;
                }
            }
        } catch (error) {
            console.error('Error loading job counts:', error);
        }
    }

    createJobCard(job) {
        const isBookmarked = this.bookmarkedJobs.includes(job.id);
        const lastDate = new Date(job.last_date).toLocaleDateString();
        
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
                </div>
            </div>
        `;
    }

    createResultItem(result) {
        const publishedDate = new Date(result.published_date).toLocaleDateString();
        
        return `
            <div class="result-item">
                <h3 class="result-title">${this.escapeHtml(result.title)}</h3>
                <div class="result-exam">${this.escapeHtml(result.exam_name)}</div>
                <div class="result-actions">
                    <div class="result-date">Published: ${publishedDate}</div>
                    <a href="${result.result_link}" class="download-btn" target="_blank" rel="noopener">
                        View Result
                    </a>
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

        // Share buttons (if implemented)
        const shareBtns = document.querySelectorAll('.share-btn');
        shareBtns.forEach(btn => {
            btn.addEventListener('click', this.handleShare.bind(this));
        });
    }

    handleBookmark(e) {
        e.preventDefault();
        const btn = e.target;
        const jobId = parseInt(btn.dataset.jobId);
        
        if (this.bookmarkedJobs.includes(jobId)) {
            // Remove bookmark
            this.bookmarkedJobs = this.bookmarkedJobs.filter(id => id !== jobId);
            btn.classList.remove('bookmarked');
            btn.innerHTML = '🤍';
            btn.title = 'Add to bookmarks';
        } else {
            // Add bookmark
            this.bookmarkedJobs.push(jobId);
            btn.classList.add('bookmarked');
            btn.innerHTML = '❤️';
            btn.title = 'Remove from bookmarks';
        }
        
        localStorage.setItem('bookmarkedJobs', JSON.stringify(this.bookmarkedJobs));
        this.showNotification('Bookmark updated successfully!');
    }

    handleShare(e) {
        e.preventDefault();
        const jobCard = e.target.closest('.job-card');
        const jobTitle = jobCard.querySelector('.job-title').textContent;
        const jobUrl = window.location.href;
        
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

    async handleSearch(e) {
        e.preventDefault();
        
        const searchInput = document.getElementById('searchInput');
        const categoryFilter = document.getElementById('categoryFilter');
        
        const searchQuery = searchInput.value.trim();
        const category = categoryFilter.value;
        
        // Build search URL
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        if (category) params.append('category', category);
        
        // Redirect to jobs page with search parameters
        window.location.href = `/jobs?${params.toString()}`;
    }

    handleCategoryClick(e) {
        const category = e.currentTarget.dataset.category;
        if (category) {
            window.location.href = `/jobs?category=${encodeURIComponent(category)}`;
        }
    }

    setupSearch() {
        // Real-time search suggestions (if on jobs page)
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(this.handleSearchInput.bind(this), 300));
        }
    }

    async handleSearchInput(e) {
        const query = e.target.value.trim();
        if (query.length < 2) return;
        
        // Implement search suggestions here if needed
        // For now, we'll just update the jobs list on the jobs page
        if (window.location.pathname === '/jobs') {
            await this.searchJobs(query);
        }
    }

    async searchJobs(query, category = '', page = 1) {
        const container = document.querySelector('.jobs-results') || document.getElementById('latestJobs');
        if (!container) return;
        
        try {
            const params = new URLSearchParams();
            if (query) params.append('search', query);
            if (category) params.append('category', category);
            params.append('limit', '20');
            
            const response = await fetch(`/api/jobs?${params.toString()}`);
            const jobs = await response.json();
            
            if (jobs.length === 0) {
                container.innerHTML = '<p class="no-data">No jobs found matching your criteria.</p>';
                return;
            }
            
            container.innerHTML = jobs.map(job => this.createJobCard(job)).join('');
            this.setupJobCardListeners();
            
        } catch (error) {
            console.error('Error searching jobs:', error);
            container.innerHTML = '<p class="error">Failed to search jobs.</p>';
        }
    }

    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add styles
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
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    // SEO and performance optimizations
    lazyLoadImages() {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }

    // Service Worker registration for PWA features
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered successfully');
                })
                .catch(error => {
                    console.log('Service Worker registration failed');
                });
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const app = new SarkariJob();
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        .no-data, .error {
            text-align: center;
            padding: 2rem;
            color: #7f8c8d;
            font-style: italic;
            grid-column: 1 / -1;
        }
        
        .error {
            color: #e74c3c;
        }
    `;
    document.head.appendChild(style);
});

// Export for use in other scripts
window.SarkariJob = SarkariJob;
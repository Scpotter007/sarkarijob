// Service Worker for SarkariJob Portal
// Provides caching, offline functionality, and push notifications

const CACHE_NAME = 'sarkarijob-v1';
const urlsToCache = [
    '/',
    '/css/styles.css',
    '/css/responsive.css',
    '/js/app.js',
    '/js/notifications.js',
    '/jobs',
    '/results',
    '/admit-cards',
    '/answer-keys'
];

// Install event - cache resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Clearing old cache');
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
            .catch(() => {
                // If both cache and network fail, show offline page
                if (event.request.destination === 'document') {
                    return caches.match('/offline.html');
                }
            })
    );
});

// Push event - handle push notifications
self.addEventListener('push', event => {
    const options = {
        body: 'New government jobs are available!',
        icon: '/images/notification-icon.png',
        badge: '/images/notification-badge.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'View Jobs',
                icon: '/images/checkmark.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/images/xmark.png'
            }
        ]
    };

    if (event.data) {
        const data = event.data.json();
        options.body = data.body || options.body;
        options.data = data;
    }

    event.waitUntil(
        self.registration.showNotification('SarkariJob Update', options)
    );
});

// Notification click event
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'explore') {
        // Open jobs page
        event.waitUntil(
            clients.openWindow('/jobs')
        );
    } else if (event.action === 'close') {
        // Just close the notification
        return;
    } else {
        // Default action - open main page
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Background sync for offline job applications
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(
            // Handle offline actions when connection is restored
            handleBackgroundSync()
        );
    }
});

async function handleBackgroundSync() {
    // Check for pending actions in IndexedDB
    // This would handle things like bookmarks, searches, etc. that were done offline
    console.log('Background sync triggered');
}

// Handle periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
    if (event.tag === 'job-updates') {
        event.waitUntil(
            checkForJobUpdates()
        );
    }
});

async function checkForJobUpdates() {
    try {
        const response = await fetch('/api/jobs?limit=5');
        const jobs = await response.json();
        
        // Check if there are new jobs since last check
        const lastJobId = await getLastJobId();
        const newJobs = jobs.filter(job => job.id > lastJobId);
        
        if (newJobs.length > 0) {
            // Show notification for new jobs
            await self.registration.showNotification('🆕 New Government Jobs!', {
                body: `${newJobs.length} new job(s) available`,
                icon: '/images/notification-icon.png',
                badge: '/images/notification-badge.png',
                tag: 'new-jobs',
                data: {
                    type: 'new-jobs',
                    count: newJobs.length,
                    jobs: newJobs
                }
            });
            
            // Update last job ID
            await setLastJobId(Math.max(...jobs.map(j => j.id)));
        }
    } catch (error) {
        console.error('Error checking for job updates:', error);
    }
}

// Helper functions for IndexedDB operations
async function getLastJobId() {
    return new Promise((resolve) => {
        const request = indexedDB.open('SarkariJobDB', 1);
        
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const getRequest = store.get('lastJobId');
            
            getRequest.onsuccess = () => {
                resolve(getRequest.result?.value || 0);
            };
            
            getRequest.onerror = () => {
                resolve(0);
            };
        };
        
        request.onerror = () => {
            resolve(0);
        };
        
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
        };
    });
}

async function setLastJobId(jobId) {
    return new Promise((resolve) => {
        const request = indexedDB.open('SarkariJobDB', 1);
        
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            store.put({ key: 'lastJobId', value: jobId });
            
            transaction.oncomplete = () => {
                resolve();
            };
        };
        
        request.onerror = () => {
            resolve();
        };
    });
}
// Push Notifications for SarkariJob Portal

class NotificationManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupNotificationPermission();
        this.setupPushNotifications();
        this.checkForNewJobs();
    }

    async setupNotificationPermission() {
        // Check if browser supports notifications
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return;
        }

        // Request permission if not already granted
        if (Notification.permission === 'default') {
            this.showNotificationPrompt();
        }
    }

    showNotificationPrompt() {
        // Create a custom notification prompt
        const promptDiv = document.createElement('div');
        promptDiv.className = 'notification-prompt';
        promptDiv.innerHTML = `
            <div class="prompt-content">
                <div class="prompt-icon">🔔</div>
                <div class="prompt-text">
                    <h4>Stay Updated!</h4>
                    <p>Get instant notifications for new government jobs and results</p>
                </div>
                <div class="prompt-actions">
                    <button class="prompt-btn enable-btn">Enable Notifications</button>
                    <button class="prompt-btn dismiss-btn">Maybe Later</button>
                </div>
            </div>
        `;

        // Add styles
        Object.assign(promptDiv.style, {
            position: 'fixed',
            top: '80px',
            right: '20px',
            background: 'white',
            padding: '1rem',
            borderRadius: '10px',
            boxShadow: '0 5px 20px rgba(0,0,0,0.2)',
            zIndex: '10000',
            maxWidth: '350px',
            border: '1px solid #e0e0e0'
        });

        document.body.appendChild(promptDiv);

        // Handle button clicks
        promptDiv.querySelector('.enable-btn').addEventListener('click', async () => {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.showWelcomeNotification();
                localStorage.setItem('notificationsEnabled', 'true');
            }
            promptDiv.remove();
        });

        promptDiv.querySelector('.dismiss-btn').addEventListener('click', () => {
            promptDiv.remove();
            localStorage.setItem('notificationPromptDismissed', Date.now().toString());
        });

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (promptDiv.parentNode) {
                promptDiv.remove();
            }
        }, 10000);
    }

    showWelcomeNotification() {
        if (Notification.permission === 'granted') {
            new Notification('SarkariJob Notifications Enabled! 🎉', {
                body: 'You\'ll now receive updates about new government jobs and exam results.',
                icon: '/images/notification-icon.png',
                badge: '/images/notification-badge.png',
                tag: 'welcome'
            });
        }
    }

    async setupPushNotifications() {
        // Check if service worker and push messaging are supported
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('Push messaging is not supported');
            return;
        }

        try {
            // Register service worker
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered for push notifications');
            
            // Subscribe to push notifications
            if (Notification.permission === 'granted') {
                await this.subscribeToPush(registration);
            }
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    async subscribeToPush(registration) {
        try {
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(
                    'BFxmPYG4aOzK6O3lA5XVY9vJkR2kLOQX3F7d1Z8Y5XpJ2QwE3rT9bH6mF8pK4qS2'
                )
            });

            // Send subscription to server
            await fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(subscription)
            });

            console.log('Push subscription successful');
        } catch (error) {
            console.error('Push subscription failed:', error);
        }
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    async checkForNewJobs() {
        // Check for new jobs every 30 minutes
        setInterval(async () => {
            if (Notification.permission === 'granted') {
                await this.fetchAndNotifyNewJobs();
            }
        }, 30 * 60 * 1000); // 30 minutes

        // Initial check
        if (Notification.permission === 'granted') {
            setTimeout(() => this.fetchAndNotifyNewJobs(), 5000);
        }
    }

    async fetchAndNotifyNewJobs() {
        try {
            const lastCheck = localStorage.getItem('lastJobCheck');
            const now = Date.now();
            
            // Don't check more than once every 10 minutes
            if (lastCheck && (now - parseInt(lastCheck)) < 10 * 60 * 1000) {
                return;
            }

            const response = await fetch('/api/jobs?limit=5');
            const jobs = await response.json();
            
            const lastJobId = localStorage.getItem('lastJobId');
            const newJobs = lastJobId ? 
                jobs.filter(job => job.id > parseInt(lastJobId)) : [];

            if (newJobs.length > 0) {
                this.showNewJobNotification(newJobs);
                localStorage.setItem('lastJobId', Math.max(...jobs.map(j => j.id)).toString());
            }

            localStorage.setItem('lastJobCheck', now.toString());

        } catch (error) {
            console.error('Error checking for new jobs:', error);
        }
    }

    showNewJobNotification(jobs) {
        const jobCount = jobs.length;
        const title = jobCount === 1 ? 
            '🆕 New Government Job Available!' : 
            `🆕 ${jobCount} New Government Jobs Available!`;
        
        const body = jobCount === 1 ? 
            jobs[0].title : 
            `Latest: ${jobs[0].title} and ${jobCount - 1} more`;

        const notification = new Notification(title, {
            body: body,
            icon: '/images/notification-icon.png',
            badge: '/images/notification-badge.png',
            tag: 'new-jobs',
            requireInteraction: true,
            actions: [
                {
                    action: 'view',
                    title: 'View Jobs'
                },
                {
                    action: 'dismiss',
                    title: 'Dismiss'
                }
            ]
        });

        notification.onclick = () => {
            window.open('/jobs', '_blank');
            notification.close();
        };

        // Auto-close after 10 seconds
        setTimeout(() => {
            notification.close();
        }, 10000);
    }

    // Manual notification methods for admin use
    async sendCustomNotification(title, body, tag = 'custom') {
        if (Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: '/images/notification-icon.png',
                badge: '/images/notification-badge.png',
                tag: tag
            });
        }
    }

    // Notification for exam results
    showResultNotification(resultTitle) {
        if (Notification.permission === 'granted') {
            new Notification('📊 New Exam Result Published!', {
                body: resultTitle,
                icon: '/images/notification-icon.png',
                badge: '/images/notification-badge.png',
                tag: 'new-result',
                actions: [
                    {
                        action: 'view',
                        title: 'View Result'
                    }
                ]
            });
        }
    }

    // Notification for admit cards
    showAdmitCardNotification(examTitle) {
        if (Notification.permission === 'granted') {
            new Notification('🎫 New Admit Card Available!', {
                body: `Admit card for ${examTitle} is now available for download`,
                icon: '/images/notification-icon.png',
                badge: '/images/notification-badge.png',
                tag: 'new-admit-card',
                actions: [
                    {
                        action: 'download',
                        title: 'Download'
                    }
                ]
            });
        }
    }

    // Method to disable notifications
    disableNotifications() {
        localStorage.setItem('notificationsEnabled', 'false');
        // Unsubscribe from push notifications
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                registration.pushManager.getSubscription().then(subscription => {
                    if (subscription) {
                        subscription.unsubscribe();
                    }
                });
            });
        }
    }

    // Check if notifications are enabled
    areNotificationsEnabled() {
        return Notification.permission === 'granted' && 
               localStorage.getItem('notificationsEnabled') !== 'false';
    }
}

// Initialize notification manager
document.addEventListener('DOMContentLoaded', () => {
    // Only show notification prompt if not dismissed recently
    const lastDismissed = localStorage.getItem('notificationPromptDismissed');
    const daysSinceDismissed = lastDismissed ? 
        (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24) : 
        Infinity;

    // Show prompt if never dismissed or dismissed more than 7 days ago
    if (daysSinceDismissed > 7) {
        window.notificationManager = new NotificationManager();
    }
});

// Service Worker for push notifications
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
            // Handle notification click actions
            const action = event.data.action;
            const data = event.data.data;
            
            switch (action) {
                case 'view':
                    window.open('/jobs', '_blank');
                    break;
                case 'download':
                    window.open('/admit-cards', '_blank');
                    break;
                default:
                    window.focus();
            }
        }
    });
}

// Add notification settings to user preferences
function addNotificationSettings() {
    const settingsHTML = `
        <div class="notification-settings">
            <h4>Notification Preferences</h4>
            <label class="setting-item">
                <input type="checkbox" id="jobNotifications" checked>
                <span>New Job Notifications</span>
            </label>
            <label class="setting-item">
                <input type="checkbox" id="resultNotifications" checked>
                <span>Result Notifications</span>
            </label>
            <label class="setting-item">
                <input type="checkbox" id="admitCardNotifications" checked>
                <span>Admit Card Notifications</span>
            </label>
        </div>
    `;
    
    // Add to user settings modal or preferences page
    const settingsContainer = document.querySelector('.user-settings');
    if (settingsContainer) {
        settingsContainer.insertAdjacentHTML('beforeend', settingsHTML);
    }
}

// Export for global use
window.NotificationManager = NotificationManager;
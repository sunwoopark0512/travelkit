document.addEventListener('DOMContentLoaded', () => {
    // console.log('System active.');

    // Optional: Add simple interaction for the "Proof" log
    const logWindow = document.querySelector('.log-window');
    if (logWindow) {
        // Simple effect to scroll to bottom if we add more logs later
        logWindow.scrollTop = logWindow.scrollHeight;
    }
});

// Yeroo (Time) qunceessuuf (Fakkeenya: 3:45 PM)
export const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
};

// Guyyaa (Date) qunceessuuf (Fakkeenya: Jan 15, 2025)
export const formatDate = (dateString) => {
    if (!dateString) return '----';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
};

// Yeroo darbee (Time ago) herreguuf (Fakkeenya: "5 daqiiqaa dura")
export const timeAgo = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return `✋ ${diffInSeconds} sec ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `⏳ ${diffInMinutes} min ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `🕒 ${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `📅 ${diffInDays} days ago`;
};
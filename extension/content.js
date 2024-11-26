chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getPageDetails") {
        const details = {
            totalHeight: document.documentElement.scrollHeight,
            viewportHeight: window.innerHeight,
        };
        console.log("Sending page details:", details);
        sendResponse(details);
    } else if (message.action === "scrollTo") {
        window.scrollTo(0, message.scrollY);
        console.log(`Scrolled to Y: ${message.scrollY}`);
        sendResponse(true); // Indicate successful scrolling
    }
    return true; // Keep the message channel open for async responses
});

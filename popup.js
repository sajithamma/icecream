document.getElementById("screenshotBtn").addEventListener("click", () => {
    console.log("Screenshot button clicked, capturing current viewport.");

    chrome.tabs.captureVisibleTab(null, { format: "png" }, (image) => {
        if (chrome.runtime.lastError) {
            console.error("Error capturing screenshot:", chrome.runtime.lastError);
        } else {
            console.log("Screenshot captured.");
            // Displaying the screenshot or saving it
            const img = document.createElement("img");
            img.src = image;
            document.body.appendChild(img);
        }
    });
});

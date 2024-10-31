// Listen for the extension icon click
chrome.action.onClicked.addListener((tab) => {
    console.log("Extension icon clicked, capturing and uploading...");

    // Step 1: Capture the screenshot of the current tab
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (image) => {
        if (chrome.runtime.lastError) {
            console.error("Error capturing screenshot:", chrome.runtime.lastError);
            displayNotification(tab.id, "Error capturing screenshot.");
        } else {
            console.log("Screenshot captured. Preparing to upload...");
            displayNotification(tab.id, "Capturing and uploading...", true);

            // Step 2: Upload the screenshot to the server
            fetch("http://localhost:7001/upload-image", {
                method: "POST",
                body: createFormData(image),
            })
                .then(response => response.json())
                .then(data => {
                    if (data.status === "success") {
                        console.log("File successfully uploaded:", data.message);
                        displayNotification(tab.id, `Success: ${data.message}`);
                    } else {
                        console.error("Failed to upload file:", data.message);
                        displayNotification(tab.id, `Error: ${data.message}`);
                    }
                })
                .catch(error => {
                    console.error("Upload error:", error);
                    displayNotification(tab.id, "Error uploading screenshot.");
                });
        }
    });
});

// Helper function to convert base64 image data to FormData
function createFormData(base64Image) {
    const formData = new FormData();
    const byteString = atob(base64Image.split(",")[1]);
    const mimeString = base64Image.split(",")[0].split(":")[1].split(";")[0];
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([arrayBuffer], { type: mimeString });
    formData.append("image", blob, "screenshot.png");

    return formData;
}

function displayNotification(tabId, message, showProgress = false) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (message, showProgress) => {
            // Create or update the notification element
            let notification = document.getElementById("extension-notification");
            if (!notification) {
                notification = document.createElement("div");
                notification.id = "extension-notification";
                document.body.appendChild(notification);
            }

            // Update notification styles
            notification.style.position = "fixed";
            notification.style.bottom = "20px";
            notification.style.right = "20px";
            notification.style.backgroundColor = "#333";
            notification.style.color = "white";
            notification.style.padding = "15px";
            notification.style.borderRadius = "8px";
            notification.style.boxShadow = "0px 4px 8px rgba(0, 0, 0, 0.3)";
            notification.style.fontFamily = "Arial, sans-serif";
            notification.style.zIndex = "9999";
            notification.style.maxWidth = "300px";

            // Add the message and close button
            notification.innerHTML = `
          <p style="margin: 0; font-size: 0.9em; line-height: 1.4;">${message}</p>
          <button id="close-notification" style="margin-top: 10px; padding: 5px 10px; background-color: #444; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
        `;

            // Add progress bar if needed
            if (showProgress) {
                let progressBar = document.getElementById("progress-bar");
                if (!progressBar) {
                    progressBar = document.createElement("div");
                    progressBar.id = "progress-bar";
                    progressBar.style.height = "6px";
                    progressBar.style.backgroundColor = "#4CAF50";
                    progressBar.style.borderRadius = "3px";
                    notification.insertBefore(progressBar, notification.firstChild);
                }

                // Animate progress bar width
                let width = 0;
                const interval = setInterval(() => {
                    width += 10;
                    progressBar.style.width = width + "%";
                    if (width >= 100) clearInterval(interval);
                }, 300);
            }

            // Close button functionality
            document.getElementById("close-notification").onclick = () => notification.remove();
        },
        args: [message, showProgress]
    });
}


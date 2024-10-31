// Listen for the extension icon click
chrome.action.onClicked.addListener((tab) => {
    console.log("Extension icon clicked, capturing and uploading...");

    // Retrieve the saved question from Chrome storage
    chrome.storage.local.get(["defaultQuestion"], (result) => {
        const question = result.defaultQuestion || "Tell me about this image"; // Default question if none set

        // Step 1: Display initial notification with progress bar
        displayNotification(tab.id, "Capturing and uploading...", true);

        // Capture the screenshot
        chrome.tabs.captureVisibleTab(null, { format: "png" }, (image) => {
            if (chrome.runtime.lastError) {
                console.error("Error capturing screenshot:", chrome.runtime.lastError);
                displayNotification(tab.id, "Error capturing screenshot.");
            } else {
                console.log("Screenshot captured. Preparing to upload...");

                // Step 2: Upload the screenshot to the server with the question
                fetch("http://localhost:7001/upload-image", {
                    method: "POST",
                    body: createFormData(image, question),
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === "success") {
                            console.log("File successfully uploaded:", data.message);

                            // Load marked.min.js for Markdown rendering, then display the notification
                            chrome.scripting.executeScript({
                                target: { tabId: tab.id },
                                files: ["marked.min.js"]
                            }).then(() => {
                                // Display the final message with Markdown support
                                displayNotification(tab.id, data.message);
                            }).catch(error => {
                                console.error("Error loading marked.js:", error);
                                displayNotification(tab.id, `Success: ${data.message}`);
                            });
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
});

// Helper function to convert base64 image data to FormData
function createFormData(base64Image, question) {
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
    formData.append("question", question);

    return formData;
}

// Function to show a notification in the tab with optional Markdown rendering and progress bar
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

            // Notification styling for a modern windowed look
            notification.style.position = "fixed";
            notification.style.bottom = "20px";
            notification.style.right = "20px";
            notification.style.width = "420px";
            notification.style.backgroundColor = "#ffffff";
            notification.style.color = "#000000";
            notification.style.borderRadius = "10px";
            notification.style.boxShadow = "0px 8px 16px rgba(0, 0, 0, 0.1)";
            notification.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
            notification.style.zIndex = "9999";
            notification.style.lineHeight = "1.2";
            notification.style.overflow = "scroll";

            // Convert message from Markdown to HTML if marked.js is loaded
            let renderedMessage = message;
            if (typeof marked !== "undefined") {
                renderedMessage = marked.parse(message);
            }

            // HTML structure with header, rendered message, and optional progress bar
            notification.innerHTML = `
                <div style="background-color: #1a73e8; color: white; padding: 10px 15px; display: flex; align-items: center; justify-content: space-between; font-weight: bold;">
                    <span>IceCream</span>
                    <button id="close-notification" style="background: none; border: none; color: white; font-weight: bold; cursor: pointer; font-size: 1.2em; line-height: 1;">&times;</button>
                </div>
                <div style="padding: 20px;">
                    <div style="font-size: 0.95em;">${renderedMessage}</div>
                    ${showProgress ? '<div id="progress-bar" style="margin-top: 10px; height: 6px; background-color: #4CAF50; border-radius: 3px; width: 0;"></div>' : ''}
                </div>
            `;

            // Progress bar animation if needed
            if (showProgress) {
                let progressBar = notification.querySelector("#progress-bar");
                let width = 0;
                const interval = setInterval(() => {
                    width += 10;
                    progressBar.style.width = width + "%";
                    if (width >= 100) clearInterval(interval);
                }, 300);
            }

            // Close button functionality
            notification.querySelector("#close-notification").onclick = () => notification.remove();
        },
        args: [message, showProgress]
    });
}
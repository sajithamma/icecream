// Create context menu items for settings and run
chrome.runtime.onInstalled.addListener(() => {

    chrome.contextMenus.create({
        id: "iceCreamRun",
        title: "🕵️‍♂️ Run",
        contexts: ["all"]
    });

    chrome.contextMenus.create({
        id: "iceCreamSettings",
        title: "⚙️ Settings",
        contexts: ["all"]
    });


});

// Handle the context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "iceCreamSettings") {
        // Open the settings page
        chrome.runtime.openOptionsPage();
    }
    else if (info.menuItemId === "iceCreamRun") {
        ensureLoggedIn((email) => {
            console.log(`User ${email} is ready to run IceCream.`);
            // Do nothing after login; let the user click again for screenshot
            runIceCream(tab);
        });
    }
});

function googleLogin(callback) {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError || !token) {
            console.error("Google Login Error:", chrome.runtime.lastError ? chrome.runtime.lastError.message : "Unknown error");

            // Show error notification
            chrome.notifications.create({
                type: "basic",
                iconUrl: "icon128.png",
                title: "Login Error",
                message: "Failed to log in with Google. Please try again."
            });
            return;
        }

        // Use the token to fetch user info
        fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((response) => response.json())
            .then((user) => {
                if (user.email) {
                    console.log("Google User:", user);

                    // Save user email locally
                    chrome.storage.local.set({ userEmail: user.email }, () => {
                        console.log("User email saved:", user.email);

                        // Show success message
                        chrome.notifications.create({
                            type: "basic",
                            iconUrl: "icon128.png",
                            title: "Login Successful",
                            message: `You are now logged in as ${user.email}. Go to settings to configure the plugin.`,
                            priority: 2
                        });

                        // Redirect to settings page
                        chrome.runtime.openOptionsPage();

                        // Call the callback if needed
                        if (callback) callback(user.email);
                    });
                } else {
                    console.error("Failed to fetch user info:", user);
                }
            })
            .catch((err) => console.error("Error fetching user info:", err));
    });
}



// Check if user is logged in before proceeding
function ensureLoggedIn(callback) {
    chrome.storage.local.get("userEmail", (result) => {
        if (result.userEmail) {
            console.log("User already logged in:", result.userEmail);
            if (callback) callback(result.userEmail);
        } else {
            console.log("No user logged in. Prompting Google login...");
            googleLogin((email) => {
                console.log(`User ${email} logged in.`);
                // Optionally, notify the user that they are now logged in
                chrome.notifications.create({
                    type: "basic",
                    iconUrl: "icon128.png",
                    title: "Login Successful",
                    message: `You are now logged in as ${email}. You can now use the plugin.`,
                    priority: 2
                });
            });
        }
    });
}


// Function to run the main functionality
function runIceCream(tab) {

    chrome.storage.local.get("userEmail", (result) => {
        if (!result.userEmail) {
            alert("Please log in with Google to use the extension.");
            return;
        }
        console.log("Running IceCream for user:", result.userEmail);
        // Proceed with the main functionality
    });

    console.log("Running ICE Cream, initiating capture...");

    // Retrieve the saved question and capture mode from Chrome storage
    chrome.storage.local.get(["defaultQuestion", "captureMode"], (settings) => {
        const question = settings.defaultQuestion || "Tell me about this image";
        const captureMode = settings.captureMode || "viewport";

        console.log(`Capture mode: ${captureMode}, Question: "${question}"`);

        if (captureMode === "viewport") {
            displayNotification(tab.id, "Capturing data and analysing...", true);
            captureFullViewport(tab.id, question);
        } else if (captureMode === "selection") {
            console.log("Starting selection overlay for area capture...");
            captureSelectedArea(tab.id, question);
        }
    });
}


// Listen for the extension icon click
chrome.action.onClicked.addListener((tab) => {
    ensureLoggedIn((email) => {
        console.log(`User ${email} is ready to run IceCream.`);
        // Do nothing after login; let the user click again for screenshot
        runIceCream(tab);
    });
});

// Capture the full viewport and upload it
function captureFullViewport(tabId, question) {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (image) => {
        if (chrome.runtime.lastError) {
            console.error("Error capturing screenshot:", chrome.runtime.lastError);
            displayNotification(tabId, "Error capturing screenshot.");
        } else {
            console.log("Full viewport screenshot captured. Preparing to upload...");
            uploadImage(tabId, image, question);
        }
    });
}

// Capture a selected area of the screen
function captureSelectedArea(tabId, question) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: clearSelectionOverlay,
    }).then(() => {
        console.log("Cleared any previous selection overlay.");
    });

    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: addSelectionOverlay,
    }).then(() => {
        console.log("Selection overlay injected.");
    });

    // Listener for area coordinates from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "captureArea" && request.x != null && request.y != null) {
            console.log("Area selected. Capturing full viewport and cropping to selection...");

            displayNotification(sender.tab.id, "Capturing data and analysing...", true);

            chrome.tabs.captureVisibleTab(null, { format: "png" }, (image) => {
                if (chrome.runtime.lastError) {
                    console.error("Error capturing screenshot:", chrome.runtime.lastError);
                } else {
                    console.log("Full screenshot captured. Injecting script to crop the image.");

                    // Inject temporary content script for cropping
                    chrome.scripting.executeScript({
                        target: { tabId: sender.tab.id },
                        func: cropAndSendImage,
                        args: [image, request.x, request.y, request.width, request.height],
                    });
                }
            });
        }
    });

    // Listener for cropped image data from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "croppedImage" && request.imageData) {
            console.log("Cropped image received. Preparing for upload...");
            uploadImage(sender.tab.id, request.imageData, question);
        }
    });
}

// Enhanced function to clear any previous selection overlays
function clearSelectionOverlay() {
    console.log("Clearing previous selection overlay...");
    const overlays = document.querySelectorAll(".selection-overlay");
    overlays.forEach(overlay => overlay.remove());
}

// Inject selection overlay into the page
function addSelectionOverlay() {
    console.log("Adding selection overlay...");
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    overlay.style.zIndex = "9999";
    overlay.style.cursor = "crosshair";
    overlay.id = "selection-overlay";
    overlay.className = "selection-overlay";
    document.body.appendChild(overlay);

    let startX, startY, endX, endY, selectionBox;

    overlay.addEventListener("mousedown", (e) => {
        startX = e.clientX;
        startY = e.clientY;
        selectionBox = document.createElement("div");
        selectionBox.style.position = "fixed";
        selectionBox.style.border = "2px dashed #fff";
        selectionBox.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
        selectionBox.style.zIndex = "10000";
        overlay.appendChild(selectionBox);

        function onMouseMove(e) {
            endX = e.clientX;
            endY = e.clientY;
            selectionBox.style.left = Math.min(startX, endX) + "px";
            selectionBox.style.top = Math.min(startY, endY) + "px";
            selectionBox.style.width = Math.abs(endX - startX) + "px";
            selectionBox.style.height = Math.abs(endY - startY) + "px";
        }

        function onMouseUp() {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            overlay.remove();
            const x = Math.min(startX, endX);
            const y = Math.min(startY, endY);
            const width = Math.abs(endX - startX);
            const height = Math.abs(endY - startY);

            console.log("Selected area:", { x, y, width, height });

            // Send selection coordinates to the background script
            chrome.runtime.sendMessage({
                action: "captureArea",
                x, y, width, height
            });
        }

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    });
}

// Crop and send the image as a temporary content script function
function cropAndSendImage(base64Image, x, y, width, height) {
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
        const croppedImage = canvas.toDataURL("image/png");

        // Send cropped image back to background script
        chrome.runtime.sendMessage({
            action: "croppedImage",
            imageData: croppedImage
        });
    };
    img.src = base64Image;
}

// Helper function to upload image to the server
function uploadImage(tabId, base64Image, question) {
    console.log("Preparing image upload...");

    // Retrieve user email and token
    chrome.storage.local.get("userEmail", (result) => {
        const email = result.userEmail;

        // Ensure the user is logged in
        if (!email) {
            console.error("User is not logged in. Aborting API call.");
            displayNotification(tabId, "You must be logged in to use this feature.");
            return;
        }

        // Get OAuth token
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (!token) {
                console.error("OAuth token not available. Aborting API call.");
                displayNotification(tabId, "Authentication token missing. Please log in again.");
                return;
            }

            // Create form data with email and token
            const formData = createFormData(base64Image, question, email, token);

            // Make the API call
            fetch("https://icecream.capy.in/upload-image", {
                method: "POST",
                body: formData,
            })
                .then(response => response.json())
                .then(data => {
                    console.log("Upload response received:", data);
                    if (data.status === "success") {
                        console.log("File successfully uploaded:", data.message);

                        chrome.scripting.executeScript({
                            target: { tabId: tabId },
                            files: ["marked.min.js"]
                        }).then(() => {
                            displayNotification(tabId, data.message);
                        }).catch(error => {
                            console.error("Error loading marked.js:", error);
                            displayNotification(tabId, `Success: ${data.message}`);
                        });
                    } else {
                        console.error("Failed to upload file:", data.message);
                        displayNotification(tabId, `Error: ${data.message}`);
                    }
                })
                .catch(error => {
                    console.error("Upload error:", error);
                    displayNotification(tabId, "Error uploading screenshot.");
                });
        });
    });
}


// Helper function to convert base64 image data to FormData
function createFormData(base64Image, question, email, token) {
    console.log("Creating FormData for upload...");
    const formData = new FormData();
    const byteString = atob(base64Image.split(",")[1]);
    const mimeString = base64Image.split(",")[0].split(":")[1].split(";")[0];
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([uint8Array], { type: mimeString });
    formData.append("image", blob, "screenshot.png");
    formData.append("question", question);
    formData.append("email", email);
    formData.append("authToken", token); // Add the token for server-side validation

    return formData;
}

// Function to show a notification in the tab with optional Markdown rendering and progress bar
function displayNotification(tabId, message, showProgress = false) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (message, showProgress) => {
            console.log("Displaying notification...");
            let notification = document.getElementById("extension-notification");
            if (!notification) {
                notification = document.createElement("div");
                notification.id = "extension-notification";
                document.body.appendChild(notification);
            }

            notification.style.position = "fixed";
            notification.style.bottom = "20px";
            notification.style.right = "20px";
            notification.style.width = "420px";
            notification.style.maxHeight = "90vh";

            notification.style.backgroundColor = "#ffffff";
            notification.style.color = "#000000";
            notification.style.borderRadius = "10px";
            notification.style.boxShadow = "0px 8px 16px rgba(0, 0, 0, 0.1)";
            notification.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
            notification.style.zIndex = "9999";
            notification.style.lineHeight = "1.2";
            notification.style.overflow = "auto";

            let renderedMessage = message;
            if (typeof marked !== "undefined") {
                renderedMessage = marked.parse(message);
            }

            notification.innerHTML = `
                <div style="background-color: #1a73e8; color: white; padding: 10px 15px; display: flex; align-items: center; justify-content: space-between; font-weight: bold;">
                    <span>IceCream</span>
                    <button id="close-notification" style="background: none; border: none; color: white; font-weight: bold; cursor: pointer; font-size: 1.2em; line-height: 1;">&times;</button>
                </div>
                <div style="padding: 20px;">
                    <div style="font-size: 12px; padding-left:5px">${renderedMessage}</div>
                    ${showProgress ? '<div id="progress-bar" style="margin-top: 10px; height: 6px; background-color: #4CAF50; border-radius: 3px; width: 0;"></div>' : ''}
                </div>
            `;

            if (showProgress) {
                let progressBar = notification.querySelector("#progress-bar");
                let width = 0;
                const interval = setInterval(() => {
                    width += 10;
                    progressBar.style.width = width + "%";
                    if (width >= 100) clearInterval(interval);
                }, 300);
            }

            notification.querySelector("#close-notification").onclick = () => notification.remove();
        },
        args: [message, showProgress]
    });
}

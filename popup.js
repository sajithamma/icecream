document.getElementById("screenshotBtn").addEventListener("click", () => {
    console.log("Screenshot button clicked, capturing and uploading...");

    // Show the slide window and reset progress bar
    showSlideWindow();
    updateProgressBar(0);

    // Step 1: Capture the screenshot
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (image) => {
        if (chrome.runtime.lastError) {
            console.error("Error capturing screenshot:", chrome.runtime.lastError);
            displayMessage("Error capturing screenshot.");
            updateProgressBar(100);
        } else {
            console.log("Screenshot captured. Preparing to upload...");
            updateProgressBar(30); // Initial progress after capture

            // Step 2: Upload the screenshot to the server
            fetch("http://localhost:7001/upload-image", {
                method: "POST",
                body: createFormData(image),
            })
                .then(response => {
                    updateProgressBar(70); // Progress after server receives the file
                    return response.json();
                })
                .then(data => {
                    if (data.status === "success") {
                        console.log("File successfully uploaded:", data.message);
                        displayMessage(`Success: ${data.message}`);
                    } else {
                        console.error("Failed to upload file:", data.message);
                        displayMessage(`Error: ${data.message}`);
                    }
                    updateProgressBar(100); // Complete progress
                })
                .catch(error => {
                    console.error("Upload error:", error);
                    displayMessage("Error uploading screenshot.");
                    updateProgressBar(100);
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

// Function to display a message in the slide window
function displayMessage(message) {
    const messageContainer = document.getElementById("messageContainer");
    messageContainer.textContent = message;
}

// Function to show the slide window
function showSlideWindow() {
    const slideWindow = document.getElementById("slideWindow");
    slideWindow.classList.add("show");
}

// Function to update the progress bar
function updateProgressBar(percentage) {
    const progressBar = document.getElementById("progressBar");
    progressBar.style.width = percentage + "%";
    if (percentage === 100) {
        setTimeout(() => hideSlideWindow(), 3000); // Hide after 3 seconds
    }
}

// Function to hide the slide window
function hideSlideWindow() {
    const slideWindow = document.getElementById("slideWindow");
    slideWindow.classList.remove("show");
}

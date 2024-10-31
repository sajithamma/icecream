document.getElementById("screenshotBtn").addEventListener("click", () => {
    console.log("Screenshot button clicked, capturing and uploading...");

    // Step 1: Capture the screenshot
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (image) => {
        if (chrome.runtime.lastError) {
            console.error("Error capturing screenshot:", chrome.runtime.lastError);
        } else {
            console.log("Screenshot captured. Preparing to upload...");

            // Step 2: Upload the screenshot to the server
            fetch("http://localhost:7001/upload-image", {
                method: "POST",
                body: createFormData(image),
            })
                .then(response => response.json())
                .then(data => {
                    if (data.status === "success") {
                        console.log("File successfully uploaded:", data.filename);
                        alert("Screenshot uploaded successfully!");
                    } else {
                        console.error("Failed to upload file:", data.message);
                        alert("Failed to upload screenshot.");
                    }
                })
                .catch(error => {
                    console.error("Upload error:", error);
                    alert("Error uploading screenshot.");
                });
        }
    });
});

// Helper function to convert base64 image data to FormData
function createFormData(base64Image) {
    const formData = new FormData();

    // Convert base64 image to Blob
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

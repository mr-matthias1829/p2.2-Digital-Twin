class OllamaAnalyzer{
    constructor(viewer, options = {}) {
        this.viewer = viewer;
        this.ollamaUrl = options.ollamaUrl || 'http://localhost:11434';
        this.model = options.model || 'gemma3:4b';
        this.interval = options.interval || 120000;
        this.prompt = options.prompt || "You are viewing this scene from the Cesium Man's perspective in Leeuwarden. Describe what you see in the environment and give your opinion about it in 2-3 sentences.";
        this.intervalId = null;
        this.isRunning = false;
    }

    async captureScreenshot( ) {
        const canvas = this.viewer.scene.canvas;
        return new Promise((resolve) => {
            this.viewer.scene.render();
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', 0.8);
        });
    }

    async analyzeWithOllama(){
        try{
            console.log("   Capturing screenshot...");
            const screenshot = await this.captureScreenshot();

            if (!screenshot) {
                console.error("Failed to capture screenshot");
                return;
            }

            const reader = new FileReader();
            reader.readAsDataURL(screenshot);
            
            reader.onloadend = async () => {
                const base64Image = reader.result.split(',')[1];

                console.log("Sending to Ollama...");
                const response = await fetch(`${this.ollamaUrl}/api/generate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: this.model,
                        prompt: this.prompt,
                        images: [base64Image],
                        stream: false,
                    }),
                });
                if (!response.ok) {
                    throw new Error(`Ollama request failed: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('Ollama response:', data.response);

                this.displayResponse(data.response);
            };
        } catch (err) {
            console.error('Error analyzing with Ollama:', err);
        }
    }

    displayResponse(response) {
        let responseDiv = document.getElementById('ollama-response');
        if (!responseDiv) {
            responseDiv = document.createElement('div');
            responseDiv.id = 'ollama-response';
            responseDiv.style.cssText = `
                position: absolute;
                bottom: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 15px;
                border-radius: 5px;
                max-width: 300px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                z-index: 1000;
                line-height: 1.4;
            `;
            document.body.appendChild(responseDiv);
        }
        
        const timestamp = new Date().toLocaleTimeString();
        responseDiv.innerHTML = `
            <strong>AI Opinion (${timestamp}):</strong><br>
            ${response}
        `;
    }
    start() {
        if (this.isRunning) {
            console.warn("Ollama analyzer is already running.");
            return;
        }

        console.log("Starting Ollama analysis loop...");
        this.isRunning = true;

        this.analyzeWithOllama();

        this.intervalId = setInterval(() => {
            this.analyzeWithOllama();  
        }, this.interval);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.isRunning = false;
            console.log("Ollama analysis stopped");
        }
    }

    setInterval(newInterval) {
        const wasRunning = this.isRunning;
        if (wasRunning) {
            this.stop();
        }
        this.interval = newInterval;
        if (wasRunning) {
            this.start();
        }
    }
}
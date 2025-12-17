class OllamaAnalyzer{
    constructor(viewer, options = {}) {
        this.viewer = viewer;
        this.ollamaUrl = options.ollamaUrl || 'http://localhost:11434';
        this.models = options.models || [
            'gemma3:4b',
            'qwen3-vl:4b',
        ];
        this.model = this.models[0];
        this.interval = options.interval || 120000;
        this.prompt = options.prompt || "You are viewing this scene from the Cesium Man's perspective in Leeuwarden. Describe what you see in the environment and give your opinion about it in 2-3 sentences.";
        this.intervalId = null;
        this.isRunning = false;
        this.selectedCesiumMan = null;
        this.trackingCallback = null;
        this.removeTrackingCallback = null;
    }

    findAllCesiumMen() {
        const cesiumMen = [];
        const primitives = this.viewer.scene.primitives;

        for (let i = 0; i < primitives.length; i++) {
            const primitive = primitives.get(i);
            if (primitive.isEditableModel && primitive.modelKey === "man"){
                cesiumMen.push(primitive);
            }
        }
        return cesiumMen;
    }

    selectCesiumMan(index = 0) {
        const cesiumMen = this.findAllCesiumMen();

        if (cesiumMen.length === 0) {
            console.error("No Cesium Man models found in the scene.");
            this.selectedCesiumMan = null;
            return false;
        }

        if (index < 0 || index >= cesiumMen.length) {
            console.error(`Invalid index ${index}. Found ${cesiumMen.length} Cesium man model(s).`);
            return false;
        }
        this.selectedCesiumMan = cesiumMen[index];
        console.log(`Selected Cesium Man #${index} at position:`, this.selectedCesiumMan.modelPosition);

        this.trackSelectedMan();

        return true;
    }

    trackSelectedMan() {
        if (!this.selectedCesiumMan){
            console.warn("No Cesium Man selected to track.");
            return false;
        }

        const model = this.selectedCesiumMan;

        this.trackingCallback = () => {
            if (!this.selectedCesiumMan) return;

            const position = model.modelPosition;
            const height = model.modelHeight;

            const modelPos = Cesium.Cartesian3.fromDegrees(
                position.lon, 
                position.lat, 
                height
            );

            this.viewer.trackedEntity = new Cesium.Entity({
                position: new Cesium.ConstantPositionProperty(modelPos),
            });
        };

        this.trackingCallback();

        if (this.removeTrackingCallback) {
            this.removeTrackingCallback();
        }

        this.removeTrackingCallback = this.viewer.scene.preRender.addEventListener(() => {
            if (!this.selectedCesiumMan) return;

            const position = this.selectedCesiumMan.modelPosition;
            const height = this.selectedCesiumMan.modelHeight;

            const modelPos = Cesium.Cartesian3.fromDegrees(
                position.lon,
                position.lat, 
                height
            );

            if (this.viewer.trackedEntity) {
                this.viewer.trackedEntity.position = new Cesium.ConstantPositionProperty(modelPos);
            }
        });

        console.log("Camera is now tracking around the selected Cesium Man.");
        return true;
    }

    stopTracking() {
        this.viewer.trackedEntity = undefined;

        if (this.removeTrackingCallback) {
            this.removeTrackingCallback();
            this.removeTrackingCallback = null;
            console.log("Camera tracking stopped.");
            return true;
        }
        console.log("Camera was not tracking");
        return false;
    }

    listCesiumMen() {
        const cesiumMen = this.findAllCesiumMen();

        if (cesiumMen.length === 0) {
            console.log("No Cesium Man models found.");
            return [];
        }

        console.log(`Found ${cesiumMen.length} Cesium Man model(s):`);
        cesiumMen.forEach((man, index) => {
            const info = getModelInfo(man);
            console.log(`   [${index}] Position: (${info.position.lon}, ${info.position.lat}), Rotation: ${info.rotation}°, Height: ${info.height}`);
        });

        return cesiumMen;
    }

    snapCameraToSelectedMan() {
        if (!this.selectedCesiumMan) {
            console.warn("No Cesium Man selected. Call selectCesiumMan(index) first.");
            return false;
        }

        const model = this.selectedCesiumMan;
        const position = model.modelPosition;
        const height = model.modelHeight;
        const rotationDegrees = model.modelRotation;
        const scale = model.modelScale;

        const pos = Cesium.Cartesian3.fromDegrees(position.lon, position.lat, height);

        const heading = Cesium.Math.toRadians(rotationDegrees);
        const hpr = new Cesium.HeadingPitchRoll(heading, 0, 0);

        const modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(pos, hpr);

        const modelForward = new Cesium.Cartesian3(0, 1, 0);

        const worldForward = Cesium.Matrix4.multiplyByPoint(
            modelMatrix,
            modelForward,
            new Cesium.Cartesian3()
        );
        Cesium.Cartesian3.normalize(worldForward, worldForward);

        const eyeHeight = 0.8 * scale;
        const forwardOffset = 0.5 * scale;

        const eyePosition = Cesium.Cartesian3.clone(pos, new Cesium.Cartesian3());

        Cesium.Cartesian3.multiplyByScalar(worldForward, forwardOffset, worldForward);
        Cesium.Cartesian3.add(eyePosition, worldForward, eyePosition);

        const up = Cesium.Cartesian3.normalize(pos, new Cesium.Cartesian3());
        const heightOffset = Cesium.Cartesian3.multiplyByScalar(up, eyeHeight, new Cesium.Cartesian3());
        Cesium.Cartesian3.add(eyePosition, heightOffset, eyePosition);

        const headingCorrection = Math.PI / 2;

        this.viewer.camera.setView({
            destination: eyePosition,
            orientation: {
                heading: heading + headingCorrection,
                pitch: 0,
                roll: 0,
            }
        });

        console.log(`Camera snapped to Cesium Man's perspective`);
        return true;
    }

    async captureScreenshot() {
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
            if (this.selectedCesiumMan != null) {
                this.snapCameraToSelectedMan();
                await new Promise(resolve => setTimeout(resolve, 100));
            } else{
                console.warn("No Cesium Man selected. Analyzing from current camera position.")
            }

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

                console.log(`Sending to Ollama Model ${this.model}...`);
                const response = await fetch(`${this.ollamaUrl}/api/chat`, {
                    method: "POST",
                    headers: {
                    "Content-Type": "application/json",
                },
                    body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: "user",
                            content: this.prompt,
                            images: [base64Image]
                            }
                        ],
                    stream: false,
                    }),
                });
                if (!response.ok) {
                    throw new Error(`Ollama request failed: ${response.statusText}`);
                }

                const data = await response.json();
                console.log("Ollama response:", data.message.content);
                this.displayResponse(data.message.content);
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
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
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

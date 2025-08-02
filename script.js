// AI Universal Orchestrator
class AIOrchestrator {
    constructor() {
        this.apiKey = this.getStoredApiKey();
        this.tasks = [];
        this.currentTaskIndex = 0;
        this.isRunning = false;
        this.executionMode = 'serial';
        this.enableCodeExecution = false;
        this.enableCanvas = false;
        
        this.initializeDOM();
        this.setupEventListeners();
        this.checkApiKey();
    }

    // DOM Initialization
    initializeDOM() {
        this.elements = {
            apiKeyModal: document.getElementById('apiKeyModal'),
            apiKeyInput: document.getElementById('apiKeyInput'),
            saveApiKeyBtn: document.getElementById('saveApiKey'),
            configBtn: document.getElementById('configBtn'),
            taskInput: document.getElementById('taskInput'),
            systemPrompt: document.getElementById('systemPrompt'),
            orchestrateBtn: document.getElementById('orchestrateBtn'),
            taskBreakdown: document.getElementById('taskBreakdown'),
            taskCount: document.getElementById('taskCount'),
            executionResults: document.getElementById('executionResults'),
            progressBar: document.getElementById('progressBar'),
            progressText: document.getElementById('progressText'),
            canvasContainer: document.getElementById('canvasContainer'),
            codeContainer: document.getElementById('codeContainer'),
            outputCanvas: document.getElementById('outputCanvas'),
            codeOutput: document.getElementById('codeOutput')
        };
    }

    // Event Listeners
    setupEventListeners() {
        this.elements.saveApiKeyBtn.addEventListener('click', () => this.saveApiKey());
        this.elements.configBtn.addEventListener('click', () => this.openSettings());
        this.elements.orchestrateBtn.addEventListener('click', () => this.startOrchestration());

        // Execution mode radio buttons
        document.querySelectorAll('input[name="executionMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.executionMode = e.target.value;
            });
        });

        // Feature checkboxes
        document.getElementById('enableCodeExecution').addEventListener('change', (e) => {
            this.enableCodeExecution = e.target.checked;
            this.toggleCodeContainer();
        });

        document.getElementById('enableCanvas').addEventListener('change', (e) => {
            this.enableCanvas = e.target.checked;
            this.toggleCanvasContainer();
        });
    }

    // API Key Management
    getStoredApiKey() {
        return localStorage.getItem('openai_api_key');
    }

    saveApiKey() {
        const apiKey = this.elements.apiKeyInput.value.trim();
        if (apiKey && apiKey.startsWith('sk-')) {
            localStorage.setItem('openai_api_key', apiKey);
            this.apiKey = apiKey;
            this.hideApiKeyModal();
        } else {
            alert('Please enter a valid OpenAI API key');
        }
    }

    checkApiKey() {
        if (!this.apiKey) {
            this.showApiKeyModal();
        }
    }

    showApiKeyModal() {
        const modal = new bootstrap.Modal(this.elements.apiKeyModal, {
            backdrop: 'static',
            keyboard: false
        });
        modal.show();
    }

    hideApiKeyModal() {
        const modal = bootstrap.Modal.getInstance(this.elements.apiKeyModal);
        if (modal) modal.hide();
    }

    openSettings() {
        this.showApiKeyModal();
    }

    // UI Toggle Functions
    toggleCodeContainer() {
        if (this.enableCodeExecution) {
            this.elements.codeContainer.classList.remove('d-none');
        } else {
            this.elements.codeContainer.classList.add('d-none');
        }
    }

    toggleCanvasContainer() {
        if (this.enableCanvas) {
            this.elements.canvasContainer.classList.remove('d-none');
        } else {
            this.elements.canvasContainer.classList.add('d-none');
        }
    }

    // OpenAI API Communication
    async callOpenAI(messages, temperature = 0.7) {
        if (!this.apiKey) {
            throw new Error('No API key configured');
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: messages,
                temperature: temperature,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    // Task Breakdown
    async breakdownTask(mainTask, systemPrompt) {
        const messages = [
            {
                role: 'system',
                content: systemPrompt || `You are an expert task decomposition AI. Break down complex tasks into smaller, manageable subtasks. 
                Return your response as a JSON array where each task has: id, title, description, estimated_duration, dependencies (array of task ids), and type (research/analysis/creation/execution/review).
                Make sure tasks are logical, sequential when needed, and can be executed independently when possible.`
            },
            {
                role: 'user',
                content: `Please break down this main task into smaller subtasks: ${mainTask}
                
                Return only a valid JSON array of tasks. Each task should be specific and actionable.`
            }
        ];

        try {
            const response = await this.callOpenAI(messages);
            // Try to extract JSON from the response
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No valid JSON found in response');
            }
        } catch (error) {
            console.error('Error parsing task breakdown:', error);
            // Fallback: create a simple single task
            return [{
                id: 1,
                title: "Complete Main Task",
                description: mainTask,
                estimated_duration: "Unknown",
                dependencies: [],
                type: "execution"
            }];
        }
    }

    // Task Execution
    async executeTask(task) {
        const systemPrompt = this.elements.systemPrompt.value || 
            "You are a helpful AI assistant. Complete the given task thoroughly and provide clear, actionable results.";

        const messages = [
            {
                role: 'system',
                content: systemPrompt + (this.enableCodeExecution ? 
                    "\n\nYou can execute JavaScript code. If you need to run code, provide it in a code block marked with 'EXECUTE_JS:' followed by the code." : "")
            },
            {
                role: 'user',
                content: `Task: ${task.title}\nDescription: ${task.description}\n\nPlease complete this task and provide detailed results.`
            }
        ];

        try {
            const result = await this.callOpenAI(messages);
            
            // Check for code execution requests
            if (this.enableCodeExecution && result.includes('EXECUTE_JS:')) {
                return await this.executeWithCode(result, task);
            }
            
            return {
                success: true,
                result: result,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Code Execution
    async executeWithCode(content, task) {
        try {
            const codeBlocks = content.match(/EXECUTE_JS:([\s\S]*?)(?=EXECUTE_JS:|$)/g);
            let finalResult = content;
            
            if (codeBlocks) {
                for (const block of codeBlocks) {
                    const code = block.replace('EXECUTE_JS:', '').trim();
                    try {
                        // Create a sandboxed execution environment
                        const result = this.executeJavaScript(code);
                        this.displayCodeOutput(`// Executing code for task: ${task.title}\n${code}\n\n// Output:\n${result}`);
                        finalResult = finalResult.replace(block, `Code executed successfully. Result: ${result}`);
                    } catch (execError) {
                        this.displayCodeOutput(`// Error executing code for task: ${task.title}\n${code}\n\n// Error:\n${execError.message}`);
                        finalResult = finalResult.replace(block, `Code execution failed: ${execError.message}`);
                    }
                }
            }
            
            return {
                success: true,
                result: finalResult,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Safe JavaScript Execution
    executeJavaScript(code) {
        try {
            // Create a sandboxed environment with limited access
            const sandbox = {
                console: {
                    log: (...args) => args.join(' '),
                    error: (...args) => 'Error: ' + args.join(' ')
                },
                Math: Math,
                Date: Date,
                JSON: JSON,
                canvas: this.enableCanvas ? this.elements.outputCanvas : null,
                ctx: this.enableCanvas ? this.elements.outputCanvas.getContext('2d') : null
            };

            // Create a function with the sandboxed environment
            const func = new Function(...Object.keys(sandbox), `
                "use strict";
                ${code}
            `);

            const result = func(...Object.values(sandbox));
            return result !== undefined ? String(result) : 'Code executed successfully';
        } catch (error) {
            throw new Error(`JavaScript execution error: ${error.message}`);
        }
    }

    // Display Functions
    displayCodeOutput(output) {
        this.elements.codeOutput.textContent = output;
    }

    displayTaskBreakdown(tasks) {
        this.tasks = tasks;
        this.elements.taskCount.textContent = `${tasks.length} tasks`;
        
        const html = tasks.map((task, index) => `
            <div class="task-item pending" data-task-id="${task.id}">
                <div class="task-title">${task.title}</div>
                <div class="task-description">${task.description}</div>
                <div class="task-status">
                    <span class="badge bg-secondary">Pending</span>
                    <small class="text-muted">${task.type} • ~${task.estimated_duration}</small>
                </div>
            </div>
        `).join('');
        
        this.elements.taskBreakdown.innerHTML = html;
    }

    updateTaskStatus(taskId, status, result = null) {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (!taskElement) return;

        taskElement.className = `task-item ${status}`;
        const statusBadge = taskElement.querySelector('.badge');
        
        switch (status) {
            case 'running':
                statusBadge.textContent = 'Running';
                statusBadge.className = 'badge bg-primary';
                break;
            case 'completed':
                statusBadge.textContent = 'Completed';
                statusBadge.className = 'badge bg-success';
                break;
            case 'error':
                statusBadge.textContent = 'Error';
                statusBadge.className = 'badge bg-danger';
                break;
        }
    }

    displayExecutionResult(task, result) {
        const resultHtml = `
            <div class="result-item ${result.success ? 'success' : 'error'}">
                <div class="result-header">
                    <span>${task.title}</span>
                    <small class="text-muted">${new Date(result.timestamp).toLocaleTimeString()}</small>
                </div>
                <div class="result-content">${result.success ? result.result : `Error: ${result.error}`}</div>
            </div>
        `;
        this.elements.executionResults.insertAdjacentHTML('beforeend', resultHtml);
        this.elements.executionResults.scrollTop = this.elements.executionResults.scrollHeight;
    }

    updateProgress() {
        const completedTasks = this.tasks.filter(task => 
            document.querySelector(`[data-task-id="${task.id}"]`).classList.contains('completed')
        ).length;
        
        const progress = this.tasks.length > 0 ? (completedTasks / this.tasks.length) * 100 : 0;
        this.elements.progressBar.style.width = `${progress}%`;
        this.elements.progressText.textContent = `${Math.round(progress)}%`;
    }

    // Main Orchestration Logic
    async startOrchestration() {
        const mainTask = this.elements.taskInput.value.trim();
        if (!mainTask) {
            alert('Please enter a task to orchestrate');
            return;
        }

        if (this.isRunning) {
            alert('Orchestration is already running');
            return;
        }

        try {
            this.isRunning = true;
            this.elements.orchestrateBtn.disabled = true;
            this.elements.orchestrateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Breaking down task...';
            
            // Clear previous results
            this.elements.executionResults.innerHTML = '';
            this.elements.taskBreakdown.innerHTML = '';
            
            // Break down the main task
            const tasks = await this.breakdownTask(mainTask, this.elements.systemPrompt.value);
            this.displayTaskBreakdown(tasks);
            
            this.elements.orchestrateBtn.innerHTML = '<i class="fas fa-play me-2"></i>Executing tasks...';
            
            // Execute tasks based on mode
            if (this.executionMode === 'serial') {
                await this.executeTasksSerial();
            } else {
                await this.executeTasksParallel();
            }
            
        } catch (error) {
            console.error('Orchestration error:', error);
            alert(`Error during orchestration: ${error.message}`);
        } finally {
            this.isRunning = false;
            this.elements.orchestrateBtn.disabled = false;
            this.elements.orchestrateBtn.innerHTML = '<i class="fas fa-play me-2"></i>Start Orchestration';
        }
    }

    async executeTasksSerial() {
        for (const task of this.tasks) {
            this.updateTaskStatus(task.id, 'running');
            const result = await this.executeTask(task);
            
            if (result.success) {
                this.updateTaskStatus(task.id, 'completed');
            } else {
                this.updateTaskStatus(task.id, 'error');
            }
            
            this.displayExecutionResult(task, result);
            this.updateProgress();
            
            // Small delay between tasks
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    async executeTasksParallel() {
        const promises = this.tasks.map(async (task) => {
            this.updateTaskStatus(task.id, 'running');
            const result = await this.executeTask(task);
            
            if (result.success) {
                this.updateTaskStatus(task.id, 'completed');
            } else {
                this.updateTaskStatus(task.id, 'error');
            }
            
            this.displayExecutionResult(task, result);
            this.updateProgress();
            
            return { task, result };
        });
        
        await Promise.all(promises);
    }
}

// Initialize the orchestrator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.orchestrator = new AIOrchestrator();
});

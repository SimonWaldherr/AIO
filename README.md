# AI Universal Orchestrator
Transform any complex task into manageable AI-powered workflows

## Introduction
Welcome to the AI Universal Orchestrator, an advanced tool that revolutionizes how you approach complex tasks by leveraging the power of artificial intelligence. This orchestrator automatically breaks down any complex task into smaller, manageable subtasks and executes them either sequentially or in parallel, providing a comprehensive solution for AI-driven task automation.

Unlike traditional AI tools that handle single requests, this orchestrator creates intelligent workflows that can:
- Decompose complex tasks into structured subtasks
- Execute tasks in serial or parallel modes
- Perform code execution with JavaScript sandboxing
- Provide visual outputs through HTML Canvas integration
- Store your API credentials securely in your browser
- Track progress and manage task dependencies

## Key Features

### 🧠 Intelligent Task Breakdown
The orchestrator analyzes your main task and automatically creates a structured breakdown with:
- Specific subtask titles and descriptions
- Estimated duration for each task
- Task dependencies and execution order
- Task categorization (research, analysis, creation, execution, review)

### ⚡ Flexible Execution Modes
- **Serial Execution**: Tasks run one after another, perfect for dependent workflows
- **Parallel Execution**: All tasks run simultaneously for maximum speed

### 💻 Code Execution Capabilities
- Safe JavaScript execution in a sandboxed environment
- Access to HTML Canvas for visual outputs and data visualization
- Real-time code output display
- Error handling and debugging support

### 🔐 Secure API Management
- API keys stored locally in your browser (localStorage)
- No server-side storage of sensitive credentials
- Easy configuration and management interface

### 📊 Real-time Progress Tracking
- Visual task status indicators (pending, running, completed, error)
- Overall progress bar
- Detailed execution results with timestamps
- Error handling and reporting

## Prerequisites
To use this tool, you'll need:
1. An [OpenAI API key](https://platform.openai.com/account/api-keys) with access to GPT-4
2. A modern web browser with JavaScript enabled
3. Internet connection for API calls

## Getting Started

### 1. Obtain Your API Key
Visit [OpenAI's API platform](https://platform.openai.com/account/api-keys) and create an API key. Make sure you have sufficient credits in your OpenAI account.

### 2. Run the Application
You can run the application locally using Python's built-in server:

**Python 3:**
```bash
python3 -m http.server 8080
```

**Python 2:**
```bash
python2 -m SimpleHTTPServer 8080
```

Then open your browser and navigate to `http://localhost:8080`

### 3. Configure Your API Key
When you first open the application, you'll be prompted to enter your OpenAI API key. This key will be stored securely in your browser's local storage.

### 4. Start Orchestrating
1. Enter your main task in the "Task Input" field
2. Optionally provide a custom system prompt
3. Choose your execution mode (Serial or Parallel)
4. Enable additional features like code execution or canvas access if needed
5. Click "Start Orchestration" to begin

## Usage Examples

### Example 1: Research Project
**Main Task**: "Research renewable energy trends and create a comprehensive report"

The orchestrator might break this down into:
1. Research current renewable energy technologies
2. Analyze market trends and statistics
3. Identify key challenges and opportunities
4. Compile findings into structured sections
5. Create executive summary and recommendations

### Example 2: Data Analysis with Visualization
**Main Task**: "Analyze website traffic data and create visual charts"
*Enable Canvas Access*

The orchestrator could:
1. Process and clean the traffic data
2. Calculate key metrics and trends
3. Generate charts using Canvas API
4. Create insights and recommendations
5. Compile a visual dashboard

### Example 3: Code Development
**Main Task**: "Create a JavaScript function to sort and filter user data"
*Enable Code Execution*

The workflow might include:
1. Design the function architecture
2. Implement sorting algorithms
3. Add filtering capabilities
4. Test with sample data
5. Optimize for performance

## Advanced Features

### Custom System Prompts
Customize how the AI approaches your tasks by providing specific instructions:
- "You are a data scientist focusing on statistical analysis"
- "Act as a creative writer with expertise in storytelling"
- "Approach this as a software architect designing scalable systems"

### Code Execution Environment
The sandboxed JavaScript environment provides access to:
- Console logging for debugging
- Math and Date objects for calculations
- JSON parsing for data manipulation
- Canvas context for drawing and visualization

### Canvas Integration
When enabled, tasks can create visual outputs:
- Charts and graphs
- Diagrams and flowcharts
- Interactive visualizations
- Custom graphics and animations

## Security Considerations

### API Key Protection
- Your OpenAI API key is stored only in your browser's local storage
- Keys are never transmitted to any server other than OpenAI's API
- You can clear your stored key anytime through the settings

### Code Execution Safety
- JavaScript execution runs in a restricted sandbox
- No access to sensitive browser APIs or local files
- Limited to safe operations and approved libraries

### Best Practices
1. Never share your API key with others
2. Monitor your OpenAI usage to avoid unexpected charges
3. Clear your browser data if using a shared computer
4. Regularly review and rotate your API keys

## Technical Architecture

### Frontend Technologies
- **HTML5**: Modern semantic markup with Bootstrap 5
- **CSS3**: Responsive design with custom animations
- **JavaScript ES6+**: Modular architecture with async/await
- **Bootstrap 5**: Professional UI components and responsive grid
- **Font Awesome**: Comprehensive icon library

### AI Integration
- **OpenAI GPT-4**: Advanced language model for task decomposition and execution
- **Custom Prompting**: Specialized prompts for different task types
- **Error Handling**: Robust error management and fallback strategies

### Data Management
- **Local Storage**: Secure client-side credential storage
- **JSON Processing**: Structured data handling for task management
- **Progress Tracking**: Real-time status updates and progress monitoring

## Contributing
We welcome contributions to improve the AI Universal Orchestrator! Here's how you can help:

1. **Bug Reports**: Submit detailed bug reports with reproduction steps
2. **Feature Requests**: Suggest new capabilities and improvements
3. **Code Contributions**: Fork the repository and submit pull requests
4. **Documentation**: Help improve documentation and examples

### Development Setup
1. Fork the repository
2. Make your changes
3. Test thoroughly with different task types
4. Submit a pull request with a detailed description

## Troubleshooting

### Common Issues
1. **API Key Errors**: Ensure your key is valid and has sufficient credits
2. **Task Breakdown Failed**: Try simplifying your main task description
3. **Code Execution Errors**: Check JavaScript syntax and sandbox limitations
4. **Canvas Not Working**: Ensure canvas access is enabled in settings

### Performance Tips
1. Use serial execution for dependent tasks
2. Use parallel execution for independent tasks
3. Break down very large tasks into smaller components
4. Monitor API usage to manage costs

## Future Enhancements
- Integration with additional AI models (Claude, Gemini)
- Support for file uploads and processing
- Advanced visualization libraries
- Team collaboration features
- Task template library
- Export capabilities for various formats

## License
This project is open source and available under the MIT License.

## Acknowledgments
- OpenAI for providing powerful AI capabilities
- The open-source community for inspiration and best practices
- Bootstrap and Font Awesome for excellent UI components

---

**Ready to orchestrate your next big project? Start by entering your task and let AI break it down into manageable steps!**

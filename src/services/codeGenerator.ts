
interface CodeTemplate {
  keywords: string[]
  template: (prompt: string) => string
}

const codeTemplates: CodeTemplate[] = [
  {
    keywords: ['todo', 'task', 'list', 'checklist'],
    template: (prompt: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Todo App</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.1);
        }
        h1 { color: #333; text-align: center; margin-bottom: 30px; }
        .input-section {
            display: flex;
            margin-bottom: 30px;
            gap: 10px;
        }
        input[type="text"] {
            flex: 1;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
        }
        button {
            padding: 12px 20px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover { background: #5a6fd8; }
        .todo-item {
            display: flex;
            align-items: center;
            padding: 15px;
            border: 1px solid #eee;
            border-radius: 8px;
            margin-bottom: 10px;
            background: #f9f9f9;
        }
        .todo-item.completed {
            text-decoration: line-through;
            opacity: 0.6;
        }
        .todo-item input[type="checkbox"] {
            margin-right: 15px;
            transform: scale(1.2);
        }
        .delete-btn {
            margin-left: auto;
            padding: 5px 10px;
            background: #ff4757;
            font-size: 12px;
        }
        .delete-btn:hover { background: #ff3742; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Todo List - ${prompt}</h1>
        <div class="input-section">
            <input type="text" id="todoInput" placeholder="Add a new task...">
            <button onclick="addTodo()">Add Task</button>
        </div>
        <div id="todoList"></div>
    </div>

    <script>
        let todos = [];
        let nextId = 1;

        function addTodo() {
            const input = document.getElementById('todoInput');
            const text = input.value.trim();
            if (text) {
                todos.push({ id: nextId++, text, completed: false });
                input.value = '';
                renderTodos();
            }
        }

        function toggleTodo(id) {
            const todo = todos.find(t => t.id === id);
            if (todo) {
                todo.completed = !todo.completed;
                renderTodos();
            }
        }

        function deleteTodo(id) {
            todos = todos.filter(t => t.id !== id);
            renderTodos();
        }

        function renderTodos() {
            const list = document.getElementById('todoList');
            list.innerHTML = todos.map(todo => \`
                <div class="todo-item \${todo.completed ? 'completed' : ''}">
                    <input type="checkbox" \${todo.completed ? 'checked' : ''} 
                           onchange="toggleTodo(\${todo.id})">
                    <span>\${todo.text}</span>
                    <button class="delete-btn" onclick="deleteTodo(\${todo.id})">Delete</button>
                </div>
            \`).join('');
        }

        document.getElementById('todoInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addTodo();
        });
    </script>
</body>
</html>`
  },
  {
    keywords: ['calculator', 'calc', 'math', 'numbers'],
    template: (prompt: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calculator - ${prompt}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
        }
        .calculator {
            background: #333;
            padding: 25px;
            border-radius: 20px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        }
        .display {
            width: 280px;
            height: 80px;
            background: #000;
            color: white;
            text-align: right;
            font-size: 2.5rem;
            padding: 0 20px;
            margin-bottom: 20px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            font-family: 'Courier New', monospace;
        }
        .buttons {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
        }
        button {
            width: 70px;
            height: 70px;
            border: none;
            border-radius: 15px;
            font-size: 1.5rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
        }
        .number, .decimal { background: #666; color: white; }
        .operator { background: #ff9500; color: white; }
        .equals { background: #ff9500; color: white; }
        .clear { background: #a6a6a6; color: black; }
        button:hover { transform: scale(1.05); }
        button:active { transform: scale(0.95); }
    </style>
</head>
<body>
    <div class="calculator">
        <div class="display" id="display">0</div>
        <div class="buttons">
            <button class="clear" onclick="clearAll()">C</button>
            <button class="clear" onclick="clearEntry()">CE</button>
            <button class="operator" onclick="inputOperator('/')">/</button>
            <button class="operator" onclick="inputOperator('*')">×</button>
            
            <button class="number" onclick="inputNumber('7')">7</button>
            <button class="number" onclick="inputNumber('8')">8</button>
            <button class="number" onclick="inputNumber('9')">9</button>
            <button class="operator" onclick="inputOperator('-')">-</button>
            
            <button class="number" onclick="inputNumber('4')">4</button>
            <button class="number" onclick="inputNumber('5')">5</button>
            <button class="number" onclick="inputNumber('6')">6</button>
            <button class="operator" onclick="inputOperator('+')">+</button>
            
            <button class="number" onclick="inputNumber('1')">1</button>
            <button class="number" onclick="inputNumber('2')">2</button>
            <button class="number" onclick="inputNumber('3')">3</button>
            <button class="equals" onclick="calculate()" rowspan="2">=</button>
            
            <button class="number" onclick="inputNumber('0')" style="grid-column: span 2;">0</button>
            <button class="decimal" onclick="inputDecimal()">.</button>
        </div>
    </div>

    <script>
        let display = document.getElementById('display');
        let currentInput = '0';
        let operator = null;
        let previousInput = null;
        let waitingForOperand = false;

        function updateDisplay() {
            display.textContent = currentInput;
        }

        function inputNumber(num) {
            if (waitingForOperand) {
                currentInput = num;
                waitingForOperand = false;
            } else {
                currentInput = currentInput === '0' ? num : currentInput + num;
            }
            updateDisplay();
        }

        function inputOperator(nextOperator) {
            const inputValue = parseFloat(currentInput);

            if (previousInput === null) {
                previousInput = inputValue;
            } else if (operator) {
                const result = performCalculation();
                currentInput = String(result);
                previousInput = result;
                updateDisplay();
            }

            waitingForOperand = true;
            operator = nextOperator;
        }

        function inputDecimal() {
            if (waitingForOperand) {
                currentInput = '0.';
                waitingForOperand = false;
            } else if (currentInput.indexOf('.') === -1) {
                currentInput += '.';
            }
            updateDisplay();
        }

        function clearAll() {
            currentInput = '0';
            previousInput = null;
            operator = null;
            waitingForOperand = false;
            updateDisplay();
        }

        function clearEntry() {
            currentInput = '0';
            updateDisplay();
        }

        function calculate() {
            const inputValue = parseFloat(currentInput);

            if (previousInput !== null && operator) {
                const result = performCalculation();
                currentInput = String(result);
                previousInput = null;
                operator = null;
                waitingForOperand = true;
                updateDisplay();
            }
        }

        function performCalculation() {
            const prev = previousInput;
            const current = parseFloat(currentInput);

            switch (operator) {
                case '+': return prev + current;
                case '-': return prev - current;
                case '*': return prev * current;
                case '/': return prev / current;
                default: return current;
            }
        }
    </script>
</body>
</html>`
  },
  {
    keywords: ['timer', 'clock', 'stopwatch', 'countdown'],
    template: (prompt: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Timer App</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        }
        .timer-container {
            background: white;
            padding: 50px;
            border-radius: 25px;
            box-shadow: 0 25px 60px rgba(0,0,0,0.2);
            text-align: center;
            min-width: 400px;
        }
        h1 { color: #333; margin-bottom: 40px; }
        .time-display {
            font-size: 4rem;
            font-weight: bold;
            color: #2a5298;
            margin: 30px 0;
            font-family: 'Courier New', monospace;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
        .controls {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin: 30px 0;
        }
        button {
            padding: 15px 25px;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        }
        .start { background: #27ae60; color: white; }
        .pause { background: #f39c12; color: white; }
        .reset { background: #e74c3c; color: white; }
        button:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
        .input-section {
            margin: 20px 0;
            display: flex;
            gap: 10px;
            justify-content: center;
            align-items: center;
        }
        input {
            width: 60px;
            padding: 10px;
            border: 2px solid #ddd;
            border-radius: 8px;
            text-align: center;
            font-size: 16px;
        }
        .running { color: #27ae60; }
        .paused { color: #f39c12; }
        .finished { color: #e74c3c; }
    </style>
</head>
<body>
    <div class="timer-container">
        <h1>Timer - ${prompt}</h1>
        
        <div class="input-section">
            <input type="number" id="minutes" min="0" max="59" value="5" placeholder="MM">
            <span>:</span>
            <input type="number" id="seconds" min="0" max="59" value="0" placeholder="SS">
            <button onclick="setTimer()">Set</button>
        </div>
        
        <div class="time-display" id="display">05:00</div>
        
        <div class="controls">
            <button class="start" onclick="startTimer()" id="startBtn">Start</button>
            <button class="pause" onclick="pauseTimer()" id="pauseBtn" disabled>Pause</button>
            <button class="reset" onclick="resetTimer()">Reset</button>
        </div>
        
        <div id="status"></div>
    </div>

    <script>
        let totalSeconds = 300; // 5 minutes default
        let currentSeconds = totalSeconds;
        let isRunning = false;
        let intervalId = null;

        function updateDisplay() {
            const minutes = Math.floor(currentSeconds / 60);
            const seconds = currentSeconds % 60;
            document.getElementById('display').textContent = 
                \`\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;
        }

        function setTimer() {
            const minutes = parseInt(document.getElementById('minutes').value) || 0;
            const seconds = parseInt(document.getElementById('seconds').value) || 0;
            totalSeconds = minutes * 60 + seconds;
            currentSeconds = totalSeconds;
            updateDisplay();
            resetTimer();
        }

        function startTimer() {
            if (!isRunning && currentSeconds > 0) {
                isRunning = true;
                document.getElementById('startBtn').disabled = true;
                document.getElementById('pauseBtn').disabled = false;
                document.getElementById('display').className = 'time-display running';
                
                intervalId = setInterval(() => {
                    currentSeconds--;
                    updateDisplay();
                    
                    if (currentSeconds <= 0) {
                        finishTimer();
                    }
                }, 1000);
            }
        }

        function pauseTimer() {
            if (isRunning) {
                isRunning = false;
                clearInterval(intervalId);
                document.getElementById('startBtn').disabled = false;
                document.getElementById('pauseBtn').disabled = true;
                document.getElementById('display').className = 'time-display paused';
            }
        }

        function resetTimer() {
            isRunning = false;
            clearInterval(intervalId);
            currentSeconds = totalSeconds;
            updateDisplay();
            document.getElementById('startBtn').disabled = false;
            document.getElementById('pauseBtn').disabled = true;
            document.getElementById('display').className = 'time-display';
            document.getElementById('status').textContent = '';
        }

        function finishTimer() {
            isRunning = false;
            clearInterval(intervalId);
            document.getElementById('display').className = 'time-display finished';
            document.getElementById('status').innerHTML = '<h2 style="color: #e74c3c;">Time\'s Up!</h2>';
            document.getElementById('startBtn').disabled = false;
            document.getElementById('pauseBtn').disabled = true;
            
            // Play a simple beep sound (if browser supports it)
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
        }

        updateDisplay();
    </script>
</body>
</html>`
  }
]

const defaultTemplate = (prompt: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated App</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 600px;
            width: 100%;
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
            font-size: 2.5rem;
        }
        p {
            color: #666;
            line-height: 1.8;
            font-size: 1.1rem;
            margin-bottom: 30px;
        }
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 50px;
            cursor: pointer;
            margin: 10px;
            font-size: 16px;
            font-weight: bold;
            transition: all 0.3s;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
        #output {
            margin-top: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 15px;
            min-height: 60px;
            border-left: 5px solid #667eea;
        }
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .feature-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 15px;
            transition: transform 0.3s;
        }
        .feature-card:hover {
            transform: translateY(-5px);
        }
        .emoji {
            font-size: 2rem;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Generated App</h1>
        <p><strong>Request:</strong> "${prompt}"</p>
        <p>This is a dynamically generated application based on your request. Click the buttons below to interact with the app!</p>
        
        <div class="feature-grid">
            <div class="feature-card">
                <div class="emoji">✨</div>
                <h3>Interactive</h3>
                <p>Click buttons to see dynamic content</p>
            </div>
            <div class="feature-card">
                <div class="emoji">🎨</div>
                <h3>Styled</h3>
                <p>Modern, responsive design</p>
            </div>
            <div class="feature-card">
                <div class="emoji">⚡</div>
                <h3>Fast</h3>
                <p>Instant generation and deployment</p>
            </div>
        </div>
        
        <button class="btn" onclick="handleClick()">✨ Magic Click</button>
        <button class="btn" onclick="changeTheme()">🎨 Change Theme</button>
        <button class="btn" onclick="showInfo()">ℹ️ Show Info</button>
        
        <div id="output">👋 Welcome! Click any button above to get started.</div>
    </div>

    <script>
        let clickCount = 0;
        let currentTheme = 0;
        const themes = [
            { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', name: 'Purple Dream' },
            { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', name: 'Pink Sunset' },
            { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', name: 'Ocean Blue' },
            { bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', name: 'Mint Fresh' },
            { bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', name: 'Warm Glow' }
        ];

        function handleClick() {
            clickCount++;
            const messages = [
                \`🎉 Awesome! You've clicked \${clickCount} time\${clickCount !== 1 ? 's' : ''}!\`,
                \`✨ Magic happens with every click! Count: \${clickCount}\`,
                \`🚀 You're on fire! \${clickCount} clicks and counting!\`,
                \`🌟 Amazing interaction! Click #\${clickCount} completed!\`,
                \`💫 Keep clicking! You're at \${clickCount} now!\`
            ];
            
            document.getElementById('output').innerHTML = 
                messages[Math.floor(Math.random() * messages.length)];
        }

        function changeTheme() {
            currentTheme = (currentTheme + 1) % themes.length;
            const theme = themes[currentTheme];
            document.body.style.background = theme.bg;
            document.getElementById('output').innerHTML = 
                \`🎨 Theme changed to: <strong>\${theme.name}</strong>\`;
        }

        function showInfo() {
            const info = [
                \`📱 This app was generated instantly based on your request!\`,
                \`🔧 Built with HTML, CSS, and JavaScript\`,
                \`⚡ Deployed in real-time to the preview pane\`,
                \`🎯 Customized for: "\${prompt}"\`,
                \`💡 Try asking for different types of apps!\`
            ];
            
            document.getElementById('output').innerHTML = 
                info.map(item => \`<div style="margin: 10px 0; text-align: left;">\${item}</div>\`).join('');
        }

        // Auto-welcome animation
        setTimeout(() => {
            document.getElementById('output').innerHTML = 
                '🎊 App successfully generated and deployed! Ready for interaction.';
        }, 1000);
    </script>
</body>
</html>
`

export async function generateCodeFallback(prompt: string): Promise<string> {
  console.log('Using fallback template generation for:', prompt)
  
  // Fallback to templates
  const lowerPrompt = prompt.toLowerCase()
  const matchingTemplate = codeTemplates.find(template =>
    template.keywords.some(keyword => lowerPrompt.includes(keyword))
  )
  
  if (matchingTemplate) {
    return matchingTemplate.template(prompt)
  } else {
    return defaultTemplate(prompt)
  }
}
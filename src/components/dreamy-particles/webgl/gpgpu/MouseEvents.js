/**
 * Mouse interaction events for GPGPU simulation
 * 
 * This class handles mouse interactions and provides events for GPGPU simulations.
 */

class MouseEvents {
    constructor(element, options = {}) {
        // Element to attach events to
        this.element = element || window;
        
        // Position and previous position
        this.position = { x: 0, y: 0 };
        this.prevPosition = { x: 0, y: 0 };
        
        // Mouse state
        this.isDown = false;
        this.isMoving = false;
        
        // Velocity calculation
        this.velocity = { x: 0, y: 0 };
        
        // Options
        this.options = {
            inertia: options.inertia || 0.8,
            sensitivity: options.sensitivity || 1.0
        };
        
        // Event listeners
        this.listeners = {
            move: [],
            down: [],
            up: []
        };
        
        // Bind methods
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        
        // Initialize
        this.init();
    }
    
    init() {
        // Add event listeners
        this.element.addEventListener('mousemove', this.onMouseMove);
        this.element.addEventListener('mousedown', this.onMouseDown);
        this.element.addEventListener('mouseup', this.onMouseUp);
        this.element.addEventListener('mouseleave', this.onMouseUp);
        
        // Touch support
        this.element.addEventListener('touchmove', this.onMouseMove);
        this.element.addEventListener('touchstart', this.onMouseDown);
        this.element.addEventListener('touchend', this.onMouseUp);
    }
    
    onMouseMove(e) {
        // Prevent default for touch events
        if (e.type === 'touchmove') {
            e.preventDefault();
            e = e.touches[0];
        }
        
        // Get element dimensions and position
        const rect = this.element.getBoundingClientRect();
        
        // Update previous position
        this.prevPosition.x = this.position.x;
        this.prevPosition.y = this.position.y;
        
        // Calculate normalized position (0-1)
        this.position.x = ((e.clientX - rect.left) / rect.width) * this.options.sensitivity;
        this.position.y = ((e.clientY - rect.top) / rect.height) * this.options.sensitivity;
        
        // Calculate velocity
        this.velocity.x = this.position.x - this.prevPosition.x;
        this.velocity.y = this.position.y - this.prevPosition.y;
        
        // Set moving flag
        this.isMoving = true;
        
        // Trigger move event
        this.trigger('move', {
            position: this.position,
            velocity: this.velocity,
            isDown: this.isDown
        });
    }
    
    onMouseDown(e) {
        // Handle touch events
        if (e.type === 'touchstart') {
            e.preventDefault();
            e = e.touches[0];
        }
        
        this.isDown = true;
        
        // Trigger down event
        this.trigger('down', {
            position: this.position,
            velocity: this.velocity
        });
    }
    
    onMouseUp(e) {
        this.isDown = false;
        
        // Trigger up event
        this.trigger('up', {
            position: this.position,
            velocity: this.velocity
        });
    }
    
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
        return this;
    }
    
    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
        return this;
    }
    
    trigger(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }
    
    destroy() {
        // Remove event listeners
        this.element.removeEventListener('mousemove', this.onMouseMove);
        this.element.removeEventListener('mousedown', this.onMouseDown);
        this.element.removeEventListener('mouseup', this.onMouseUp);
        this.element.removeEventListener('mouseleave', this.onMouseUp);
        
        // Touch events
        this.element.removeEventListener('touchmove', this.onMouseMove);
        this.element.removeEventListener('touchstart', this.onMouseDown);
        this.element.removeEventListener('touchend', this.onMouseUp);
        
        // Clear listeners
        this.listeners = {
            move: [],
            down: [],
            up: []
        };
    }
}

export default MouseEvents; 
import Experience from '../Experience.js';


/**
 * Handler for THREE views
 */
export default class Handler {

    constructor() {

        if (new.target === Handler) {
            throw new TypeError("Cannot construct Abstract instances directly");
        }

        // Global instances

        this.experience = new Experience();

        this.time = this.experience.time;

        this.sizes = this.experience.sizes;
    }

    update() { };

    resize() { };

    scroll() { };

    dispose() { };
}

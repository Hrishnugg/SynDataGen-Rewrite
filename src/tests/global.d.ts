declare global {
  /**
   * Utility function to wait for a condition to be true
   * @param condition Function that returns a boolean; waiting continues until true
   * @param timeout Maximum time to wait in milliseconds
   * @param interval Time between condition checks in milliseconds
   */
  function waitFor(
    condition: () => boolean,
    timeout?: number,
    interval?: number
  ): Promise<void>;
  
  namespace NodeJS {
    interface Global {
      waitFor: typeof waitFor;
    }
  }
}

export {}; 
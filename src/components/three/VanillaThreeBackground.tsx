'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function VanillaThreeBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Only import Three.js on the client
    import('three').then((THREE) => {
      // Create scene, camera, and renderer
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(theme === 'dark' ? '#060B10' : '#f5f5f5');
      
      const camera = new THREE.PerspectiveCamera(
        75, window.innerWidth / window.innerHeight, 0.1, 1000
      );
      camera.position.z = 5;
      
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      
      // Add renderer to the DOM
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      containerRef.current.appendChild(renderer.domElement);
      
      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      
      const pointLight = new THREE.PointLight(0xffffff, 0.8);
      pointLight.position.set(10, 10, 10);
      scene.add(pointLight);
      
      // Add a simple sphere
      const geometry = new THREE.SphereGeometry(1, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: theme === 'dark' ? '#4A90E2' : '#60A5FA'
      });
      const sphere = new THREE.Mesh(geometry, material);
      scene.add(sphere);
      
      // Handle window resize
      const handleResize = () => {
        if (!containerRef.current) return;
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        
        renderer.setSize(width, height);
      };
      
      window.addEventListener('resize', handleResize);
      
      // Animation loop
      let animationId: number;
      
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        
        sphere.rotation.x += 0.01;
        sphere.rotation.y += 0.01;
        
        renderer.render(scene, camera);
      };
      
      animate();
      
      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationId);
        
        // Dispose resources
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        
        if (containerRef.current && renderer.domElement) {
          containerRef.current.removeChild(renderer.domElement);
        }
      };
    }).catch(error => {
      console.error("Failed to load Three.js:", error);
    });
  }, [theme]);
  
  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full"
      style={{ backgroundColor: theme === 'dark' ? '#060B10' : '#f5f5f5' }}
    ></div>
  );
} 
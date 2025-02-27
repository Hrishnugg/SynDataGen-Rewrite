'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function VanillaThreeDecagon() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Only import Three.js on the client
    import('three').then((THREE) => {
      // Create scene, camera, and renderer
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('transparent');
      
      const camera = new THREE.PerspectiveCamera(
        45, 1, 0.1, 1000 // Using aspect ratio 1 for a square container
      );
      camera.position.z = 4.5;
      
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true // Enable transparency
      });
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      
      // Add renderer to the DOM
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      containerRef.current.appendChild(renderer.domElement);
      
      // Add lights
      const ambientLight = new THREE.AmbientLight(
        0xffffff, 
        theme === 'dark' ? 0.15 : 0.3
      );
      scene.add(ambientLight);
      
      const pointLight = new THREE.PointLight(
        0xffffff,
        theme === 'dark' ? 1.8 : 2.5
      );
      pointLight.position.set(10, 10, 10);
      scene.add(pointLight);
      
      // Create a simplified geometry (icosahedron instead of custom decagon)
      const geometry = new THREE.IcosahedronGeometry(1, 0);
      const material = new THREE.MeshPhysicalMaterial({
        color: theme === 'dark' ? '#080808' : '#2563eb',
        metalness: theme === 'dark' ? 0.95 : 0.9,
        roughness: theme === 'dark' ? 0.85 : 0.1,
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      
      // Handle window resize
      const handleResize = () => {
        if (!containerRef.current) return;
        
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        renderer.setSize(width, height);
      };
      
      window.addEventListener('resize', handleResize);
      
      // Animation loop
      let animationId: number;
      
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        
        mesh.rotation.x += 0.005;
        mesh.rotation.y += 0.01;
        
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
      className="h-[900px] w-full translate-y-20 rounded-lg"
    ></div>
  );
} 
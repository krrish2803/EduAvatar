import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

document.addEventListener('DOMContentLoaded', () => {
    initThreeJSHero();
    initGSAPAnimations();
    initInteractions();
    initNewSectionsGSAP();
    initFAQ();
});

function initThreeJSHero() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    camera.position.z = 160;

    // --- AI CORE (Central Geometric Brain) ---
    const coreGroup = new THREE.Group();
    
    // Inner solid core
    const coreGeo = new THREE.IcosahedronGeometry(18, 1);
    const coreMat = new THREE.MeshPhysicalMaterial({
        color: 0x7c3aed, // Vibrant purple
        emissive: 0x2e1065, // Deep purple glow
        roughness: 0.1,
        metalness: 0.9,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        wireframe: false
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    
    // Outer holographic wireframe shell
    const wireGeo = new THREE.IcosahedronGeometry(24, 2);
    const wireMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4, // Cyan
        wireframe: true,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
    });
    const wireframe = new THREE.Mesh(wireGeo, wireMat);
    
    coreGroup.add(core);
    coreGroup.add(wireframe);
    scene.add(coreGroup);

    // --- NEURAL NETWORK (Particles & Dynamic Lines) ---
    const particleCount = 150;
    const particles = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = [];

    // Distribute particles in a spherical cloud around the core
    for (let i = 0; i < particleCount; i++) {
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos((Math.random() * 2) - 1);
        const radius = 35 + Math.random() * 70; // Orbit between 35 and 105

        particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        particlePositions[i * 3 + 2] = radius * Math.cos(phi);

        particleVelocities.push(new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3
        ));
    }

    particles.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    // Particle styling
    const particleMat = new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: 3,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(particles, particleMat);
    scene.add(particleSystem);

    // Reusable material for dynamic connections
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x8b5cf6, // Purple connecting lines
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending
    });

    // --- Lighting ---
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    
    const dirLight1 = new THREE.DirectionalLight(0x06b6d4, 3); // Cyan beam
    dirLight1.position.set(50, 50, 50);
    scene.add(dirLight1);
    
    const dirLight2 = new THREE.DirectionalLight(0x7c3aed, 3); // Purple beam
    dirLight2.position.set(-50, -50, -50);
    scene.add(dirLight2);

    // --- Interaction / Parallax ---
    let mouse = new THREE.Vector2(0, 0);
    let targetMouse = new THREE.Vector2(0, 0);
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    document.addEventListener('mousemove', (event) => {
        targetMouse.x = (event.clientX - windowHalfX);
        targetMouse.y = (event.clientY - windowHalfY);
    });

    // --- Animation Loop ---
    let lineMesh;
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const time = clock.getElapsedTime();

        // Smooth mouse interpolation for elegant parallax
        mouse.x += (targetMouse.x - mouse.x) * 0.05;
        mouse.y += (targetMouse.y - mouse.y) * 0.05;

        // Core rotations
        coreGroup.rotation.y += 0.005;
        coreGroup.rotation.x += 0.003;
        
        // Counter-rotate the inner core for a complex mechanical look
        core.rotation.y -= 0.01;
        core.rotation.z += 0.005;
        
        // Parallax effect on the entire scene based on mouse
        scene.rotation.x = mouse.y * 0.0003;
        scene.rotation.y = mouse.x * 0.0003;

        // Animate particles and draw dynamic connections (Neural Net effect)
        const positions = particleSystem.geometry.attributes.position.array;
        const linePositions = [];

        for (let i = 0; i < particleCount; i++) {
            // Add velocity
            positions[i * 3] += particleVelocities[i].x;
            positions[i * 3 + 1] += particleVelocities[i].y;
            positions[i * 3 + 2] += particleVelocities[i].z;

            const x = positions[i * 3];
            const y = positions[i * 3 + 1];
            const z = positions[i * 3 + 2];
            
            // Soft boundary - reverse velocity if they stray too far (radius 105)
            const dist = Math.sqrt(x*x + y*y + z*z);
            if (dist > 105) {
                particleVelocities[i].multiplyScalar(-1.01); 
            } else if (dist < 35) {
                particleVelocities[i].multiplyScalar(-1.01); // Don't go inside the core
            }

            // Check distance to other particles to form connections
            for (let j = i + 1; j < particleCount; j++) {
                const dx = positions[i * 3] - positions[j * 3];
                const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                const distSq = dx*dx + dy*dy + dz*dz;

                // If particles are close, draw a line between them
                if (distSq < 900) { 
                    linePositions.push(
                        positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
                        positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
                    );
                }
            }
        }
        
        particleSystem.geometry.attributes.position.needsUpdate = true;

        // Rebuild lines mesh dynamically every frame
        if (lineMesh) scene.remove(lineMesh);
        if (linePositions.length > 0) {
            const lineGeo = new THREE.BufferGeometry();
            lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
            lineMesh = new THREE.LineSegments(lineGeo, lineMaterial);
            scene.add(lineMesh);
        }

        // Pulse the outer wireframe shell
        const scale = 1 + Math.sin(time * 2) * 0.05;
        wireframe.scale.set(scale, scale, scale);

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });
}

// ---------------------------------------------------------
// GSAP AND INTERACTION LOGIC
// ---------------------------------------------------------

function initGSAPAnimations() {
    const tl = gsap.timeline();
    
    tl.to(".main-headline .word", {
        y: 0,
        opacity: 1,
        duration: 0.6,
        stagger: 0.1,
        ease: "cubic-bezier(0.34, 1.56, 0.64, 1)"
    })
    .to(".subheading", {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "ease-out"
    }, "-=0.2")
    .fromTo(".hero-ctas", { opacity: 0, y: 20 }, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "ease-out"
    }, "-=0.6")
    .fromTo(".trust-indicators", { opacity: 0 }, {
        opacity: 1,
        duration: 1
    }, "-=0.4");

    gsap.to(".problem-card", {
        scrollTrigger: {
            trigger: ".problem-grid",
            start: "top 80%",
        },
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.15,
        ease: "ease-out"
    });
}

function initNewSectionsGSAP() {
    gsap.to(".feature-list li", {
        scrollTrigger: { trigger: ".solution-container", start: "top 75%" },
        x: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "ease-out"
    });

    gsap.to(".benefit-card", {
        scrollTrigger: { trigger: ".solution-right", start: "top 75%" },
        x: 0, opacity: 1, duration: 0.7, stagger: 0.2, ease: "ease-out"
    });

    gsap.to(".timeline-line", {
        scrollTrigger: { trigger: ".timeline", start: "top 50%", end: "bottom 50%", scrub: 1 },
        height: "100%", ease: "none"
    });

    const timelineItems = document.querySelectorAll(".timeline-card");
    timelineItems.forEach((item, index) => {
        gsap.to(item, {
            scrollTrigger: { trigger: item, start: "top 80%" },
            x: 0, opacity: 1, duration: 0.8, ease: "ease-out"
        });
    });

    gsap.to(".f-card", {
        scrollTrigger: { trigger: ".feature-grid", start: "top 80%" },
        scale: 1, opacity: 1, duration: 0.6, stagger: 0.15, ease: "back.out(1.5)"
    });

    gsap.from(".comparison-table tbody tr", {
        scrollTrigger: { trigger: ".comparison-table-wrapper", start: "top 85%" },
        y: 20, opacity: 0, duration: 0.5, stagger: 0.1, ease: "ease-out"
    });
}

function initInteractions() {
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    });

    const buttons = document.querySelectorAll('.cta-btn');
    buttons.forEach(btn => {
        btn.addEventListener('mousedown', () => gsap.to(btn, { scaleY: 0.9, scaleX: 1.05, duration: 0.1 }));
        btn.addEventListener('mouseup', () => {
            gsap.to(btn, { scaleY: 1.1, scaleX: 0.95, duration: 0.1, onComplete: () => {
                gsap.to(btn, { scaleY: 1, scaleX: 1, duration: 0.2, ease: "back.out(2)" });
            }});
        });
        btn.addEventListener('mouseleave', () => gsap.to(btn, { scale: 1, duration: 0.2 }));
    });
}

function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    const faqAnswers = document.querySelectorAll('.faq-answer');

    faqItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            faqItems.forEach(faq => faq.classList.remove('active'));
            faqAnswers.forEach(ans => ans.classList.remove('active'));
            
            item.classList.add('active');
            const answer = document.getElementById(targetId);
            if(answer) {
                answer.classList.add('active');
                gsap.fromTo(answer, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
            }
        });
    });
}

// ==========================================
// 🧩 CORE COMPONENT INJECTOR
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    const includes = document.querySelectorAll('[data-include]');
    
    // Create an array to track all our downloading files
    const fetchPromises = [];

    includes.forEach(el => {
        const file = el.getAttribute('data-include');
        
        // Start the fetch and save its "Promise" into our array
        const fetchReq = fetch(file)
            .then(response => {
                if (response.ok) return response.text();
                throw new Error(`Failed to load component: ${file}`);
            })
            .then(html => {
                el.innerHTML = html;
                el.removeAttribute('data-include'); // Clean up the DOM
            })
            .catch(error => console.error(error));
            
        fetchPromises.push(fetchReq);
    });

    // Wait until EVERY single component has successfully downloaded and injected
    Promise.all(fetchPromises).then(() => {
        console.log("🧩 All HTML components successfully loaded.");
        
        // Shout into the void that the DOM is actually, fully ready!
        // Other scripts can listen for this if they rely on injected HTML.
        document.dispatchEvent(new Event('componentsLoaded'));
    });
});
document.addEventListener("DOMContentLoaded", () => {
    const includes = document.querySelectorAll('[data-include]');
    
    includes.forEach(el => {
        const file = el.getAttribute('data-include');
        fetch(file)
            .then(response => {
                if (response.ok) return response.text();
                throw new Error(`Failed to load ${file}`);
            })
            .then(html => {
                el.innerHTML = html;
            })
            .catch(error => console.error(error));
    });
});
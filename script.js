// Custom Cursor
const cursor = document.createElement('div');
cursor.className = 'cursor';
document.body.appendChild(cursor);

const follower = document.createElement('div');
follower.className = 'cursor-follower';
document.body.appendChild(follower);

document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    
    setTimeout(() => {
        follower.style.left = e.clientX + 'px';
        follower.style.top = e.clientY + 'px';
    }, 50);
});

// Cursor hover effect on links and buttons
const interactables = document.querySelectorAll('a, button, .service-card');
interactables.forEach(el => {
    el.addEventListener('mouseenter', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(2)';
        cursor.style.borderColor = 'var(--secondary)';
        follower.style.opacity = '0';
    });
    el.addEventListener('mouseleave', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        cursor.style.borderColor = 'var(--primary)';
        follower.style.opacity = '1';
    });
});

// Navigation Scroll Effect
const navbar = document.getElementById('navbar');
window.onscroll = () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
};

// Active Link Highlight
const currentPath = window.location.pathname.split("/").pop() || "index.html";
document.querySelectorAll('.nav-links a').forEach(link => {
    if (link.getAttribute('href') === currentPath) {
        link.classList.add('active-link');
    }
});

// Mobile Menu Toggle
const menuBtn = document.querySelector('.menu-btn');
const navLinks = document.querySelector('.nav-links');
if (menuBtn) {
    menuBtn.addEventListener('click', () => {
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '100%';
        navLinks.style.left = '0';
        navLinks.style.width = '100%';
        navLinks.style.background = 'var(--bg-dark)';
        navLinks.style.padding = '20px';
        navLinks.style.borderBottom = '1px solid var(--glass-border)';
    });
}

// Reveal on Scroll
const revealElements = document.querySelectorAll('[data-reveal]');
const revealOnScroll = () => {
    for (let i = 0; i < revealElements.length; i++) {
        const windowHeight = window.innerHeight;
        const elementTop = revealElements[i].getBoundingClientRect().top;
        const elementVisible = 100;
        if (elementTop < windowHeight - elementVisible) {
            revealElements[i].classList.add('active');
        }
    }
};
window.addEventListener('scroll', revealOnScroll);
revealOnScroll();

// Form Submission
const handleFormSubmission = (form, apiPath) => {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = 'Sending...';
        submitBtn.disabled = true;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(apiPath, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                alert('Success: ' + result.message);
                form.reset();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to submit. Please try again later.');
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });
};

const contactForm = document.querySelector('.contact-form form');
if (contactForm) handleFormSubmission(contactForm, '/api/contact');

const careerForm = document.querySelector('.career-form form');
if (careerForm) handleFormSubmission(careerForm, '/api/career');



// FAQ Accordion
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        
        // Close all other items
        faqItems.forEach(i => i.classList.remove('active'));
        
        // Toggle current item
        if (!isActive) {
            item.classList.add('active');
        }
    });
});

// Chatbot Functionality
const chatFab = document.getElementById('chat-fab');
const chatWindow = document.getElementById('chat-window');
const chatClose = document.getElementById('chat-close');
const chatSend = document.getElementById('chat-send');
const chatInput = document.getElementById('chat-input');
const chatBody = document.getElementById('chat-body');

let sessionId = localStorage.getItem('chatSessionId') || 'session_' + Math.random().toString(36).substr(2, 9);
localStorage.setItem('chatSessionId', sessionId);

const toggleChat = () => {
    if (!chatWindow) return;
    const isHidden = getComputedStyle(chatWindow).display === 'none';
    chatWindow.style.display = isHidden ? 'flex' : 'none';
    if (isHidden && chatInput) chatInput.focus();
};

if (chatFab) chatFab.addEventListener('click', toggleChat);
if (chatClose) chatClose.addEventListener('click', toggleChat);

const formatMessage = (text) => {
    if (!text) return "";
    
    // Escape HTML to prevent XSS
    let formatted = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    
    // Replace **text** with <strong>text</strong>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace * or - used as list markers with bullet points
    formatted = formatted.replace(/^\s*[\*\-]\s+/gm, '• ');
    
    // Clean up any remaining single asterisks that might be left from italics or poorly formatted lists
    formatted = formatted.replace(/ \*/g, ' •').replace(/\* /g, '• ');
    
    // Finally remove any stray single asterisks
    formatted = formatted.replace(/\*/g, '');

    // Convert newlines to <br> for proper spacing
    return formatted.replace(/\n/g, '<br>');
};

const appendMessage = (content, role) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;
    messageDiv.innerHTML = formatMessage(content);
    chatBody.appendChild(messageDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
};

const sendMessage = async () => {
    const message = chatInput.value.trim();
    if (!message) return;

    appendMessage(message, 'user');
    chatInput.value = '';

    // Typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message bot typing';
    typingDiv.innerText = '...';
    chatBody.appendChild(typingDiv);
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        const response = await fetch('http://127.0.0.1:5000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, sessionId })
        });
        const data = await response.json();
        
        chatBody.removeChild(typingDiv);
        if (data.success) {
            appendMessage(data.response, 'bot');
        } else {
            appendMessage('Sorry, I encountered an error. Please try again.', 'bot');
        }
    } catch (error) {
        chatBody.removeChild(typingDiv);
        appendMessage('Connection error. Please check your internet.', 'bot');
    }
};

chatSend.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Auto-select Service from URL
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    let serviceParam = urlParams.get('service');
    
    if (serviceParam) {
        serviceParam = decodeURIComponent(serviceParam).trim();
        const serviceSelect = document.getElementById('service-select');
        
        if (serviceSelect) {
            setTimeout(() => {
                let found = false;
                // Try exact match first
                Array.from(serviceSelect.options).forEach(option => {
                    if (option.value === serviceParam || option.text === serviceParam) {
                        serviceSelect.value = option.value;
                        found = true;
                    }
                });
                
                // Fallback to partial match
                if (!found) {
                    Array.from(serviceSelect.options).forEach(option => {
                        if (option.text.toLowerCase().includes(serviceParam.toLowerCase())) {
                            serviceSelect.value = option.value;
                        }
                    });
                }
                serviceSelect.dispatchEvent(new Event('change'));
            }, 200); // Increased timeout slightly
        }
    }
    
    // Dynamically load Services and Packages if available in DB
    fetch('/api/admin/services').then(res => res.json()).then(data => {
        if(data && data.length > 0) {
            const grid = document.querySelector('.services-grid');
            if(grid) {
                grid.innerHTML = data.map(s => `
                    <div class="service-card" data-reveal>
                        <i class="${s.icon} fa-2x" style="color: var(--primary); margin-bottom: 20px;"></i>
                        <h3>${s.title}</h3>
                        <p>${s.description}</p>
                        <a href="${s.link}" class="btn btn-outline" style="margin-top: 15px; width: 100%; text-align: center;">Inquire Now</a>
                    </div>
                `).join('');
                revealOnScroll(); // re-trigger reveal for new items
            }
        }
    }).catch(e => console.log('Static services fallback.'));

    fetch('/api/admin/packages').then(res => res.json()).then(data => {
        if(data && data.length > 0) {
            const packageSection = document.getElementById('packages');
            if(packageSection) {
                // Group by category
                const categories = [...new Set(data.map(p => p.category))];
                let html = '<div class="container"><div class="section-title" style="text-align: center; margin-bottom: 50px;"><h2 class="text-gradient">Packages Starting From</h2><p>Choose the right plan to bring your ideas to life.</p></div>';
                
                categories.forEach(cat => {
                    html += `<div style="text-align: center; margin-top: 40px; margin-bottom: 30px;"><h3 style="font-size: 1.8rem; margin-bottom: 10px;">${cat}</h3></div><div class="pricing-grid">`;
                    const pkgs = data.filter(p => p.category === cat);
                    pkgs.forEach(p => {
                        html += `
                        <div class="pricing-card ${p.isPremium ? 'premium-card' : ''}">
                            <h4>${p.name}</h4>
                            <ul class="pricing-features">
                                ${p.features.map(f => `<li><i class="fas fa-check"></i> ${f}</li>`).join('')}
                            </ul>
                            <a href="${p.link || 'contact.html'}" class="btn ${p.isPremium ? 'btn-primary' : 'btn-outline'}" style="width: 100%; text-align: center;">Get Started</a>
                        </div>`;
                    });
                    html += `</div>`;
                });
                html += '</div>';
                packageSection.innerHTML = html;
            }
        }
    }).catch(e => console.log('Static packages fallback.'));
});

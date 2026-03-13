document.addEventListener('DOMContentLoaded', () => {

    const newsletterEmailServiceConfig = {
        apiEndpoint: window.NEWSLETTER_EMAIL_CONFIG?.apiEndpoint || '/api/newsletter'
    };

    const sendNewsletterRegistrationEmail = async (email) => {
        const response = await fetch(newsletterEmailServiceConfig.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subscriberEmail: email,
                submittedAt: new Date().toISOString(),
                pageUrl: window.location.href
            })
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            const detailedMessage = errorBody.details
                ? `${errorBody.error || 'SMTP email sending failed'} (${errorBody.details})`
                : (errorBody.error || 'SMTP email sending failed');
            throw new Error(detailedMessage);
        }

        return response.json().catch(() => ({}));
    };

    // Set Current Year in Footer
    const yearSpan = document.getElementById('year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // Newsletter Registration
    const newsletterForms = document.querySelectorAll('.newsletter-form');
    newsletterForms.forEach(form => {
        const emailInput = form.querySelector('.newsletter-input');
        const registerButton = form.querySelector('.newsletter-button');
        const messageElement = document.createElement('p');
        messageElement.className = 'newsletter-message';
        form.appendChild(messageElement);
        let messageTimeoutId;

        const showNewsletterMessage = (messageText, messageType) => {
            messageElement.className = `newsletter-message newsletter-message-${messageType}`;
            messageElement.textContent = messageText;

            if (messageTimeoutId) {
                clearTimeout(messageTimeoutId);
            }

            messageTimeoutId = setTimeout(() => {
                messageElement.className = 'newsletter-message';
                messageElement.textContent = '';
            }, 10000);
        };

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (!emailInput) {
                return;
            }

            const email = emailInput.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isValidEmail = emailRegex.test(email);

            if (!isValidEmail) {
                console.error('Invalid email address for newsletter registration.');
                showNewsletterMessage('Please enter a valid email address.', 'error');
                emailInput.focus();
                return;
            }

            try {
                if (registerButton) {
                    registerButton.disabled = true;
                }

                await sendNewsletterRegistrationEmail(email);
                console.log('Newsletter registration email sent for:', email);
                showNewsletterMessage('Thanks for registering for our newsletter!', 'success');
                form.reset();
            } catch (error) {
                console.error('Newsletter email sending failed:', error);
                showNewsletterMessage(error.message || 'Registration failed. Please try again shortly.', 'error');
            } finally {
                if (registerButton) {
                    registerButton.disabled = false;
                }
            }
        });
    });

    // Mobile Navigation Toggle
    const navToggle = document.querySelector('.mobile-nav-toggle');
    const primaryNav = document.getElementById('primary-navigation');
    const navIcon = navToggle ? navToggle.querySelector('i') : null;

    const setMobileMenuState = (isOpen) => {
        if (!primaryNav || !navToggle || !navIcon) {
            return;
        }

        primaryNav.setAttribute('data-visible', isOpen ? 'true' : 'false');
        navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        navIcon.classList.toggle('fa-bars', !isOpen);
        navIcon.classList.toggle('fa-xmark', isOpen);
        document.body.classList.toggle('menu-open', isOpen);
    };

    if (navToggle && primaryNav && navIcon) {
        navToggle.addEventListener('click', () => {
            const isVisible = primaryNav.getAttribute('data-visible') === 'true';
            setMobileMenuState(!isVisible);
        });
    }

    // Close mobile menu on link click
    const navLinks = document.querySelectorAll('.primary-navigation a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                setMobileMenuState(false);
            }
        });
    });

    if (primaryNav && navToggle) {
        document.addEventListener('click', (event) => {
            if (window.innerWidth > 768) {
                return;
            }

            const isVisible = primaryNav.getAttribute('data-visible') === 'true';
            if (!isVisible) {
                return;
            }

            const clickedInsideNav = primaryNav.contains(event.target);
            const clickedToggle = navToggle.contains(event.target);
            if (!clickedInsideNav && !clickedToggle) {
                setMobileMenuState(false);
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                setMobileMenuState(false);
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && primaryNav.getAttribute('data-visible') === 'true') {
                setMobileMenuState(false);
            }
        });
    }

    // Sticky Header Color Change on Scroll
    const header = document.getElementById('header');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Scroll Reveal Animations using Intersection Observer
    const revealElements = document.querySelectorAll('.reveal, .reveal-up, .reveal-left, .reveal-right');

    const revealOptions = {
        threshold: 0.15, // Trigger when 15% of the element is visible
        rootMargin: "0px 0px -50px 0px"
    };

    const revealOnScroll = new IntersectionObserver(function (entries, observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.classList.add('active');
                // Optional: to animate only once, uncomment next line
                // observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    revealElements.forEach(el => {
        revealOnScroll.observe(el);
    });

    const instaFeedElement = document.getElementById('insta-feed');
    if (instaFeedElement && window.Instafeed) {
        const accessToken = instaFeedElement.getAttribute('data-access-token');

        if (accessToken) {
            const feed = new Instafeed({
                accessToken,
                target: 'insta-feed',
                limit: 8,
                template: '<a href="{{link}}" target="_blank" rel="noopener noreferrer" class="insta-item"><img src="{{image}}" alt="Instagram post"><div class="insta-overlay"><div class="insta-stats"><span><i class="fa-brands fa-instagram"></i></span></div></div></a>'
            });

            feed.run();
        }
    }

    // Active Navigation Link Highlighting on Scroll
    const sections = document.querySelectorAll('section');
    const newsOverlay = document.getElementById('news');
    const newsToggle = document.getElementById('news-toggle');

    const setNewsOverlayVisibility = (currentSection) => {
        if (!newsOverlay) {
            return;
        }

        newsOverlay.style.display = currentSection === 'home' ? 'flex' : 'none';
    };

    window.addEventListener('scroll', () => {
        let current = '';
        const scrollPosition = window.pageYOffset;

        // Calculate if we've reached the bottom of the document
        const documentHeight = Math.max(
            document.body.scrollHeight, document.body.offsetHeight,
            document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight
        );
        const windowBottom = window.innerHeight + window.pageYOffset;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            // Add a small offset so it triggers slightly before hitting the exact top
            if (scrollPosition >= (sectionTop - header.clientHeight - 50)) {
                current = section.getAttribute('id');
            }
        });

        // Ensure the last section is selected if scrolled all the way to the bottom
        if (windowBottom >= documentHeight - 10) {
            const lastSection = sections[sections.length - 1];
            current = lastSection.getAttribute('id');
        }

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').includes(current) && current !== '') {
                link.classList.add('active');
            }
        });

        setNewsOverlayVisibility(current);
    });

    // News Overlay Toggle
    if (newsToggle) {
        newsToggle.addEventListener('click', () => {
            newsOverlay.classList.toggle('collapsed');
            const icon = newsToggle.querySelector('i');
            if (newsOverlay.classList.contains('collapsed')) {
                icon.classList.remove('fa-chevron-left');
                icon.classList.add('fa-chevron-right');
            } else {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-left');
            }
        });
    }

    window.dispatchEvent(new Event('scroll'));

    // Load More News Articles
    const loadMoreBtn = document.querySelector('.load-more-btn');
    const hiddenArticles = document.querySelectorAll('.news-article-card.hidden');

    if (loadMoreBtn && hiddenArticles.length > 0) {
        loadMoreBtn.addEventListener('click', () => {
            hiddenArticles.forEach(article => {
                article.classList.remove('hidden');
            });
            loadMoreBtn.style.display = 'none';
        });
    }

    // News Modal Functionality
    const newsModal = document.getElementById('news-modal');
    const modalClose = document.querySelector('.modal-close');
    const newsItems = document.querySelectorAll('.news-item');

    if (newsModal) {
        // Open modal on news item click
        newsItems.forEach(item => {
            item.addEventListener('click', () => {
                newsModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        });

        // Close modal on close button click
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                newsModal.classList.remove('active');
                document.body.style.overflow = 'auto';
            });
        }

        // Close modal on background click
        newsModal.addEventListener('click', (e) => {
            if (e.target === newsModal) {
                newsModal.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && newsModal.classList.contains('active')) {
                newsModal.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });
    }
});

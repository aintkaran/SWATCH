document.addEventListener('DOMContentLoaded', function () {
    // API URL
    const API_URL = 'https://makeup-api.herokuapp.com/api/v1/products.json';

    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const resultsSection = document.getElementById('results-section');
    const loadingIndicator = document.getElementById('loading-indicator');
    const productsGrid = document.getElementById('products-grid');
    const noResults = document.getElementById('no-results');
    const clearFiltersBtn = document.getElementById('clear-filters');

    // Filter elements
    const brandFilters = document.getElementById('brand-filters');
    const typeFilters = document.getElementById('type-filters');
    const shadeFilters = document.getElementById('shade-filters');
    const priceMinSlider = document.getElementById('price-min');
    const priceMaxSlider = document.getElementById('price-max');
    const priceMinDisplay = document.getElementById('price-min-display');
    const priceMaxDisplay = document.getElementById('price-max-display');
    const ratingBtns = document.querySelectorAll('.rating-btn');

    // State variables
    let allProducts = [];
    let filteredProducts = [];
    let currentFilters = {
        brands: [],
        types: [],
        shades: [],
        minPrice: 0,
        maxPrice: 100,
        rating: 0,
        searchTerm: ''
    };

    // Initialize the application
    init();

    // Initialize function
    async function init() {
        // Set up event listeners
        setupEventListeners();

        // Fetch products on load but don't display them
        try {
            const products = await fetchProducts();
            allProducts = products;

            // Initialize filters with available options
            initializeFilters(products);

            // Check if there's a search term in localStorage (from previous session)
            const savedSearch = localStorage.getItem('searchTerm');
            if (savedSearch) {
                searchInput.value = savedSearch;
                handleSearch();
            }

            // Check for saved favorites
            loadFavorites();
        } catch (error) {
            console.error('Error initializing application:', error);
            showErrorMessage('Failed to load products. Please try again later.');
        }
    }

    // Fetch products from API
    async function fetchProducts() {
        try {
            loadingIndicator.style.display = 'flex';
            const response = await fetch(API_URL);

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching products:', error);
            throw error;
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }

    // Set up event listeners
    function setupEventListeners() {
        // Search
        searchButton.addEventListener('click', handleSearch);
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });

        // Clear filters
        clearFiltersBtn.addEventListener('click', clearFilters);

        // Price sliders
        priceMinSlider.addEventListener('input', updatePriceFilter);
        priceMaxSlider.addEventListener('input', updatePriceFilter);

        // Rating buttons
        ratingBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                const rating = parseInt(this.dataset.rating);
                setRatingFilter(rating);
            });
        });
    }

    // Initialize filters based on available product data
    function initializeFilters(products) {
        // Extract unique brands, types, and price range
        const brands = [...new Set(products.map(product => product.brand).filter(Boolean))];
        const types = [...new Set(products.map(product => product.product_type).filter(Boolean))];
        const shades = extractShades(products);

        // Find min and max prices
        let minPrice = Infinity;
        let maxPrice = 0;

        products.forEach(product => {
            if (product.price && !isNaN(parseFloat(product.price))) {
                const price = parseFloat(product.price);
                minPrice = Math.min(minPrice, price);
                maxPrice = Math.max(maxPrice, price);
            }
        });

        // Round prices to nearest whole numbers
        minPrice = Math.floor(minPrice);
        maxPrice = Math.ceil(maxPrice);

        // Update price sliders
        priceMinSlider.min = minPrice;
        priceMinSlider.max = maxPrice;
        priceMinSlider.value = minPrice;

        priceMaxSlider.min = minPrice;
        priceMaxSlider.max = maxPrice;
        priceMaxSlider.value = maxPrice;

        priceMinDisplay.textContent = `$${minPrice}`;
        priceMaxDisplay.textContent = `$${maxPrice}`;

        // Set current filter values
        currentFilters.minPrice = minPrice;
        currentFilters.maxPrice = maxPrice;

        // Create filter options
        createFilterOptions(brandFilters, brands.sort(), 'brand');
        createFilterOptions(typeFilters, types.sort(), 'type');
        // createShadeFilters(shadeFilters, shades);
    }

    // Extract unique shades from products
    function extractShades(products) {
        const shadeSet = new Set();

        products.forEach(product => {
            // Some products have product_colors array with shade information
            if (product.product_colors && Array.isArray(product.product_colors)) {
                product.product_colors.forEach(color => {
                    if (color.colour_name) {
                        shadeSet.add(color.colour_name.toLowerCase());
                    }
                });
            }

            // Some products might have shade information in the name or description
            const nameWords = product.name ? product.name.toLowerCase().split(' ') : [];
            nameWords.forEach(word => {
                // Common shade words (simplified approach)
                const commonShades = ['red', 'pink', 'coral', 'nude', 'berry', 'plum', 'brown', 'beige',
                    'tan', 'peach', 'orange', 'gold', 'bronze', 'copper', 'silver',
                    'black', 'white', 'blue', 'green', 'purple', 'violet', 'yellow'];

                if (commonShades.includes(word)) {
                    shadeSet.add(word);
                }
            });
        });

        return [...shadeSet].sort();
    }

    // Create filter options for brand and type
    function createFilterOptions(container, options, filterType) {
        container.innerHTML = '';

        options.forEach(option => {
            if (!option) return; // Skip null/undefined values

            const btn = document.createElement('button');
            btn.classList.add('filter-option');
            btn.textContent = option;
            btn.dataset.value = option;
            btn.dataset.type = filterType;

            btn.addEventListener('click', function () {
                toggleFilter(this);
            });

            container.appendChild(btn);
        });
    }

    // Create shade filter buttons
    function createShadeFilters(container, shades) {
        container.innerHTML = '';

        shades.forEach(shade => {
            const btn = document.createElement('button');
            btn.classList.add('filter-option');
            btn.textContent = shade;
            btn.dataset.value = shade;
            btn.dataset.type = 'shade';

            btn.addEventListener('click', function () {
                toggleFilter(this);
            });

            container.appendChild(btn);
        });
    }

    // Toggle a filter option
    function toggleFilter(element) {
        const value = element.dataset.value;
        const type = element.dataset.type;

        element.classList.toggle('active');

        if (type === 'brand') {
            if (element.classList.contains('active')) {
                currentFilters.brands.push(value);
            } else {
                currentFilters.brands = currentFilters.brands.filter(brand => brand !== value);
            }
        } else if (type === 'type') {
            if (element.classList.contains('active')) {
                currentFilters.types.push(value);
            } else {
                currentFilters.types = currentFilters.types.filter(t => t !== value);
            }
        } else if (type === 'shade') {
            if (element.classList.contains('active')) {
                currentFilters.shades.push(value);
            } else {
                currentFilters.shades = currentFilters.shades.filter(s => s !== value);
            }
        }

        applyFilters();
    }

    // Update price filter
    function updatePriceFilter() {
        const minPrice = parseInt(priceMinSlider.value);
        const maxPrice = parseInt(priceMaxSlider.value);

        // Make sure min doesn't exceed max
        if (minPrice > maxPrice) {
            priceMinSlider.value = maxPrice;
            currentFilters.minPrice = maxPrice;
        } else {
            currentFilters.minPrice = minPrice;
        }

        // Make sure max isn't less than min
        if (maxPrice < minPrice) {
            priceMaxSlider.value = minPrice;
            currentFilters.maxPrice = minPrice;
        } else {
            currentFilters.maxPrice = maxPrice;
        }

        priceMinDisplay.textContent = `$${currentFilters.minPrice}`;
        priceMaxDisplay.textContent = `$${currentFilters.maxPrice}`;

        applyFilters();
    }

    // Set rating filter
    function setRatingFilter(rating) {
        // Toggle: if the same rating is clicked again, clear the filter
        if (currentFilters.rating === rating) {
            currentFilters.rating = 0;
            ratingBtns.forEach(btn => btn.classList.remove('active'));
        } else {
            currentFilters.rating = rating;

            // Update UI
            ratingBtns.forEach(btn => {
                const btnRating = parseInt(btn.dataset.rating);
                if (btnRating === rating) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        applyFilters();
    }

    // Handle search
    function handleSearch() {
        const searchTerm = searchInput.value.trim().toLowerCase();

        if (searchTerm) {
            currentFilters.searchTerm = searchTerm;
            localStorage.setItem('searchTerm', searchTerm);

            // Show results section if it's not visible
            resultsSection.style.display = 'grid';

            applyFilters();

            // Scroll to results
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Apply all filters to the products
    function applyFilters() {
        // Start with all products
        let results = [...allProducts];

        // Apply search term filter
        if (currentFilters.searchTerm) {
            results = results.filter(product => {
                const searchFields = [
                    product.name || '',
                    product.brand || '',
                    product.product_type || '',
                    product.description || '',
                    // Include shade names if available
                    ...(product.product_colors || []).map(color => color.colour_name || '')
                ];

                return searchFields.some(field =>
                    field.toLowerCase().includes(currentFilters.searchTerm)
                );
            });
        }

        // Apply brand filter
        if (currentFilters.brands.length > 0) {
            results = results.filter(product =>
                product.brand && currentFilters.brands.includes(product.brand)
            );
        }

        // Apply product type filter
        if (currentFilters.types.length > 0) {
            results = results.filter(product =>
                product.product_type && currentFilters.types.includes(product.product_type)
            );
        }

        // Apply price filter
        results = results.filter(product => {
            if (!product.price || isNaN(parseFloat(product.price))) {
                return false;
            }
            const price = parseFloat(product.price);
            return price >= currentFilters.minPrice && price <= currentFilters.maxPrice;
        });

        // Apply rating filter
        if (currentFilters.rating > 0) {
            results = results.filter(product => {
                if (!product.rating || product.rating === null) {
                    return false;
                }
                return Math.round(product.rating) >= currentFilters.rating;
            });
        }

        // Apply shade filter
        if (currentFilters.shades.length > 0) {
            results = results.filter(product => {
                // Check product colors array
                if (product.product_colors && Array.isArray(product.product_colors)) {
                    const productShades = product.product_colors.map(color =>
                        color.colour_name ? color.colour_name.toLowerCase() : ''
                    );

                    return currentFilters.shades.some(shade =>
                        productShades.includes(shade)
                    );
                }

                // Check product name for shade keywords
                if (product.name) {
                    const nameLower = product.name.toLowerCase();
                    return currentFilters.shades.some(shade =>
                        nameLower.includes(shade)
                    );
                }

                return false;
            });
        }

        // Update filtered products and display
        filteredProducts = results;
        displayProducts(results);
    }

    // Display products in the grid
    function displayProducts(products) {
        productsGrid.innerHTML = '';

        if (products.length === 0) {
            noResults.style.display = 'block';
            return;
        }

        noResults.style.display = 'none';

        products.forEach(product => {
            // Create product card
            const card = document.createElement('div');
            card.classList.add('product-card');
            card.dataset.id = product.id;

            // Prepare product data
            const imageUrl = product.image_link || 'https://via.placeholder.com/300x200?text=No+Image';
            const name = product.name || 'Unnamed Product';
            const brand = product.brand || 'Unknown Brand';
            const type = product.product_type ? formatProductType(product.product_type) : 'Makeup';
            const price = product.price ? `${product.price_sign || '$'}${product.price}` : 'Price not available';

            // Generate stars for rating
            let ratingHtml = '';
            if (product.rating) {
                const rating = Math.round(product.rating);
                const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
                ratingHtml = `
                    <div class="product-rating">
                        <span class="stars">${stars}</span>
                        <span class="rating-value">(${product.rating})</span>
                    </div>
                `;
            } else {
                ratingHtml = `
                    <div class="product-rating">
                        <span class="rating-value">No ratings yet</span>
                    </div>
                `;
            }

            // Generate shade swatches
            let shadesHtml = '';
            if (product.product_colors && product.product_colors.length > 0) {
                let shadeElements = '';
                // Show max 5 shades in the card
                const maxShades = 5;
                const displayColors = product.product_colors.slice(0, maxShades);

                displayColors.forEach(color => {
                    shadeElements += `
                        <div class="shade" style="background-color: ${color.hex_value};" title="${color.colour_name || 'Shade'}"></div>
                    `;
                });

                if (product.product_colors.length > maxShades) {
                    shadeElements += `
                        <div class="shade more-shades" title="+ ${product.product_colors.length - maxShades} more">+${product.product_colors.length - maxShades}</div>
                    `;
                }

                shadesHtml = `
                    <div class="product-shades">
                        ${shadeElements}
                    </div>
                `;
            }

            // Build card HTML
            card.innerHTML = `
                <img src="${imageUrl}" alt="${name}" class="product-image" onerror="this.src='https://via.placeholder.com/300x200?text=Image+Not+Found'">
                <div class="product-info">
                    <h3 class="product-name">${name}</h3>
                    <div class="product-brand">${brand}</div>
                    <div class="product-type">${type}</div>
                    <div class="product-price">${price}</div>
                    ${ratingHtml}
                    ${shadesHtml}
                    <a href="${product.product_link || '#'}" class="product-link" target="_blank">View Product</a>
                </div>
            `;

            productsGrid.appendChild(card);
        });
    }

    // Format product type for display
    function formatProductType(type) {
        if (!type) return '';
        return type.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    // Clear all filters
    function clearFilters() {
        // Reset filter state
        currentFilters = {
            brands: [],
            types: [],
            shades: [],
            minPrice: parseInt(priceMinSlider.min),
            maxPrice: parseInt(priceMaxSlider.max),
            rating: 0,
            searchTerm: currentFilters.searchTerm // Keep the search term
        };

        // Reset UI
        document.querySelectorAll('.filter-option').forEach(btn => {
            btn.classList.remove('active');
        });

        ratingBtns.forEach(btn => {
            btn.classList.remove('active');
        });

        priceMinSlider.value = priceMinSlider.min;
        priceMaxSlider.value = priceMaxSlider.max;
        priceMinDisplay.textContent = `$${priceMinSlider.min}`;
        priceMaxDisplay.textContent = `$${priceMaxSlider.max}`;

        // Reapply filters (using only search term)
        applyFilters();
    }

    // Show error message
    function showErrorMessage(message) {
        noResults.querySelector('h3').textContent = 'Error';
        noResults.querySelector('p').textContent = message;
        noResults.style.display = 'block';
        loadingIndicator.style.display = 'none';
    }

    // Favorites functionality
    function loadFavorites() {
        const favorites = JSON.parse(localStorage.getItem('favorites')) || [];

        // Add event listeners for favorite buttons
        document.addEventListener('click', function (e) {
            if (e.target.classList.contains('favorite-btn')) {
                const productId = e.target.closest('.product-card').dataset.id;
                toggleFavorite(productId);
            }
        });
    }

    function toggleFavorite(productId) {
        let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

        const index = favorites.indexOf(productId);
        if (index === -1) {
            // Add to favorites
            favorites.push(productId);
            // Update UI
            document.querySelector(`.product-card[data-id="${productId}"] .favorite-btn`)
                .classList.add('active');
        } else {
            // Remove from favorites
            favorites.splice(index, 1);
            // Update UI
            document.querySelector(`.product-card[data-id="${productId}"] .favorite-btn`)
                .classList.remove('active');
        }

        // Save to localStorage
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }
});
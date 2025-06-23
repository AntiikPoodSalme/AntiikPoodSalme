// script.js

document.addEventListener('DOMContentLoaded', () => {

  // --- GLOBAL STATE & DOM REFERENCES ---
  const DOM = {
    body: document.body,
    productListWrapper: document.getElementById('productListWrapper'),
    searchInput: document.getElementById('searchInput'),
    productList: document.querySelector('.product-list'),
    tagFilter1Container: document.getElementById('tagFilter1-container'),
    tagFilter2Container: document.getElementById('tagFilter2-container'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    loadMoreTrigger: document.getElementById('loadMoreTrigger'),
    imageModal: document.getElementById('imageModal'),
    modalImage: document.getElementById('modalImage'),
    modalClose: document.querySelector('.modal-close')
  };

  const PRODUCTS_PER_LOAD = 24;
  
  let masterProductList = [];
  let currentFilteredProducts = [];
  let productsCurrentlyShown = 0;
  let currentTag1 = 'all', currentTag2 = 'all';
  let lazyImageObserver, loadMoreObserver;

  // --- CORE INITIALIZATION ---
  function initialize() {
    setupEventListeners();
    loadProducts();
    
    DOM.tagFilter1 = createCustomDropdown(DOM.tagFilter1Container, 'tagFilter1', (value) => { currentTag1 = value; updateSecondaryFilter(); applyAllFilters(); });
    DOM.tagFilter2 = createCustomDropdown(DOM.tagFilter2Container, 'tagFilter2', (value) => { currentTag2 = value; applyAllFilters(); });
    
    createLazyImageObserver();
    createLoadMoreObserver();
    
    populatePrimaryFilter();
    updateSecondaryFilter();
    applyAllFilters();
  }

  // --- DATA MANAGEMENT ---
  function loadProducts() {
    // Directly use the products from the products.js file
    masterProductList = [...products];
  }

  // --- RENDERING & UI LOGIC ---
  function appendProducts() {
    const fragment = document.createDocumentFragment();
    const startIndex = productsCurrentlyShown;
    const endIndex = startIndex + PRODUCTS_PER_LOAD;
    const productsToAdd = currentFilteredProducts.slice(startIndex, endIndex);

    productsToAdd.forEach(product => {
      const productCard = document.createElement('div');
      productCard.classList.add('product-card');
      productCard.dataset.id = product.id;
      // This class is used by style.css to hide items not for sale.
      productCard.classList.toggle('not-for-sale', !product.onSale);
      
      const cardActionsHTML = `
        <div class="card-actions">
          <button class="view-btn" data-action="view">View</button>
        </div>
      `;
      productCard.innerHTML = `
        <img class="lazy-image" src="" data-src="${product.previewImage}" alt="${product.name}" width="200" height="200">
        <h2>${product.name}</h2>
        <p>Price: €${product.price}</p>
        <p>ID: ${product.id}</p>
        ${cardActionsHTML}
      `;
      const img = productCard.querySelector('.lazy-image');
      lazyImageObserver.observe(img);
      fragment.appendChild(productCard);
    });
    DOM.productList.appendChild(fragment);
    productsCurrentlyShown += productsToAdd.length;
    DOM.loadMoreTrigger.style.display = productsCurrentlyShown < currentFilteredProducts.length ? 'block' : 'none';
  }
  
  function applyAllFilters() {
    const searchQuery = DOM.searchInput.value.trim().toLowerCase();
    
    // Start with products that are explicitly marked "onSale"
    let tempProducts = masterProductList.filter(p => p.onSale);

    if (currentTag1 !== 'all') { tempProducts = tempProducts.filter(p => p.mainTag === currentTag1); }
    if (currentTag2 !== 'all') { tempProducts = tempProducts.filter(p => p.subTag === currentTag2); }
    if (searchQuery) { tempProducts = tempProducts.filter(p => p.name.toLowerCase().includes(searchQuery) || p.id.toLowerCase().includes(searchQuery)); }
    
    currentFilteredProducts = tempProducts;
    DOM.productList.innerHTML = '';
    productsCurrentlyShown = 0;
    if (currentFilteredProducts.length === 0) {
      DOM.productList.innerHTML = '<p class="no-results-message">No products found matching your criteria.</p>';
      DOM.loadMoreTrigger.style.display = 'none';
    } else {
      appendProducts();
    }
  }
  
  // --- UI HELPER FUNCTIONS ---
  function openModal(imageUrl) { if (!imageUrl) return; document.body.style.cursor = 'wait'; DOM.modalImage.src = imageUrl; DOM.modalImage.onload = () => { DOM.imageModal.classList.add('active'); document.body.style.cursor = 'default'; }; DOM.modalImage.onerror = () => { console.error("Modal image failed to load."); document.body.style.cursor = 'default'; closeModal(); }; }
  function closeModal() { DOM.imageModal.classList.remove('active'); setTimeout(() => { DOM.modalImage.removeAttribute('src'); }, 300); }
  function createCustomDropdown(container, id, onChangeCallback) { const s = document.createElement('div'); s.classList.add('dropdown-selected'); const o = document.createElement('div'); o.classList.add('dropdown-options'); const i = document.createElement('ul'); o.appendChild(i); container.innerHTML = ''; container.appendChild(s); container.appendChild(o); container.setAttribute('data-value', 'all'); s.addEventListener('click', e => { e.stopPropagation(); if (!s.classList.contains('disabled')) { closeAllDropdowns(container); container.classList.toggle('open'); } }); i.addEventListener('click', e => { if (e.target.tagName === 'LI') { const t = e.target.dataset.value, a = e.target.textContent; container.setAttribute('data-value', t); s.textContent = a; container.classList.remove('open'); onChangeCallback(t); } }); return { selectedDiv: s, optionsList: i, container: container }; }
  function closeAllDropdowns(exceptThisOne = null) { document.querySelectorAll('.custom-dropdown-container.open').forEach(d => { if (d !== exceptThisOne) d.classList.remove('open'); }); }
  function populateDropdown(elements, options, initialText) { const { selectedDiv, optionsList } = elements; selectedDiv.textContent = initialText; optionsList.innerHTML = ''; options.forEach(o => { const li = document.createElement('li'); li.dataset.value = o.value; li.textContent = o.text; optionsList.appendChild(li); }); }
  function populatePrimaryFilter() { const t = new Set(masterProductList.filter(p=>p.onSale).map(p => p.mainTag).filter(Boolean)); const o = [{ value: 'all', text: 'All Categories' }, ...[...t].sort().map(tag => ({ value: tag, text: tag.charAt(0).toUpperCase() + tag.slice(1) }))]; populateDropdown(DOM.tagFilter1, o, 'All Categories'); }
  function updateSecondaryFilter() { currentTag2 = 'all'; DOM.tagFilter2Container.setAttribute('data-value', 'all'); let o = [{ value: 'all', text: 'Select Main Category First' }], d = true; if (currentTag1 !== 'all') { const r = masterProductList.filter(p => p.onSale && p.mainTag === currentTag1), s = new Set(r.map(p => p.subTag).filter(Boolean)); o = [{ value: 'all', text: 'All Sub-categories' }, ...[...s].sort().map(tag => ({ value: tag, text: tag.charAt(0).toUpperCase() + tag.slice(1) }))]; d = o.length <= 1; } populateDropdown(DOM.tagFilter2, o, o[0].text); DOM.tagFilter2.selectedDiv.classList.toggle('disabled', d); }
  function createLazyImageObserver() { lazyImageObserver = new IntersectionObserver((e) => { e.forEach(entry => { if (entry.isIntersecting) { loadImage(entry.target); lazyImageObserver.unobserve(entry.target); } }); }, { rootMargin: "0px 0px 200px 0px" }); }
  function createLoadMoreObserver() { const o = { threshold: 1.0 }; loadMoreObserver = new IntersectionObserver((e) => { e.forEach(entry => { if (entry.isIntersecting) appendProducts(); }); }, o); loadMoreObserver.observe(DOM.loadMoreTrigger); }
  async function loadImage(imgElement) { const e = imgElement.dataset.src; if (!e) return; try { const t = await caches.open('antiikpood-image-cache-v1'); const o = await t.match(e); let a; if (o) { const e = await o.blob(); a = URL.createObjectURL(e) } else { const o = await fetch(e); await t.put(e, o.clone()); const n = await o.blob(); a = URL.createObjectURL(n) } imgElement.src = a; imgElement.onload = () => { imgElement.classList.add("loaded"); URL.revokeObjectURL(imgElement.src) } } catch (e) { console.error("Error loading image:", e); imgElement.alt = "Image failed to load" } }
  
  // --- EVENT LISTENERS SETUP ---
  function setupEventListeners() {
    DOM.searchInput.addEventListener('input', applyAllFilters);
    DOM.resetFiltersBtn.addEventListener('click', () => { 
        DOM.searchInput.value = ''; 
        currentTag1 = 'all'; 
        DOM.tagFilter1Container.setAttribute('data-value', 'all'); 
        populatePrimaryFilter(); 
        updateSecondaryFilter(); 
        applyAllFilters(); 
    });
    DOM.modalClose.addEventListener('click', closeModal);
    DOM.imageModal.addEventListener('click', (e) => { if (e.target === DOM.imageModal) closeModal(); });
    window.addEventListener('click', () => closeAllDropdowns());
    DOM.productList.addEventListener('click', (e) => {
      const target = e.target;
      if (target.dataset.action === 'view') {
        const productCard = target.closest('.product-card');
        const productId = productCard.dataset.id;
        const product = masterProductList.find(p => p.id === productId);
        if (product) openModal(product.previewImage);
      }
    });
  }

  // --- START THE APP ---
  initialize();
});

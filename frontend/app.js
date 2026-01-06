// Конфигурация API
const API_BASE_URL = 'http://localhost:3000/api';
let currentUser = null;
let currentCategory = 'all';

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async () => {
    // Проверка авторизации
    await checkAuth();
    
    // Загрузка товаров
    await loadProducts();
    
    // Настройка обработчиков событий
    setupEventListeners();
});

// Проверка авторизации
async function checkAuth() {
    try {
        // Получение данных авторизации из Telegram
        const initData = window.Telegram.WebApp.initData;
        if (!initData) {
            console.warn('Telegram auth data not available');
            return;
        }

        // Отправка данных на сервер для проверки
        const response = await fetch(`${API_BASE_URL}/auth/telegram`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ initData })
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            localStorage.setItem('auth_token', data.token);
        }
    } catch (error) {
        console.error('Auth error:', error);
    }
}

// Загрузка товаров
async function loadProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    
    grid.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Загрузка объявлений...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE_URL}/products${currentCategory !== 'all' ? `?category=${currentCategory}` : ''}`);
        const products = await response.json();
        
        if (products.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h3>😔 Объявления не найдены</h3>
                    <p>Будьте первым, кто добавит товар в эту категорию!</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = '';
        products.forEach(product => {
            grid.appendChild(createProductCard(product));
        });
    } catch (error) {
        console.error('Error loading products:', error);
        grid.innerHTML = `
            <div class="error-state">
                <h3>⚠️ Ошибка загрузки</h3>
                <p>Попробуйте обновить страницу</p>
            </div>
        `;
    }
}

// Создание карточки товара
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
        <button class="favorite-btn ${product.isFavorite ? 'active' : ''}" data-id="${product.id}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="${product.isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
        </button>
        <img src="${product.images[0] || 'https://via.placeholder.com/300x200/2d3743/666?text=Hot+Wheels'}" 
             alt="${product.title}" 
             class="product-image"
             onclick="openProductModal(${product.id})">
        <div class="product-info">
            <h3 class="product-title">${product.title}</h3>
            <div class="product-price">$${product.price.toFixed(2)}</div>
            <span class="product-category">${getCategoryName(product.category)}</span>
            <div class="product-seller">
                <div class="seller-avatar"></div>
                <div class="seller-info">
                    <div class="seller-name">${product.seller.name}</div>
                    <div class="seller-rating">
                        ${generateStarRating(product.seller.rating)}
                        <span>(${product.seller.reviews})</span>
                    </div>
                </div>
            </div>
            <div class="product-actions">
                <button class="btn btn-primary" onclick="contactSeller(${product.seller.id})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                    </svg>
                    Написать
                </button>
                <button class="btn btn-secondary" onclick="shareProduct(${product.id})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                        <polyline points="16 6 12 2 8 6"/>
                        <line x1="12" y1="2" x2="12" y2="15"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
    
    // Обработчик избранного
    card.querySelector('.favorite-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        await toggleFavorite(product.id);
    });
    
    return card;
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Фильтры по категориям
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.dataset.category;
            await loadProducts();
        });
    });
    
    // Сброс фильтров
    const clearFiltersBtn = document.getElementById('clear-filters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', async () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.category-btn[data-category="all"]').classList.add('active');
            currentCategory = 'all';
            await loadProducts();
        });
    }
    
    // Кнопка добавления товара
    const addBtn = document.getElementById('add-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            window.location.href = 'add-product.html';
        });
    }
    
    // Кнопка профиля
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
    }
    
    // Закрытие модального окна
    const modalCloseBtn = document.getElementById('modal-close');
    const modalOverlay = document.getElementById('product-modal');
    
    if (modalCloseBtn && modalOverlay) {
        modalCloseBtn.addEventListener('click', () => {
            modalOverlay.style.display = 'none';
        });
        
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.style.display = 'none';
            }
        });
    }
}

// Вспомогательные функции
function getCategoryName(category) {
    const categories = {
        'rare': 'Редкие',
        'vintage': 'Винтажные',
        'new': 'Новые',
        'custom': 'Кастомные',
        'sets': 'Наборы',
        'other': 'Другое'
    };
    return categories[category] || category;
}

function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '';
    
    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            stars += '★';
        } else if (i === fullStars && hasHalfStar) {
            stars += '½';
        } else {
            stars += '☆';
        }
    }
    return stars;
}

// Функции взаимодействия
async function toggleFavorite(productId) {
    if (!currentUser) {
        alert('Войдите в систему, чтобы добавлять в избранное');
        return;
    }
    
    try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE_URL}/favorites/${productId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            await loadProducts();
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
    }
}

function contactSeller(sellerId) {
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.openTelegramLink(`https://t.me/user?id=${sellerId}`);
    } else {
        alert('Откройте приложение через Telegram для связи с продавцом');
    }
}

function shareProduct(productId) {
    const productUrl = `https://t.me/hotwheelselite/app?startapp=product_${productId}`;
    
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.shareUrl(productUrl, '🔥 Посмотрите эту коллекционную модель Hot Wheels!');
    } else {
        // Fallback для браузера
        navigator.clipboard.writeText(productUrl).then(() => {
            alert('Ссылка скопирована в буфер обмена!');
        });
    }
}

function openProductModal(productId) {
    // Загрузка и отображение полной информации о товаре
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.style.display = 'flex';
        // Здесь будет загрузка детальной информации о товаре
    }
}

// Глобальные функции для использования в HTML
window.openProductModal = openProductModal;
window.contactSeller = contactSeller;
window.shareProduct = shareProduct;
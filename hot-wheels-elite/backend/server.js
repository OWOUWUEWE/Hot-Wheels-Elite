const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hotwheelselite', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Модели
const User = require('./models/User');
const Product = require('./models/Product');
const Favorite = require('./models/Favorite');
const Review = require('./models/Review');

// Валидация данных Telegram WebApp
const validateTelegramData = (initData) => {
    // Здесь должна быть реализована валидация подписи Telegram
    // Для MVP пропускаем валидацию
    return true;
};

// Маршруты
app.post('/api/auth/telegram', async (req, res) => {
    try {
        const { initData } = req.body;
        
        if (!validateTelegramData(initData)) {
            return res.status(401).json({ error: 'Invalid Telegram data' });
        }

        // Парсинг данных Telegram
        const params = new URLSearchParams(initData);
        const userData = JSON.parse(params.get('user'));
        
        // Поиск или создание пользователя
        let user = await User.findOne({ telegramId: userData.id });
        
        if (!user) {
            user = new User({
                telegramId: userData.id,
                firstName: userData.first_name,
                lastName: userData.last_name || '',
                username: userData.username || '',
                photoUrl: userData.photo_url || '',
                rating: 5.0,
                reviewsCount: 0,
                joinedAt: new Date()
            });
            await user.save();
        }

        // Генерация JWT токена
        const token = jwt.sign(
            { userId: user._id, telegramId: user.telegramId },
            process.env.JWT_SECRET || 'hotwheels-secret-key',
            { expiresIn: '30d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                telegramId: user.telegramId,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                photoUrl: user.photoUrl,
                rating: user.rating,
                reviewsCount: user.reviewsCount
            }
        });
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Маршруты для товаров
app.get('/api/products', async (req, res) => {
    try {
        const { category, page = 1, limit = 20 } = req.query;
        const query = category && category !== 'all' ? { category, active: true } : { active: true };
        
        const products = await Product.find(query)
            .populate('seller', 'firstName lastName username rating reviewsCount')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
            
        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hotwheels-secret-key');
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const product = new Product({
            ...req.body,
            seller: user._id,
            active: true,
            views: 0,
            createdAt: new Date()
        });

        await product.save();
        res.status(201).json(product);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// Маршруты для избранного
app.post('/api/favorites/:productId', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hotwheels-secret-key');
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { productId } = req.params;
        
        // Проверяем, есть ли уже в избранном
        const existingFavorite = await Favorite.findOne({
            user: user._id,
            product: productId
        });

        if (existingFavorite) {
            // Удаляем из избранного
            await existingFavorite.deleteOne();
            res.json({ favorited: false });
        } else {
            // Добавляем в избранное
            const favorite = new Favorite({
                user: user._id,
                product: productId,
                createdAt: new Date()
            });
            await favorite.save();
            res.json({ favorited: true });
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        res.status(500).json({ error: 'Failed to toggle favorite' });
    }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
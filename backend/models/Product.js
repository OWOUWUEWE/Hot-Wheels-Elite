const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: String,
    price: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        enum: ['rare', 'vintage', 'new', 'custom', 'sets', 'other'],
        required: true
    },
    condition: {
        type: String,
        enum: ['new', 'excellent', 'good', 'used'],
        default: 'good'
    },
    year: Number,
    images: [String],
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    location: String,
    shippingAvailable: {
        type: Boolean,
        default: false
    },
    active: {
        type: Boolean,
        default: true
    },
    views: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Product', productSchema);
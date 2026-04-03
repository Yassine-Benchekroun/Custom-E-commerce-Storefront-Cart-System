// stock-api.js - Mock Stock Management API

class StockAPI {
    constructor() {
        this.initializeStock();
    }

    // Initialize stock data for all products
    initializeStock() {
        const phones = JSON.parse(localStorage.getItem('catalogue_phones') || '[]');
        let stockData = JSON.parse(localStorage.getItem('stock_data') || '{}');

        // If no stock data exists, create default stock for all products
        phones.forEach(phone => {
            if (!stockData[phone.id]) {
                stockData[phone.id] = {
                    productId: phone.id,
                    quantity: Math.floor(Math.random() * 50) + 5, // Random stock between 5-55
                    status: 'en_stock', // en_stock, rupture, precommande
                    lowStockThreshold: 10,
                    lastUpdated: new Date().toISOString(),
                    reserved: 0 // Quantity in carts but not purchased
                };
            }
        });

        localStorage.setItem('stock_data', JSON.stringify(stockData));
        return stockData;
    }

    // Get stock info for a specific product
    getStock(productId) {
        const stockData = JSON.parse(localStorage.getItem('stock_data') || '{}');
        const stock = stockData[productId];

        if (!stock) {
            return {
                success: false,
                message: 'Product not found in stock database'
            };
        }

        // Calculate available quantity (total - reserved)
        const available = stock.quantity - stock.reserved;

        // Determine status
        let status = 'en_stock';
        if (available <= 0) {
            status = 'rupture';
        } else if (available <= stock.lowStockThreshold) {
            status = 'stock_faible';
        }

        return {
            success: true,
            data: {
                ...stock,
                available: available,
                status: status,
                isLowStock: available <= stock.lowStockThreshold && available > 0
            }
        };
    }

    // Get all stock data
    getAllStock() {
        const stockData = JSON.parse(localStorage.getItem('stock_data') || '{}');
        const result = [];

        for (let productId in stockData) {
            const stockInfo = this.getStock(parseInt(productId));
            if (stockInfo.success) {
                result.push(stockInfo.data);
            }
        }

        return {
            success: true,
            data: result
        };
    }

    // Update stock quantity
    updateStock(productId, newQuantity) {
        const stockData = JSON.parse(localStorage.getItem('stock_data') || '{}');
        
        if (!stockData[productId]) {
            return {
                success: false,
                message: 'Product not found'
            };
        }

        stockData[productId].quantity = newQuantity;
        stockData[productId].lastUpdated = new Date().toISOString();

        localStorage.setItem('stock_data', JSON.stringify(stockData));

        return {
            success: true,
            message: 'Stock updated successfully',
            data: this.getStock(productId).data
        };
    }

    // Reserve stock (when added to cart)
    reserveStock(productId, quantity) {
        const stockData = JSON.parse(localStorage.getItem('stock_data') || '{}');
        
        if (!stockData[productId]) {
            return {
                success: false,
                message: 'Product not found'
            };
        }

        const available = stockData[productId].quantity - stockData[productId].reserved;

        if (available < quantity) {
            return {
                success: false,
                message: `Stock insuffisant. Disponible: ${available}`,
                available: available
            };
        }

        stockData[productId].reserved += quantity;
        stockData[productId].lastUpdated = new Date().toISOString();

        localStorage.setItem('stock_data', JSON.stringify(stockData));

        return {
            success: true,
            message: 'Stock reserved successfully',
            data: this.getStock(productId).data
        };
    }

    // Release reserved stock (when removed from cart)
    releaseStock(productId, quantity) {
        const stockData = JSON.parse(localStorage.getItem('stock_data') || '{}');
        
        if (!stockData[productId]) {
            return {
                success: false,
                message: 'Product not found'
            };
        }

        stockData[productId].reserved = Math.max(0, stockData[productId].reserved - quantity);
        stockData[productId].lastUpdated = new Date().toISOString();

        localStorage.setItem('stock_data', JSON.stringify(stockData));

        return {
            success: true,
            message: 'Stock released successfully'
        };
    }

    // Complete purchase (reduce actual stock)
    completePurchase(productId, quantity) {
        const stockData = JSON.parse(localStorage.getItem('stock_data') || '{}');
        
        if (!stockData[productId]) {
            return {
                success: false,
                message: 'Product not found'
            };
        }

        stockData[productId].quantity -= quantity;
        stockData[productId].reserved = Math.max(0, stockData[productId].reserved - quantity);
        stockData[productId].lastUpdated = new Date().toISOString();

        localStorage.setItem('stock_data', JSON.stringify(stockData));

        return {
            success: true,
            message: 'Purchase completed successfully',
            data: this.getStock(productId).data
        };
    }

    // Get low stock alerts
    getLowStockAlerts() {
        const allStock = this.getAllStock();
        const alerts = [];

        allStock.data.forEach(stock => {
            if (stock.isLowStock) {
                const phones = JSON.parse(localStorage.getItem('catalogue_phones') || '[]');
                const phone = phones.find(p => p.id === stock.productId);
                
                alerts.push({
                    productId: stock.productId,
                    productName: phone ? `${phone.marque} ${phone.nom}` : 'Unknown Product',
                    available: stock.available,
                    threshold: stock.lowStockThreshold,
                    severity: stock.available <= 5 ? 'critical' : 'warning'
                });
            }
        });

        return {
            success: true,
            count: alerts.length,
            data: alerts
        };
    }

    // Check if product is out of stock
    isOutOfStock(productId) {
        const stockInfo = this.getStock(productId);
        return stockInfo.success && stockInfo.data.available <= 0;
    }

    // Get stock status badge info
    getStatusBadge(productId) {
        const stockInfo = this.getStock(productId);
        
        if (!stockInfo.success) {
            return {
                text: 'Indisponible',
                class: 'stock-unavailable',
                icon: '❌'
            };
        }

        const available = stockInfo.data.available;

        if (available <= 0) {
            return {
                text: 'Rupture de stock',
                class: 'stock-out',
                icon: '❌'
            };
        } else if (available <= stockInfo.data.lowStockThreshold) {
            return {
                text: `Stock faible (${available} restants)`,
                class: 'stock-low',
                icon: '⚠️'
            };
        } else {
            return {
                text: 'En stock',
                class: 'stock-available',
                icon: '✓'
            };
        }
    }
}

// Initialize API
const stockAPI = new StockAPI();
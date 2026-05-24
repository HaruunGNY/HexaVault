class HexaDB {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('hexavault_items')) || [];
        this.orders = JSON.parse(localStorage.getItem('hexavault_orders')) || [];
    }

    save() {
        localStorage.setItem('hexavault_items', JSON.stringify(this.items));
        document.dispatchEvent(new Event('db_updated'));
    }

    addItem(item) {
        item.id = Date.now().toString();
        item.createdAt = new Date().toISOString();
        this.items.unshift(item); // Add to beginning
        this.save();
    }

    updateQuantity(id, change) {
        const item = this.items.find(i => i.id === id);
        if (item) {
            item.quantity = Math.max(0, parseInt(item.quantity) + change);
            this.save();
        }
    }

    updateItem(id, newData) {
        const index = this.items.findIndex(i => i.id === id);
        if (index !== -1) {
            this.items[index] = { ...this.items[index], ...newData };
            this.save();
        }
    }

    deleteItem(id) {
        this.items = this.items.filter(i => i.id !== id);
        this.save();
    }

    // Orders Logic
    saveOrders() {
        localStorage.setItem('hexavault_orders', JSON.stringify(this.orders));
        document.dispatchEvent(new Event('orders_updated'));
    }

    addOrder(orderData) {
        if(!orderData.name.trim()) return;
        this.orders.unshift({ 
            id: Date.now().toString(), 
            name: orderData.name, 
            qty: orderData.qty, 
            specs: orderData.specs, 
            done: false 
        });
        this.saveOrders();
    }

    toggleOrder(id) {
        const order = this.orders.find(o => o.id === id);
        if(order) {
            order.done = !order.done;
            this.saveOrders();
        }
    }

    updateOrder(id, orderData) {
        const index = this.orders.findIndex(o => o.id === id);
        if(index !== -1) {
            this.orders[index] = { ...this.orders[index], ...orderData };
            this.saveOrders();
        }
    }

    removeOrder(id) {
        this.orders = this.orders.filter(o => o.id !== id);
        this.saveOrders();
    }
}

const db = new HexaDB();
let currentCategoryFilter = "Tümü";

document.addEventListener('DOMContentLoaded', () => {
    // === NAVIGATION LOGIC ===
    const navButtons = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            views.forEach(v => {
                if (v.id === targetId) v.classList.add('active');
                else v.classList.remove('active');
            });
        });
    });

    // === MODAL LOGIC ===
    const addModal = document.getElementById('add-modal');
    const addNewBtn = document.getElementById('add-new-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const addItemForm = document.getElementById('add-item-form');

    const deleteItemBtn = document.getElementById('delete-item-btn');
    const modalTitle = document.getElementById('modal-title');

    function openModalForAdd() {
        addItemForm.reset();
        document.getElementById('item-id').value = '';
        modalTitle.textContent = 'Yeni Malzeme Ekle';
        deleteItemBtn.style.display = 'none';
        addModal.classList.add('active');
    }

    function openModalForEdit(id) {
        const item = db.items.find(i => i.id === id);
        if(!item) return;

        document.getElementById('item-id').value = item.id;
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-category').value = item.category;
        document.getElementById('item-quantity').value = item.quantity;
        document.getElementById('item-footprint').value = item.footprint || '';
        document.getElementById('item-location').value = item.location || '';
        document.getElementById('item-price').value = item.price || '';
        document.getElementById('item-health').value = item.health || 'Sağlam';
        document.getElementById('item-notes').value = item.notes || '';
        document.getElementById('item-is-consumable').checked = item.isConsumable;

        modalTitle.textContent = 'Malzemeyi Düzenle';
        deleteItemBtn.style.display = 'block';
        addModal.classList.add('active');
    }

    addNewBtn.addEventListener('click', openModalForAdd);
    closeModalBtn.addEventListener('click', () => addModal.classList.remove('active'));

    deleteItemBtn.addEventListener('click', () => {
        const id = document.getElementById('item-id').value;
        if(id && confirm('Bu malzemeyi silmek istediğinize emin misiniz?')) {
            db.deleteItem(id);
            addModal.classList.remove('active');
        }
    });

    addItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const id = document.getElementById('item-id').value;
        const itemData = {
            name: document.getElementById('item-name').value,
            category: document.getElementById('item-category').value,
            quantity: parseInt(document.getElementById('item-quantity').value) || 0,
            footprint: document.getElementById('item-footprint').value,
            location: document.getElementById('item-location').value,
            price: parseFloat(document.getElementById('item-price').value) || 0,
            health: document.getElementById('item-health').value,
            notes: document.getElementById('item-notes').value,
            isConsumable: document.getElementById('item-is-consumable').checked,
            criticalThreshold: 5 // Default threshold
        };

        if(id) {
            db.updateItem(id, itemData);
        } else {
            db.addItem(itemData);
        }

        addItemForm.reset();
        addModal.classList.remove('active');
    });

    // === RENDERING LOGIC ===
    function renderDashboard() {
        document.getElementById('total-items').textContent = db.items.length;
        
        const lowStock = db.items.filter(i => i.isConsumable && i.quantity <= i.criticalThreshold);
        document.getElementById('low-stock-items').textContent = lowStock.length;

        // Calculate total value
        const totalValue = db.items.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0);
        document.getElementById('total-value').textContent = totalValue.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' ₺';

        const recentList = document.getElementById('recent-items-list');
        recentList.innerHTML = '';
        
        const recents = db.items.slice(0, 5); // Last 5 items
        if(recents.length === 0) {
            recentList.innerHTML = '<li class="text-muted">Henüz malzeme eklenmedi.</li>';
        } else {
            recents.forEach(item => {
                recentList.innerHTML += `
                    <li>
                        <span>${item.name}</span>
                        <span class="text-muted">${item.quantity} Adet</span>
                    </li>
                `;
            });
        }
    }

    function renderCategoryFilters() {
        const filtersDiv = document.getElementById('category-filters');
        const categories = ["Tümü", "Pasif Bileşen", "Mikrodenetleyici", "Sensör", "Motor Sürücü", "Sarf Malzemesi", "Diğer"];
        
        filtersDiv.innerHTML = '';
        categories.forEach(cat => {
            const chip = document.createElement('div');
            chip.className = `chip ${currentCategoryFilter === cat ? 'active' : ''}`;
            chip.textContent = cat;
            chip.addEventListener('click', () => {
                currentCategoryFilter = cat;
                renderCategoryFilters();
                renderInventory(document.getElementById('search-input').value);
            });
            filtersDiv.appendChild(chip);
        });
    }

    function renderInventory(searchTerm = "") {
        const list = document.getElementById('inventory-list');
        list.innerHTML = '';

        const filtered = db.items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  item.category.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = currentCategoryFilter === "Tümü" || item.category === currentCategoryFilter;
            return matchesSearch && matchesCategory;
        });

        if(filtered.length === 0) {
            list.innerHTML = '<p class="text-muted" style="text-align:center; margin-top:2rem;">Malzeme bulunamadı.</p>';
            return;
        }

        filtered.forEach(item => {
            const locText = item.location ? `Konum: ${item.location}` : 'Konum belirtilmedi';
            const fpText = item.footprint ? ` | Kılıf: ${item.footprint}` : '';
            const priceText = item.price ? ` | Birim Fiyat: ${item.price} ₺` : '';
            
            // Health badge
            let badgeClass = 'badge-success';
            if(item.health === 'Şüpheli') badgeClass = 'badge-warning';
            else if(item.health === 'Bozuk') badgeClass = 'badge-danger';
            else if(item.health === 'Projede') badgeClass = 'badge-primary';
            
            const badgeHtml = item.health ? `<span class="badge ${badgeClass}" style="margin-left:0.5rem; font-size:0.7rem;">${item.health}</span>` : '';
            const notesHtml = item.notes ? `<div class="item-meta" style="margin-top:0.25rem; font-style:italic; color:var(--text-muted);">💬 ${item.notes}</div>` : '';

            const div = document.createElement('div');
            div.className = 'inventory-item';
            div.innerHTML = `
                <div class="item-info">
                    <h4 style="display:flex; align-items:center;">${item.name} ${badgeHtml}</h4>
                    <div class="item-meta">${item.category} ${fpText} ${priceText}</div>
                    <div class="item-meta">${locText}</div>
                    ${notesHtml}
                </div>
                <div class="item-actions">
                    <button class="qty-btn minus" data-id="${item.id}">-</button>
                    <span class="qty-display">${item.quantity}</span>
                    <button class="qty-btn plus" data-id="${item.id}">+</button>
                    <button class="btn-icon edit-btn" data-id="${item.id}" style="margin-left: 0.5rem; font-size: 1rem;">✎</button>
                </div>
            `;
            list.appendChild(div);
        });

        // Attach event listeners to new buttons
        document.querySelectorAll('.qty-btn.minus').forEach(btn => {
            btn.addEventListener('click', (e) => db.updateQuantity(e.target.dataset.id, -1));
        });
        document.querySelectorAll('.qty-btn.plus').forEach(btn => {
            btn.addEventListener('click', (e) => db.updateQuantity(e.target.dataset.id, 1));
        });
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => openModalForEdit(e.target.dataset.id));
        });
    }

    function renderOrders() {
        const list = document.getElementById('order-list');
        list.innerHTML = '';

        if(db.orders.length === 0) {
            list.innerHTML = '<p class="text-muted" style="text-align:center; margin-top:2rem;">Sipariş listeniz boş.</p>';
            return;
        }

        db.orders.forEach(order => {
            const div = document.createElement('div');
            div.className = 'inventory-item';
            div.style.opacity = order.done ? '0.5' : '1';
            div.style.cursor = 'pointer';
            div.className += ' order-toggle';
            div.dataset.id = order.id;
            
            const specsHtml = order.specs ? `<div class="item-meta" style="margin-top:0.25rem;">📝 ${order.specs}</div>` : '';
            // Eski verilerde order.text olabilir, geriye dönük uyumluluk için order.name || order.text
            const itemName = order.name || order.text || 'Bilinmeyen Sipariş';
            const itemQty = order.qty ? `(${order.qty} Adet)` : '';

            div.innerHTML = `
                <div class="item-info" style="display:flex; align-items:flex-start; gap:0.5rem; flex:1;">
                    <input type="checkbox" ${order.done ? 'checked' : ''} style="width:auto; margin-top:0.2rem;" onclick="event.preventDefault();">
                    <div style="flex:1;">
                        <h4 style="margin:0; text-decoration: ${order.done ? 'line-through' : 'none'};">${itemName} <span class="text-muted" style="font-size:0.8rem;">${itemQty}</span></h4>
                        ${specsHtml}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-icon edit-order-btn" data-id="${order.id}" style="color:var(--text-muted); font-size:1.1rem; margin-right: 0.5rem;">✎</button>
                    <button class="btn-icon delete-order-btn" data-id="${order.id}" style="color:var(--danger); font-size:1.2rem;">✖</button>
                </div>
            `;
            list.appendChild(div);
        });

        // Event listeners for orders
        document.querySelectorAll('.order-toggle').forEach(el => {
            el.addEventListener('click', (e) => {
                if(!e.target.classList.contains('delete-order-btn') && !e.target.classList.contains('edit-order-btn')) {
                    db.toggleOrder(el.dataset.id);
                }
            });
        });
        document.querySelectorAll('.delete-order-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                db.removeOrder(e.target.dataset.id);
            });
        });
        document.querySelectorAll('.edit-order-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.target.dataset.id;
                const order = db.orders.find(o => o.id === id);
                if(order) {
                    document.getElementById('order-id').value = order.id;
                    document.getElementById('order-name').value = order.name || order.text || '';
                    document.getElementById('order-qty').value = order.qty || 1;
                    document.getElementById('order-specs').value = order.specs || '';
                    document.getElementById('submit-order-btn').textContent = "Siparişi Güncelle";
                    // Scroll to top of the form
                    document.getElementById('view-orders').scrollTop = 0;
                }
            });
        });
    }

    // Bind Add Order form
    document.getElementById('add-order-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const id = document.getElementById('order-id').value;
        const orderData = {
            name: document.getElementById('order-name').value,
            qty: parseInt(document.getElementById('order-qty').value) || 1,
            specs: document.getElementById('order-specs').value
        };
        
        if (id) {
            db.updateOrder(id, orderData);
        } else {
            db.addOrder(orderData);
        }
        
        e.target.reset();
        document.getElementById('order-id').value = '';
        document.getElementById('order-qty').value = "1";
        document.getElementById('submit-order-btn').textContent = "Siparişe Ekle";
    });

    // === SETTINGS (IMPORT/EXPORT) ===
    document.getElementById('export-btn').addEventListener('click', () => {
        const dataStr = JSON.stringify({ items: db.items, orders: db.orders });
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'hexavault_backup.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    });

    document.getElementById('import-btn').addEventListener('click', () => {
        const fileInput = document.getElementById('import-file');
        if(!fileInput.files.length) {
            alert("Lütfen önce bir .json yedek dosyası seçin.");
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if(importedData.items) {
                    db.items = importedData.items;
                    db.save();
                }
                if(importedData.orders) {
                    db.orders = importedData.orders;
                    db.saveOrders();
                }
                alert("Yedek başarıyla yüklendi!");
                fileInput.value = ''; // clear input
            } catch(err) {
                alert("Dosya okunamadı. Geçerli bir HexaVault yedeği olduğundan emin olun.");
            }
        };
        reader.readAsText(file);
    });

    // === SEARCH ===
    document.getElementById('search-input').addEventListener('input', (e) => {
        renderInventory(e.target.value);
    });

    // === EVENTS ===
    document.addEventListener('db_updated', () => {
        renderDashboard();
        renderInventory(document.getElementById('search-input').value);
    });

    document.addEventListener('orders_updated', renderOrders);

    // Initial render
    renderDashboard();
    renderCategoryFilters();
    renderInventory();
    renderOrders();

});

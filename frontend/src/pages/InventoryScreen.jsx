import { useState, useEffect } from "react";
import { api } from "../services/api";
import KPICard from "../components/KPICard";

export default function InventoryScreen() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [formData, setFormData] = useState({
    product_name: "",
    category: "",
    available_quantity: 0,
    minimum_stock: 10,
    supplier: "",
    unit_price: 0
  });

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const data = await api.getInventory();
      setInventory(data);
    } catch (err) {
      setError(err.message || "Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInventory();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenModal = (product = null) => {
    setError("");
    setSuccess("");
    if (product) {
      setEditId(product.product_id);
      setFormData({
        product_name: product.product_name,
        category: product.category,
        available_quantity: product.available_quantity,
        minimum_stock: product.minimum_stock,
        supplier: product.supplier || "",
        unit_price: product.unit_price
      });
    } else {
      setEditId(null);
      setFormData({
        product_name: "",
        category: "",
        available_quantity: 0,
        minimum_stock: 10,
        supplier: "",
        unit_price: 0
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (editId) {
        await api.updateInventoryProduct(editId, formData);
        setSuccess("Product updated successfully");
      } else {
        await api.addInventoryProduct(formData);
        setSuccess("Product added successfully");
      }
      setShowModal(false);
      fetchInventory();
    } catch (err) {
      setError(err.message || "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await api.deleteInventoryProduct(id);
      setSuccess("Product deleted");
      fetchInventory();
    } catch (err) {
      setError("Failed to delete product: " + err.message);
    }
  };

  const totalProducts = inventory.length;
  const lowStockCount = inventory.filter(p => p.available_quantity <= p.minimum_stock).length;
  const totalValue = inventory.reduce((sum, p) => sum + (p.available_quantity * p.unit_price), 0);

  return (
    <div className="animated-fade">
      <div style={{ padding: "1rem 2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "var(--primary-dark)" }}>Inventory Management</h2>
            <p style={{ color: "var(--text-muted)" }}>Track stock levels, set reorder points, and manage catalog.</p>
          </div>
          <button onClick={() => handleOpenModal()} className="btn btn-primary">+ Add Product</button>
        </div>

        {error && <div style={{ padding: "1rem", backgroundColor: "#FEE2E2", color: "#B91C1C", borderRadius: "8px", margin: "1rem 0" }}>{error}</div>}
        {success && <div style={{ padding: "1rem", backgroundColor: "#DCFCE7", color: "#15803D", borderRadius: "8px", margin: "1rem 0" }}>{success}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem", margin: "1.5rem 0" }}>
            <KPICard title="Total Unique Items" value={totalProducts} icon="📦" color="#3B82F6" />
            <KPICard title="Low Stock Alerts" value={lowStockCount} icon="⚠️" color="#EF4444" />
            <KPICard title="Total Inventory Value" value={`$${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon="💰" color="#10B981" />
        </div>

        <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          {loading && inventory.length === 0 ? (
            <p>Loading inventory...</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Available Stock</th>
                    <th>Reserved Stock</th>
                    <th>Unit Price</th>
                    <th>Supplier</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: "center", padding: "2rem" }}>No products in inventory.</td></tr>
                  ) : (
                    inventory.map(p => {
                      const isLowStock = p.available_quantity <= p.minimum_stock;
                      return (
                        <tr key={p.product_id} style={{ backgroundColor: isLowStock ? "#FEF2F2" : "transparent" }}>
                          <td style={{ fontWeight: "500" }}>
                            {p.product_name}
                            {isLowStock && <span style={{ marginLeft: "0.5rem", fontSize: "0.7rem", backgroundColor: "#EF4444", color: "white", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>LOW STOCK</span>}
                          </td>
                          <td>{p.category}</td>
                          <td style={{ fontWeight: isLowStock ? "bold" : "normal", color: isLowStock ? "#B91C1C" : "inherit" }}>{p.available_quantity}</td>
                          <td>{p.reserved_quantity}</td>
                          <td>${Number(p.unit_price).toFixed(2)}</td>
                          <td>{p.supplier || "-"}</td>
                          <td>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button onClick={() => handleOpenModal(p)} style={{ background: "transparent", border: "1px solid #D1D5DB", borderRadius: "4px", padding: "0.25rem 0.5rem", cursor: "pointer", fontSize: "0.85rem" }}>Edit</button>
                              <button onClick={() => handleDelete(p.product_id)} style={{ background: "transparent", border: "1px solid #FECACA", color: "#EF4444", borderRadius: "4px", padding: "0.25rem 0.5rem", cursor: "pointer", fontSize: "0.85rem" }}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: "12px", width: "500px", maxWidth: "90%" }}>
            <h3 style={{ marginTop: 0, marginBottom: "1.5rem" }}>{editId ? "Edit Product" : "Add New Product"}</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="form-label">Product Name *</label>
                <input type="text" className="form-input" name="product_name" value={formData.product_name} onChange={handleInputChange} required />
              </div>
              <div>
                <label className="form-label">Category *</label>
                <select className="form-input" name="category" value={formData.category} onChange={handleInputChange} required>
                  <option value="">-- Select Category --</option>
                  <option value="Drinkware">Drinkware</option>
                  <option value="Stationery">Stationery</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Apparel">Apparel</option>
                  <option value="Bags">Bags</option>
                  <option value="Hampers">Hampers</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Available Quantity *</label>
                  <input type="number" className="form-input" name="available_quantity" value={formData.available_quantity} onChange={handleInputChange} required min="0" />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Minimum Stock</label>
                  <input type="number" className="form-input" name="minimum_stock" value={formData.minimum_stock} onChange={handleInputChange} min="0" />
                </div>
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Unit Price ($) *</label>
                  <input type="number" step="0.01" className="form-input" name="unit_price" value={formData.unit_price} onChange={handleInputChange} required min="0" />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Supplier Name</label>
                  <input type="text" className="form-input" name="supplier" value={formData.supplier} onChange={handleInputChange} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn" style={{ background: "#F3F4F6", color: "#374151" }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Saving..." : "Save Product"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

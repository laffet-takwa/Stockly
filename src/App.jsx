import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  BarChart3,
  Boxes,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  LayoutDashboard,
  Package,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const money = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const number = new Intl.NumberFormat('fr-FR');
const categoryColors = ['#397f72', '#e39b55', '#7184ba', '#d77566', '#8a9c58', '#976fa1'];

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || 'Une erreur est survenue. Réessayez.');
  }
  return response.status === 204 ? null : response.json();
}

function stockState(product) {
  if (product.quantity === 0) return { label: 'Rupture', tone: 'empty' };
  if (product.quantity <= product.min_quantity) return { label: 'Stock faible', tone: 'low' };
  return { label: 'En stock', tone: 'good' };
}

function App() {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [connection, setConnection] = useState('loading');
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [productData, movementData] = await Promise.all([
        api('/products'),
        api('/movements?limit=8'),
      ]);
      setProducts(productData);
      setMovements(movementData);
      setConnection('connected');
      setError('');
    } catch (requestError) {
      setConnection('offline');
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(() => [...new Set(products.map((product) => product.category))].sort(), [products]);
  const lowStock = products.filter((product) => product.quantity <= product.min_quantity);
  const stockValue = products.reduce((total, product) => total + product.quantity * product.unit_price, 0);
  const units = products.reduce((total, product) => total + product.quantity, 0);

  const categoryData = useMemo(() => {
    const totals = products.reduce((result, product) => {
      result[product.category] = (result[product.category] || 0) + product.quantity;
      return result;
    }, {});
    const categoryTotal = Object.values(totals).reduce((sum, quantity) => sum + quantity, 0) || 1;
    return Object.entries(totals)
      .sort((left, right) => right[1] - left[1])
      .map(([name, quantity], index) => ({ name, quantity, share: (quantity / categoryTotal) * 100, color: categoryColors[index % categoryColors.length] }));
  }, [products]);

  const visibleProducts = products.filter((product) => {
    const matchesSearch = `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filter === 'all' || product.quantity <= product.min_quantity;
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3200);
  }

  async function saveProduct(productData) {
    const editing = Boolean(modal?.product);
    await api(editing ? `/products/${modal.product.id}` : '/products', {
      method: editing ? 'PUT' : 'POST',
      body: JSON.stringify(productData),
    });
    setModal(null);
    await loadData();
    showNotice(editing ? 'Produit mis à jour' : 'Produit ajouté à votre stock');
  }

  async function saveMovement(movementData) {
    await api('/movements', { method: 'POST', body: JSON.stringify(movementData) });
    setModal(null);
    await loadData();
    showNotice(movementData.movement_type === 'in' ? 'Entrée de stock enregistrée' : 'Sortie de stock enregistrée');
  }

  async function removeProduct(product) {
    if (!window.confirm(`Supprimer « ${product.name} » du catalogue ?`)) return;
    try {
      await api(`/products/${product.id}`, { method: 'DELETE' });
      await loadData();
      showNotice('Produit supprimé');
    } catch (requestError) {
      showNotice(requestError.message);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#accueil" aria-label="Stockly, accueil">
          <span className="brand-mark"><Boxes size={19} strokeWidth={2.4} /></span>
          <span className="brand-name">stockly<span>.</span></span>
        </a>
        <div className="workspace-switcher">
          <span className="workspace-avatar">A</span>
          <span className="workspace-copy"><strong>Atelier Nord</strong><small>Plan professionnel</small></span>
          <ChevronDown size={15} />
        </div>
        <div className="nav-label">ESPACE DE TRAVAIL</div>
        <nav className="side-nav" aria-label="Navigation principale">
          <a className="nav-item" href="#accueil"><LayoutDashboard size={17} /> Vue d’ensemble</a>
          <a className="nav-item active" href="#inventaire"><Package size={17} /> Inventaire <span>{products.length}</span></a>
          <a className="nav-item" href="#mouvements"><Activity size={17} /> Mouvements</a>
          <a className="nav-item" href="#rapports"><BarChart3 size={17} /> Rapports</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="side-tip"><span className="tip-icon"><Sparkles size={15} /></span><strong>Un œil sur le stock</strong><p>{lowStock.length ? `${lowStock.length} référence${lowStock.length > 1 ? 's' : ''} à réapprovisionner.` : 'Tout est à jour dans votre inventaire.'}</p><a href="#inventaire">Voir les alertes <ArrowRight size={13} /></a></div>
          <div className="profile"><span className="profile-avatar">TK</span><span className="profile-copy"><strong>Takwa K.</strong><small>Administratrice</small></span><button className="icon-button profile-menu" aria-label="Ouvrir le menu du profil"><ChevronDown size={16} /></button></div>
        </div>
      </aside>

      <main className="main-content" id="accueil">
        <header className="topbar">
          <div className="breadcrumb"><span>Atelier Nord</span><span className="crumb-slash">/</span><strong>Inventaire</strong></div>
          <div className="topbar-right"><span className={`connection ${connection}`}><span className="connection-dot" />{connection === 'connected' ? <><Wifi size={14} /> Connecté</> : connection === 'loading' ? 'Connexion…' : <><WifiOff size={14} /> Hors ligne</>}</span><span className="topbar-date">{new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}</span><span className="topbar-avatar">TK</span></div>
        </header>

        <div className="page-content" id="inventaire">
          <section className="page-heading">
            <div><div className="eyebrow"><span /> GESTION DES STOCKS</div><h1>Votre inventaire<span className="heading-period">.</span></h1><p>Suivez vos produits et gardez le bon rythme.</p></div>
            <div className="heading-actions"><button className="button button-secondary" onClick={() => setModal({ type: 'movement' })}><ArrowDownToLine size={16} /> Mouvement</button><button className="button button-primary" onClick={() => setModal({ type: 'product' })}><Plus size={17} /> Nouveau produit</button></div>
          </section>

          {connection === 'offline' && <div className="connection-alert"><WifiOff size={16} /><span><strong>API indisponible.</strong> {error} Démarrez le backend Python pour synchroniser votre inventaire.</span><button className="icon-button" onClick={loadData} title="Réessayer" aria-label="Réessayer la connexion"><Activity size={16} /></button></div>}

          <section className="stats-grid" aria-label="Résumé du stock">
            <StatCard label="Valeur du stock" value={money.format(stockValue)} icon={<CircleDollarSign size={19} />} color="mint" foot="Au prix d’achat unitaire" />
            <StatCard label="Références" value={number.format(products.length)} icon={<Package size={19} />} color="blue" foot={`${number.format(units)} unités en stock`} />
            <StatCard label="Stock faible" value={number.format(lowStock.length)} icon={<AlertTriangle size={19} />} color="amber" foot="Sous le seuil minimum" emphasized={lowStock.length > 0} />
            <StatCard label="Unités disponibles" value={number.format(units)} icon={<Boxes size={19} />} color="coral" foot="Toutes catégories confondues" />
          </section>

          <section className="overview-grid" id="rapports">
            <div className="inventory-panel">
              <div className="panel-heading">
                <div><div className="section-kicker">CATALOGUE</div><h2>Produits <span className="count-pill">{visibleProducts.length}</span></h2></div>
                <div className="panel-tools"><label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un produit..." aria-label="Rechercher un produit" /><kbd>⌘ K</kbd></label><button className="icon-button filter-button" aria-label="Filtrer les produits" title="Filtrer les produits"><SlidersHorizontal size={17} /></button></div>
              </div>
              <div className="table-filters"><div className="filter-tabs" role="tablist" aria-label="Filtrer par disponibilité"><button className={filter === 'all' ? 'filter-tab selected' : 'filter-tab'} onClick={() => setFilter('all')}>Tous <span>{products.length}</span></button><button className={filter === 'low' ? 'filter-tab selected' : 'filter-tab'} onClick={() => setFilter('low')}>À réapprovisionner <span className={lowStock.length ? 'tab-alert' : ''}>{lowStock.length}</span></button></div><label className="category-select"><span>Catégorie</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filtrer par catégorie"><option value="all">Toutes</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select><ChevronDown size={14} /></label></div>
              <div className="table-scroll"><table><thead><tr><th>PRODUIT</th><th>CATÉGORIE</th><th>PRIX UNITAIRE</th><th>QUANTITÉ</th><th>STATUT</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
                {loading && <tr><td colSpan="6" className="table-message">Chargement de l’inventaire…</td></tr>}
                {!loading && visibleProducts.length === 0 && <tr><td colSpan="6" className="table-message">{products.length ? 'Aucun produit ne correspond à votre recherche.' : 'Ajoutez un produit pour commencer votre inventaire.'}</td></tr>}
                {!loading && visibleProducts.map((product, index) => {
                  const status = stockState(product);
                  return <tr key={product.id} style={{ animationDelay: `${Math.min(index * 35, 280)}ms` }}>
                    <td><div className="product-cell"><span className={`product-thumb thumb-${index % 5}`}><Package size={17} /></span><span className="product-name"><strong>{product.name}</strong><small>{product.sku}</small></span></div></td>
                    <td><span className="category-name"><span style={{ background: categoryColors[categories.indexOf(product.category) % categoryColors.length] }} />{product.category}</span></td>
                    <td className="price-cell">{money.format(product.unit_price)}</td>
                    <td><div className="quantity-cell"><strong className={status.tone === 'empty' ? 'quantity-empty' : ''}>{number.format(product.quantity)}</strong><span>min. {number.format(product.min_quantity)}</span></div></td>
                    <td><span className={`status-pill ${status.tone}`}><span />{status.label}</span></td>
                    <td><div className="row-actions"><button className="icon-button" title="Modifier le produit" aria-label={`Modifier ${product.name}`} onClick={() => setModal({ type: 'product', product })}><Pencil size={15} /></button><button className="icon-button" title="Enregistrer un mouvement" aria-label={`Mouvement de stock pour ${product.name}`} onClick={() => setModal({ type: 'movement', product })}><ArrowDownToLine size={15} /></button><button className="icon-button delete-action" title="Supprimer le produit" aria-label={`Supprimer ${product.name}`} onClick={() => removeProduct(product)}><Trash2 size={15} /></button></div></td>
                  </tr>;
                })}
              </tbody></table></div>
              <div className="table-footer"><span>Affichage de <strong>{visibleProducts.length}</strong> sur <strong>{products.length}</strong> références</span><button className="text-button" onClick={() => { setFilter('all'); setCategoryFilter('all'); setSearch(''); }}>Réinitialiser les filtres <ArrowRight size={14} /></button></div>
            </div>

            <aside className="insights-column">
              <section className="insight-panel category-panel">
                <div className="insight-title"><div><div className="section-kicker">RÉPARTITION</div><h2>Stock par catégorie</h2></div><button className="icon-button" aria-label="Plus d’options"><ChevronDown size={16} /></button></div>
                {categoryData.length > 0 ? <><div className="category-bar" role="img" aria-label="Répartition des unités par catégorie">{categoryData.map((category) => <span key={category.name} style={{ width: `${category.share}%`, background: category.color }} />)}</div><div className="category-legend">{categoryData.slice(0, 5).map((category) => <div className="legend-row" key={category.name}><span className="legend-name"><i style={{ background: category.color }} />{category.name}</span><strong>{number.format(category.quantity)}</strong></div>)}</div></> : <div className="insight-empty">Les catégories apparaîtront ici.</div>}
                <button className="panel-link" onClick={() => { setCategoryFilter('all'); document.getElementById('inventaire').scrollIntoView({ behavior: 'smooth' }); }}>Voir l’inventaire <ArrowRight size={14} /></button>
              </section>
              <section className="insight-panel activity-panel" id="mouvements">
                <div className="insight-title"><div><div className="section-kicker">EN TEMPS RÉEL</div><h2>Activité récente</h2></div><span className="live-indicator"><i /> LIVE</span></div>
                {movements.length ? <div className="activity-list">{movements.slice(0, 5).map((movement) => <div className="activity-row" key={movement.id}><span className={`activity-icon ${movement.movement_type === 'in' ? 'incoming' : 'outgoing'}`}>{movement.movement_type === 'in' ? <ArrowDownToLine size={15} /> : <ArrowUpFromLine size={15} />}</span><div className="activity-copy"><strong>{movement.product_name}</strong><span>{movement.movement_type === 'in' ? 'Entrée' : 'Sortie'} · {formatDate(movement.created_at)}</span></div><span className={`movement-amount ${movement.movement_type === 'in' ? 'positive' : ''}`}>{movement.movement_type === 'in' ? '+' : '−'}{movement.quantity}</span></div>)}</div> : <div className="insight-empty">Aucun mouvement récent.</div>}
                <button className="panel-link" onClick={() => setModal({ type: 'movement' })}>Enregistrer un mouvement <ArrowRight size={14} /></button>
              </section>
              <section className="reorder-panel"><div className="reorder-icon"><AlertTriangle size={18} /></div><div className="reorder-copy"><strong>{lowStock.length ? `${lowStock.length} produit${lowStock.length > 1 ? 's' : ''} à surveiller` : 'Aucune alerte de stock'}</strong><span>{lowStock.length ? 'Évitez les ruptures, pensez au réassort.' : 'Vos niveaux de stock sont bons.'}</span></div><button className="icon-button" onClick={() => setFilter(lowStock.length ? 'low' : 'all')} title="Voir les stocks faibles" aria-label="Voir les stocks faibles"><ArrowRight size={16} /></button></section>
            </aside>
          </section>
          <footer className="page-footer"><span>STOCKLY <span>·</span> GESTION SIMPLIFIÉE</span><span><Clock3 size={13} /> Mis à jour à l’instant</span></footer>
        </div>
      </main>

      {modal?.type === 'product' && <ProductModal key={modal.product?.id || 'new'} product={modal.product} onClose={() => setModal(null)} onSave={saveProduct} />}
      {modal?.type === 'movement' && <MovementModal key={modal.product?.id || 'all'} products={products} product={modal.product} onClose={() => setModal(null)} onSave={saveMovement} />}
      {notice && <div className="toast"><span><Check size={15} /></span>{notice}<button className="icon-button" onClick={() => setNotice('')} aria-label="Fermer la notification"><X size={15} /></button></div>}
    </div>
  );
}

function StatCard({ label, value, icon, color, foot, emphasized }) {
  return <article className={`stat-card stat-${color}`}><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong className={emphasized ? 'stat-emphasized' : ''}>{value}</strong><div className="stat-foot">{emphasized && <span className="stat-dot" />}{foot}</div></article>;
}

function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState({ name: product?.name || '', sku: product?.sku || '', category: product?.category || '', quantity: product?.quantity ?? 0, min_quantity: product?.min_quantity ?? 5, unit_price: product?.unit_price ?? '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const update = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({ ...form, quantity: Number(form.quantity), min_quantity: Number(form.min_quantity), unit_price: Number(form.unit_price) });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title"><div className="modal-header"><div className="modal-icon mint"><Package size={19} /></div><button className="icon-button" onClick={onClose} aria-label="Fermer"><X size={18} /></button></div><div className="modal-heading"><div className="section-kicker">CATALOGUE PRODUITS</div><h2 id="product-modal-title">{product ? 'Modifier le produit' : 'Nouveau produit'}</h2><p>Les informations servent au suivi de votre inventaire.</p></div><form onSubmit={submit} className="modal-form"><label>Nom du produit<input autoFocus required maxLength="120" value={form.name} onChange={update('name')} placeholder="Ex. Casque Studio Pro" /></label><div className="form-row"><label>Référence SKU<input required maxLength="40" value={form.sku} onChange={update('sku')} placeholder="Ex. AUD-2401" /></label><label>Catégorie<input required maxLength="60" value={form.category} onChange={update('category')} placeholder="Ex. Électronique" /></label></div><div className="form-row"><label>Quantité initiale<input required type="number" min="0" step="1" value={form.quantity} onChange={update('quantity')} /></label><label>Seuil d’alerte<input required type="number" min="0" step="1" value={form.min_quantity} onChange={update('min_quantity')} /></label></div><label>Prix unitaire (€)<input required type="number" min="0" step="0.01" value={form.unit_price} onChange={update('unit_price')} placeholder="0,00" /></label>{error && <div className="form-error"><AlertTriangle size={15} />{error}</div>}<div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Annuler</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Enregistrement…' : product ? 'Enregistrer' : <><Plus size={16} /> Ajouter le produit</>}</button></div></form></section></div>;
}

function MovementModal({ products, product, onClose, onSave }) {
  const [type, setType] = useState('in');
  const [productId, setProductId] = useState(product?.id || products[0]?.id || '');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const selectedProduct = products.find((item) => item.id === productId);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({ product_id: productId, movement_type: type, quantity: Number(quantity), note });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="movement-modal-title"><div className="modal-header"><div className="modal-icon blue"><ArrowDownToLine size={19} /></div><button className="icon-button" onClick={onClose} aria-label="Fermer"><X size={18} /></button></div><div className="modal-heading"><div className="section-kicker">JOURNAL DE STOCK</div><h2 id="movement-modal-title">Nouveau mouvement</h2><p>Chaque mouvement met à jour le stock disponible.</p></div>{products.length ? <form onSubmit={submit} className="modal-form"><div className="movement-type" role="group" aria-label="Type de mouvement"><button type="button" className={type === 'in' ? 'movement-choice chosen incoming-choice' : 'movement-choice'} onClick={() => setType('in')}><ArrowDownToLine size={16} /> Entrée</button><button type="button" className={type === 'out' ? 'movement-choice chosen outgoing-choice' : 'movement-choice'} onClick={() => setType('out')}><ArrowUpFromLine size={16} /> Sortie</button></div><label>Produit<select required value={productId} onChange={(event) => setProductId(event.target.value)}>{products.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.quantity} en stock</option>)}</select><ChevronDown className="select-chevron" size={15} /></label><div className="movement-stock">Disponible maintenant <strong>{number.format(selectedProduct?.quantity || 0)} unités</strong></div><label>Quantité<input autoFocus required type="number" min="1" max={type === 'out' ? selectedProduct?.quantity || 1 : undefined} step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label><label>Note <span className="optional-label">(facultatif)</span><input maxLength="240" value={note} onChange={(event) => setNote(event.target.value)} placeholder={type === 'in' ? 'Ex. Réception fournisseur' : 'Ex. Commande client'} /></label>{error && <div className="form-error"><AlertTriangle size={15} />{error}</div>}<div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Annuler</button><button type="submit" className="button button-primary" disabled={saving || !productId}>{saving ? 'Enregistrement…' : 'Confirmer le mouvement'}</button></div></form> : <div className="modal-empty"><p>Ajoutez d’abord un produit avant d’enregistrer un mouvement.</p><button className="button button-primary" onClick={onClose}>Compris</button></div>}</section></div>;
}

function formatDate(value) {
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

export default App;
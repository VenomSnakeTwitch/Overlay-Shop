import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Lenis from "lenis";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight, Check, ChevronRight, CreditCard, Headphones, LayoutTemplate, LockKeyhole, LogOut, Menu, Pencil, Plus, Radio, ShieldCheck, ShoppingCart, Sparkles, Timer, Trash2, User, X } from "lucide-react";
import "@/App.css";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const icons = { OVERLAYS: LayoutTemplate, BRANDING: Sparkles, MUSIC: Headphones };
const categories = ["ALL", "OVERLAYS", "BRANDING", "MUSIC"];
const badges = ["", "NEU", "BELIEBT", "LIMITED"];

const ease = [0.22, 1, 0.36, 1];
const rise = { hidden: { opacity: 0, y: 48 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, ease } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };

const finalPrice = (o) => Math.round(o.price * (1 - (o.discount || 0) / 100) * 100) / 100;
const fmt = (n) => Number(n) === 0 ? "GRATIS" : "€" + Number(n).toFixed(2).replace(".00", "");
const pad = (n) => String(n).padStart(2, "0");

function SaleTimer() {
  const [endsAt, setEndsAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { axios.get(`${API}/settings`).then((r) => setEndsAt(r.data.sale_ends_at)).catch(() => {}); }, []);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - now;
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000); const h = Math.floor(diff / 3600000) % 24; const m = Math.floor(diff / 60000) % 60; const s = Math.floor(diff / 1000) % 60;
  return <span className="sale-timer" data-testid="sale-timer"><Timer size={12}/>SALE ENDET IN {d > 0 ? `${d}T ` : ""}{pad(h)}:{pad(m)}:{pad(s)}</span>;
}

function App() {
  const [offers, setOffers] = useState([]); const [filter, setFilter] = useState("ALL");
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem("bs_cart")) || []; } catch { return []; } });
  const [cartOpen, setCartOpen] = useState(false); const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [admin, setAdmin] = useState(false); const [loginOpen, setLoginOpen] = useState(false); const [mobileOpen, setMobileOpen] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("overlay_admin_token"));
  const [customer, setCustomer] = useState(() => { try { return JSON.parse(localStorage.getItem("bs_customer")); } catch { return null; } });
  const [customerLoginOpen, setCustomerLoginOpen] = useState(false); const [accountOpen, setAccountOpen] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.25, smoothWheel: true, anchors: true });
    let raf;
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);

  useEffect(() => { localStorage.setItem("bs_cart", JSON.stringify(cart)); }, [cart]);

  useEffect(() => { loadOffers(); const orderId = new URLSearchParams(window.location.search).get("token"); if (orderId) capture(orderId); }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("session_id=")) {
      const sid = hash.split("session_id=")[1].split("&")[0];
      axios.post(`${API}/auth/google-session`, { session_id: sid }, { withCredentials: true })
        .then((r) => {
          if (r.data.role === "admin") {
            localStorage.setItem("overlay_admin_token", r.data.token); setToken(r.data.token); setAdmin(true);
          } else {
            const c = { token: r.data.token, name: r.data.name, email: r.data.email };
            localStorage.setItem("bs_customer", JSON.stringify(c)); setCustomer(c);
          }
          setNotice(`Willkommen, ${r.data.name || r.data.email}.`);
        })
        .catch(() => setNotice("Google-Anmeldung fehlgeschlagen."))
        .finally(() => window.history.replaceState({}, "", window.location.pathname));
      return;
    }
    if (!localStorage.getItem("overlay_admin_token") && !localStorage.getItem("bs_customer")) {
      axios.get(`${API}/auth/me`, { withCredentials: true })
        .then((r) => {
          if (r.data.role === "admin") { localStorage.setItem("overlay_admin_token", r.data.token); setToken(r.data.token); }
          else { const c = { token: r.data.token, name: r.data.name, email: r.data.email }; localStorage.setItem("bs_customer", JSON.stringify(c)); setCustomer(c); }
        })
        .catch(() => {});
    }
  }, []);

  async function loadOffers() { try { setOffers((await axios.get(`${API}/offers`)).data); } catch { setNotice("Der Shop konnte gerade nicht geladen werden."); } }
  async function capture(orderId) {
    try {
      await axios.post(`${API}/paypal/capture/${orderId}`);
      setCart([]); setNotice("Zahlung erfolgreich bestätigt. Wir melden uns gleich bei dir."); window.history.replaceState({}, "", "/");
    } catch { setNotice("Die Zahlung wird noch geprüft. Bitte bewahre deine PayPal-Bestätigung auf."); }
  }
  function addToCart(id) {
    if (cart.includes(id)) { setNotice("Schon im Warenkorb."); return; }
    setCart([...cart, id]); setNotice("Zum Warenkorb hinzugefügt.");
  }
  async function logout() {
    try { await axios.post(`${API}/auth/logout`, {}, { withCredentials: true }); } catch {}
    localStorage.removeItem("bs_customer"); setCustomer(null); setAccountOpen(false); setNotice("Abgemeldet.");
  }

  const visible = offers.filter((item) => filter === "ALL" || item.category === filter);
  const cartItems = cart.map((id) => offers.find((o) => o.id === id)).filter(Boolean);

  return <div className="site-shell">
    <div className="noise-layer"/>
    <nav className="nav" data-testid="main-navigation">
      <a className="brand" href="#top" data-testid="brand-home"><span className="brand-mark">BS</span><span className="brand-word">BLACKSOLID<small>CREATIVE SUPPLY</small></span></a>
      <div className={mobileOpen ? "nav-links mobile-open" : "nav-links"}>
        <SaleTimer/>
        <a href="#services" onClick={() => setMobileOpen(false)} data-testid="services-link">Services</a>
        <a href="#process" onClick={() => setMobileOpen(false)} data-testid="process-link">Workflow</a>
        <button className="nav-icon-btn" onClick={() => { setMobileOpen(false); customer ? setAccountOpen(true) : setCustomerLoginOpen(true); }} data-testid="customer-account-button"><User size={14}/>{customer ? customer.name?.split(" ")[0] || "Konto" : "Login"}</button>
        <button className="nav-icon-btn cart-btn" onClick={() => { setMobileOpen(false); setCartOpen(true); }} data-testid="cart-open-button"><ShoppingCart size={14}/>Warenkorb{cart.length > 0 && <span className="cart-count" data-testid="cart-count">{cart.length}</span>}</button>
        <button className="admin-link" onClick={() => { setMobileOpen(false); token ? setAdmin(true) : setLoginOpen(true); }} data-testid="admin-open-button"><LockKeyhole size={13}/> Control Room</button>
      </div>
      <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-button"><Menu size={20}/></button>
    </nav>

    <main id="top">
      <Hero onShop={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}/>

      <div className="marquee" data-testid="ticker"><div className="marquee-track">
        {[0, 1].map((n) => <div className="marquee-run" key={n} aria-hidden={n === 1}>
          <span>BLACKSOLID CREATIVE SUPPLY</span><i/><span>PREMIUM STREAM ASSETS</span><i/><span>OBS READY</span><i/><span>DMCA-SAFE AUDIO</span><i/><span>BUILT FOR THE LIVE MOMENT</span><i/>
        </div>)}
      </div></div>

      <section className="services-section" id="services" data-testid="services-section">
        <motion.div className="section-heading" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}>
          <motion.div variants={rise}><div className="eyebrow">01 / THE DROP</div><h2>Pick your <em>signal.</em></h2></motion.div>
          <motion.p variants={rise}>Purpose-built assets für Creator mit Haltung. Wähl dein Setup, schick dein Briefing – wir liefern den Rest.</motion.p>
        </motion.div>
        <motion.div className="filter-bar" data-testid="category-filters" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease }}>
          {categories.map((cat) => <button className={filter === cat ? "filter active" : "filter"} onClick={() => setFilter(cat)} key={cat} data-testid={`filter-${cat.toLowerCase()}`}>{cat === "ALL" ? "ALL ITEMS" : cat}</button>)}
        </motion.div>
        <motion.div className="offer-grid" data-testid="offer-grid" variants={stagger} initial="hidden" animate="show" key={visible.map((o) => o.id).join(",")}>
          {visible.map((offer) => <OfferCard key={offer.id} offer={offer} inCart={cart.includes(offer.id)} onAdd={addToCart}/>)}
        </motion.div>
      </section>

      <section className="process-section" id="process" data-testid="process-section">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}>
          <motion.div className="eyebrow" variants={rise}>02 / THE WORKFLOW</motion.div>
          <motion.h2 variants={rise}>From idea to <em>on-air.</em></motion.h2>
          <div className="process-grid">
            <Step number="01" title="Choose your signal" text="Wähl das Paket, das zu deinem nächsten Level passt."/>
            <Step number="02" title="Share the brief" text="Erzähl uns von Kanal, Energie und Audience."/>
            <Step number="03" title="Go live different" text="Wir bauen dein Custom-Kit und liefern alle Files."/>
          </div>
        </motion.div>
      </section>
    </main>

    <footer className="footer">
      <div className="brand"><span className="brand-mark">BS</span><span className="brand-word">BLACKSOLID<small>CREATIVE SUPPLY</small></span></div>
      <span className="footer-copy">© 2026 Blacksolid. Built for the next broadcast.</span>
      <span className="footer-status"><span className="rec-dot"/> SYSTEMS ONLINE</span>
    </footer>

    {cartOpen && <CartDrawer items={cartItems} onClose={() => setCartOpen(false)} onRemove={(id) => setCart(cart.filter((c) => c !== id))} onCheckout={() => { if (!customer) { setCartOpen(false); setCustomerLoginOpen(true); setNotice("Bitte melde dich zuerst mit Google an – danach geht es direkt weiter."); return; } setCartOpen(false); setCheckoutOpen(true); }}/>}
    {checkoutOpen && <Checkout items={cartItems} customer={customer} onClose={() => setCheckoutOpen(false)} onNotice={setNotice} onFreeSuccess={() => { setCart([]); setCheckoutOpen(false); }}/>}
    {customerLoginOpen && <CustomerLogin onClose={() => setCustomerLoginOpen(false)}/>}
    {accountOpen && customer && <Account customer={customer} onClose={() => setAccountOpen(false)} onLogout={logout}/>}
    {loginOpen && <Login onClose={() => setLoginOpen(false)} onSuccess={(t) => { setToken(t); setLoginOpen(false); setAdmin(true); }}/>}
    {admin && <Admin token={token} onClose={() => setAdmin(false)} onOffers={loadOffers}/>}
    {notice && <motion.div className="notice" data-testid="status-notice" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}><Check size={17}/>{notice}<button onClick={() => setNotice(null)} data-testid="close-notice"><X size={16}/></button></motion.div>}
  </div>;
}

function Hero({ onShop }) {
  const ref = useRef(null);
  const mx = useMotionValue(0); const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 120, damping: 18 });
  const px = useSpring(useTransform(mx, [-0.5, 0.5], [-14, 14]), { stiffness: 80, damping: 20 });
  const py = useSpring(useTransform(my, [-0.5, 0.5], [-10, 10]), { stiffness: 80, damping: 20 });

  function onMove(e) { const r = ref.current.getBoundingClientRect(); mx.set((e.clientX - r.left) / r.width - 0.5); my.set((e.clientY - r.top) / r.height - 0.5); }
  const lines = [<>Make your</>, <>stream <em>impossible</em></>, <>to miss.</>];

  return <section className="hero" data-testid="hero-section" ref={ref} onMouseMove={onMove}>
    <div className="hero-glow"/>
    <div className="hero-copy">
      <motion.div className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }}><span className="rec-dot"/> CREATIVE SYSTEMS / 2026</motion.div>
      <h1>{lines.map((line, i) => <span className="line-mask" key={i}><motion.span initial={{ y: "112%" }} animate={{ y: 0 }} transition={{ delay: 0.25 + i * 0.13, duration: 0.9, ease }}>{line}</motion.span></span>)}</h1>
      <motion.p className="hero-sub" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.7, ease }}>High-impact Visuals, Sound und Identity für Creator, die sich nicht unterkriegen lassen.</motion.p>
      <motion.div className="hero-actions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.7, ease }}>
        <button className="primary-button" onClick={onShop} data-testid="hero-shop-button">Explore the drop <ArrowUpRight size={17}/></button>
        <span className="hero-note"><ShieldCheck size={16}/> PayPal secure checkout</span>
      </motion.div>
    </div>
    <motion.div className="hero-visual" style={{ rotateX: rx, rotateY: ry }} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 1, ease }}>
      <motion.div className="hero-frame" style={{ x: px, y: py }}>
        <div className="scanline"/><div className="hud-corner hud-tl"/><div className="hud-corner hud-tr"/><div className="hud-corner hud-bl"/><div className="hud-corner hud-br"/>
        <img src="https://images.unsplash.com/photo-1636489948870-058e57b5f7d9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHwxfHxnYW1pbmclMjBvdmVybGF5JTIwZXNwb3J0cyUyMHN0cmVhbWluZyUyMHNldHVwJTIwcmdiJTIwZGFyayUyMG5lb258ZW58MHx8fHwxNzkwNjg0ODgzfDA&ixlib=rb-4.1.0&q=85" alt="Cyberpunk Gaming Studio Rig" data-testid="hero-image"/>
        <div className="visual-label"><span>LIVE / 01</span><b>OBS READY</b></div>
        <div className="visual-stats"><span><Radio size={13}/> SIGNAL</span><strong>98.4%</strong></div>
        <div className="visual-eq"><i/><i/><i/><i/><i/><i/><i/></div>
      </motion.div>
    </motion.div>
  </section>;
}

function OfferCard({ offer, inCart, onAdd }) {
  const Icon = icons[offer.category] || Sparkles;
  const hasDiscount = (offer.discount || 0) > 0;
  return <motion.article className="offer-card" variants={rise} data-testid={`offer-card-${offer.id}`} whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}>
    <div className="card-image"><img src={offer.image} alt={offer.name}/><span className="category-tag"><Icon size={13}/>{offer.category}</span>
      {hasDiscount && <span className="discount-tag" data-testid={`offer-discount-${offer.id}`}>-{offer.discount}%</span>}
      {offer.badge && <span className={`badge-tag badge-${offer.badge.toLowerCase()}`} data-testid={`offer-badge-${offer.id}`}>{offer.badge}</span>}
      {offer.featured && !offer.badge && <span className="featured-tag">FEATURED</span>}
    </div>
    <div className="card-body"><div><h3 data-testid={`offer-name-${offer.id}`}>{offer.name}</h3><p data-testid={`offer-description-${offer.id}`}>{offer.description}</p></div>
    <div className="card-bottom"><div className="price-block">{hasDiscount && <span className="old-price">{fmt(offer.price)}</span>}<strong data-testid={`offer-price-${offer.id}`}>{fmt(finalPrice(offer))}</strong></div><button className={inCart ? "card-button in-cart" : "card-button"} onClick={() => onAdd(offer.id)} data-testid={`offer-buy-${offer.id}`}>{inCart ? <><Check size={15}/> Im Warenkorb</> : <>In den Warenkorb <ShoppingCart size={15}/></>}</button></div></div>
  </motion.article>;
}

function Step({ number, title, text }) { return <motion.div className="step" variants={rise} data-testid={`workflow-step-${number}`}><span>{number}</span><h3>{title}</h3><p>{text}</p></motion.div>; }

function CartDrawer({ items, onClose, onRemove, onCheckout }) {
  const total = items.reduce((sum, i) => sum + finalPrice(i), 0);
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} onClick={onClose}>
    <motion.div className="cart-drawer" data-testid="cart-drawer" initial={{ x: 420 }} animate={{ x: 0 }} transition={{ duration: 0.45, ease }} onClick={(e) => e.stopPropagation()}>
      <div className="cart-top"><div><div className="modal-kicker">LOADOUT / {String(items.length).padStart(2, "0")}</div><h2>Waren<em>korb.</em></h2></div><button className="modal-close" style={{position:"static"}} onClick={onClose} data-testid="cart-close"><X/></button></div>
      <div className="cart-list">
        {items.length === 0 && <p className="orders-empty" data-testid="cart-empty">Noch leer. Schnapp dir ein Paket.</p>}
        {items.map((item) => <div className="cart-item" key={item.id} data-testid={`cart-item-${item.id}`}>
          <img src={item.image} alt={item.name}/>
          <div><strong>{item.name}</strong><span>{fmt(finalPrice(item))}{(item.discount || 0) > 0 && <s className="cart-old">{fmt(item.price)}</s>}</span></div>
          <button onClick={() => onRemove(item.id)} data-testid={`cart-remove-${item.id}`}><Trash2 size={15}/></button>
        </div>)}
      </div>
      {items.length > 0 && <div className="cart-footer">
        <div className="cart-total"><span>Gesamt</span><strong data-testid="cart-total">{fmt(total)}</strong></div>
        <button className="primary-button full" onClick={onCheckout} data-testid="cart-checkout-button">Kauf bestätigen <ChevronRight size={16}/></button>
      </div>}
    </motion.div>
  </motion.div>;
}

function Checkout({ items, customer, onClose, onNotice, onFreeSuccess }) {
  const [form, setForm] = useState({ name: customer?.name || "", email: customer?.email || "", notes: "" });
  const [loading, setLoading] = useState(false);
  const total = items.reduce((sum, i) => sum + finalPrice(i), 0);
  async function submit(e) {
    e.preventDefault(); setLoading(true);
    try {
      const result = await axios.post(`${API}/paypal/create-order`, { offer_ids: items.map((i) => i.id), ...form }, { headers: { Authorization: `Bearer ${customer.token}` } });
      if (result.data.free) { onNotice("Bestellung eingegangen! Du bekommst dein Produkt per E-Mail zugeschickt."); onFreeSuccess(); return; }
      window.location.href = result.data.approval_url;
    } catch (err) { onNotice(err.response?.data?.detail || "Die Bestellung konnte nicht gestartet werden. Bitte prüfe deine Eingaben."); setLoading(false); }
  }
  const isFree = total === 0;
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
    <motion.div className="checkout-modal" data-testid="checkout-modal" initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45, ease }}>
      <button className="modal-close" onClick={onClose} data-testid="checkout-close"><X/></button>
      <div className="modal-kicker">READY WHEN YOU ARE / 03</div>
      <h2>Let’s make it <em>real.</em></h2>
      <div className="checkout-items" data-testid="checkout-items">
        {items.map((i) => <div className="checkout-item" key={i.id}><span>{i.name}{(i.discount || 0) > 0 && <i className="checkout-discount">-{i.discount}%</i>}</span><b>{fmt(finalPrice(i))}</b></div>)}
        <div className="checkout-item total"><span>Gesamt</span><b data-testid="checkout-total">{fmt(total)}</b></div>
      </div>
      <form onSubmit={submit}>
        <p className="logged-in-note" data-testid="checkout-account"><User size={13}/> Angemeldet als {customer.email}</p>
        <label>Name<input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Dein Name" data-testid="customer-name-input"/></label>
        <label>E-Mail<input required type="email" value={form.email} readOnly data-testid="customer-email-input"/></label>
        <label>Brief / Notiz <span>(optional)</span><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Erzähl uns kurz von deinem Kanal..." data-testid="customer-notes-input"/></label>
        <button className="primary-button full" disabled={loading} data-testid="paypal-submit-button"><CreditCard size={17}/>{loading ? "Wird gesendet..." : isFree ? "Kostenlos bestellen" : "Mit PayPal bezahlen"}</button>
        <small className="secure-note"><ShieldCheck size={14}/> {isFree ? "Kostenlos – kein PayPal nötig. Lieferung per E-Mail." : "Du wirst sicher zu PayPal weitergeleitet. Zahlung in EUR."}</small>
      </form>
    </motion.div>
  </motion.div>;
}

function googleLogin() {
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const redirectUrl = window.location.origin + "/";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}

function GoogleButton({ testid }) {
  return <button type="button" className="google-button" onClick={googleLogin} data-testid={testid}>
    <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
    Mit Google anmelden
  </button>;
}

function CustomerLogin({ onClose }) {
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
    <motion.div className="login-modal" data-testid="customer-login-modal" initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45, ease }}>
      <button className="modal-close" onClick={onClose} data-testid="customer-login-close"><X/></button>
      <div className="login-icon"><User/></div>
      <div className="modal-kicker">CREATOR ACCESS</div>
      <h2>Dein <em>Konto.</em></h2>
      <p>Melde dich mit Google an, um deine Bestellungen zu sehen und offene Käufe zu verwalten.</p>
      <GoogleButton testid="customer-google-button"/>
    </motion.div>
  </motion.div>;
}

function Account({ customer, onClose, onLogout }) {
  const [orders, setOrders] = useState([]);
  useEffect(() => { axios.get(`${API}/my/orders`, { headers: { Authorization: `Bearer ${customer.token}` } }).then((r) => setOrders(r.data)).catch(() => {}); }, [customer.token]);
  async function remove(o) { try { await axios.delete(`${API}/my/orders/${o.paypal_id}`, { headers: { Authorization: `Bearer ${customer.token}` } }); setOrders(orders.filter((x) => x.paypal_id !== o.paypal_id)); } catch {} }
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
    <motion.div className="admin-modal" data-testid="account-modal" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease }}>
      <div className="admin-top"><div><div className="modal-kicker">CREATOR / {customer.email}</div><h2>Meine <em>Bestellungen.</em></h2></div><button className="modal-close" style={{position:"static"}} onClick={onClose} data-testid="account-close"><X/></button></div>
      <p className="modal-intro">Offene Bestellungen kannst du hier wieder entfernen. Bezahlte Aufträge bleiben bestehen.</p>
      <div className="admin-list" data-testid="my-orders-list">
        {orders.length === 0 && <p className="orders-empty" data-testid="my-orders-empty">Noch keine Bestellungen.</p>}
        {orders.map((o) => <div className="order-row" key={o.paypal_id} data-testid={`my-order-${o.paypal_id}`}>
          <div className="order-main">
            <strong>{(o.items || []).map((i) => i.name).join(" + ") || o.offer_name || o.offer_id}</strong>
            <span>{o.created_at ? new Date(o.created_at).toLocaleString("de-DE") : ""}</span>
          </div>
          <div className="order-side">
            {o.total != null && <b className="order-price">{fmt(o.total)}</b>}
            <span className={`status-badge ${o.status === "COMPLETED" ? "ok" : "pending"}`} data-testid={`my-order-status-${o.paypal_id}`}>{o.status === "COMPLETED" ? "BEZAHLT" : "OFFEN"}</span>
            {o.status !== "COMPLETED" && <button className="delete-button order-delete" onClick={() => remove(o)} data-testid={`my-order-delete-${o.paypal_id}`}><Trash2 size={14}/></button>}
          </div>
        </div>)}
      </div>
      <button className="ghost-button logout-btn" onClick={onLogout} data-testid="logout-button"><LogOut size={14}/> Abmelden</button>
    </motion.div>
  </motion.div>;
}

function Login({ onClose, onSuccess }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState("");
  async function submit(e) { e.preventDefault(); try { const result = await axios.post(`${API}/auth/login`, { email, password }); localStorage.setItem("overlay_admin_token", result.data.token); onSuccess(result.data.token); } catch { setError("Zugangsdaten nicht erkannt."); } }
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
    <motion.div className="login-modal" data-testid="admin-login-modal" initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45, ease }}>
      <button className="modal-close" onClick={onClose} data-testid="admin-login-close"><X/></button>
      <div className="login-icon"><LockKeyhole/></div>
      <div className="modal-kicker">RESTRICTED AREA</div>
      <h2>Control <em>Room.</em></h2>
      <p>Verwalte deine Angebote, Preise und Bestellungen.</p>
      <GoogleButton testid="google-login-button"/>
      <div className="login-divider"><span>oder mit E-Mail</span></div>
      <form onSubmit={submit}>
        <label>E-Mail<input required type="email" value={email} onChange={e => setEmail(e.target.value)} data-testid="admin-email-input"/></label>
        <label>Passwort<input required type="password" value={password} onChange={e => setPassword(e.target.value)} data-testid="admin-password-input"/></label>
        {error && <div className="form-error" data-testid="admin-login-error">{error}</div>}
        <button className="primary-button full" data-testid="admin-login-submit">Enter Control Room <ArrowUpRight size={16}/></button>
      </form>
    </motion.div>
  </motion.div>;
}

function ImageUpload({ token, value, onChange, testid }) {
  const [busy, setBusy] = useState(false);
  async function onFile(e) {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData(); fd.append("file", f);
      const r = await axios.post(`${API}/admin/upload`, fd, { headers: { Authorization: `Bearer ${token}` } });
      onChange(r.data.url);
    } catch { /* ignore */ } finally { setBusy(false); }
  }
  return <div className="upload-row">
    {value && <img src={value} alt="Vorschau" className="upload-preview" data-testid={`${testid}-preview`}/>}
    <label className="ghost-button upload-btn">{busy ? "Lädt hoch..." : "Bild hochladen"}<input type="file" accept="image/*" hidden onChange={onFile} data-testid={testid}/></label>
  </div>;
}

const emptyDraft = { name: "", description: "", price: "", category: "OVERLAYS", image: "", featured: false, discount: 0, badge: "" };

function BadgeSelect({ value, onChange, testid }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid} className="badge-select">
    <option value="">Kein Badge</option>{badges.filter(Boolean).map((b) => <option key={b} value={b}>{b}</option>)}
  </select>;
}

function Admin({ token, onClose, onOffers }) {
  const [tab, setTab] = useState("offers");
  const [items, setItems] = useState([]); const [orders, setOrders] = useState([]);
  const [editing, setEditing] = useState(null); const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [formError, setFormError] = useState("");
  const [saleEnd, setSaleEnd] = useState(""); const [saleSaved, setSaleSaved] = useState("");
  const headers = { Authorization: `Bearer ${token}` };

  async function load() {
    setItems((await axios.get(`${API}/admin/offers`, { headers })).data.map((i) => ({ discount: 0, badge: "", ...i })));
    setOrders((await axios.get(`${API}/admin/orders`, { headers })).data);
    const s = await axios.get(`${API}/settings`);
    if (s.data.sale_ends_at) { const d = new Date(s.data.sale_ends_at); setSaleEnd(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)); }
  }
  useEffect(() => { load().catch(() => {}); }, [token]);

  async function save(item) { try { await axios.put(`${API}/admin/offers/${item.id}`, item, { headers }); setEditing(null); setFormError(""); load(); onOffers(); } catch (err) { setFormError(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Speichern fehlgeschlagen. Bitte Eingaben prüfen."); } }
  async function remove(item) { await axios.delete(`${API}/admin/offers/${item.id}`, { headers }); load(); onOffers(); }
  async function create(e) { e.preventDefault(); try { await axios.post(`${API}/admin/offers`, { ...draft, price: Number(draft.price) || 0, discount: Number(draft.discount) || 0, active: true }, { headers }); setCreating(false); setDraft(emptyDraft); setFormError(""); load(); onOffers(); } catch { setFormError("Angebot konnte nicht angelegt werden. Bitte Eingaben prüfen."); } }
  async function saveSale() {
    const iso = saleEnd ? new Date(saleEnd).toISOString() : null;
    await axios.put(`${API}/admin/settings`, { sale_ends_at: iso }, { headers });
    setSaleSaved(iso ? `Sale-Timer aktiv bis ${new Date(iso).toLocaleString("de-DE")}` : "Sale-Timer deaktiviert");
  }
  async function completeOrder(o) { await axios.post(`${API}/admin/orders/${o.paypal_id}/complete`, {}, { headers }); load(); }
  async function removeOrder(o) { await axios.delete(`${API}/admin/orders/${o.paypal_id}`, { headers }); load(); }
  const openOrders = orders.filter((o) => !o.done);
  const doneOrders = orders.filter((o) => o.done);

  const [deliveryOrder, setDeliveryOrder] = useState("");
  const [deliveryFiles, setDeliveryFiles] = useState([]);
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [deliveryBusy, setDeliveryBusy] = useState(false);
  const [deliveryDone, setDeliveryDone] = useState("");
  const selectedOrder = orders.find((o) => o.paypal_id === deliveryOrder);

  async function uploadDeliveryFile(e) {
    const f = e.target.files?.[0]; if (!f) return;
    setDeliveryBusy(true);
    try {
      const fd = new FormData(); fd.append("file", f);
      const r = await axios.post(`${API}/admin/upload`, fd, { headers });
      setDeliveryFiles((prev) => [...prev, { path: r.data.url.replace("/api/files/", ""), name: f.name }]);
    } catch { setFormError("Upload fehlgeschlagen."); } finally { setDeliveryBusy(false); e.target.value = ""; }
  }
  async function sendDelivery() {
    if (!selectedOrder || deliveryFiles.length === 0) return;
    setDeliveryBusy(true);
    try {
      await axios.post(`${API}/admin/deliver`, { order_id: selectedOrder.paypal_id, files: deliveryFiles.map((f) => f.path), message: deliveryMessage }, { headers });
      setDeliveryDone(`Versendet an ${selectedOrder.customer?.email} – Auftrag wurde als erledigt markiert.`);
      setDeliveryOrder(""); setDeliveryFiles([]); setDeliveryMessage(""); load();
    } catch (err) { setFormError(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Versand fehlgeschlagen."); } finally { setDeliveryBusy(false); }
  }

  function orderRow(o, isDone) {
    return <div className="order-row" key={o.paypal_id} data-testid={`order-row-${o.paypal_id}`}>
      <div className="order-main">
        <strong>{(o.items || []).map((i) => i.name).join(" + ") || o.offer_name || o.offer_id}</strong>
        <span>{o.customer?.name} · {o.customer?.email}</span>
        {o.customer?.notes && <em>„{o.customer.notes}“</em>}
      </div>
      <div className="order-side">
        {(o.total ?? o.price) != null && <b className="order-price">{fmt(o.total ?? o.price)}</b>}
        <span className={`status-badge ${o.status === "COMPLETED" ? "ok" : "pending"}`} data-testid={`order-status-${o.paypal_id}`}>{o.status === "COMPLETED" ? "BEZAHLT" : "OFFEN"}</span>
        <small>{o.created_at ? new Date(o.created_at).toLocaleString("de-DE") : ""}</small>
        <div className="row-actions">
          {!isDone && <button className="complete-button" title="Als erledigt markieren" onClick={() => completeOrder(o)} data-testid={`order-complete-${o.paypal_id}`}><Check size={15}/></button>}
          <button className="delete-button" title="Bestellung entfernen" onClick={() => removeOrder(o)} data-testid={`order-delete-${o.paypal_id}`}><Trash2 size={15}/></button>
        </div>
      </div>
    </div>;
  }

  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
    <motion.div className="admin-modal" data-testid="admin-panel" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease }}>
      <div className="admin-top"><div><div className="modal-kicker">BLACKSOLID / CONTROL ROOM</div><h2>Command <em>station.</em></h2></div><button className="modal-close" onClick={onClose} data-testid="admin-close"><X/></button></div>
      <div className="admin-tabs">
        <button className={tab === "offers" ? "admin-tab active" : "admin-tab"} onClick={() => setTab("offers")} data-testid="admin-tab-offers">Angebote</button>
        <button className={tab === "orders" ? "admin-tab active" : "admin-tab"} onClick={() => setTab("orders")} data-testid="admin-tab-orders">Bestellungen {openOrders.length > 0 && <span className="tab-count">{openOrders.length}</span>}</button>
        <button className={tab === "done" ? "admin-tab active" : "admin-tab"} onClick={() => setTab("done")} data-testid="admin-tab-done">Erledigt {doneOrders.length > 0 && <span className="tab-count done-count">{doneOrders.length}</span>}</button>
        <button className={tab === "delivery" ? "admin-tab active" : "admin-tab"} onClick={() => setTab("delivery")} data-testid="admin-tab-delivery">Versand</button>
        <button className={tab === "sale" ? "admin-tab active" : "admin-tab"} onClick={() => setTab("sale")} data-testid="admin-tab-sale"><Timer size={12}/> Sale-Timer</button>
      </div>

      {tab === "offers" && <>
        <p className="modal-intro">Lege neue Angebote an, bearbeite Preise, Rabatte und Badges oder lösche, was du nicht mehr brauchst.</p>
        {formError && <div className="form-error" data-testid="admin-form-error">{formError}</div>}
        {!creating && <button className="primary-button new-offer-btn" onClick={() => setCreating(true)} data-testid="new-offer-button"><Plus size={15}/> Neues Angebot</button>}
        {creating && <form className="admin-create" onSubmit={create} data-testid="create-offer-form">
          <input required placeholder="Name" value={draft.name} onChange={e => setDraft({...draft, name: e.target.value})} data-testid="create-offer-name"/>
          <textarea required placeholder="Beschreibung" value={draft.description} onChange={e => setDraft({...draft, description: e.target.value})} data-testid="create-offer-description"/>
          <div className="edit-row">
            <input required type="number" min="0.01" step="0.01" placeholder="Preis in EUR" value={draft.price} disabled={draft.price === 0} onChange={e => setDraft({...draft, price: e.target.value})} data-testid="create-offer-price"/>
            <select value={draft.category} onChange={e => setDraft({...draft, category: e.target.value})} data-testid="create-offer-category">
              <option value="OVERLAYS">OVERLAYS</option><option value="BRANDING">BRANDING</option><option value="MUSIC">MUSIC</option>
            </select>
          </div>
          <label className="check-row"><input type="checkbox" checked={draft.price === 0} onChange={e => setDraft({...draft, price: e.target.checked ? 0 : ""})} data-testid="create-offer-free"/> Kostenlos anbieten – kein PayPal, du lieferst per E-Mail</label>
          <div className="edit-row">
            <input type="number" min="0" max="90" placeholder="Rabatt in % (0 = keiner)" value={draft.discount} onChange={e => setDraft({...draft, discount: e.target.value})} data-testid="create-offer-discount"/>
            <BadgeSelect value={draft.badge} onChange={(b) => setDraft({...draft, badge: b})} testid="create-offer-badge"/>
          </div>
          <input placeholder="Bild-URL oder unten hochladen" value={draft.image} onChange={e => setDraft({...draft, image: e.target.value})} data-testid="create-offer-image"/>
          <ImageUpload token={token} value={draft.image} onChange={(url) => setDraft({...draft, image: url})} testid="create-offer-upload"/>
          <label className="check-row"><input type="checkbox" checked={draft.featured} onChange={e => setDraft({...draft, featured: e.target.checked})} data-testid="create-offer-featured"/> Als Featured hervorheben</label>
          <div className="edit-row">
            <button type="submit" className="primary-button" data-testid="create-offer-submit">Angebot anlegen</button>
            <button type="button" className="ghost-button" onClick={() => setCreating(false)} data-testid="create-offer-cancel">Abbrechen</button>
          </div>
        </form>}
        <div className="admin-list">{items.map(item => editing?.id === item.id ?
          <div className="admin-edit" key={item.id}>
            <input value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} data-testid={`edit-name-${item.id}`}/>
            <textarea value={editing.description} onChange={e => setEditing({...editing, description: e.target.value})} data-testid={`edit-description-${item.id}`}/>
            <div className="edit-row">
              <input type="number" min="0.01" step="0.01" value={editing.price} disabled={Number(editing.price) === 0} onChange={e => setEditing({...editing, price: Number(e.target.value)})} data-testid={`edit-price-${item.id}`}/>
              <input type="number" min="0" max="90" placeholder="Rabatt %" value={editing.discount} onChange={e => setEditing({...editing, discount: Number(e.target.value)})} data-testid={`edit-discount-${item.id}`}/>
              <BadgeSelect value={editing.badge} onChange={(b) => setEditing({...editing, badge: b})} testid={`edit-badge-${item.id}`}/>
            </div>
            <label className="check-row"><input type="checkbox" checked={Number(editing.price) === 0} onChange={e => setEditing({...editing, price: e.target.checked ? 0 : (item.price || 1)})} data-testid={`edit-free-${item.id}`}/> Kostenlos anbieten – kein PayPal, Lieferung per E-Mail</label>
            <ImageUpload token={token} value={editing.image} onChange={(url) => setEditing({...editing, image: url})} testid={`edit-upload-${item.id}`}/>
            <div className="edit-row"><button className="primary-button" onClick={() => save(editing)} data-testid={`save-offer-${item.id}`}>Speichern</button><button className="ghost-button" onClick={() => setEditing(null)} data-testid={`cancel-edit-${item.id}`}>Abbrechen</button></div>
          </div> :
          <div className="admin-row" key={item.id} data-testid={`admin-offer-${item.id}`}>
            <div><span className="category-tag">{item.category}</span>{item.badge && <span className={`badge-tag inline badge-${item.badge.toLowerCase()}`}>{item.badge}</span>}<h3>{item.name}</h3></div>
            <div className="admin-price"><strong>{fmt(finalPrice(item))}</strong>{(item.discount || 0) > 0 && <small>-{item.discount}%</small>}</div>
            <div className="row-actions">
              <button onClick={() => setEditing(item)} data-testid={`edit-offer-${item.id}`}><Pencil size={16}/></button>
              <button className="delete-button" onClick={() => remove(item)} data-testid={`delete-offer-${item.id}`}><Trash2 size={16}/></button>
            </div>
          </div>)}
        </div>
      </>}

      {tab === "orders" && <>
        <p className="modal-intro">Alle offenen Käufe mit Kundendaten und Zahlungsstatus. Erledigte Aufträge wandern in den Tab „Erledigt".</p>
        <div className="admin-list" data-testid="orders-list">
          {openOrders.length === 0 && <p className="orders-empty" data-testid="orders-empty">Keine offenen Bestellungen.</p>}
          {openOrders.map((o) => orderRow(o, false))}
        </div>
      </>}

      {tab === "done" && <>
        <p className="modal-intro">Abgeschlossene Aufträge – hier landet alles, was du als erledigt markiert hast.</p>
        <div className="admin-list" data-testid="done-orders-list">
          {doneOrders.length === 0 && <p className="orders-empty" data-testid="done-orders-empty">Noch keine erledigten Bestellungen.</p>}
          {doneOrders.map((o) => orderRow(o, true))}
        </div>
      </>}

      {tab === "delivery" && <>
        <p className="modal-intro">Wähl eine Bestellung – die E-Mail des Kunden wird automatisch übernommen. Häng die fertigen Dateien an und sende sie direkt raus.</p>
        {formError && <div className="form-error" data-testid="admin-form-error">{formError}</div>}
        <div className="sale-form delivery-form">
          <label>Bestellung auswählen
            <select value={deliveryOrder} onChange={(e) => { setDeliveryOrder(e.target.value); setDeliveryDone(""); setFormError(""); }} data-testid="delivery-order-select">
              <option value="">– Bestellung wählen –</option>
              {orders.map((o) => <option key={o.paypal_id} value={o.paypal_id}>{(o.items || []).map((i) => i.name).join(" + ") || o.offer_name || o.offer_id} · {o.customer?.name} · {o.status === "COMPLETED" ? "bezahlt" : "offen"}{o.done ? " · erledigt" : ""}</option>)}
            </select>
          </label>
          {selectedOrder && <>
            <label>An (Kunden-E-Mail)<input readOnly value={selectedOrder.customer?.email || ""} data-testid="delivery-email-input"/></label>
            <label>Nachricht <span>(optional)</span><textarea value={deliveryMessage} onChange={(e) => setDeliveryMessage(e.target.value)} placeholder="Kurze Notiz an den Kunden..." data-testid="delivery-message-input"/></label>
            <div className="upload-row">
              <label className="ghost-button upload-btn">{deliveryBusy ? "Lädt hoch..." : "Datei anhängen"}<input type="file" hidden onChange={uploadDeliveryFile} data-testid="delivery-file-input"/></label>
            </div>
            {deliveryFiles.length > 0 && <div className="delivery-files" data-testid="delivery-file-list">
              {deliveryFiles.map((f) => <div className="delivery-file" key={f.path}><span>{f.name}</span><button onClick={() => setDeliveryFiles(deliveryFiles.filter((x) => x.path !== f.path))} data-testid={`delivery-file-remove-${f.name}`}><X size={13}/></button></div>)}
            </div>}
            <button className="primary-button" disabled={deliveryBusy || deliveryFiles.length === 0} onClick={sendDelivery} data-testid="delivery-send-button">Jetzt an den Kunden senden</button>
            {deliveryDone && <p className="sale-ok" data-testid="delivery-success">{deliveryDone}</p>}
          </>}
        </div>
      </>}

      {tab === "sale" && <>
        <p className="modal-intro">Lege fest, wann dein Sale endet. Solange der Timer läuft, sehen Besucher den Countdown oben in der Leiste.</p>
        <div className="sale-form">
          <label>Sale endet am<input type="datetime-local" value={saleEnd} onChange={(e) => setSaleEnd(e.target.value)} data-testid="sale-end-input"/></label>
          <div className="edit-row">
            <button className="primary-button" onClick={saveSale} data-testid="save-sale-button">Timer speichern</button>
            <button className="ghost-button" onClick={() => { setSaleEnd(""); }} data-testid="clear-sale-button">Zurücksetzen</button>
          </div>
          {saleSaved && <p className="sale-ok" data-testid="sale-saved">{saleSaved}</p>}
          <p className="sale-hint">Tipp: Leer speichern schaltet den Timer aus. Rabatte legst du pro Angebot im Tab „Angebote" fest.</p>
        </div>
      </>}
    </motion.div>
  </motion.div>;
}

export default App;

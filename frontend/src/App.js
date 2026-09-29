import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Lenis from "lenis";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight, Check, ChevronRight, CreditCard, Headphones, LayoutTemplate, LockKeyhole, Menu, Pencil, Plus, Radio, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import "@/App.css";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const icons = { OVERLAYS: LayoutTemplate, BRANDING: Sparkles, MUSIC: Headphones };
const categories = ["ALL", "OVERLAYS", "BRANDING", "MUSIC"];

const ease = [0.22, 1, 0.36, 1];
const rise = { hidden: { opacity: 0, y: 48 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, ease } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };

function Clock() {
  const [time, setTime] = useState("");
  useEffect(() => { const tick = () => setTime(new Date().toLocaleTimeString("de-DE", { hour12: false })); tick(); const id = setInterval(tick, 1000); return () => clearInterval(id); }, []);
  return <span className="hud-clock" data-testid="hud-clock">{time}</span>;
}

function App() {
  const [offers, setOffers] = useState([]); const [filter, setFilter] = useState("ALL"); const [selected, setSelected] = useState(null);
  const [admin, setAdmin] = useState(false); const [loginOpen, setLoginOpen] = useState(false); const [mobileOpen, setMobileOpen] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("overlay_admin_token"));
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.25, smoothWheel: true, anchors: true });
    let raf;
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);

  useEffect(() => { loadOffers(); const orderId = new URLSearchParams(window.location.search).get("token"); if (orderId) capture(orderId); }, []);
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("session_id=")) {
      const sid = hash.split("session_id=")[1].split("&")[0];
      axios.post(`${API}/auth/google-session`, { session_id: sid }, { withCredentials: true })
        .then((r) => { localStorage.setItem("overlay_admin_token", r.data.token); setToken(r.data.token); setAdmin(true); setNotice(`Willkommen zurück, ${r.data.name || "Admin"}.`); })
        .catch(() => setNotice("Google-Anmeldung fehlgeschlagen oder kein Admin-Konto."))
        .finally(() => window.history.replaceState({}, "", window.location.pathname));
      return;
    }
    if (!localStorage.getItem("overlay_admin_token")) {
      axios.get(`${API}/auth/me`, { withCredentials: true })
        .then((r) => { localStorage.setItem("overlay_admin_token", r.data.token); setToken(r.data.token); })
        .catch(() => {});
    }
  }, []);
  async function loadOffers() { try { setOffers((await axios.get(`${API}/offers`)).data); } catch { setNotice("Der Shop konnte gerade nicht geladen werden."); } }
  async function capture(orderId) { try { await axios.post(`${API}/paypal/capture/${orderId}`); setNotice("Zahlung erfolgreich bestätigt. Wir melden uns gleich bei dir."); window.history.replaceState({}, "", "/"); } catch { setNotice("Die Zahlung wird noch geprüft. Bitte bewahre deine PayPal-Bestätigung auf."); } }

  const visible = offers.filter((item) => filter === "ALL" || item.category === filter);

  return <div className="site-shell">
    <div className="noise-layer"/>
    <nav className="nav" data-testid="main-navigation">
      <a className="brand" href="#top" data-testid="brand-home"><span className="brand-mark">BS</span><span className="brand-word">BLACKSOLID<small>CREATIVE SUPPLY</small></span></a>
      <div className={mobileOpen ? "nav-links mobile-open" : "nav-links"}>
        <span className="hud-status"><span className="rec-dot"/>REC <Clock/></span>
        <a href="#services" onClick={() => setMobileOpen(false)} data-testid="services-link">Services</a>
        <a href="#process" onClick={() => setMobileOpen(false)} data-testid="process-link">Workflow</a>
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
        <motion.div className="offer-grid" data-testid="offer-grid" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
          {visible.map((offer) => <OfferCard key={offer.id} offer={offer} onSelect={setSelected}/>)}
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

    {selected && <Checkout offer={selected} onClose={() => setSelected(null)} onNotice={setNotice}/>}
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

function OfferCard({ offer, onSelect }) {
  const Icon = icons[offer.category] || Sparkles;
  return <motion.article className="offer-card" variants={rise} data-testid={`offer-card-${offer.id}`} whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}>
    <div className="card-image"><img src={offer.image} alt={offer.name}/><span className="category-tag"><Icon size={13}/>{offer.category}</span>{offer.featured && <span className="featured-tag">FEATURED</span>}</div>
    <div className="card-body"><div><h3 data-testid={`offer-name-${offer.id}`}>{offer.name}</h3><p data-testid={`offer-description-${offer.id}`}>{offer.description}</p></div>
    <div className="card-bottom"><strong data-testid={`offer-price-${offer.id}`}>€{offer.price.toFixed(2).replace(".00", "")}</strong><button className="card-button" onClick={() => onSelect(offer)} data-testid={`offer-buy-${offer.id}`}>Start a project <ChevronRight size={16}/></button></div></div>
  </motion.article>;
}

function Step({ number, title, text }) { return <motion.div className="step" variants={rise} data-testid={`workflow-step-${number}`}><span>{number}</span><h3>{title}</h3><p>{text}</p></motion.div>; }

function Checkout({ offer, onClose, onNotice }) {
  const [form, setForm] = useState({ name: "", email: "", notes: "" }); const [loading, setLoading] = useState(false);
  async function submit(e) { e.preventDefault(); setLoading(true); try { const result = await axios.post(`${API}/paypal/create-order`, { offer_id: offer.id, ...form }); window.location.href = result.data.approval_url; } catch { onNotice("PayPal konnte die Bestellung nicht starten. Bitte prüfe deine Eingaben."); setLoading(false); } }
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
    <motion.div className="checkout-modal" data-testid="checkout-modal" initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45, ease }}>
      <button className="modal-close" onClick={onClose} data-testid="checkout-close"><X/></button>
      <div className="modal-kicker">READY WHEN YOU ARE / 03</div>
      <h2>Let’s make it <em>real.</em></h2>
      <p className="modal-intro">Deine Auswahl: <b>{offer.name}</b> · €{offer.price.toFixed(2).replace(".00", "")}</p>
      <form onSubmit={submit}>
        <label>Name<input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Dein Name" data-testid="customer-name-input"/></label>
        <label>E-Mail<input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@creator.com" data-testid="customer-email-input"/></label>
        <label>Brief / Notiz <span>(optional)</span><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Erzähl uns kurz von deinem Kanal..." data-testid="customer-notes-input"/></label>
        <button className="primary-button full" disabled={loading} data-testid="paypal-submit-button"><CreditCard size={17}/>{loading ? "Weiterleitung..." : "Mit PayPal bezahlen"}</button>
        <small className="secure-note"><ShieldCheck size={14}/> Du wirst sicher zu PayPal weitergeleitet. Zahlung in EUR.</small>
      </form>
    </motion.div>
  </motion.div>;
}

function Login({ onClose, onSuccess }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState("");
  async function submit(e) { e.preventDefault(); try { const result = await axios.post(`${API}/auth/login`, { email, password }); localStorage.setItem("overlay_admin_token", result.data.token); onSuccess(result.data.token); } catch { setError("Zugangsdaten nicht erkannt."); } }
  function googleLogin() {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  }
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
    <motion.div className="login-modal" data-testid="admin-login-modal" initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45, ease }}>
      <button className="modal-close" onClick={onClose} data-testid="admin-login-close"><X/></button>
      <div className="login-icon"><LockKeyhole/></div>
      <div className="modal-kicker">RESTRICTED AREA</div>
      <h2>Control <em>Room.</em></h2>
      <p>Verwalte deine Angebote, Preise und Bestellungen.</p>
      <button type="button" className="google-button" onClick={googleLogin} data-testid="google-login-button">
        <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
        Mit Google anmelden
      </button>
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

const emptyDraft = { name: "", description: "", price: "", category: "OVERLAYS", image: "", featured: false };

function Admin({ token, onClose, onOffers }) {
  const [tab, setTab] = useState("offers");
  const [items, setItems] = useState([]); const [orders, setOrders] = useState([]);
  const [editing, setEditing] = useState(null); const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const headers = { Authorization: `Bearer ${token}` };

  async function load() {
    setItems((await axios.get(`${API}/admin/offers`, { headers })).data);
    setOrders((await axios.get(`${API}/admin/orders`, { headers })).data);
  }
  useEffect(() => { load().catch(() => {}); }, [token]);

  async function save(item) { await axios.put(`${API}/admin/offers/${item.id}`, item, { headers }); setEditing(null); load(); onOffers(); }
  async function remove(item) { await axios.delete(`${API}/admin/offers/${item.id}`, { headers }); load(); onOffers(); }
  async function create(e) { e.preventDefault(); await axios.post(`${API}/admin/offers`, { ...draft, price: Number(draft.price) || 0, active: true }, { headers }); setCreating(false); setDraft(emptyDraft); load(); onOffers(); }

  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
    <motion.div className="admin-modal" data-testid="admin-panel" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease }}>
      <div className="admin-top"><div><div className="modal-kicker">BLACKSOLID / CONTROL ROOM</div><h2>Command <em>station.</em></h2></div><button className="modal-close" onClick={onClose} data-testid="admin-close"><X/></button></div>
      <div className="admin-tabs">
        <button className={tab === "offers" ? "admin-tab active" : "admin-tab"} onClick={() => setTab("offers")} data-testid="admin-tab-offers">Angebote</button>
        <button className={tab === "orders" ? "admin-tab active" : "admin-tab"} onClick={() => setTab("orders")} data-testid="admin-tab-orders">Bestellungen {orders.length > 0 && <span className="tab-count">{orders.length}</span>}</button>
      </div>

      {tab === "offers" ? <>
        <p className="modal-intro">Lege neue Angebote an, bearbeite Preise oder lösche, was du nicht mehr brauchst.</p>
        {!creating && <button className="primary-button new-offer-btn" onClick={() => setCreating(true)} data-testid="new-offer-button"><Plus size={15}/> Neues Angebot</button>}
        {creating && <form className="admin-create" onSubmit={create} data-testid="create-offer-form">
          <input required placeholder="Name" value={draft.name} onChange={e => setDraft({...draft, name: e.target.value})} data-testid="create-offer-name"/>
          <textarea required placeholder="Beschreibung" value={draft.description} onChange={e => setDraft({...draft, description: e.target.value})} data-testid="create-offer-description"/>
          <div className="edit-row">
            <input required type="number" min="0" step="0.01" placeholder="Preis in EUR" value={draft.price} onChange={e => setDraft({...draft, price: e.target.value})} data-testid="create-offer-price"/>
            <select value={draft.category} onChange={e => setDraft({...draft, category: e.target.value})} data-testid="create-offer-category">
              <option value="OVERLAYS">OVERLAYS</option><option value="BRANDING">BRANDING</option><option value="MUSIC">MUSIC</option>
            </select>
          </div>
          <input required placeholder="Bild-URL (https://...)" value={draft.image} onChange={e => setDraft({...draft, image: e.target.value})} data-testid="create-offer-image"/>
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
            <div className="edit-row"><input type="number" value={editing.price} onChange={e => setEditing({...editing, price: Number(e.target.value)})} data-testid={`edit-price-${item.id}`}/><button className="primary-button" onClick={() => save(editing)} data-testid={`save-offer-${item.id}`}>Speichern</button><button className="ghost-button" onClick={() => setEditing(null)} data-testid={`cancel-edit-${item.id}`}>Abbrechen</button></div>
          </div> :
          <div className="admin-row" key={item.id} data-testid={`admin-offer-${item.id}`}>
            <div><span className="category-tag">{item.category}</span><h3>{item.name}</h3></div>
            <strong>€{item.price.toFixed(2).replace(".00", "")}</strong>
            <div className="row-actions">
              <button onClick={() => setEditing(item)} data-testid={`edit-offer-${item.id}`}><Pencil size={16}/></button>
              <button className="delete-button" onClick={() => remove(item)} data-testid={`delete-offer-${item.id}`}><Trash2 size={16}/></button>
            </div>
          </div>)}
        </div>
      </> : <>
        <p className="modal-intro">Alle eingegangenen Käufe mit Kundendaten und Zahlungsstatus.</p>
        <div className="admin-list" data-testid="orders-list">
          {orders.length === 0 && <p className="orders-empty" data-testid="orders-empty">Noch keine Bestellungen eingegangen.</p>}
          {orders.map(o => <div className="order-row" key={o.paypal_id} data-testid={`order-row-${o.paypal_id}`}>
            <div className="order-main">
              <strong>{o.offer_name || o.offer_id}</strong>
              <span>{o.customer?.name} · {o.customer?.email}</span>
              {o.customer?.notes && <em>„{o.customer.notes}“</em>}
            </div>
            <div className="order-side">
              {o.price != null && <b className="order-price">€{Number(o.price).toFixed(2).replace(".00", "")}</b>}
              <span className={`status-badge ${o.status === "COMPLETED" ? "ok" : "pending"}`} data-testid={`order-status-${o.paypal_id}`}>{o.status === "COMPLETED" ? "BEZAHLT" : "OFFEN"}</span>
              <small>{o.created_at ? new Date(o.created_at).toLocaleString("de-DE") : ""}</small>
            </div>
          </div>)}
        </div>
      </>}
    </motion.div>
  </motion.div>;
}

export default App;

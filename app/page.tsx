'use client'

import { FormEvent, useMemo, useState } from 'react'
import {
  ArrowRight,
  Bike,
  Check,
  ChevronDown,
  Clock3,
  LocateFixed,
  MapPin,
  Menu,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Utensils,
  X,
  Zap,
} from 'lucide-react'

type Role = 'customer' | 'vendor' | 'driver' | 'admin'

type Restaurant = {
  name: string
  cuisine: string
  rating: string
  eta: string
  image: string
  tag: string
}

const restaurants: Restaurant[] = [
  { name: 'The Green Table', cuisine: 'Healthy bowls · Salads', rating: '4.8', eta: '25–30 min', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85', tag: 'Healthy' },
  { name: 'Momo House', cuisine: 'Asian · Dumplings', rating: '4.7', eta: '20–25 min', image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=900&q=85', tag: 'Popular' },
  { name: 'Casa Napoli', cuisine: 'Italian · Pizza', rating: '4.9', eta: '30–35 min', image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=85', tag: 'Top rated' },
]

const menuItems = [
  { name: 'Basil Pesto Bowl', detail: 'Roasted vegetables, pesto, quinoa', price: 289, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=85' },
  { name: 'Smoky Paneer Wrap', detail: 'Charred paneer, pickled onion, mint', price: 249, image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=500&q=85' },
]

const roleCopy: Record<Role, { title: string; description: string; icon: typeof Bike }> = {
  customer: { title: 'Customer view', description: 'Discover, order, and track every bite.', icon: ShoppingBag },
  vendor: { title: 'Vendor console', description: 'Keep your kitchen moving.', icon: Store },
  driver: { title: 'Driver cockpit', description: 'Every delivery, right on route.', icon: Bike },
  admin: { title: 'Admin command center', description: 'One clear view of your entire network.', icon: ShieldCheck },
}

export default function Page() {
  const [role, setRole] = useState<Role>('customer')
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [cart, setCart] = useState<number[]>([])
  const [showRoleMenu, setShowRoleMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [transactionRef, setTransactionRef] = useState('')
  const [payerUpiId, setPayerUpiId] = useState('')
  const [paymentSubmitted, setPaymentSubmitted] = useState(false)
  const [paymentRecords, setPaymentRecords] = useState<Array<{ ref: string; upiId: string; amount: number }>>([])

  const cartTotal = useMemo(() => cart.reduce((sum, index) => sum + menuItems[index].price, 0), [cart])
  const RoleIcon = roleCopy[role].icon
  const upiLink = `upi://pay?pa=drop@upi&pn=drop%20Food%20Delivery&am=${cartTotal}&cu=INR&tn=Order%20DRP-2481`

  function addToCart(index: number) {
    setCart((current) => [...current, index])
  }

  function submitPaymentReference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!transactionRef.trim() || !payerUpiId.trim()) return
    setPaymentRecords((records) => [...records, { ref: transactionRef.trim(), upiId: payerUpiId.trim(), amount: cartTotal }])
    setPaymentSubmitted(true)
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f8f8f6] text-[#18201c]">
      <nav className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 lg:px-8">
        <a href="#top" className="flex items-center gap-2.5" aria-label="drop home">
          <span className="grid size-9 place-items-center rounded-[12px] bg-[#d9f447] text-[#18201c] shadow-[0_5px_20px_rgba(217,244,71,.3)]"><Zap className="size-5 fill-current" /></span>
          <span className="text-[21px] font-bold tracking-[-.06em]">drop<span className="text-[#869c18]">.</span></span>
        </a>
        <div className="hidden items-center gap-8 text-[13px] font-semibold text-[#67716c] md:flex">
          <a href="#restaurants" className="transition hover:text-[#18201c]">Explore</a>
          <a href="#how" className="transition hover:text-[#18201c]">How it works</a>
          <a href="#partners" className="transition hover:text-[#18201c]">Partner with us</a>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative hidden sm:block">
            <button onClick={() => setShowRoleMenu((current) => !current)} className="flex items-center gap-2 rounded-full border border-[#dfe4dc] bg-white px-4 py-2.5 text-[12px] font-bold shadow-sm">
              <RoleIcon className="size-4 text-[#849b19]" /> {roleCopy[role].title} <ChevronDown className="size-3.5 text-[#8f9993]" />
            </button>
            {showRoleMenu && <div className="absolute right-0 top-12 z-20 w-52 rounded-2xl border border-[#e2e6df] bg-white p-2 shadow-xl">
              {(Object.keys(roleCopy) as Role[]).map((item) => { const Icon = roleCopy[item].icon; return <button key={item} onClick={() => { setRole(item); setShowRoleMenu(false) }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold hover:bg-[#f3f7e8]"><Icon className="size-4 text-[#849b19]" />{roleCopy[item].title}</button> })}
            </div>}
          </div>
          <button className="hidden rounded-full bg-[#18201c] px-5 py-2.5 text-[12px] font-bold text-white transition hover:bg-[#303a34] sm:block">Sign in</button>
          <button onClick={() => setShowMobileMenu((current) => !current)} className="grid size-10 place-items-center rounded-full border border-[#dfe4dc] bg-white md:hidden" aria-label="Open menu">{showMobileMenu ? <X className="size-4" /> : <Menu className="size-4" />}</button>
        </div>
      </nav>
      {showMobileMenu && <div className="mx-5 rounded-2xl border border-[#e0e5db] bg-white p-4 md:hidden"><div className="flex flex-col gap-3 text-sm font-semibold"><a href="#restaurants">Explore restaurants</a><a href="#how">How it works</a><button className="rounded-full bg-[#18201c] px-4 py-3 text-white">Sign in</button></div></div>}

      <section id="top" className="mx-auto grid max-w-[1240px] gap-10 px-5 pb-16 pt-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-8 lg:pb-24 lg:pt-20">
        <div className="max-w-[560px]">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#dfe6bf] bg-[#f2f8db] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[.12em] text-[#617316]"><span className="size-1.5 rounded-full bg-[#a9c525]" /> Live in Bengaluru · 12,400+ drops today</div>
          <h1 className="max-w-[650px] text-[clamp(3.2rem,6.4vw,6.35rem)] font-bold leading-[.91] tracking-[-.085em]">Good food.<br /><span className="text-[#91aa19]">Good mood.</span><br />On its way.</h1>
          <p className="mt-7 max-w-[430px] text-[16px] leading-7 text-[#68736c]">The simplest way to get what you love, delivered fresh and fast — from your favourite local kitchens.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => document.getElementById('restaurants')?.scrollIntoView({ behavior: 'smooth' })} className="group flex items-center justify-center gap-3 rounded-full bg-[#d9f447] px-6 py-3.5 text-sm font-bold shadow-[0_10px_24px_rgba(160,186,36,.18)] transition hover:-translate-y-0.5">Start an order <ArrowRight className="size-4 transition group-hover:translate-x-1" /></button>
            <button className="flex items-center justify-center gap-2 rounded-full border border-[#dce2da] bg-white px-6 py-3.5 text-sm font-bold"><LocateFixed className="size-4 text-[#8fa71c]" /> Deliver to me</button>
          </div>
          <div className="mt-10 flex items-center gap-8 text-xs font-semibold text-[#78827c]"><span className="flex items-center gap-2"><Clock3 className="size-4 text-[#8fa71c]" /> Avg. 28 min</span><span className="flex items-center gap-2"><PackageCheck className="size-4 text-[#8fa71c]" /> Real-time tracking</span></div>
        </div>
        <div className="relative min-h-[440px] overflow-hidden rounded-[34px] bg-[#e1e9d3] lg:min-h-[570px]">
          <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'linear-gradient(28deg, transparent 48%, #c3d1ad 49%, #c3d1ad 51%, transparent 52%), linear-gradient(116deg, transparent 47%, #cbd7b9 48%, #cbd7b9 51%, transparent 52%), linear-gradient(78deg, transparent 48%, #d0dbbf 49%, #d0dbbf 50%, transparent 51%)', backgroundSize: '180px 160px, 220px 180px, 250px 190px' }} />
          <div className="absolute left-[14%] top-[18%] h-40 w-40 rounded-full border-[28px] border-[#d2dfc0] opacity-80" /><div className="absolute right-[9%] top-[29%] h-56 w-56 rounded-full border-[32px] border-[#d3dfc2] opacity-70" />
          <div className="absolute left-[26%] top-[28%] h-44 w-32 rotate-[28deg] border-l-[5px] border-t-[5px] border-[#849c38] opacity-80" /><div className="absolute left-[39%] top-[46%] h-32 w-40 rotate-[-18deg] border-b-[5px] border-r-[5px] border-[#849c38] opacity-80" />
          <div className="absolute left-[20%] top-[22%] rounded-full bg-white px-3 py-2 text-[10px] font-bold shadow-lg">The Green Table</div><div className="absolute right-[14%] top-[39%] rounded-full bg-white px-3 py-2 text-[10px] font-bold shadow-lg">Your drop is here</div>
          <div className="absolute left-[30%] top-[34%] grid size-10 place-items-center rounded-full border-4 border-white bg-[#18201c] text-white shadow-lg"><Store className="size-4" /></div><div className="absolute right-[23%] top-[48%] grid size-11 place-items-center rounded-full border-4 border-white bg-[#d9f447] text-[#18201c] shadow-lg"><Bike className="size-5" /></div>
          <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-2xl border border-white/70 bg-white/90 p-4 backdrop-blur-md"><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#89948d]">Live delivery</p><p className="mt-1 text-sm font-bold">Order #DRP-2481 <span className="ml-1 text-[#839d16]">· 8 min away</span></p></div><div className="grid size-9 place-items-center rounded-full bg-[#edf4d0]"><ArrowRight className="size-4 text-[#718b09]" /></div></div>
        </div>
      </section>

      <section id="restaurants" className="border-y border-[#e5e9e1] bg-white px-5 py-16 lg:px-8 lg:py-20"><div className="mx-auto max-w-[1240px]"><div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#94a622]">Made for you</p><h2 className="mt-2 text-3xl font-bold tracking-[-.06em] lg:text-4xl">What are you craving?</h2></div><div className="flex items-center gap-2 rounded-full border border-[#e1e6df] bg-[#f8f9f7] px-4 py-2.5 text-xs text-[#7a847e]"><Search className="size-4" /> Search 2,000+ restaurants</div></div><div className="grid gap-5 md:grid-cols-3">{restaurants.map((restaurant) => <button key={restaurant.name} onClick={() => setSelectedRestaurant(restaurant)} className="group text-left"><div className="relative overflow-hidden rounded-2xl"><img src={restaurant.image} alt={restaurant.name} className="h-52 w-full object-cover transition duration-500 group-hover:scale-105" /><span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-[#4d5d15]">{restaurant.tag}</span><span className="absolute bottom-3 right-3 rounded-full bg-[#18201c] px-3 py-1.5 text-[10px] font-bold text-white">{restaurant.eta}</span></div><div className="mt-4 flex items-start justify-between gap-3"><div><h3 className="font-bold tracking-[-.02em]">{restaurant.name}</h3><p className="mt-1 text-xs text-[#7a847e]">{restaurant.cuisine}</p></div><span className="flex items-center gap-1 rounded-full bg-[#f1f5e5] px-2.5 py-1 text-[11px] font-bold"><Star className="size-3 fill-[#9bb721] text-[#9bb721]" />{restaurant.rating}</span></div></button>)}</div></div></section>

      <section id="how" className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8 lg:py-24"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#94a622]">One smooth flow</p><h2 className="mt-2 max-w-[380px] text-4xl font-bold leading-[.95] tracking-[-.07em] lg:text-5xl">From kitchen to doorstep, in sync.</h2><p className="mt-5 max-w-[370px] text-sm leading-6 text-[#748078]">Every person in the journey sees the same live order — so nothing gets lost between "cooking" and "delivered."</p></div><div className="grid gap-3 sm:grid-cols-3">{[{ icon: Utensils, title: 'Choose', text: 'Browse local favourites and build your order.' }, { icon: Store, title: 'Prepared', text: 'The kitchen updates you when it is ready.' }, { icon: Bike, title: 'Delivered', text: 'Follow your driver right to your door.' }].map(({ icon: Icon, title, text }, index) => <div key={title} className="rounded-2xl border border-[#e1e6df] bg-white p-5"><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-[#f0f5d9] text-[#829c14]"><Icon className="size-5" /></span><span className="text-xs font-bold text-[#b1b9b2]">0{index + 1}</span></div><h3 className="mt-7 font-bold">{title}</h3><p className="mt-2 text-xs leading-5 text-[#78827c]">{text}</p></div>)}</div></div></section>

      <section id="partners" className="bg-[#18201c] px-5 py-12 text-white lg:px-8"><div className="mx-auto flex max-w-[1240px] flex-col justify-between gap-6 sm:flex-row sm:items-center"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#d9f447]">Built for every role</p><h2 className="mt-2 text-2xl font-bold tracking-[-.05em]">One platform. Four perspectives.</h2></div><div className="flex flex-wrap gap-2">{(Object.keys(roleCopy) as Role[]).map((item) => <button key={item} onClick={() => setRole(item)} className={`rounded-full border px-4 py-2 text-xs font-bold capitalize transition ${role === item ? 'border-[#d9f447] bg-[#d9f447] text-[#18201c]' : 'border-white/15 text-white/70 hover:border-white/40'}`}>{item}</button>)}</div></div></section>

      {role === 'admin' && <section className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8"><div className="rounded-[28px] border border-[#dfe6d9] bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#94a622]">Admin review queue</p><h2 className="mt-2 text-2xl font-bold tracking-[-.05em]">UPI payment references</h2><p className="mt-2 text-sm text-[#78827c]">Verify customer-submitted references before marking orders as paid.</p></div><span className="rounded-full bg-[#f1f5e5] px-3 py-1.5 text-xs font-bold text-[#617316]">{paymentRecords.length} pending</span></div>{paymentRecords.length > 0 ? <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-b border-[#e8ece5] text-xs text-[#89948d]"><tr><th className="pb-3 font-semibold">Order</th><th className="pb-3 font-semibold">Customer UPI ID</th><th className="pb-3 font-semibold">Transaction ref</th><th className="pb-3 text-right font-semibold">Amount</th></tr></thead><tbody>{paymentRecords.map((record, index) => <tr key={`${record.ref}-${index}`} className="border-b border-[#f0f2ed]"><td className="py-4 font-bold">#DRP-2481</td><td className="py-4 text-[#68736c]">{record.upiId}</td><td className="py-4 font-mono text-xs">{record.ref}</td><td className="py-4 text-right font-bold">₹{record.amount}</td></tr>)}</tbody></table></div> : <div className="mt-6 rounded-2xl bg-[#f8f9f7] p-6 text-center text-sm text-[#78827c]">No payment references submitted yet. They will appear here after checkout.</div>}</div></section>}

      {showCheckout && <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#18201c]/40 p-0 backdrop-blur-sm sm:items-center sm:p-5"><div className="w-full max-w-[520px] rounded-t-[28px] bg-white p-6 sm:rounded-[28px]"><div className="flex items-start justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#94a622]">Secure UPI checkout</p><h2 className="mt-1 text-2xl font-bold tracking-[-.05em]">Pay ₹{cartTotal} for your order</h2></div><button onClick={() => setShowCheckout(false)} className="grid size-9 place-items-center rounded-full bg-[#f1f4ef]" aria-label="Close checkout"><X className="size-4" /></button></div>{paymentSubmitted ? <div className="mt-7 rounded-2xl bg-[#f1f5e5] p-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-[#d9f447]"><Check className="size-5" /></span><div><h3 className="font-bold">Reference submitted</h3><p className="mt-1 text-xs leading-5 text-[#68736c]">The admin team will verify your payment and update the order status.</p></div></div><button onClick={() => setShowCheckout(false)} className="mt-5 w-full rounded-full bg-[#18201c] px-4 py-3 text-xs font-bold text-white">Continue tracking</button></div> : <><div className="mt-6 rounded-2xl border border-[#e1e6df] bg-[#f8f9f7] p-4"><p className="text-xs leading-5 text-[#68736c]">Tap below to open your installed UPI app. The amount and merchant details are pre-filled.</p><a href={upiLink} className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#d9f447] px-4 py-3 text-sm font-bold text-[#18201c]">Open UPI app <ArrowRight className="size-4" /></a><p className="mt-3 text-center text-[10px] text-[#89948d]">UPI ID: drop@upi · drop Food Delivery</p></div><form onSubmit={submitPaymentReference} className="mt-5 flex flex-col gap-4"><div><label htmlFor="upi-id" className="text-xs font-bold">Your UPI ID</label><input id="upi-id" value={payerUpiId} onChange={(event) => setPayerUpiId(event.target.value)} placeholder="name@bank" required className="mt-2 w-full rounded-xl border border-[#dfe5dc] bg-white px-4 py-3 text-sm outline-none focus:border-[#a8bd29]" /></div><div><label htmlFor="transaction-ref" className="text-xs font-bold">Transaction reference number</label><input id="transaction-ref" value={transactionRef} onChange={(event) => setTransactionRef(event.target.value)} placeholder="Enter the 12-digit UTR / reference" required className="mt-2 w-full rounded-xl border border-[#dfe5dc] bg-white px-4 py-3 text-sm outline-none focus:border-[#a8bd29]" /></div><button type="submit" className="w-full rounded-full bg-[#18201c] px-4 py-3 text-sm font-bold text-white">Submit payment reference</button></form></>}</div></div>}

      {selectedRestaurant && <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#18201c]/40 p-0 backdrop-blur-sm sm:items-center sm:p-5"><div className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-t-[28px] bg-white p-6 sm:rounded-[28px]"><div className="flex items-start justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#94a622]">{selectedRestaurant.cuisine}</p><h2 className="mt-1 text-2xl font-bold tracking-[-.05em]">{selectedRestaurant.name}</h2><p className="mt-1 text-xs text-[#7c867f]">{selectedRestaurant.eta} · {selectedRestaurant.rating} rating</p></div><button onClick={() => setSelectedRestaurant(null)} className="grid size-9 place-items-center rounded-full bg-[#f1f4ef]" aria-label="Close menu"><X className="size-4" /></button></div><div className="mt-6 flex flex-col gap-3">{menuItems.map((item, index) => <div key={item.name} className="flex items-center gap-3 rounded-2xl border border-[#e6ebe3] p-3"><img src={item.image} alt="" className="size-16 rounded-xl object-cover" /><div className="min-w-0 flex-1"><h3 className="text-sm font-bold">{item.name}</h3><p className="mt-1 truncate text-xs text-[#7a847e]">{item.detail}</p><p className="mt-2 text-sm font-bold">₹{item.price}</p></div><button onClick={() => addToCart(index)} className="grid size-9 place-items-center rounded-full bg-[#d9f447]" aria-label={`Add ${item.name}`}><Plus className="size-4" /></button></div>)}</div>{cart.length > 0 && <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#18201c] p-4 text-white"><div><p className="text-xs text-white/60">{cart.length} item{cart.length > 1 ? 's' : ''} in cart</p><p className="mt-1 text-sm font-bold">₹{cartTotal}</p></div><button onClick={() => { setSelectedRestaurant(null); setShowCheckout(true) }} className="flex items-center gap-2 rounded-full bg-[#d9f447] px-4 py-2.5 text-xs font-bold text-[#18201c]">View cart <ArrowRight className="size-3.5" /></button></div>}</div></div>}

      <footer className="mx-auto flex max-w-[1240px] flex-col justify-between gap-4 px-5 py-7 text-xs text-[#8a948c] sm:flex-row lg:px-8"><span>© 2026 drop. Built to move good things.</span><span className="flex gap-5"><a href="#top">Privacy</a><a href="#top">Terms</a><a href="#top">Support</a></span></footer>
    </main>
  )
}

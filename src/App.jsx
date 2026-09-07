import { useEffect, useMemo, useState } from 'react'

import {
  Search,
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  Pencil,
  Settings,
  MessageCircle,
  ChevronRight,
  PackagePlus,
  LogOut,
  Save,
  ImagePlus,
} from 'lucide-react'

import {
  FaFacebookF,
  FaInstagram,
  FaWhatsapp,
} from 'react-icons/fa'

import { supabase } from './lib/supabase'
import './App.css'

const DEFAULT_SITE = {
  business_name: 'Ventitas Chiquitas Cucui',
  subtitle: 'Cositas bonitas para consentirte',
  hero_image_url: null,
  logo_url: null,
  whatsapp_number: '529221397398',
  whatsapp_group_url:
    'https://chat.whatsapp.com/LCwmE515ecPBK0yrnW70r7',
  facebook_url:
    'https://www.facebook.com/share/1GhovSMvyk/',
  instagram_url:
    'https://www.instagram.com/ventitas_chiquitas_cucui?stkn=bTQ4OGozbHY4M3J4',
}

const EMPTY_PRODUCT = {
  name: '',
  price: '',
  image_url: '',
  short_description: '',
  full_description: '',
  category: 'Cosméticos',
  label: '',
  available: true,
}

function App() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([
    'Todos',
    'Ofertas',
  ])
  const [siteConfig, setSiteConfig] = useState(DEFAULT_SITE)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] =
    useState('Todos')

  const [selectedProduct, setSelectedProduct] =
    useState(null)

  const [modalQuantity, setModalQuantity] =
    useState(1)

  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('cucui-cart')

    if (!saved) return []

    try {
      return JSON.parse(saved)
    } catch {
      return []
    }
  })

  const [cartOpen, setCartOpen] = useState(false)

  const [session, setSession] = useState(null)
  const [adminLoginOpen, setAdminLoginOpen] =
    useState(false)

  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] =
    useState('')

  const [adminError, setAdminError] =
    useState('')

  const [productEditorOpen, setProductEditorOpen] =
    useState(false)

  const [editingProduct, setEditingProduct] =
    useState(null)

  const [productForm, setProductForm] =
    useState(EMPTY_PRODUCT)

  const [confirmDelete, setConfirmDelete] =
    useState(null)

  const [savingProduct, setSavingProduct] =
    useState(false)

  const adminMode = Boolean(session)

  useEffect(() => {
    initializeApp()
  }, [])

  useEffect(() => {
    localStorage.setItem(
      'cucui-cart',
      JSON.stringify(cart),
    )
  }, [cart])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession)
      },
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== 'Escape') return

      setSelectedProduct(null)
      setCartOpen(false)
      setAdminLoginOpen(false)
      setProductEditorOpen(false)
      setConfirmDelete(null)
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener(
        'keydown',
        handleEscape,
      )
    }
  }, [])

  async function initializeApp() {
    setLoading(true)
    setLoadError('')

    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()

      setSession(currentSession)

      await Promise.all([
        loadProducts(),
        loadCategories(),
        loadSiteConfig(),
      ])
    } catch (error) {
      console.error(error)

      setLoadError(
        'No se pudo cargar el catálogo. Revisa la conexión con Supabase.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', {
        ascending: false,
      })

    if (error) {
      throw error
    }

    setProducts(data || [])
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', {
        ascending: true,
      })

    if (error) {
      throw error
    }

    const categoryNames = (data || []).map(
      (item) => item.name,
    )

    setCategories([
      'Todos',
      ...categoryNames,
      'Ofertas',
    ])
  }

  async function loadSiteConfig() {
    const { data, error } = await supabase
      .from('site_config')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (data) {
      setSiteConfig({
        ...DEFAULT_SITE,
        ...data,
      })
    }
  }

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase()

    return products.filter((product) => {
      let categoryMatches = false

      if (selectedCategory === 'Todos') {
        categoryMatches = true
      } else if (selectedCategory === 'Ofertas') {
        categoryMatches =
          product.label === 'OFERTA'
      } else {
        categoryMatches =
          product.category === selectedCategory
      }

      const searchableText = [
        product.name,
        product.category,
        product.short_description,
        product.full_description,
        product.label,
      ]
        .join(' ')
        .toLowerCase()

      const searchMatches =
        !normalizedSearch ||
        searchableText.includes(normalizedSearch)

      return categoryMatches && searchMatches
    })
  }, [products, search, selectedCategory])

  const cartUnits = cart.reduce(
    (total, item) => total + item.quantity,
    0,
  )

  const cartTotal = cart.reduce(
    (total, item) =>
      total + Number(item.price) * item.quantity,
    0,
  )

  function getProductImage(product) {
    return (
      product.image_url ||
      '/logo-cucui.jpg'
    )
  }

  function scrollToCatalog() {
    document
      .getElementById('catalogo')
      ?.scrollIntoView({
        behavior: 'smooth',
      })
  }

  function openWhatsappQuestion() {
    const message = encodeURIComponent(
      'Hola, tengo una pregunta sobre sus productos.',
    )

    window.open(
      `https://wa.me/${siteConfig.whatsapp_number}?text=${message}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  function openProduct(product) {
    setSelectedProduct(product)
    setModalQuantity(1)
  }

  function addToCart(product, quantity = 1) {
    if (!product.available) return

    setCart((current) => {
      const existing = current.find(
        (item) => item.id === product.id,
      )

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity:
                  item.quantity + quantity,
              }
            : item,
        )
      }

      return [
        ...current,
        {
          ...product,
          quantity,
        },
      ]
    })

    setSelectedProduct(null)
    setCartOpen(true)
  }

  function changeCartQuantity(id, amount) {
    setCart((current) =>
      current
        .map((item) => {
          if (item.id !== id) return item

          return {
            ...item,
            quantity:
              item.quantity + amount,
          }
        })
        .filter(
          (item) => item.quantity > 0,
        ),
    )
  }

  function removeFromCart(id) {
    setCart((current) =>
      current.filter(
        (item) => item.id !== id,
      ),
    )
  }

  function sendOrder() {
    if (cart.length === 0) {
      alert('Tu carrito está vacío.')
      return
    }

    const productLines = cart
      .map((item) => {
        const subtotal =
          Number(item.price) *
          item.quantity

        return (
          `${item.quantity} x ${item.name}\n` +
          `Precio unitario: $${Number(item.price)} MXN\n` +
          `Subtotal: $${subtotal} MXN`
        )
      })
      .join('\n\n')

    const message =
      `Hola, Ventitas Chiquitas Cucui.\n\n` +
      `Quiero realizar el siguiente pedido:\n\n` +
      `${productLines}\n\n` +
      `TOTAL: $${cartTotal} MXN\n\n` +
      `¿Me podrían confirmar disponibilidad?`

    window.open(
      `https://wa.me/${siteConfig.whatsapp_number}?text=${encodeURIComponent(
        message,
      )}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  async function tryAdminLogin(event) {
    event.preventDefault()

    setAdminError('')

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: adminEmail.trim(),
        password: adminPassword,
      })

    if (error) {
      console.error(error)

      setAdminError(
        'Correo o contraseña incorrectos.',
      )

      return
    }

    setSession(data.session)
    setAdminLoginOpen(false)
    setAdminPassword('')
    setAdminError('')

    setTimeout(() => {
      document
        .getElementById('catalogo')
        ?.scrollIntoView({
          behavior: 'smooth',
        })
    }, 100)
  }

  async function logoutAdmin() {
    await supabase.auth.signOut()

    setSession(null)
    setProductEditorOpen(false)
    setEditingProduct(null)
  }

  function startAddingProduct() {
    const firstCategory =
      categories.find(
        (category) =>
          category !== 'Todos' &&
          category !== 'Ofertas',
      ) || ''

    setEditingProduct(null)

    setProductForm({
      ...EMPTY_PRODUCT,
      category: firstCategory,
    })

    setProductEditorOpen(true)
  }

  function startEditingProduct(product) {
    setEditingProduct(product)

    setProductForm({
      name: product.name || '',
      price: product.price || '',
      image_url:
        product.image_url || '',
      short_description:
        product.short_description || '',
      full_description:
        product.full_description || '',
      category:
        product.category || '',
      label:
        product.label || '',
      available:
        product.available ?? true,
    })

    setProductEditorOpen(true)
  }

  function handleProductFormChange(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target

    setProductForm((current) => ({
      ...current,
      [name]:
        type === 'checkbox'
          ? checked
          : value,
    }))
  }

  async function uploadProductImage(file) {
    if (!file) return null

    const extension =
      file.name.split('.').pop()

    const randomName =
      typeof crypto !== 'undefined' &&
      crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now()

    const filePath =
      `products/${randomName}.${extension}`

    const { error: uploadError } =
      await supabase.storage
        .from('productos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

    if (uploadError) {
      throw uploadError
    }

    const { data } =
      supabase.storage
        .from('productos')
        .getPublicUrl(filePath)

    return data.publicUrl
  }

  async function handleImageUpload(event) {
    const file =
      event.target.files?.[0]

    if (!file) return

    try {
      const publicUrl =
        await uploadProductImage(file)

      setProductForm((current) => ({
        ...current,
        image_url: publicUrl,
      }))
    } catch (error) {
      console.error(error)

      alert(
        'No se pudo subir la imagen.',
      )
    }
  }

  async function saveProduct(event) {
    event.preventDefault()

    if (!adminMode) return

    const cleanProduct = {
      name:
        productForm.name.trim(),
      price:
        Number(productForm.price),
      image_url:
        productForm.image_url || null,
      short_description:
        productForm.short_description.trim(),
      full_description:
        productForm.full_description.trim(),
      category:
        productForm.category,
      label:
        productForm.label || '',
      available:
        Boolean(
          productForm.available,
        ),
    }

    if (
      !cleanProduct.name ||
      !cleanProduct.price ||
      !cleanProduct.short_description ||
      !cleanProduct.full_description
    ) {
      alert(
        'Completa nombre, precio y ambas descripciones.',
      )

      return
    }

    setSavingProduct(true)

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(cleanProduct)
          .eq(
            'id',
            editingProduct.id,
          )

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('products')
          .insert(cleanProduct)

        if (error) throw error
      }

      await loadProducts()

      setProductEditorOpen(false)
      setEditingProduct(null)
    } catch (error) {
      console.error(error)

      alert(
        'No se pudo guardar el producto.',
      )
    } finally {
      setSavingProduct(false)
    }
  }

  async function deleteProduct(product) {
    if (!adminMode) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)

      if (error) throw error

      setProducts((current) =>
        current.filter(
          (item) =>
            item.id !== product.id,
        ),
      )

      setCart((current) =>
        current.filter(
          (item) =>
            item.id !== product.id,
        ),
      )

      setConfirmDelete(null)
    } catch (error) {
      console.error(error)

      alert(
        'No se pudo eliminar el producto.',
      )
    }
  }

  if (loading) {
    return (
      <div className="app">
        <div
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            background: '#fff8f1',
            color: '#51001c',
            fontWeight: 800,
          }}
        >
          Cargando Ventitas Chiquitas Cucui...
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="app">
        <div
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: 30,
            textAlign: 'center',
            background: '#fff8f1',
            color: '#51001c',
          }}
        >
          <div>
            <h2>
              No se pudo cargar la tienda
            </h2>

            <p>{loadError}</p>

            <button
              className="primary-button"
              onClick={initializeApp}
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  const logo =
    siteConfig.logo_url ||
    '/logo-cucui.jpg'

  return (
    <div className="app">
      <section className="hero">
        <div className="hero-stars stars-one">
          ★
        </div>

        <div className="hero-stars stars-two">
          ★
        </div>

        <div className="hero-stars stars-three">
          ★
        </div>

        <div className="hero-copy">
          <div className="mini-brand">
            {siteConfig.business_name.toUpperCase()}
          </div>

          <h1>
            Cositas bonitas
            <span>
              para consentirte
            </span>
          </h1>

          <p>
            Encuentra detallitos,
            cosméticos, papelería,
            dulces y cositas lindas
            elegidas especialmente
            para ti.
          </p>

          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={scrollToCatalog}
            >
              Ver catálogo

              <ChevronRight
                size={19}
              />
            </button>

            <button
              className="secondary-button"
              onClick={
                openWhatsappQuestion
              }
            >
              <FaWhatsapp
                size={19}
              />

              Preguntar por WhatsApp
            </button>
          </div>
        </div>

        <div className="hero-logo-area">
          <div className="logo-glow" />

          <img
            className="main-logo"
            src={logo}
            alt={
              siteConfig.business_name
            }
          />

          <div className="hero-badge">
            Hecho con cariño ♡
          </div>
        </div>
      </section>

      <section
        className="catalog-section"
        id="catalogo"
      >
        <div className="catalog-heading">
          <span>
            NUESTRO CATÁLOGO
          </span>

          <h2>
            Encuentra tu próximo
            detallito
          </h2>

          <p>
            Explora todas nuestras
            cositas disponibles.
          </p>
        </div>

        <div className="catalog-toolbar">
          <div className="category-scroll">
            {categories.map(
              (category) => (
                <button
                  key={category}
                  className={
                    selectedCategory ===
                    category
                      ? 'category-button active'
                      : 'category-button'
                  }
                  onClick={() =>
                    setSelectedCategory(
                      category,
                    )
                  }
                >
                  {category}
                </button>
              ),
            )}
          </div>

          <button
            className="cart-toolbar-button"
            onClick={() =>
              setCartOpen(true)
            }
          >
            <ShoppingBag
              size={22}
            />

            {cartUnits > 0 && (
              <span>
                {cartUnits}
              </span>
            )}
          </button>
        </div>

        <div className="search-box">
          <Search size={21} />

          <input
            type="search"
            placeholder="¿Qué estás buscando?"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
          />

          {search && (
            <button
              onClick={() =>
                setSearch('')
              }
            >
              <X size={18} />
            </button>
          )}
        </div>

        {adminMode && (
          <div className="admin-banner">
            <div>
              <Settings
                size={22}
              />

              <span>
                Modo administración activo
              </span>
            </div>

            <div className="admin-banner-actions">
              <button
                onClick={
                  startAddingProduct
                }
              >
                <PackagePlus
                  size={18}
                />

                Añadir producto
              </button>

              <button
                onClick={
                  logoutAdmin
                }
              >
                <LogOut
                  size={18}
                />

                Cerrar administración
              </button>
            </div>
          </div>
        )}

        {visibleProducts.length === 0 ? (
          <div className="empty-results">
            <Search size={36} />

            <h3>
              No encontramos productos
            </h3>

            <p>
              Prueba con otra búsqueda
              o categoría.
            </p>
          </div>
        ) : (
          <div className="product-grid">
            {visibleProducts.map(
              (product) => (
                <article
                  className="product-card"
                  key={product.id}
                  onClick={() =>
                    openProduct(product)
                  }
                >
                  <div className="product-image-wrapper">
                    <img
                      src={getProductImage(
                        product,
                      )}
                      alt={product.name}
                    />

                    {product.label && (
                      <span
                        className={`product-label ${product.label
                          .toLowerCase()
                          .replaceAll(
                            ' ',
                            '-',
                          )}`}
                      >
                        {product.label}
                      </span>
                    )}

                    {!product.available && (
                      <div className="sold-out-overlay">
                        Agotado
                      </div>
                    )}

                    {adminMode && (
                      <div
                        className="card-admin-actions"
                        onClick={(
                          event,
                        ) =>
                          event.stopPropagation()
                        }
                      >
                        <button
                          onClick={() =>
                            startEditingProduct(
                              product,
                            )
                          }
                        >
                          <Pencil
                            size={17}
                          />
                        </button>

                        <button
                          onClick={() =>
                            setConfirmDelete(
                              product,
                            )
                          }
                        >
                          <Trash2
                            size={17}
                          />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="product-card-body">
                    <div className="product-category">
                      {
                        product.category
                      }
                    </div>

                    <h3>
                      {product.name}
                    </h3>

                    <p>
                      {
                        product.short_description
                      }
                    </p>

                    <div className="product-card-footer">
                      <strong>
                        $
                        {Number(
                          product.price,
                        )}{' '}
                        MXN
                      </strong>

                      <span>
                        Ver detalle

                        <ChevronRight
                          size={16}
                        />
                      </span>
                    </div>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      <footer>
        <div className="footer-brand">
          <img
            src={logo}
            alt={
              siteConfig.business_name
            }
          />

          <div>
            <strong>
              {
                siteConfig.business_name
              }
            </strong>

            <span>
              {siteConfig.subtitle}
            </span>
          </div>
        </div>

        <div className="social-section">
          <h3>
            Síguenos
          </h3>

          <div className="social-links">
            <a
              href={
                siteConfig.facebook_url
              }
              target="_blank"
              rel="noreferrer"
            >
              <FaFacebookF
                size={20}
              />

              Facebook
            </a>

            <a
              href={
                siteConfig.instagram_url
              }
              target="_blank"
              rel="noreferrer"
            >
              <FaInstagram
                size={20}
              />

              Instagram
            </a>

            <a
              href={`https://wa.me/${siteConfig.whatsapp_number}`}
              target="_blank"
              rel="noreferrer"
            >
              <FaWhatsapp
                size={20}
              />

              WhatsApp
            </a>

            <a
              href={
                siteConfig.whatsapp_group_url
              }
              target="_blank"
              rel="noreferrer"
            >
              <FaWhatsapp
                size={20}
              />

              Grupo de WhatsApp
            </a>
          </div>
        </div>

        <button
          className="admin-footer-button"
          onClick={() => {
            if (adminMode) {
              scrollToCatalog()
            } else {
              setAdminLoginOpen(
                true,
              )
            }
          }}
        >
          <Settings
            size={14}
          />

          {adminMode
            ? 'Administrando'
            : 'Administrar'}
        </button>

        <p className="footer-copy">
          Ventitas Chiquitas Cucui
        </p>
      </footer>

      {selectedProduct && (
        <div
          className="modal-backdrop"
          onMouseDown={() =>
            setSelectedProduct(null)
          }
        >
          <div
            className="product-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="modal-close"
              onClick={() =>
                setSelectedProduct(
                  null,
                )
              }
            >
              <X />
            </button>

            <div className="product-modal-image">
              <img
                src={getProductImage(
                  selectedProduct,
                )}
                alt={
                  selectedProduct.name
                }
              />
            </div>

            <div className="product-modal-content">
              <span className="modal-category">
                {
                  selectedProduct.category
                }
              </span>

              <h2>
                {selectedProduct.name}
              </h2>

              <div className="modal-price">
                $
                {Number(
                  selectedProduct.price,
                )}{' '}
                MXN
              </div>

              <p>
                {
                  selectedProduct.full_description
                }
              </p>

              {selectedProduct.available ? (
                <>
                  <div className="quantity-row">
                    <span>
                      Cantidad
                    </span>

                    <div className="quantity-control">
                      <button
                        onClick={() =>
                          setModalQuantity(
                            (
                              current,
                            ) =>
                              Math.max(
                                1,
                                current -
                                  1,
                              ),
                          )
                        }
                      >
                        <Minus
                          size={18}
                        />
                      </button>

                      <strong>
                        {modalQuantity}
                      </strong>

                      <button
                        onClick={() =>
                          setModalQuantity(
                            (
                              current,
                            ) =>
                              current +
                              1,
                          )
                        }
                      >
                        <Plus
                          size={18}
                        />
                      </button>
                    </div>
                  </div>

                  <button
                    className="add-cart-button"
                    onClick={() =>
                      addToCart(
                        selectedProduct,
                        modalQuantity,
                      )
                    }
                  >
                    <ShoppingBag
                      size={20}
                    />

                    Agregar al carrito
                  </button>
                </>
              ) : (
                <div className="unavailable-message">
                  Agotado temporalmente
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {cartOpen && (
        <div
          className="drawer-backdrop"
          onMouseDown={() =>
            setCartOpen(false)
          }
        >
          <aside
            className="cart-drawer"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="cart-header">
              <div>
                <span>
                  Tu carrito
                </span>

                <strong>
                  {cartUnits}{' '}
                  {cartUnits === 1
                    ? 'producto'
                    : 'productos'}
                </strong>
              </div>

              <button
                onClick={() =>
                  setCartOpen(
                    false,
                  )
                }
              >
                <X />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <ShoppingBag
                  size={46}
                />

                <h3>
                  Tu carrito está vacío
                </h3>

                <p>
                  Agrega algunas cositas bonitas
                  para comenzar tu pedido.
                </p>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map(
                    (item) => (
                      <div
                        className="cart-item"
                        key={
                          item.id
                        }
                      >
                        <img
                          src={getProductImage(
                            item,
                          )}
                          alt={
                            item.name
                          }
                        />

                        <div className="cart-item-info">
                          <strong>
                            {
                              item.name
                            }
                          </strong>

                          <span>
                            $
                            {
                              Number(
                                item.price,
                              )
                            }{' '}
                            c/u
                          </span>

                          <div className="cart-quantity">
                            <button
                              onClick={() =>
                                changeCartQuantity(
                                  item.id,
                                  -1,
                                )
                              }
                            >
                              <Minus
                                size={
                                  15
                                }
                              />
                            </button>

                            <span>
                              {
                                item.quantity
                              }
                            </span>

                            <button
                              onClick={() =>
                                changeCartQuantity(
                                  item.id,
                                  1,
                                )
                              }
                            >
                              <Plus
                                size={
                                  15
                                }
                              />
                            </button>
                          </div>
                        </div>

                        <div className="cart-item-end">
                          <strong>
                            $
                            {Number(
                              item.price,
                            ) *
                              item.quantity}
                          </strong>

                          <button
                            onClick={() =>
                              removeFromCart(
                                item.id,
                              )
                            }
                          >
                            <Trash2
                              size={
                                17
                              }
                            />
                          </button>
                        </div>
                      </div>
                    ),
                  )}
                </div>

                <div className="cart-bottom">
                  <div className="cart-total">
                    <span>
                      Total
                    </span>

                    <strong>
                      $
                      {
                        cartTotal
                      }{' '}
                      MXN
                    </strong>
                  </div>

                  <p>
                    Los productos están sujetos
                    a disponibilidad.
                    Confirmaremos tu pedido por
                    WhatsApp.
                  </p>

                  <button
                    className="whatsapp-order-button"
                    onClick={
                      sendOrder
                    }
                  >
                    <FaWhatsapp
                      size={21}
                    />

                    Enviar pedido por WhatsApp
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {adminLoginOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={() =>
            setAdminLoginOpen(false)
          }
        >
          <form
            className="admin-login-modal"
            onSubmit={tryAdminLogin}
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="modal-close"
              onClick={() =>
                setAdminLoginOpen(
                  false,
                )
              }
            >
              <X />
            </button>

            <Settings size={32} />

            <h2>
              Acceso de administrador
            </h2>

            <p>
              Inicia sesión con el correo y
              contraseña que creaste en Supabase.
            </p>

            <input
              type="email"
              value={adminEmail}
              onChange={(event) =>
                setAdminEmail(
                  event.target.value,
                )
              }
              placeholder="Correo"
              required
            />

            <input
              type="password"
              value={adminPassword}
              onChange={(event) => {
                setAdminPassword(
                  event.target.value,
                )

                setAdminError('')
              }}
              placeholder="Contraseña"
              required
            />

            {adminError && (
              <span className="admin-error">
                {adminError}
              </span>
            )}

            <button
              className="primary-button admin-login-button"
              type="submit"
            >
              Entrar
            </button>
          </form>
        </div>
      )}

      {productEditorOpen &&
        adminMode && (
          <div
            className="modal-backdrop"
            onMouseDown={() =>
              setProductEditorOpen(
                false,
              )
            }
          >
            <form
              className="product-editor"
              onSubmit={saveProduct}
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >
              <div className="editor-header">
                <div>
                  <span>
                    {editingProduct
                      ? 'EDITAR PRODUCTO'
                      : 'NUEVO PRODUCTO'}
                  </span>

                  <h2>
                    {editingProduct
                      ? editingProduct.name
                      : 'Añadir producto'}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setProductEditorOpen(
                      false,
                    )
                  }
                >
                  <X />
                </button>
              </div>

              <div className="editor-grid">
                <div className="editor-image-column">
                  <img
                    src={
                      productForm.image_url ||
                      '/logo-cucui.jpg'
                    }
                    alt="Vista previa"
                  />

                  <label className="upload-button">
                    <ImagePlus
                      size={18}
                    />

                    Cambiar imagen

                    <input
                      type="file"
                      accept="image/*"
                      onChange={
                        handleImageUpload
                      }
                    />
                  </label>
                </div>

                <div className="editor-fields">
                  <label>
                    Nombre

                    <input
                      name="name"
                      value={
                        productForm.name
                      }
                      onChange={
                        handleProductFormChange
                      }
                    />
                  </label>

                  <label>
                    Precio

                    <input
                      name="price"
                      type="number"
                      min="1"
                      step="0.01"
                      value={
                        productForm.price
                      }
                      onChange={
                        handleProductFormChange
                      }
                    />
                  </label>

                  <label>
                    Categoría

                    <select
                      name="category"
                      value={
                        productForm.category
                      }
                      onChange={
                        handleProductFormChange
                      }
                    >
                      {categories
                        .filter(
                          (
                            category,
                          ) =>
                            category !==
                              'Todos' &&
                            category !==
                              'Ofertas',
                        )
                        .map(
                          (
                            category,
                          ) => (
                            <option
                              key={
                                category
                              }
                              value={
                                category
                              }
                            >
                              {
                                category
                              }
                            </option>
                          ),
                        )}
                    </select>
                  </label>

                  <label>
                    Etiqueta

                    <select
                      name="label"
                      value={
                        productForm.label
                      }
                      onChange={
                        handleProductFormChange
                      }
                    >
                      <option value="">
                        Sin etiqueta
                      </option>

                      <option value="NUEVO">
                        NUEVO
                      </option>

                      <option value="OFERTA">
                        OFERTA
                      </option>

                      <option value="POPULAR">
                        POPULAR
                      </option>

                      <option value="ÚLTIMAS PIEZAS">
                        ÚLTIMAS PIEZAS
                      </option>
                    </select>
                  </label>

                  <label className="wide-field">
                    Descripción breve

                    <textarea
                      name="short_description"
                      rows="3"
                      value={
                        productForm.short_description
                      }
                      onChange={
                        handleProductFormChange
                      }
                    />
                  </label>

                  <label className="wide-field">
                    Descripción completa

                    <textarea
                      name="full_description"
                      rows="6"
                      value={
                        productForm.full_description
                      }
                      onChange={
                        handleProductFormChange
                      }
                    />
                  </label>

                  <label className="availability-switch wide-field">
                    <input
                      type="checkbox"
                      name="available"
                      checked={
                        productForm.available
                      }
                      onChange={
                        handleProductFormChange
                      }
                    />

                    <span>
                      Producto disponible
                    </span>
                  </label>
                </div>
              </div>

              <div className="editor-footer">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() =>
                    setProductEditorOpen(
                      false,
                    )
                  }
                >
                  Cancelar
                </button>

                <button
                  className="save-button"
                  type="submit"
                  disabled={
                    savingProduct
                  }
                >
                  <Save
                    size={18}
                  />

                  {savingProduct
                    ? 'Guardando...'
                    : editingProduct
                      ? 'Guardar cambios'
                      : 'Agregar producto'}
                </button>
              </div>
            </form>
          </div>
        )}

      {confirmDelete &&
        adminMode && (
          <div
            className="modal-backdrop"
            onMouseDown={() =>
              setConfirmDelete(null)
            }
          >
            <div
              className="delete-modal"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >
              <Trash2 size={30} />

              <h2>
                Eliminar producto
              </h2>

              <p>
                ¿Seguro que deseas eliminar{' '}
                <strong>
                  {
                    confirmDelete.name
                  }
                </strong>
                ?
              </p>

              <div>
                <button
                  className="cancel-button"
                  onClick={() =>
                    setConfirmDelete(
                      null,
                    )
                  }
                >
                  Cancelar
                </button>

                <button
                  className="delete-button"
                  onClick={() =>
                    deleteProduct(
                      confirmDelete,
                    )
                  }
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

export default App
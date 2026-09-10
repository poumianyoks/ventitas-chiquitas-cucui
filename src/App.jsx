import { useEffect, useMemo, useRef, useState } from 'react'

import {
  Search,
  ShoppingBag,
  ShoppingCart,
  X,
  Plus,
  Minus,
  Trash2,
  Pencil,
  Settings,
  ChevronRight,
  ChevronLeft,
  PackagePlus,
  LogOut,
  Save,
  ImagePlus,
  Star,
  Tags,
  SlidersHorizontal,
  RotateCcw,
  Upload,
} from 'lucide-react'

import {
  FaFacebookF,
  FaInstagram,
  FaWhatsapp,
} from 'react-icons/fa'

import { supabase } from './lib/supabase'
import './App.css'

const MAX_PRODUCT_IMAGES = 5
const MAX_IMAGE_SIDE = 1400
const WEBP_QUALITY = 0.82

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

const DEFAULT_MASCOT_LAYOUT = {
  catalog: { size: 43, x: 0, y: 0 },
  whatsappHero: { size: 43, x: 0, y: 0 },
  cart: { size: 39, x: 0, y: 0 },
  morePhotos: { size: 31, x: 0, y: 0 },
  addCart: { size: 44, x: 0, y: 0 },
  order: { size: 47, x: 0, y: 0 },
  facebook: { size: 39, x: 0, y: 0 },
  instagram: { size: 39, x: 0, y: 0 },
  whatsappFooter: { size: 39, x: 0, y: 0 },
  group: { size: 39, x: 0, y: 0 },
}

const MASCOT_DESIGN_ITEMS = [
  { key: 'catalog', label: 'Ver catálogo', src: '/mascotas/botones/naranja-catalogo.png' },
  { key: 'whatsappHero', label: 'WhatsApp de portada', src: '/mascotas/botones/blanquita-whatsapp.png' },
  { key: 'cart', label: 'Carrito superior', src: '/mascotas/botones/blanquita-carrito.png' },
  { key: 'morePhotos', label: 'Más fotos', src: '/mascotas/botones/naranja-mas-fotos.png' },
  { key: 'addCart', label: 'Agregar al carrito', src: '/mascotas/botones/naranja-agregar-carrito.png' },
  { key: 'order', label: 'Hacer pedido', src: '/mascotas/botones/naranja-pedido.png' },
  { key: 'facebook', label: 'Facebook', src: '/mascotas/botones/blanquita-facebook.png' },
  { key: 'instagram', label: 'Instagram', src: '/mascotas/botones/naranja-instagram.png' },
  { key: 'whatsappFooter', label: 'WhatsApp del footer', src: '/mascotas/botones/blanquita-whatsapp-footer.png' },
  { key: 'group', label: 'Grupo de WhatsApp', src: '/mascotas/botones/naranja-grupo.png' },
]

const EMPTY_PRODUCT = {
  name: '',
  price: '',
  image_url: '',
  image_urls: [],
  short_description: '',
  full_description: '',
  category: 'Cosméticos',
  label: '',
  available: true,
}


function CategoryIcon({ category, size = 16 }) {
  const normalized = String(category || '').toLowerCase()

  if (normalized === 'todos') return <Tags size={size} />
  if (normalized.includes('cosm')) return <Star size={size} />
  if (normalized.includes('papel')) return <Pencil size={size} />
  if (normalized.includes('hogar')) return <PackagePlus size={size} />
  if (normalized.includes('oferta')) return <Star size={size} />

  return <Tags size={size} />
}

function normalizeImageUrls(product) {
  const values = Array.isArray(product?.image_urls)
    ? product.image_urls
    : []

  const clean = values.filter(
    (url) => typeof url === 'string' && url.trim(),
  )

  if (
    product?.image_url &&
    !clean.includes(product.image_url)
  ) {
    clean.unshift(product.image_url)
  }

  return [...new Set(clean)].slice(
    0,
    MAX_PRODUCT_IMAGES,
  )
}


function ButtonMascot({
  src,
  alt = '',
  className = '',
  layout,
}) {
  if (!src) return null

  return (
    <img
      className={`button-mascot-image ${className}`}
      src={src}
      alt={alt}
      aria-hidden={alt ? undefined : 'true'}
      loading="lazy"
      decoding="async"
      style={layout ? {
        '--mascot-size': `${layout.size}px`,
        '--mascot-x': `${layout.x}px`,
        '--mascot-y': `${layout.y}px`,
      } : undefined}
    />
  )
}

function App() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([
    'Todos',
    'Ofertas',
  ])
  const [siteConfig, setSiteConfig] =
    useState(DEFAULT_SITE)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState('Todos')

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState(null)

  const [modalQuantity, setModalQuantity] =
    useState(1)
  const [galleryIndex, setGalleryIndex] =
    useState(0)
  const touchStartX = useRef(null)
  const [mascotTipVisible, setMascotTipVisible] =
    useState(false)
  const [mascotTipText, setMascotTipText] =
    useState('')

  const [cart, setCart] = useState(() => {
    const saved =
      localStorage.getItem('cucui-cart')

    if (!saved) return []

    try {
      return JSON.parse(saved)
    } catch {
      return []
    }
  })

  const [cartOpen, setCartOpen] =
    useState(false)
  const [session, setSession] =
    useState(null)
  const [
    adminLoginOpen,
    setAdminLoginOpen,
  ] = useState(false)

  const [adminEmail, setAdminEmail] =
    useState('')
  const [
    adminPassword,
    setAdminPassword,
  ] = useState('')
  const [adminError, setAdminError] =
    useState('')

  const [
    productEditorOpen,
    setProductEditorOpen,
  ] = useState(false)

  const [
    categoryManagerOpen,
    setCategoryManagerOpen,
  ] = useState(false)

  const [
    designManagerOpen,
    setDesignManagerOpen,
  ] = useState(false)
  const [designDraft, setDesignDraft] = useState({
    logo_url: null,
    mascot_layout: DEFAULT_MASCOT_LAYOUT,
  })
  const [designError, setDesignError] = useState('')
  const [savingDesign, setSavingDesign] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [
    newCategoryName,
    setNewCategoryName,
  ] = useState('')
  const [
    categoryError,
    setCategoryError,
  ] = useState('')
  const [
    savingCategory,
    setSavingCategory,
  ] = useState(false)
  const [
    editingProduct,
    setEditingProduct,
  ] = useState(null)
  const [productForm, setProductForm] =
    useState(EMPTY_PRODUCT)

  const [
    confirmDelete,
    setConfirmDelete,
  ] = useState(null)

  const [
    savingProduct,
    setSavingProduct,
  ] = useState(false)
  const [
    uploadingImages,
    setUploadingImages,
  ] = useState(false)

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
      setCategoryManagerOpen(false)
      setDesignManagerOpen(false)
      setConfirmDelete(null)
    }

    window.addEventListener(
      'keydown',
      handleEscape,
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleEscape,
      )
    }
  }, [])

  useEffect(() => {
    const productsWithGallery = products.filter(
      (product) => normalizeImageUrls(product).length > 1,
    )

    if (productsWithGallery.length === 0) return undefined

    let hideTimer

    const showTip = () => {
      const messages = [
        'Los productos con “Más fotos” tienen una galería al abrirlos.',
        'Toca un producto con varias fotos y desliza para verlas todas.',
        'Puedes abrir cualquier producto para ver su información completa.',
      ]

      const message =
        messages[Math.floor(Math.random() * messages.length)]

      setMascotTipText(message)
      setMascotTipVisible(true)

      clearTimeout(hideTimer)
      hideTimer = setTimeout(() => {
        setMascotTipVisible(false)
      }, 6500)
    }

    const firstTimer = setTimeout(showTip, 7000)
    const interval = setInterval(showTip, 26000)

    return () => {
      clearTimeout(firstTimer)
      clearTimeout(hideTimer)
      clearInterval(interval)
    }
  }, [products])

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

    if (error) throw error

    setProducts(
      (data || []).map((product) => ({
        ...product,
        image_urls:
          normalizeImageUrls(product),
      })),
    )
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', {
        ascending: true,
      })

    if (error) throw error

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

    if (error) throw error

    if (data) {
      setSiteConfig({
        ...DEFAULT_SITE,
        ...data,
        mascot_layout: {
          ...DEFAULT_MASCOT_LAYOUT,
          ...(data.mascot_layout || {}),
        },
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
      } else if (
        selectedCategory === 'Ofertas'
      ) {
        categoryMatches =
          product.label === 'OFERTA'
      } else {
        categoryMatches =
          product.category ===
          selectedCategory
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
        searchableText.includes(
          normalizedSearch,
        )

      return categoryMatches && searchMatches
    })
  }, [
    products,
    search,
    selectedCategory,
  ])

  const cartUnits = cart.reduce(
    (total, item) =>
      total + item.quantity,
    0,
  )

  const cartTotal = cart.reduce(
    (total, item) =>
      total +
      Number(item.price) * item.quantity,
    0,
  )

  const selectedImages = selectedProduct
    ? normalizeImageUrls(selectedProduct)
    : []

  const currentGalleryImage =
    selectedImages[galleryIndex] ||
    selectedProduct?.image_url ||
    '/logo-cucui.jpg'

  function getProductImage(product) {
    return (
      normalizeImageUrls(product)[0] ||
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
    setGalleryIndex(0)
  }

  function closeProduct() {
    setSelectedProduct(null)
    setGalleryIndex(0)
  }

  function changeGalleryImage(direction) {
    if (selectedImages.length <= 1) return

    setGalleryIndex((current) => {
      const next =
        current + direction

      if (next < 0) {
        return selectedImages.length - 1
      }

      if (next >= selectedImages.length) {
        return 0
      }

      return next
    })
  }

  function handleGalleryTouchStart(event) {
    touchStartX.current =
      event.touches?.[0]?.clientX ?? null
  }

  function handleGalleryTouchEnd(event) {
    if (touchStartX.current === null) return

    const endX =
      event.changedTouches?.[0]?.clientX

    if (typeof endX !== 'number') return

    const difference =
      endX - touchStartX.current

    touchStartX.current = null

    if (Math.abs(difference) < 45) return

    if (difference < 0) {
      changeGalleryImage(1)
    } else {
      changeGalleryImage(-1)
    }
  }

  function addToCart(
    product,
    quantity = 1,
  ) {
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

    closeProduct()
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
    setCategoryManagerOpen(false)
    setDesignManagerOpen(false)
    setEditingProduct(null)
  }

  function openDesignManager() {
    setDesignError('')
    setDesignDraft({
      logo_url: siteConfig.logo_url || null,
      mascot_layout: {
        ...DEFAULT_MASCOT_LAYOUT,
        ...(siteConfig.mascot_layout || {}),
      },
    })
    setDesignManagerOpen(true)
  }

  function updateMascotDesign(key, field, value) {
    setDesignDraft((current) => ({
      ...current,
      mascot_layout: {
        ...current.mascot_layout,
        [key]: {
          ...DEFAULT_MASCOT_LAYOUT[key],
          ...(current.mascot_layout?.[key] || {}),
          [field]: Number(value),
        },
      },
    }))
  }

  function resetMascotDesign(key) {
    setDesignDraft((current) => ({
      ...current,
      mascot_layout: {
        ...current.mascot_layout,
        [key]: { ...DEFAULT_MASCOT_LAYOUT[key] },
      },
    }))
  }

  async function uploadLogoImage(file) {
    if (!file?.type?.startsWith('image/')) {
      throw new Error('Selecciona una imagen válida.')
    }

    if (file.size > 20 * 1024 * 1024) {
      throw new Error('El logo supera 20 MB.')
    }

    const optimized = await optimizeImage(file)
    const randomName =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now()
    const filePath = `site/logo-${randomName}.webp`

    const { error: uploadError } = await supabase.storage
      .from('productos')
      .upload(filePath, optimized, {
        cacheControl: '31536000',
        contentType: 'image/webp',
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('productos')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploadingLogo(true)
    setDesignError('')

    try {
      const publicUrl = await uploadLogoImage(file)
      setDesignDraft((current) => ({
        ...current,
        logo_url: publicUrl,
      }))
    } catch (error) {
      console.error(error)
      setDesignError(error.message || 'No se pudo subir el logo.')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function saveSiteDesign() {
    if (!siteConfig.id) {
      setDesignError('No se encontró la fila de configuración del sitio.')
      return
    }

    setSavingDesign(true)
    setDesignError('')

    try {
      const payload = {
        logo_url: designDraft.logo_url || null,
        mascot_layout: designDraft.mascot_layout,
      }

      const { data, error } = await supabase
        .from('site_config')
        .update(payload)
        .eq('id', siteConfig.id)
        .select('*')
        .single()

      if (error) throw error

      setSiteConfig({
        ...DEFAULT_SITE,
        ...data,
        mascot_layout: {
          ...DEFAULT_MASCOT_LAYOUT,
          ...(data.mascot_layout || {}),
        },
      })
      setDesignManagerOpen(false)
    } catch (error) {
      console.error(error)
      setDesignError(
        error.message?.includes('mascot_layout')
          ? 'Falta crear la columna mascot_layout en Supabase. Ejecuta el SQL que te indiqué.'
          : 'No se pudieron guardar los cambios de diseño.',
      )
    } finally {
      setSavingDesign(false)
    }
  }

  function getMascotLayout(key) {
    const source = designManagerOpen
      ? designDraft.mascot_layout
      : siteConfig.mascot_layout

    return {
      ...DEFAULT_MASCOT_LAYOUT[key],
      ...(source?.[key] || {}),
    }
  }

  async function addCategory(event) {
    event.preventDefault()

    const name = newCategoryName.trim()
    setCategoryError('')

    if (!name) {
      setCategoryError('Escribe el nombre de la categoría.')
      return
    }

    if (
      ['todos', 'ofertas'].includes(
        name.toLowerCase(),
      )
    ) {
      setCategoryError(
        'Ese nombre está reservado por la tienda.',
      )
      return
    }

    const exists = categories.some(
      (category) =>
        category.toLowerCase() ===
        name.toLowerCase(),
    )

    if (exists) {
      setCategoryError(
        'Esa categoría ya existe.',
      )
      return
    }

    setSavingCategory(true)

    try {
      const realCategories =
        categories.filter(
          (category) =>
            category !== 'Todos' &&
            category !== 'Ofertas',
        )

      const { error } = await supabase
        .from('categories')
        .insert({
          name,
          sort_order:
            realCategories.length + 1,
        })

      if (error) throw error

      setNewCategoryName('')
      await loadCategories()
    } catch (error) {
      console.error(error)
      setCategoryError(
        'No se pudo agregar la categoría.',
      )
    } finally {
      setSavingCategory(false)
    }
  }

  async function deleteCategory(
    categoryName,
  ) {
    setCategoryError('')

    const productsInCategory =
      products.filter(
        (product) =>
          product.category ===
          categoryName,
      )

    if (productsInCategory.length > 0) {
      setCategoryError(
        `No puedes eliminar “${categoryName}” porque tiene ${productsInCategory.length} producto(s). Cambia primero esos productos a otra categoría.`,
      )
      return
    }

    const confirmed = window.confirm(
      `¿Eliminar la categoría “${categoryName}”?`,
    )

    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('name', categoryName)

      if (error) throw error

      if (
        selectedCategory ===
        categoryName
      ) {
        setSelectedCategory('Todos')
      }

      await loadCategories()
    } catch (error) {
      console.error(error)
      setCategoryError(
        'No se pudo eliminar la categoría.',
      )
    }
  }

  function getFirstRealCategory() {
    return (
      categories.find(
        (category) =>
          category !== 'Todos' &&
          category !== 'Ofertas',
      ) || ''
    )
  }

  function startAddingProduct() {
    setEditingProduct(null)

    setProductForm({
      ...EMPTY_PRODUCT,
      category: getFirstRealCategory(),
    })

    setProductEditorOpen(true)
  }

  function startEditingProduct(product) {
    setEditingProduct(product)

    const images =
      normalizeImageUrls(product)

    setProductForm({
      name: product.name || '',
      price: product.price || '',
      image_url:
        images[0] ||
        product.image_url ||
        '',
      image_urls: images,
      short_description:
        product.short_description || '',
      full_description:
        product.full_description || '',
      category:
        product.category || '',
      label: product.label || '',
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

  async function optimizeImage(file) {
    if (!file.type.startsWith('image/')) {
      throw new Error(
        'El archivo seleccionado no es una imagen.',
      )
    }

    if (file.size > 20 * 1024 * 1024) {
      throw new Error(
        'La imagen supera 20 MB.',
      )
    }

    const objectUrl =
      URL.createObjectURL(file)

    try {
      const image =
        await new Promise(
          (resolve, reject) => {
            const img = new Image()

            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = objectUrl
          },
        )

      const longestSide = Math.max(
        image.naturalWidth,
        image.naturalHeight,
      )

      const scale = Math.min(
        1,
        MAX_IMAGE_SIDE / longestSide,
      )

      const width = Math.max(
        1,
        Math.round(
          image.naturalWidth * scale,
        ),
      )

      const height = Math.max(
        1,
        Math.round(
          image.naturalHeight * scale,
        ),
      )

      const canvas =
        document.createElement('canvas')

      canvas.width = width
      canvas.height = height

      const context =
        canvas.getContext('2d', {
          alpha: true,
        })

      if (!context) {
        throw new Error(
          'No se pudo preparar la imagen.',
        )
      }

      context.drawImage(
        image,
        0,
        0,
        width,
        height,
      )

      const blob =
        await new Promise(
          (resolve, reject) => {
            canvas.toBlob(
              (result) => {
                if (result) {
                  resolve(result)
                } else {
                  reject(
                    new Error(
                      'No se pudo comprimir la imagen.',
                    ),
                  )
                }
              },
              'image/webp',
              WEBP_QUALITY,
            )
          },
        )

      const baseName =
        file.name
          .replace(/\.[^/.]+$/, '')
          .replace(
            /[^a-zA-Z0-9-_]+/g,
            '-',
          )
          .slice(0, 50) || 'producto'

      return new File(
        [blob],
        `${baseName}.webp`,
        {
          type: 'image/webp',
        },
      )
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }

  async function uploadProductImage(file) {
    const optimized =
      await optimizeImage(file)

    const randomName =
      typeof crypto !== 'undefined' &&
      crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now()

    const filePath =
      `products/${randomName}.webp`

    const { error: uploadError } =
      await supabase.storage
        .from('productos')
        .upload(
          filePath,
          optimized,
          {
            cacheControl: '31536000',
            contentType: 'image/webp',
            upsert: false,
          },
        )

    if (uploadError) {
      throw uploadError
    }

    const { data } =
      supabase.storage
        .from('productos')
        .getPublicUrl(filePath)

    return data.publicUrl
  }

  async function handleImagesUpload(event) {
    const files = Array.from(
      event.target.files || [],
    )

    event.target.value = ''

    if (files.length === 0) return

    const currentImages =
      productForm.image_urls || []

    const availableSlots =
      MAX_PRODUCT_IMAGES -
      currentImages.length

    if (availableSlots <= 0) {
      alert(
        `Puedes guardar máximo ${MAX_PRODUCT_IMAGES} imágenes por producto.`,
      )
      return
    }

    const filesToUpload =
      files.slice(0, availableSlots)

    if (files.length > availableSlots) {
      alert(
        `Solo se subirán ${availableSlots} imagen(es) porque el máximo es ${MAX_PRODUCT_IMAGES}.`,
      )
    }

    setUploadingImages(true)

    try {
      const uploaded = []

      for (const file of filesToUpload) {
        const publicUrl =
          await uploadProductImage(file)

        uploaded.push(publicUrl)
      }

      setProductForm((current) => {
        const nextImages = [
          ...(current.image_urls || []),
          ...uploaded,
        ].slice(0, MAX_PRODUCT_IMAGES)

        return {
          ...current,
          image_urls: nextImages,
          image_url:
            nextImages[0] || '',
        }
      })
    } catch (error) {
      console.error(error)
      alert(
        error?.message ||
          'No se pudieron subir las imágenes.',
      )
    } finally {
      setUploadingImages(false)
    }
  }

  function removeProductImage(index) {
    setProductForm((current) => {
      const nextImages = (
        current.image_urls || []
      ).filter(
        (_url, imageIndex) =>
          imageIndex !== index,
      )

      return {
        ...current,
        image_urls: nextImages,
        image_url:
          nextImages[0] || '',
      }
    })
  }

  function setProductCover(index) {
    setProductForm((current) => {
      const images = [
        ...(current.image_urls || []),
      ]

      if (
        index <= 0 ||
        index >= images.length
      ) {
        return current
      }

      const [selected] =
        images.splice(index, 1)

      images.unshift(selected)

      return {
        ...current,
        image_urls: images,
        image_url: images[0],
      }
    })
  }

  async function saveProduct(event) {
    event.preventDefault()

    if (!adminMode || uploadingImages) {
      return
    }

    const images = (
      productForm.image_urls || []
    )
      .filter(Boolean)
      .slice(0, MAX_PRODUCT_IMAGES)

    const cleanProduct = {
      name: productForm.name.trim(),
      price: Number(productForm.price),
      image_url: images[0] || null,
      image_urls: images,
      short_description:
        productForm.short_description.trim(),
      full_description:
        productForm.full_description.trim(),
      category: productForm.category,
      label: productForm.label || '',
      available: Boolean(
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
          Cargando Ventitas Chiquitas
          Cucui...
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
        <div className="hero-deco hero-deco-one">♡</div>
        <div className="hero-deco hero-deco-two">✦</div>
        <div className="hero-deco hero-deco-three">✿</div>
        <div className="hero-deco hero-deco-four">♡</div>

        <div className="hero-copy">
          <div className="mini-brand">
            <span>♡</span>
            {siteConfig.business_name.toUpperCase()}
            <span>♡</span>
          </div>

          <p>
            Encuentra detallitos, cosméticos,
            papelería y cositas lindas elegidas
            especialmente para ti.
          </p>

          <div className="hero-kawaii-tags" aria-hidden="true">
            <span>♡ Bonito</span>
            <span>✦ Kawaii</span>
            <span>❀ Especial</span>
          </div>

          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={scrollToCatalog}
            >
              <ButtonMascot
                src="/mascotas/botones/naranja-catalogo.png"
                className="mascot-hero mascot-hero-catalog"
                layout={getMascotLayout('catalog')}
              />
              <span>Ver catálogo</span>
              <ChevronRight size={19} />
            </button>

            <button
              className="secondary-button"
              onClick={openWhatsappQuestion}
            >
              <ButtonMascot
                src="/mascotas/botones/blanquita-whatsapp.png"
                className="mascot-hero mascot-hero-whatsapp"
                layout={getMascotLayout('whatsappHero')}
              />
              <FaWhatsapp size={19} />
              <span>Preguntar por WhatsApp</span>
            </button>
          </div>
        </div>

        <div className="hero-logo-area">
          <div className="logo-glow" />
          <div className="hero-logo-sticker hero-logo-sticker-one">♡</div>
          <div className="hero-logo-sticker hero-logo-sticker-two">✦</div>
          <div className="hero-logo-sticker hero-logo-sticker-three">❀</div>

          <div className="logo-frame">
            <img
              className="main-logo"
              src={logo}
              alt={siteConfig.business_name}
            />
          </div>

          <div className="hero-badge">
            <span>♡</span> Hecho con cariño <span>♡</span>
          </div>
        </div>
      </section>

      <section
        className="catalog-section"
        id="catalogo"
      >
        <div className="catalog-heading">
          <span>NUESTRO CATÁLOGO</span>
          <h2>
            Encuentra tu próximo detallito
          </h2>
          <p>
            Explora todas nuestras cositas
            disponibles.
          </p>
        </div>

        <div className="catalog-toolbar">
          <div className="category-nav-group">
            <div className="category-swipe-hint" aria-hidden="true">
              <span>Categorías</span>
              <small>Desliza <ChevronRight size={15} /></small>
            </div>

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
                    <CategoryIcon category={category} size={16} />
                    <span>{category}</span>
                  </button>
                ),
              )}
            </div>
          </div>

          <button
            className="cart-toolbar-button"
            onClick={() =>
              setCartOpen(true)
            }
            aria-label="Abrir carrito"
          >
            <ButtonMascot
              src="/mascotas/botones/blanquita-carrito.png"
              className="mascot-cart-toolbar"
              layout={getMascotLayout('cart')}
            />
            <ShoppingCart size={22} />
            {cartUnits > 0 && (
              <span>{cartUnits}</span>
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
              aria-label="Limpiar búsqueda"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {adminMode && (
          <div className="admin-banner">
            <div>
              <Settings size={22} />
              <span>
                Modo administración activo
              </span>
            </div>

            <div className="admin-banner-actions">
              <button
                className="admin-action-add"
                onClick={
                  startAddingProduct
                }
              >
                <PackagePlus size={18} />
                Añadir producto
              </button>

              <button
                className="admin-action-categories"
                onClick={() => {
                  setCategoryError('')
                  setCategoryManagerOpen(true)
                }}
              >
                <Tags size={18} />
                Categorías
              </button>

              <button
                className="admin-action-design"
                onClick={openDesignManager}
              >
                <SlidersHorizontal size={18} />
                Diseño
              </button>

              <button
                className="admin-action-logout"
                onClick={logoutAdmin}
              >
                <LogOut size={18} />
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
              Prueba con otra búsqueda o
              categoría.
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
                      loading="lazy"
                      decoding="async"
                    />

                    {normalizeImageUrls(product).length > 1 && (
                      <div className="more-photos-badge">
                        <ButtonMascot
                          src="/mascotas/botones/naranja-mas-fotos.png"
                          className="mascot-more-photos"
                          layout={getMascotLayout('morePhotos')}
                        />
                        <span>Más fotos</span>
                        <small>
                          {normalizeImageUrls(product).length}
                        </small>
                      </div>
                    )}

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
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                      >
                        <button
                          onClick={() =>
                            startEditingProduct(
                              product,
                            )
                          }
                          aria-label="Editar producto"
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
                          aria-label="Eliminar producto"
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
                      {product.category}
                    </div>

                    <h3>{product.name}</h3>

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

      {mascotTipVisible && (
        <div className="mascot-tip" role="status">
          <button
            type="button"
            className="mascot-tip-close"
            onClick={() => setMascotTipVisible(false)}
            aria-label="Cerrar consejo"
          >
            <X size={14} />
          </button>

          <p>{mascotTipText}</p>
        </div>
      )}

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
          <h3>Síguenos</h3>

          <div className="social-links">
            <a
              className="social-facebook"
              href={
                siteConfig.facebook_url
              }
              target="_blank"
              rel="noreferrer"
            >
              <ButtonMascot
                src="/mascotas/botones/blanquita-facebook.png"
                className="mascot-social mascot-social-facebook"
                layout={getMascotLayout('facebook')}
              />
              <FaFacebookF size={20} />
              Facebook
            </a>

            <a
              className="social-instagram"
              href={
                siteConfig.instagram_url
              }
              target="_blank"
              rel="noreferrer"
            >
              <ButtonMascot
                src="/mascotas/botones/naranja-instagram.png"
                className="mascot-social mascot-social-instagram"
                layout={getMascotLayout('instagram')}
              />
              <FaInstagram size={20} />
              Instagram
            </a>

            <a
              className="social-whatsapp"
              href={`https://wa.me/${siteConfig.whatsapp_number}`}
              target="_blank"
              rel="noreferrer"
            >
              <ButtonMascot
                src="/mascotas/botones/blanquita-whatsapp-footer.png"
                className="mascot-social mascot-social-whatsapp"
                layout={getMascotLayout('whatsappFooter')}
              />
              <FaWhatsapp size={20} />
              WhatsApp
            </a>

            <a
              className="social-whatsapp-group"
              href={
                siteConfig.whatsapp_group_url
              }
              target="_blank"
              rel="noreferrer"
            >
              <ButtonMascot
                src="/mascotas/botones/naranja-grupo.png"
                className="mascot-social mascot-social-group"
                layout={getMascotLayout('group')}
              />
              <FaWhatsapp size={20} />
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
              setAdminLoginOpen(true)
            }
          }}
        >
          <Settings size={14} />
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
          onMouseDown={closeProduct}
        >
          <div
            className="product-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="modal-close"
              onClick={closeProduct}
              aria-label="Cerrar producto"
            >
              <X />
            </button>

            <div
              className="product-modal-image product-gallery"
              onTouchStart={
                handleGalleryTouchStart
              }
              onTouchEnd={
                handleGalleryTouchEnd
              }
            >
              <img
                key={currentGalleryImage}
                src={currentGalleryImage}
                alt={
                  selectedProduct.name
                }
                decoding="async"
              />

              {selectedImages.length > 1 && (
                <>
                  <button
                    className="gallery-arrow gallery-arrow-left"
                    type="button"
                    onClick={() =>
                      changeGalleryImage(-1)
                    }
                    aria-label="Imagen anterior"
                  >
                    <ChevronLeft
                      size={24}
                    />
                  </button>

                  <button
                    className="gallery-arrow gallery-arrow-right"
                    type="button"
                    onClick={() =>
                      changeGalleryImage(1)
                    }
                    aria-label="Siguiente imagen"
                  >
                    <ChevronRight
                      size={24}
                    />
                  </button>

                  <div className="gallery-dots">
                    {selectedImages.map(
                      (_image, index) => (
                        <button
                          key={index}
                          type="button"
                          className={
                            index ===
                            galleryIndex
                              ? 'gallery-dot active'
                              : 'gallery-dot'
                          }
                          onClick={() =>
                            setGalleryIndex(
                              index,
                            )
                          }
                          aria-label={`Ver imagen ${
                            index + 1
                          }`}
                        />
                      ),
                    )}
                  </div>

                  <span className="gallery-counter">
                    {galleryIndex + 1}/
                    {
                      selectedImages.length
                    }
                  </span>
                </>
              )}
            </div>

            {selectedImages.length > 1 && (
              <div className="gallery-helper">
                <span>Desliza o usa las flechas para ver más fotos</span>
              </div>
            )}

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
                    <span>Cantidad</span>

                    <div className="quantity-control">
                      <button
                        onClick={() =>
                          setModalQuantity(
                            (current) =>
                              Math.max(
                                1,
                                current - 1,
                              ),
                          )
                        }
                      >
                        <Minus size={18} />
                      </button>

                      <strong>
                        {modalQuantity}
                      </strong>

                      <button
                        onClick={() =>
                          setModalQuantity(
                            (current) =>
                              current + 1,
                          )
                        }
                      >
                        <Plus size={18} />
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
                    <ButtonMascot
                      src="/mascotas/botones/naranja-agregar-carrito.png"
                      className="mascot-add-cart"
                      layout={getMascotLayout('addCart')}
                    />
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
                <span>Tu carrito</span>
                <strong>
                  {cartUnits}{' '}
                  {cartUnits === 1
                    ? 'producto'
                    : 'productos'}
                </strong>
              </div>

              <button
                onClick={() =>
                  setCartOpen(false)
                }
                aria-label="Cerrar carrito"
              >
                <X />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <ShoppingBag size={46} />
                <h3>
                  Tu carrito está vacío
                </h3>
                <p>
                  Agrega algunas cositas
                  bonitas para comenzar tu
                  pedido.
                </p>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div
                      className="cart-item"
                      key={item.id}
                    >
                      <img
                        src={getProductImage(
                          item,
                        )}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                      />

                      <div className="cart-item-info">
                        <strong>
                          {item.name}
                        </strong>

                        <span>
                          $
                          {Number(
                            item.price,
                          )}{' '}
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
                              size={15}
                            />
                          </button>

                          <span>
                            {item.quantity}
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
                              size={15}
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
                          aria-label="Eliminar del carrito"
                        >
                          <Trash2
                            size={17}
                          />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart-bottom">
                  <div className="cart-total">
                    <span>Total</span>
                    <strong>
                      ${cartTotal} MXN
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
                    onClick={sendOrder}
                  >
                    <ButtonMascot
                      src="/mascotas/botones/naranja-pedido.png"
                      className="mascot-order"
                      layout={getMascotLayout('order')}
                    />
                    <FaWhatsapp size={21} />
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
                setAdminLoginOpen(false)
              }
              aria-label="Cerrar acceso"
            >
              <X />
            </button>

            <Settings size={32} />

            <h2>
              Acceso de administrador
            </h2>

            <p>
              Inicia sesión con el correo y
              contraseña que creaste en
              Supabase.
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

      {designManagerOpen && adminMode && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setDesignManagerOpen(false)}
        >
          <div
            className="design-manager-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="design-manager-header">
              <div>
                <span className="design-eyebrow">PERSONALIZACIÓN VISUAL</span>
                <h2>Diseño de la tienda</h2>
                <p>Cambia el logo y ajusta tamaño y posición de cada cuyo.</p>
              </div>
              <button
                className="modal-close design-close"
                type="button"
                onClick={() => setDesignManagerOpen(false)}
                aria-label="Cerrar diseño"
              >
                <X size={20} />
              </button>
            </div>

            <div className="design-manager-body">
              <section className="design-logo-section">
                <div className="design-section-title">
                  <div>
                    <h3>Logo principal</h3>
                    <p>La imagen que aparece en la portada y en el footer.</p>
                  </div>
                </div>

                <div className="design-logo-editor">
                  <div className="design-logo-preview">
                    <img
                      src={designDraft.logo_url || '/logo-cucui.jpg'}
                      alt="Vista previa del logo"
                    />
                  </div>
                  <div className="design-logo-actions">
                    <label className="design-upload-button">
                      <Upload size={18} />
                      {uploadingLogo ? 'Subiendo...' : 'Cambiar logo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo || savingDesign}
                      />
                    </label>
                    <button
                      type="button"
                      className="design-reset-button"
                      onClick={() =>
                        setDesignDraft((current) => ({
                          ...current,
                          logo_url: null,
                        }))
                      }
                    >
                      <RotateCcw size={17} />
                      Usar logo original
                    </button>
                  </div>
                </div>
              </section>

              <section className="design-mascots-section">
                <div className="design-section-title">
                  <div>
                    <h3>Posición de los cuyos</h3>
                    <p>X mueve a izquierda/derecha; Y mueve arriba/abajo.</p>
                  </div>
                </div>

                <div className="mascot-design-grid">
                  {MASCOT_DESIGN_ITEMS.map((item) => {
                    const values = {
                      ...DEFAULT_MASCOT_LAYOUT[item.key],
                      ...(designDraft.mascot_layout?.[item.key] || {}),
                    }

                    return (
                      <article className="mascot-design-card" key={item.key}>
                        <div className="mascot-design-top">
                          <div className="mascot-design-preview">
                            <img
                              src={item.src}
                              alt=""
                              style={{
                                width: `${Math.min(values.size, 72)}px`,
                                transform: `translate(${values.x * 0.35}px, ${values.y * 0.35}px)`,
                              }}
                            />
                          </div>
                          <div>
                            <h4>{item.label}</h4>
                            <span>{values.size}px · X {values.x} · Y {values.y}</span>
                          </div>
                          <button
                            type="button"
                            className="mascot-reset-mini"
                            onClick={() => resetMascotDesign(item.key)}
                            title="Restablecer"
                          >
                            <RotateCcw size={15} />
                          </button>
                        </div>

                        <label className="design-range-row">
                          <span>Tamaño</span>
                          <input
                            type="range"
                            min="20"
                            max="90"
                            step="1"
                            value={values.size}
                            onChange={(event) =>
                              updateMascotDesign(item.key, 'size', event.target.value)
                            }
                          />
                          <strong>{values.size}px</strong>
                        </label>

                        <label className="design-range-row">
                          <span>Posición X</span>
                          <input
                            type="range"
                            min="-60"
                            max="60"
                            step="1"
                            value={values.x}
                            onChange={(event) =>
                              updateMascotDesign(item.key, 'x', event.target.value)
                            }
                          />
                          <strong>{values.x}</strong>
                        </label>

                        <label className="design-range-row">
                          <span>Posición Y</span>
                          <input
                            type="range"
                            min="-60"
                            max="60"
                            step="1"
                            value={values.y}
                            onChange={(event) =>
                              updateMascotDesign(item.key, 'y', event.target.value)
                            }
                          />
                          <strong>{values.y}</strong>
                        </label>
                      </article>
                    )
                  })}
                </div>
              </section>

              {designError && (
                <div className="design-error">{designError}</div>
              )}
            </div>

            <div className="design-manager-footer">
              <button
                type="button"
                className="cancel-button"
                onClick={() => setDesignManagerOpen(false)}
                disabled={savingDesign || uploadingLogo}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="save-button design-save-button"
                onClick={saveSiteDesign}
                disabled={savingDesign || uploadingLogo}
              >
                <Save size={18} />
                {savingDesign ? 'Guardando...' : 'Guardar diseño'}
              </button>
            </div>
          </div>
        </div>
      )}

      {categoryManagerOpen &&
        adminMode && (
          <div
            className="modal-backdrop"
            onMouseDown={() =>
              setCategoryManagerOpen(false)
            }
          >
            <div
              className="category-manager-modal"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >
              <div className="editor-header">
                <div>
                  <span>ADMINISTRAR</span>
                  <h2>Categorías</h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCategoryManagerOpen(false)
                  }
                  aria-label="Cerrar categorías"
                >
                  <X />
                </button>
              </div>

              <p className="category-manager-help">
                “Todos” y “Ofertas” son apartados automáticos y no se eliminan. Las demás categorías sí puedes agregarlas o quitarlas.
              </p>

              <div className="category-manager-list">
                {categories
                  .filter(
                    (category) =>
                      category !== 'Todos' &&
                      category !== 'Ofertas',
                  )
                  .map((category) => (
                    <div
                      className="category-manager-item"
                      key={category}
                    >
                      <span>{category}</span>

                      <button
                        type="button"
                        onClick={() =>
                          deleteCategory(category)
                        }
                      >
                        <Trash2 size={16} />
                        Eliminar
                      </button>
                    </div>
                  ))}
              </div>

              <form
                className="category-add-form"
                onSubmit={addCategory}
              >
                <label>
                  Nueva categoría
                  <input
                    value={newCategoryName}
                    onChange={(event) => {
                      setNewCategoryName(
                        event.target.value,
                      )
                      setCategoryError('')
                    }}
                    placeholder="Ej. Accesorios"
                    maxLength={40}
                  />
                </label>

                <button
                  type="submit"
                  className="save-button"
                  disabled={savingCategory}
                >
                  <Plus size={18} />
                  {savingCategory
                    ? 'Agregando...'
                    : 'Agregar categoría'}
                </button>
              </form>

              {categoryError && (
                <div className="category-manager-error">
                  {categoryError}
                </div>
              )}
            </div>
          </div>
        )}

      {productEditorOpen &&
        adminMode && (
          <div
            className="modal-backdrop"
            onMouseDown={() =>
              setProductEditorOpen(false)
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
                  aria-label="Cerrar editor"
                >
                  <X />
                </button>
              </div>

              <div className="editor-grid">
                <div className="editor-image-column">
                  <div className="editor-gallery-preview">
                    {(productForm.image_urls ||
                      []).length === 0 ? (
                      <div className="editor-empty-image">
                        <img
                          src="/logo-cucui.jpg"
                          alt="Sin imagen"
                        />
                        <span>
                          Agrega hasta{' '}
                          {
                            MAX_PRODUCT_IMAGES
                          }{' '}
                          imágenes
                        </span>
                      </div>
                    ) : (
                      <div className="editor-image-list">
                        {productForm.image_urls.map(
                          (image, index) => (
                            <div
                              className="editor-image-item"
                              key={image}
                            >
                              <img
                                src={image}
                                alt={`Imagen ${
                                  index + 1
                                }`}
                                loading="lazy"
                                decoding="async"
                              />

                              {index === 0 && (
                                <span className="cover-badge">
                                  Portada
                                </span>
                              )}

                              <div className="editor-image-actions">
                                {index !== 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setProductCover(
                                        index,
                                      )
                                    }
                                    title="Usar como portada"
                                  >
                                    <Star
                                      size={15}
                                    />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeProductImage(
                                      index,
                                    )
                                  }
                                  title="Eliminar imagen"
                                >
                                  <Trash2
                                    size={15}
                                  />
                                </button>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>

                  {(productForm.image_urls ||
                    []).length <
                    MAX_PRODUCT_IMAGES && (
                    <label className="upload-button">
                      <ImagePlus
                        size={18}
                      />

                      {uploadingImages
                        ? 'Optimizando y subiendo...'
                        : 'Agregar imágenes'}

                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={
                          uploadingImages
                        }
                        onChange={
                          handleImagesUpload
                        }
                      />
                    </label>
                  )}

                  <p className="image-upload-help">
                    Máximo{' '}
                    {MAX_PRODUCT_IMAGES}{' '}
                    imágenes. Se reducen a
                    1400 px y WebP antes de
                    subirlas para que la tienda
                    cargue más rápido.
                  </p>
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
                      required
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
                      required
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
                          (category) =>
                            category !==
                              'Todos' &&
                            category !==
                              'Ofertas',
                        )
                        .map((category) => (
                          <option
                            key={category}
                            value={category}
                          >
                            {category}
                          </option>
                        ))}
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
                      required
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
                      required
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
                  <X size={17} />
                  Cancelar
                </button>

                <button
                  className="save-button"
                  type="submit"
                  disabled={
                    savingProduct ||
                    uploadingImages
                  }
                >
                  <Save size={18} />

                  {savingProduct
                    ? 'Guardando...'
                    : uploadingImages
                      ? 'Subiendo imágenes...'
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
                  {confirmDelete.name}
                </strong>
                ?
              </p>

              <div>
                <button
                  className="cancel-button"
                  onClick={() =>
                    setConfirmDelete(null)
                  }
                >
                  <X size={17} />
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
                  <Trash2 size={17} />
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

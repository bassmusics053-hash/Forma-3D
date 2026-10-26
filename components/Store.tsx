"use client";
import { trackProductEvent } from "@/lib/product-analytics";

import LanguageButton from "@/components/LanguageButton";

import {

  KeyboardEvent,

  MouseEvent,

  useEffect,

  useMemo,

  useState,

} from "react";



import ThemeButton from "@/components/ThemeButton";



type Brand = {

  id?: string;

  name: string;

  slug?: string;

};



type Category = {

  id: string;

  name: string;

  slug: string;

  image_url?: string | null;

  description?: string | null;

  parent_id?: string | null;

  show_on_home?: boolean;

  sort_order?: number;

};



type Product = {

  id: string;

  name: string;

  slug?: string;

  price: number;

  old_price?: number | null;

  stock: number;

  description?: string | null;

  image_url?: string | null;

  images?: string[];

  uzum_url?: string | null;

  yandex_url?: string | null;

  ozon_url?: string | null;

  brand?: Brand | null;

  category?: Category | null;

};



type DailyOffer = {id:string; ends_at:string; offer_price:number; original_price:number; product:Product};

type CartItem = Product & {

  quantity: number;

};



type Settings = {

  telegram_url?: string | null;

  instagram_url?: string | null;

  phone?: string | null;

  google_maps_url?: string | null;

  yandex_maps_url?: string | null;

  apple_maps_url?: string | null;

};

type Language = "uz" | "ru";



export default function Store() {

  const [language, setLanguage] = useState<Language>("uz");

  const [dailyOffers,setDailyOffers] = useState<DailyOffer[]>([]);
  useEffect(()=>{
    let mounted=true;
    const update=()=>fetch("/api/daily-offers",{cache:"no-store"}).then(r=>r.ok?r.json():[]).then(items=>{if(mounted)setDailyOffers(Array.isArray(items)?items:[])}).catch(()=>{});
    void update();const timer=setInterval(()=>void update(),60000);
    return ()=>{mounted=false;clearInterval(timer);};
  },[]);

  const [products, setProducts] = useState<Product[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);

  const [settings, setSettings] = useState<Settings>({});



  const [search, setSearch] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("");



  const [cart, setCart] = useState<CartItem[]>([]);

  const [cartOpen, setCartOpen] = useState(false);

  const [cartReady, setCartReady] = useState(false);



  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const [error, setError] = useState("");

  const t = (uzbek: string, russian: string) =>
    language === "ru" ? russian : uzbek;

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("forma3d-language");

    if (savedLanguage === "uz" || savedLanguage === "ru") {
      setLanguage(savedLanguage);
    }

    function handleLanguageChange(event: Event) {
      const nextLanguage = (event as CustomEvent<Language>).detail;

      if (nextLanguage === "uz" || nextLanguage === "ru") {
        setLanguage(nextLanguage);
      }
    }

    window.addEventListener("forma3d-language-change", handleLanguageChange);

    return () => {
      window.removeEventListener("forma3d-language-change", handleLanguageChange);
    };
  }, []);



  useEffect(() => {

    async function loadStore() {

      setLoading(true);

      setError("");



      const results = await Promise.allSettled([

        fetch("/api/products").then(async (response) => {

          const data = await response.json();



          if (!response.ok) {

            throw new Error(

              data.error || "Mahsulotlarni yuklab bo‘lmadi"

            );

          }



          return { data, demo: response.headers.get("X-Forma-Demo") === "1" };

        }),



        fetch("/api/categories").then(async (response) => {

          const data = await response.json();



          if (!response.ok) {

            throw new Error(

              data.error || "Kategoriyalarni yuklab bo‘lmadi"

            );

          }



          return data;

        }),



        fetch("/api/settings").then(async (response) => {

          const data = await response.json();



          if (!response.ok) {

            return {};

          }



          return data;

        }),

      ]);



      const productsResult = results[0];

      const categoriesResult = results[1];

      const settingsResult = results[2];



      if (productsResult.status === "fulfilled") {

        setProducts(Array.isArray(productsResult.value.data) ? productsResult.value.data : []);
        setIsDemo(productsResult.value.demo);

      } else {

        setError(

          productsResult.reason?.message ||

            "Mahsulotlarni yuklab bo‘lmadi"

        );

      }



      if (categoriesResult.status === "fulfilled") {

        setCategories(

          Array.isArray(categoriesResult.value)

            ? categoriesResult.value

            : []

        );

      }



      if (settingsResult.status === "fulfilled") {

        setSettings(settingsResult.value || {});

      }



      const categoryFromUrl = new URLSearchParams(

        window.location.search

      ).get("category");



      if (categoryFromUrl) {

        setSelectedCategory(categoryFromUrl);

      }



      setLoading(false);

    }



    loadStore();

  }, []);



  useEffect(() => {

    try {

      const savedCart = localStorage.getItem("forma3d-cart");



      if (savedCart) {

        const parsedCart = JSON.parse(savedCart);



        if (Array.isArray(parsedCart)) {

          setCart(parsedCart);

        }

      }

    } catch {

      localStorage.removeItem("forma3d-cart");

    } finally {

      setCartReady(true);

    }

  }, []);



  useEffect(() => {

    if (!cartReady) return;



    localStorage.setItem("forma3d-cart", JSON.stringify(cart));

  }, [cart, cartReady]);



const mainCategories = useMemo(() => {

  return categories

    .filter(

      (category) =>

        category.show_on_home === true &&

        !category.parent_id

    )

    .sort(

      (first, second) =>

        Number(first.sort_order || 0) -

        Number(second.sort_order || 0)

    )

    .slice(0, 4);

}, [categories]);



  const shownProducts = useMemo(() => {

    const normalizedSearch = search.trim().toLowerCase();



    return products.filter((product) => {

      const matchesSearch =

        !normalizedSearch ||

        product.name.toLowerCase().includes(normalizedSearch) ||

        product.brand?.name

          ?.toLowerCase()

          .includes(normalizedSearch) ||

        product.category?.name

          ?.toLowerCase()

          .includes(normalizedSearch);



      const matchesCategory =

        !selectedCategory ||

        product.category?.slug === selectedCategory;



      return matchesSearch && matchesCategory;

    });

  }, [products, search, selectedCategory]);



  const selectedCategoryName = useMemo(() => {

    return categories.find(

      (category) => category.slug === selectedCategory

    )?.name;

  }, [categories, selectedCategory]);



  const cartCount = useMemo(() => {

    return cart.reduce(

      (total, item) => total + item.quantity,

      0

    );

  }, [cart]);



  const cartTotal = useMemo(() => {

    return cart.reduce(

      (total, item) =>

        total + Number(item.price || 0) * item.quantity,

      0

    );

  }, [cart]);



  function chooseCategory(slug: string) {

    setSelectedCategory(slug);



    window.history.replaceState(

      {},

      "",

      slug ? `/?category=${slug}#products` : "/#products"

    );



    setTimeout(() => {

      document

        .getElementById("products")

        ?.scrollIntoView({

          behavior: "smooth",

          block: "start",

        });

    }, 50);

  }



  function openProduct(product: Product) {

    if (!product.slug) return;



    window.location.href = `/products/${product.slug}`;

  }



  function handleProductKeyDown(

    event: KeyboardEvent<HTMLElement>,

    product: Product

  ) {

    if (event.key === "Enter") {

      openProduct(product);

    }

  }



  function stopProductClick(

    event: MouseEvent<HTMLElement>

  ) {

    event.stopPropagation();

  }



  function addToCart(product: Product) {
    const currentOffer=dailyOffers.find(o=>o.product.id===product.id && new Date(o.ends_at).getTime()>Date.now());
    if(currentOffer) product={...product,price:Number(currentOffer.offer_price),old_price:Number(currentOffer.original_price)};
    if (product.stock <= 0) return;
    trackProductEvent(product.id, "add_to_cart");



    setCart((currentCart) => {

      const existingItem = currentCart.find(

        (item) => item.id === product.id

      );



      if (existingItem) {

        return currentCart.map((item) => {

          if (item.id !== product.id) return item;



          return {

            ...item,

            quantity: Math.min(

              item.quantity + 1,

              product.stock

            ),

          };

        });

      }



      return [

        ...currentCart,

        {

          ...product,

          quantity: 1,

        },

      ];

    });

  }



  function changeQuantity(

    productId: string,

    change: number

  ) {

    setCart((currentCart) =>

      currentCart

        .map((item) => {

          if (item.id !== productId) return item;



          return {

            ...item,

            quantity: Math.min(

              item.quantity + change,

              item.stock

            ),

          };

        })

        .filter((item) => item.quantity > 0)

    );

  }



  function removeFromCart(productId: string) {

    setCart((currentCart) =>

      currentCart.filter((item) => item.id !== productId)

    );

  }



  return (

    <>





      <header>

        <div className="wrap head">

          <a href="/" aria-label={t("Bosh sahifa", "Главная страница")}>

            <img

              className="logo"

              src="/forma3d-brand.webp"

              alt="FORMA 3D"

            />

          </a>



          <button

            type="button"

            className="catalog"

            onClick={() =>

              document

                .getElementById("categories")

                ?.scrollIntoView({

                  behavior: "smooth",

                })

            }

          >

            ☷ {t("Katalog", "Каталог")}

          </button>



          <div className="search">

            <input

              value={search}

              onChange={(event) =>

                setSearch(event.target.value)

              }

              placeholder={t(
                "Mahsulot, material yoki kategoriya qidiring",
                "Ищите товары, материалы и категории"
              )}

            />



            <button

              type="button"

              aria-label={t("Qidirish", "Поиск")}

              onClick={() =>

                document

                  .getElementById("products")

                  ?.scrollIntoView({

                    behavior: "smooth",

                  })

              }

            >

              ⌕

            </button>

          </div>



          <div className="actions">
            <ThemeButton variant="header" />

            <LanguageButton />

            <button
              type="button"
              className="action"
              onClick={() => {
                window.location.href = "/cabinet";
              }}
            >
              <i aria-hidden="true">♙</i>
              {t("Kabinet", "Кабинет")}
            </button>

            <button
              type="button"
              className="action"
              onClick={() => setCartOpen(true)}
            >
              <i aria-hidden="true">🛒</i>
              {t("Savat", "Корзина")} {cartCount > 0 ? cartCount : ""}
            </button>
          </div>

        </div>



      </header>



      <main className="wrap">
        {isDemo && <div className="demoNotice">{t("DEMO: Mahsulot rasmlari, o‘lchamlari va narxlari namunaviy. Hozircha real buyurtma qabul qilinmaydi.", "ДЕМО: Изображения, размеры и цены приведены для примера. Реальные заказы пока не принимаются.")}</div>}

        <section className="hero">
          <img className="heroBrandArt" src="/forma3d-original.webp" alt="" aria-hidden="true" />
          <div>

            <small>
              ⚡ {t("3D bosmadan yangi imkoniyatlar", "Новые возможности 3D-печати")}
            </small>



            <h1>{t("G‘oyangizni 3D shaklga aylantiramiz", "Воплощаем ваши идеи в 3D")}</h1>



            <p>
              {t(
                "Shaxmat figuralari, dekor, stendlar va buyurtma asosidagi 3D mahsulotlar.",
                "Шахматные фигуры, декор, подставки и изделия на заказ."
              )}
            </p>



            <a href="#products">
              {t("Mahsulotlarni ko‘rish", "Смотреть товары")} →
            </a>

          </div>

        </section>



        {dailyOffers.some(o=>new Date(o.ends_at).getTime()>Date.now()) && <section className="dailyOffers" id="kun-takliflari">
          <div className="dailyOffersTitle"><div><span>⚡ FORMA 3D</span><h2>{t("Kun takliflari","Предложения дня")}</h2></div><p>{t("Cheklangan muddatli maxsus mahsulotlar","Специальные товары на ограниченное время")}</p></div>
          <div className="dailyOffersGrid">{dailyOffers.filter(o=>new Date(o.ends_at).getTime()>Date.now()).map(o=><a href={`/products/${encodeURIComponent(o.product.slug||"")}`} key={o.id} className="dailyOfferCard">
            {o.product.image_url?<img src={o.product.image_url} alt={o.product.name}/>:<div className="dailyOfferPlaceholder">FORMA 3D</div>}
            <div className="dailyOfferInfo"><strong>{o.product.name}</strong><span><s style={{opacity:0.65,marginRight:8}}>{Number(o.original_price).toLocaleString("uz-UZ")} so‘m</s> <b>{Number(o.offer_price).toLocaleString("uz-UZ")} so‘m</b></span><small>⏳ {t("Taklif tugaydi:","До окончания:")} {new Date(o.ends_at).toLocaleString("uz-UZ")}</small></div>
          </a>)}</div>
        </section>}

        <section className="benefits">

       <a

            className="benefit benefitLink"

             href="/brands"

           >

               <b>🏷️ {t("Kolleksiyalar", "Коллекции")}</b>

               <span>
                 {t("Dizayn kolleksiyalarini ko‘rish", "Посмотреть коллекции дизайнов")}
               </span>

            </a>



          <div className="benefit">

            <b>🛠️ {t("Individual buyurtma", "Печать на заказ")}</b>

            <span>{t("G‘oyangizni chop etamiz", "Напечатаем вашу идею")}</span>

          </div>



          <div className="benefit">

            <b>✅ {t("Sifatli 3D bosma", "Качественная 3D-печать")}</b>

            <span>{t("Har bir detalga e’tibor", "Внимание к деталям")}</span>

          </div>



          {settings.telegram_url ? (

            <a

              className="benefit benefitLink"

              href={settings.telegram_url}

              target="_blank"

              rel="noreferrer"

            >

              <b>💬 {t("Material tanlash", "Подбор материала")}</b>

              <span>
                {t("PLA, PETG, ABS va TPU", "PLA, PETG, ABS и TPU")}
              </span>

            </a>

          ) : (

            <div className="benefit">

              <b>💬 {t("Material tanlash", "Подбор материала")}</b>

              <span>
                {t("Telegram manzili kiritilmagan", "Адрес Telegram не указан")}
              </span>

            </div>

          )}

        </section>



        <section id="categories">

          <div className="sectionHead">

            <h2>{t("Asosiy kategoriyalar", "Основные категории")}</h2>



            <a

              href="/categories"

              style={{

                color: "var(--red)",

                fontWeight: 800,

                textDecoration: "none",

              }}

            >

              {t("Barchasi", "Все категории")} →

            </a>

          </div>



          <div className="cats">

            {mainCategories.map((category) => (

              <div className="cat" key={category.id}>

                <button

                  type="button"

                  onClick={() =>

                    chooseCategory(category.slug)

                  }

                  style={{

                    width: "100%",

                    border: 0,

                    background: "transparent",

                    color: "inherit",

                    cursor: "pointer",

                  }}

                >

                  <i>

                    {category.image_url ? (

                      <img

                        src={category.image_url}

                        alt={category.name}

                        style={{

                          width: "100%",

                          height: "100%",

                          objectFit: "contain",

                          borderRadius: "50%",

                        }}

                      />

                    ) : (

                      "🧩"

                    )}

                  </i>



                  <b>{category.name}</b>

                </button>

              </div>

            ))}



            {!mainCategories.length && (

              <div className="empty">

                {t(
                  "Hozircha kategoriya qo‘shilmagan",
                  "Категории пока не добавлены"
                )}

              </div>

            )}

          </div>

        </section>



        <div className="sectionHead" id="products">

          <div>

            <h2>

              {selectedCategoryName ||
                t("Mashhur 3D mahsulotlar", "Популярные 3D-изделия")}

            </h2>



            {selectedCategory && (

              <button

                type="button"

                onClick={() => chooseCategory("")}

                style={{

                  marginTop: 8,

                  padding: 0,

                  border: 0,

                  background: "transparent",

                  color: "var(--red)",

                  cursor: "pointer",

                  fontWeight: 800,

                }}

              >

                × {t("Filterni tozalash", "Сбросить фильтр")}

              </button>

            )}

          </div>



          <span>
            {shownProducts.length} {t("ta mahsulot", "товаров")}
          </span>

        </div>



        {error && <div className="error">{error}</div>}



        {loading ? (

          <div className="loading">

            {t("Mahsulotlar yuklanmoqda...", "Товары загружаются...")}

          </div>

        ) : (

          <section className="grid">

            {shownProducts.map((product) => (

              <article

                className="card clickableCard"

                key={product.id}

                role="link"

                tabIndex={0}

                onClick={() => openProduct(product)}

                onKeyDown={(event) =>

                  handleProductKeyDown(event, product)

                }

              >

                <div className="pic">

                  {product.image_url ? (

                    <img

                      src={product.image_url}

                      alt={product.name}

                    />

                  ) : (

                    <span style={{ fontSize: 60 }}>

                      🧩

                    </span>

                  )}

                </div>



                <div className="info">

                  <div className="price">

                    {Number(dailyOffers.find(o=>o.product.id===product.id && new Date(o.ends_at).getTime()>Date.now())?.offer_price ?? product.price ?? 0).toLocaleString("ru")}{" "}

                    {t("so‘m", "сум")}

                  </div>



                  {(dailyOffers.some(o=>o.product.id===product.id && new Date(o.ends_at).getTime()>Date.now()) || (product.old_price && Number(product.old_price)>Number(product.price))) && (

                      <del

                        style={{

                          color: "var(--muted)",

                          fontSize: 14,

                        }}

                      >

                        {Number(dailyOffers.find(o=>o.product.id===product.id && new Date(o.ends_at).getTime()>Date.now())?.original_price ?? product.old_price).toLocaleString("ru")}{" "}

                        {t("so‘m", "сум")}

                      </del>

                    )}



                  <div className="name">{product.name}</div>
                  {product.description && <p className="productSpecs">{product.description}</p>}



                  <small>

                    {product.brand?.name ||

                      product.category?.name ||

                      t("3D mahsulot", "3D-изделие")}

                    {" · "}

                    {t("Omborda", "В наличии")}: {product.stock || 0}{" "}
                    {t("dona", "шт.")}

                  </small>



                  <div className="buy">

                    <button

                      type="button"

                      className="detail"

                      disabled={product.stock <= 0}

                      onClick={(event) => {

                        event.stopPropagation();

                        addToCart(product);

                        setCartOpen(true);

                      }}

                    >

                      {product.stock > 0
                        ? t("Buyurtma berish", "Заказать")
                        : t("Omborda yo‘q", "Нет в наличии")}

                    </button>



                    <button

                      type="button"

                      className="cart"

                      disabled={product.stock <= 0}

                      onClick={(event) => {

                        event.stopPropagation();

                        addToCart(product);

                      }}

                    >

                      {product.stock > 0 ? "＋" : t("Yo‘q", "Нет")}

                    </button>

                  </div>



                  <div

                    className="markets"

                    onClick={stopProductClick}

                  >

                    {product.uzum_url && (

                      <a

                        href={product.uzum_url}

                        target="_blank"

                        rel="noreferrer"

                      >

                        Uzum

                      </a>

                    )}



                    {product.yandex_url && (

                      <a

                        href={product.yandex_url}

                        target="_blank"

                        rel="noreferrer"

                      >

                        Yandex

                      </a>

                    )}



                    {product.ozon_url && (

                      <a

                        href={product.ozon_url}

                        target="_blank"

                        rel="noreferrer"

                      >

                        Ozon

                      </a>

                    )}

                  </div>

                </div>

              </article>

            ))}



            {!shownProducts.length && (

              <div

                className="empty"

                style={{ gridColumn: "1 / -1" }}

              >

                {t(
                  "Ushbu bo‘limda mahsulot topilmadi",
                  "В этом разделе товары не найдены"
                )}

              </div>

            )}

          </section>

        )}

      </main>



      <footer>

        <div className="wrap foot">

          <img

            src="/forma3d-brand.webp"

            alt="FORMA 3D"

          />



          <div>

            <b>FORMA 3D</b>

            <span>

              {t(
                "3D bosma va individual mahsulotlar",
                "3D-печать и изделия на заказ"
              )}

            </span>

          </div>



          <nav>

            {settings.telegram_url && (

              <a

                href={settings.telegram_url}

                target="_blank"

                rel="noreferrer"

              >

                Telegram

              </a>

            )}



            {settings.instagram_url && (

              <a

                href={settings.instagram_url}

                target="_blank"

                rel="noreferrer"

              >

                Instagram

              </a>

            )}



            {settings.phone && (

              <a href={`tel:${settings.phone}`}>

                {settings.phone}

              </a>

            )}



            {settings.google_maps_url && (

              <a

                href={settings.google_maps_url}

                target="_blank"

                rel="noreferrer"

              >

                Google Maps

              </a>

            )}



            {settings.yandex_maps_url && (

              <a

                href={settings.yandex_maps_url}

                target="_blank"

                rel="noreferrer"

              >

                Yandex Maps

              </a>

            )}



            {settings.apple_maps_url && (

              <a

                href={settings.apple_maps_url}

                target="_blank"

                rel="noreferrer"

              >

                Apple Maps

              </a>

            )}

          </nav>

        </div>

      </footer>



      {cartOpen && (

        <div

          className="cartOverlay"

          onClick={() => setCartOpen(false)}

        >

          <aside

            className="cartPanel"

            onClick={(event) => event.stopPropagation()}

          >

            <div className="cartHeader">

              <div>

                <h2>{t("Savat", "Корзина")}</h2>

                <span>
                  {cartCount} {t("ta mahsulot", "товаров")}
                </span>

              </div>



              <button

                type="button"

                onClick={() => setCartOpen(false)}

              >

                ✕

              </button>

            </div>



            <div className="cartItems">

              {cart.map((item) => (

                <div className="cartItem" key={item.id}>

                  <div className="cartItemImage">

                    {item.image_url ? (

                      <img

                        src={item.image_url}

                        alt={item.name}

                      />

                    ) : (

                      <span>🧩</span>

                    )}

                  </div>



                  <div className="cartItemInfo">

                    <b>{item.name}</b>



                    <span>

                      {Number(item.price).toLocaleString(

                        "ru"

                      )}{" "}

                      {t("so‘m", "сум")}

                    </span>



                    <div className="cartQuantity">

                      <button

                        type="button"

                        onClick={() =>

                          changeQuantity(item.id, -1)

                        }

                      >

                        −

                      </button>



                      <strong>{item.quantity}</strong>



                      <button

                        type="button"

                        disabled={

                          item.quantity >= item.stock

                        }

                        onClick={() =>

                          changeQuantity(item.id, 1)

                        }

                      >

                        ＋

                      </button>



                      <button

                        type="button"

                        className="removeCartItem"

                        onClick={() =>

                          removeFromCart(item.id)

                        }

                      >

                        {t("O‘chirish", "Удалить")}

                      </button>

                    </div>

                  </div>

                </div>

              ))}



              {!cart.length && (

                <div className="empty">

                  {t("Savat hozircha bo‘sh", "Корзина пока пуста")}

                </div>

              )}

            </div>



            {cart.length > 0 && (

              <div className="cartFooter">

                <div className="cartTotal">

                  <span>{t("Umumiy summa", "Общая сумма")}</span>



                  <strong>

                    {cartTotal.toLocaleString("ru")} {t("so‘m", "сум")}

                  </strong>

                </div>



                <button

                  type="button"

                  className="checkoutButton"

                  onClick={() => {

                    setCartOpen(false);

                    window.location.href = "/checkout";

                  }}

                >

                  {t("Buyurtmani rasmiylashtirish", "Оформить заказ")}

                </button>



                <button

                  type="button"

                  className="clearCart"

                  onClick={() => setCart([])}

                >

                  {t("Savatni tozalash", "Очистить корзину")}

                </button>

              </div>

            )}

          </aside>

        </div>

      )}



    </>

  );

}

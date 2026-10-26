"use client";

import { readApiJson } from "@/lib/api-response";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type OrderStatus =
  | "new"
  | "contacted"
  | "confirmed"
  | "shipping"
  | "completed"
  | "cancelled";

type OrderItem = {
  id: string;
  product_id?: string | null;
  product_name: string;
  product_slug?: string | null;
  image_url?: string | null;
  price: number;
  quantity: number;
  subtotal: number;
};

type Order = {
  id: string;
  order_number: number;
  formatted_order_number: string;

  customer_name: string;
  phone: string;

  region: string;
  district?: string | null;
  address: string;
  customer_note?: string | null;

  total_amount: number;
  status: OrderStatus;

  created_at: string;
  updated_at: string;

  items: OrderItem[];
};

const statusLabels: Record<OrderStatus, string> = {
  new: "Yangi",
  contacted: "Bog‘lanildi",
  confirmed: "Tasdiqlandi",
  shipping: "Yetkazilmoqda",
  completed: "Yakunlandi",
  cancelled: "Bekor qilindi",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | OrderStatus>("all");

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] =
    useState("");
  const [error, setError] = useState("");

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/orders",
        {
          cache: "no-store",
        }
      );

      const data = await readApiJson(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Buyurtmalarni yuklab bo‘lmadi"
        );
      }

      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Buyurtmalarni yuklab bo‘lmadi"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const statistics = useMemo(() => {
    return {
      total: orders.length,

      newOrders: orders.filter(
        (order) => order.status === "new"
      ).length,

      processing: orders.filter((order) =>
        [
          "contacted",
          "confirmed",
          "shipping",
        ].includes(order.status)
      ).length,

      completed: orders.filter(
        (order) => order.status === "completed"
      ).length,
    };
  }, [orders]);

  const shownOrders = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" ||
        order.status === statusFilter;

      const searchText = [
        order.formatted_order_number,
        order.customer_name,
        order.phone,
        order.region,
        order.district || "",
        order.address,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchText.includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  async function changeStatus(
    orderId: string,
    status: OrderStatus
  ) {
    try {
      setUpdatingId(orderId);
      setError("");

      const response = await fetch(
        "/api/admin/orders",
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            id: orderId,
            status,
          }),
        }
      );

      const data = await readApiJson(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Buyurtma holatini o‘zgartirib bo‘lmadi"
        );
      }

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status,
                updated_at:
                  data.updated_at ||
                  new Date().toISOString(),
              }
            : order
        )
      );

      setSelectedOrder((currentOrder) =>
        currentOrder?.id === orderId
          ? {
              ...currentOrder,
              status,
              updated_at:
                data.updated_at ||
                new Date().toISOString(),
            }
          : currentOrder
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Buyurtma holatini o‘zgartirib bo‘lmadi"
      );
    } finally {
      setUpdatingId("");
    }
  }

  function formatPrice(value: number) {
    return Number(value || 0).toLocaleString(
      "ru"
    );
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  async function copyPhone(phone: string) {
    try {
      await navigator.clipboard.writeText(phone);
      alert("Telefon raqami nusxalandi");
    } catch {
      alert(`Telefon raqami: ${phone}`);
    }
  }

  return (
    <div className="adminOrders">
      {error && (
        <div className="error flash">
          {error}
        </div>
      )}

      <section className="stats orderStats">
        <div className="stat">
          <span>Barcha buyurtmalar</span>
          <strong>{statistics.total}</strong>
        </div>

        <div className="stat newOrderStat">
          <span>Yangi buyurtmalar</span>
          <strong>{statistics.newOrders}</strong>
        </div>

        <div className="stat">
          <span>Jarayonda</span>
          <strong>{statistics.processing}</strong>
        </div>

        <div className="stat">
          <span>Yakunlangan</span>
          <strong>{statistics.completed}</strong>
        </div>
      </section>

      <section className="toolbar ordersToolbar">
        <input
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Buyurtma raqami, ism, telefon yoki viloyat..."
        />

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value as
                | "all"
                | OrderStatus
            )
          }
        >
          <option value="all">
            Barcha holatlar
          </option>

          <option value="new">
            Yangi
          </option>

          <option value="contacted">
            Bog‘lanildi
          </option>

          <option value="confirmed">
            Tasdiqlandi
          </option>

          <option value="shipping">
            Yetkazilmoqda
          </option>

          <option value="completed">
            Yakunlandi
          </option>

          <option value="cancelled">
            Bekor qilindi
          </option>
        </select>

        <button
          type="button"
          className="secondary"
          onClick={loadOrders}
          disabled={loading}
        >
          {loading ? "Yuklanmoqda..." : "↻ Yangilash"}
        </button>
      </section>

      <div className="table ordersTable">
        <table>
          <thead>
            <tr>
              <th>Zakaz raqami</th>
              <th>Mijoz</th>
              <th>Telefon</th>
              <th>Viloyat / shahar</th>
              <th>Summa</th>
              <th>Holati</th>
              <th>Sana</th>
              <th>Amallar</th>
            </tr>
          </thead>

          <tbody>
            {shownOrders.map((order) => (
              <tr key={order.id}>
                <td>
                  <strong className="orderNumber">
                    {order.formatted_order_number}
                  </strong>
                </td>

                <td>
                  <b>{order.customer_name}</b>
                </td>

                <td>
                  <a
                    className="phoneLink"
                    href={`tel:${order.phone}`}
                  >
                    {order.phone}
                  </a>
                </td>

                <td>
                  <b>{order.region}</b>

                  {order.district && (
                    <small className="orderDistrict">
                      {order.district}
                    </small>
                  )}
                </td>

                <td>
                  <b>
                    {formatPrice(
                      order.total_amount
                    )}{" "}
                    so‘m
                  </b>
                </td>

                <td>
                  <select
                    className={`orderStatus ${order.status}`}
                    value={order.status}
                    disabled={
                      updatingId === order.id
                    }
                    onChange={(event) =>
                      changeStatus(
                        order.id,
                        event.target
                          .value as OrderStatus
                      )
                    }
                  >
                    {Object.entries(
                      statusLabels
                    ).map(([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    ))}
                  </select>
                </td>

                <td>
                  {formatDate(order.created_at)}
                </td>

                <td>
                  <div className="rowActions">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedOrder(order)
                      }
                    >
                      Ko‘rish
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        copyPhone(order.phone)
                      }
                    >
                      Telefonni olish
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!loading &&
              shownOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="empty"
                  >
                    Buyurtmalar topilmadi
                  </td>
                </tr>
              )}

            {loading && (
              <tr>
                <td
                  colSpan={8}
                  className="empty"
                >
                  Buyurtmalar yuklanmoqda...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div
          className="modalBg"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedOrder(null);
            }
          }}
        >
          <div className="modal orderModal">
            <div className="orderModalHeader">
              <div>
                <span>Buyurtma</span>

                <h2>
                  {
                    selectedOrder.formatted_order_number
                  }
                </h2>
              </div>

              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setSelectedOrder(null)
                }
              >
                ✕
              </button>
            </div>

            <div className="orderCustomerGrid">
              <div>
                <span>Mijoz</span>
                <b>
                  {selectedOrder.customer_name}
                </b>
              </div>

              <div>
                <span>Telefon raqami</span>

                <a
                  href={`tel:${selectedOrder.phone}`}
                >
                  {selectedOrder.phone}
                </a>
              </div>

              <div>
                <span>Viloyat / shahar</span>
                <b>{selectedOrder.region}</b>
              </div>

              <div>
                <span>Tuman / shahar</span>
                <b>
                  {selectedOrder.district ||
                    "Kiritilmagan"}
                </b>
              </div>

              <div className="full">
                <span>Yetkazib berish manzili</span>
                <b>{selectedOrder.address}</b>
              </div>

              {selectedOrder.customer_note && (
                <div className="full">
                  <span>Mijoz izohi</span>
                  <b>
                    {
                      selectedOrder.customer_note
                    }
                  </b>
                </div>
              )}
            </div>

            <h3>Mahsulotlar</h3>

            <div className="orderProductList">
              {selectedOrder.items.map((item) => (
                <div
                  className="orderProduct"
                  key={item.id}
                >
                  <div className="orderProductImage">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                      />
                    ) : (
                      <span>🧩</span>
                    )}
                  </div>

                  <div className="orderProductInfo">
                    <b>{item.product_name}</b>

                    <span>
                      {formatPrice(item.price)}{" "}
                      so‘m × {item.quantity} dona
                    </span>
                  </div>

                  <strong>
                    {formatPrice(item.subtotal)}{" "}
                    so‘m
                  </strong>
                </div>
              ))}
            </div>

            <div className="orderModalTotal">
              <span>Umumiy summa</span>

              <strong>
                {formatPrice(
                  selectedOrder.total_amount
                )}{" "}
                so‘m
              </strong>
            </div>

            <div className="formActions">
              <a
                className="primary orderCallButton"
                href={`tel:${selectedOrder.phone}`}
              >
                ☎ Qo‘ng‘iroq qilish
              </a>

              <button
                type="button"
                className="secondary"
                onClick={() =>
                  copyPhone(selectedOrder.phone)
                }
              >
                Telefonni nusxalash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
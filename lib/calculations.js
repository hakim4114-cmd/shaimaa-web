export function countOrdersByStatus(orders, status) {
  return orders.filter((order) => order.status === status).length;
}
